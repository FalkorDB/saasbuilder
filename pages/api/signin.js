import _ from "lodash";

const { customerUserSignIn } = require("src/server/api/customer-user");
const { getEnvironmentType } = require("src/server/utils/getEnvironmentType");
const { isRateLimited, recordAttempt, resetAttempts } = require("src/server/utils/rateLimiter");
import { setAuthCookie, setRefreshCookie } from "src/server/utils/authCookie";
import CaptchaVerificationError from "src/server/errors/CaptchaVerificationError";
import { checkReCaptchaSetup } from "src/server/utils/checkReCaptchaSetup";
import { verifyRecaptchaToken } from "src/server/utils/verifyRecaptchaToken";

function checkRequiresReCaptcha(apiKey) {

  const skipRecaptchaApiKeys = process.env.SKIP_RECAPTCHA_API_KEYS ?? "";
  if (skipRecaptchaApiKeys && skipRecaptchaApiKeys.includes(apiKey)) return false;

  return true;
}

export default async function handleSignIn(nextRequest, nextResponse) {
  if (nextRequest.method === "POST") {
    let environmentType;
    try {
      //xForwardedForHeader has multiple IPs in the format <client>, <proxy1>, <proxy2>
      //get the first IP (client IP)
      const xForwardedForHeader = nextRequest.get?.("X-Forwarded-For") || "";
      const clientIP = xForwardedForHeader.split(",").shift().trim();

      // Check rate limiting per IP
      if (isRateLimited(clientIP)) {
        return nextResponse.status(429).json({
          message: "Too many login attempts. Please try again later.",
        });
      }

      const requestBody = nextRequest.body || {};
      const requiresReCaptachValidation = checkReCaptchaSetup() && checkRequiresReCaptcha(nextRequest.get?.("X-Api-Key") || "");
      if (requiresReCaptachValidation) {
        const { reCaptchaToken } = requestBody;
        const isVerified = await verifyRecaptchaToken(reCaptchaToken);
        if (!isVerified) throw new CaptchaVerificationError();
      }

      environmentType = getEnvironmentType();
      const { email, password, reCaptchaToken: _rcToken } = requestBody;
      const payload = {
        email,
        password,
        environmentType,
      };
      const saasBuilderIP = process.env.POD_IP || "";

      const response = await customerUserSignIn(payload, {
        "Client-IP": clientIP,
        "SaaSBuilder-IP": saasBuilderIP,
      });

      // Reset rate limiting on successful login
      resetAttempts(clientIP);

      const delayInMilliseconds = _.random(0, 150);

      //Wait for a random duration b/w 0ms and 150ms to mask the difference b/w response times of api when a user is present vs not present
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, delayInMilliseconds);
      });

      const responseData = response?.data || {};
      const { jwtToken, refreshToken, ...rest } = responseData;

      // Set httpOnly cookies — the client never sees the raw tokens
      if (jwtToken) {
        setAuthCookie(nextResponse, jwtToken);
      }
      if (refreshToken) {
        setRefreshCookie(nextResponse, refreshToken);
      }

      return nextResponse.status(200).send({ ...rest });
    } catch (error) {
      // Extract IP again for error handling (in case of early errors)
      const xForwardedForHeader = nextRequest.get?.("X-Forwarded-For") || "";
      const clientIP = xForwardedForHeader.split(",").shift().trim();

      // Record failed attempt for rate limiting
      recordAttempt(clientIP);

      console.error("Error in sign in", { status: error?.response?.status, message: error?.response?.data?.message });
      const defaultErrorMessage = "Failed to sign in. Either the credentials are incorrect or the user does not exist";

      //Wait for a random duration b/w 0ms and 150ms to mask the difference b/w response times of api when a user is present vs not present
      const delayInMilliseconds = _.random(0, 150);
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, delayInMilliseconds);
      });
      console.error("Error in signin", { status: error?.response?.status, message: error?.response?.data?.message });

      if (error.name === "ProviderAuthError" || error?.response?.status === undefined) {
        return nextResponse.status(400).send({
          message: defaultErrorMessage,
        });
      } else if (error.response?.data?.message === "wrong user email or password") {
        return nextResponse.status(400).send({
          message: defaultErrorMessage,
        });
      } else if (
        error.response?.data?.message?.toLowerCase() ===
        "user has not been activated. please check your email for activation link."
      ) {
        return nextResponse.status(400).send({
          message: defaultErrorMessage,
        });
      } else {
        return nextResponse.status(error.response?.status || 400).send({
          message: error.response?.data?.message || defaultErrorMessage,
        });
      }
    }
  } else {
    return nextResponse.status(404).json({
      message: "Endpoint not found",
    });
  }
}
