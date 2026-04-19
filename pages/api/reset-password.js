import axios from "src/axios";
import { customerUserResetPassword } from "src/server/api/customer-user";
import CaptchaVerificationError from "src/server/errors/CaptchaVerificationError";
import { checkReCaptchaSetup } from "src/server/utils/checkReCaptchaSetup";
import { isRateLimited, recordAttempt, resetAttempts } from "src/server/utils/rateLimiter";
import { verifyRecaptchaToken } from "src/server/utils/verifyRecaptchaToken";

export default async function handleResetPassword(nextRequest, nextResponse) {
  if (nextRequest.method === "POST") {
    try {
      //xForwardedForHeader has multiple IPs in the format <client>, <proxy1>, <proxy2>
      //get the first IP (client IP)
      const xForwardedForHeader = nextRequest.get?.call("X-Forwarded-For") || "";
      const clientIP = xForwardedForHeader.split(",").shift().trim();

      // Check rate limiting per IP
      if (isRateLimited(clientIP)) {
        return nextResponse.status(429).json({
          message: "Too many password reset attempts. Please try again later.",
        });
      }

      const saasBuilderIP = process.env.POD_IP || "";
      const requestBody = nextRequest.body || {};
      const { email, token: resetToken, newPassword, reCaptchaToken } = requestBody;
      const isReCaptchaSetup = checkReCaptchaSetup();
      const sessionToken = nextRequest.cookies?.token;
      let tokenValidate = false;
      if (sessionToken) {
        tokenValidate = await getUser(sessionToken);
      }
      if (!tokenValidate && isReCaptchaSetup) {
        const isVerified = await verifyRecaptchaToken(reCaptchaToken);
        if (!isVerified) throw new CaptchaVerificationError();
      }

      await customerUserResetPassword({ email, token: resetToken, newPassword }, {
        "Client-IP": clientIP,
        "SaaSBuilder-IP": saasBuilderIP,
      });

      // Reset rate limiting on successful request
      resetAttempts(clientIP);

      return nextResponse.status(200).send();
    } catch (error) {
      // Extract IP for error handling
      const xForwardedForHeader = nextRequest.get?.call("X-Forwarded-For") || "";
      const clientIP = xForwardedForHeader.split(",").shift().trim();

      // Record failed attempt for rate limiting
      recordAttempt(clientIP);

      const defaultErrorMessage = "Something went wrong. Please retry";

      if (error.name === "ProviderAuthError" || error?.response?.status === undefined) {
        return nextResponse.status(500).send({
          message: defaultErrorMessage,
        });
      } else {
        const responseErrorMessage = error.response?.data?.message;

        if (responseErrorMessage === "user not found: record not found") {
          return nextResponse.status(200).send();
        }

        return nextResponse.status(error.response?.status || 500).send({
          message: responseErrorMessage || defaultErrorMessage,
        });
      }
    }
  } else {
    return nextResponse.status(404).json({
      message: "Endpoint not found",
    });
  }
}

async function getUser(token) {
  try {
    const response = await axios.get("/user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.status === 200;
  } catch (error) {
    console.error("getUser error", error);
    return false;
  }
}
