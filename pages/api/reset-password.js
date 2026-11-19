import { customerUserResetPassword } from "src/server/api/customer-user";
import CaptchaVerificationError from "src/server/errors/CaptchaVerificationError";
import { getRefreshToken } from "src/server/utils/authCookie";
import { checkReCaptchaSetup } from "src/server/utils/checkReCaptchaSetup";
import { isRateLimited, recordAttempt, resetAttempts } from "src/server/utils/rateLimiter";
import { validateUserToken } from "src/server/utils/validateUserToken";
import { verifyRecaptchaToken } from "src/server/utils/verifyRecaptchaToken";

export default async function handleResetPassword(nextRequest, nextResponse) {
  if (nextRequest.method === "POST") {
    try {
      //xForwardedForHeader has multiple IPs in the format <client>, <proxy1>, <proxy2>
      //get the first IP (client IP)
      const xForwardedForHeader = nextRequest.headers["x-forwarded-for"] || "";
      const clientIP = xForwardedForHeader.split(",").shift().trim();

      // Check rate limiting per IP
      if (isRateLimited(clientIP)) {
        return nextResponse.status(429).json({
          message: "Too many password reset attempts. Please try again later.",
        });
      }

      const saasBuilderIP = process.env.POD_IP || "";
      const requestBody = nextRequest.body || {};
      const { reCaptchaToken } = requestBody;
      const isReCaptchaSetup = checkReCaptchaSetup();
      if (isReCaptchaSetup) {
        const isVerified = await verifyRecaptchaToken(reCaptchaToken);
        if (!isVerified) {
          const authentication = await validateUserToken(nextRequest);
          if (!authentication.ok && authentication.status === 401 && !reCaptchaToken && getRefreshToken(nextRequest)) {
            return nextResponse.status(401).send({ message: "Not authenticated" });
          }
          const userEmail = authentication.ok ? authentication.user.email : undefined;
          const requestedEmail = requestBody.email;
          if (
            typeof userEmail !== "string" ||
            !userEmail.trim() ||
            typeof requestedEmail !== "string" ||
            !requestedEmail.trim() ||
            userEmail.trim().toLowerCase() !== requestedEmail.trim().toLowerCase()
          ) {
            throw new CaptchaVerificationError();
          }
        }
      }

      await customerUserResetPassword(
        { email: requestBody.email },
        {
          "Client-IP": clientIP,
          "SaaSBuilder-IP": saasBuilderIP,
        }
      );

      // Reset rate limiting on successful request
      resetAttempts(clientIP);

      return nextResponse.status(200).send();
    } catch (error) {
      // Record failed attempt for rate limiting
      const xForwardedForHeader = nextRequest.headers["x-forwarded-for"] || "";
      recordAttempt(xForwardedForHeader.split(",").shift().trim());

      // A backend rejection is answered like success, so the response never hints whether an account exists.
      if (error.name !== "ProviderAuthError" && error?.response?.status < 500) {
        return nextResponse.status(200).send();
      }

      return nextResponse.status(500).send({ message: "Something went wrong. Please retry" });
    }
  } else {
    return nextResponse.status(404).json({
      message: "Endpoint not found",
    });
  }
}
