import { customerSignInWithIdentityProvider } from "src/server/api/customer-user";
import { getSaaSDomainURL } from "src/server/utils/getSaaSDomainURL";

export default async function handleAuth(nextRequest, nextResponse) {
  if (nextRequest.method === "GET") {
    const { state, code } = nextRequest.query;

    let authRequestPayload = null;

    if (state === "google-auth" && code) {
      const saasDomainURL = getSaaSDomainURL();
      const authorizationCode = code;
      authRequestPayload = {
        authorizationCode,
        identityProviderName: "Google",
        redirectUri: `${saasDomainURL}/api/idp-auth`,
      };
    } else if (state === "github-auth" && code) {
      const authorizationCode = code;
      authRequestPayload = {
        authorizationCode,
        identityProviderName: "GitHub",
      };
    }

    if (authRequestPayload) {
      try {
        const response = await customerSignInWithIdentityProvider(authRequestPayload);
        const jwtToken = response.data.jwtToken;
        nextResponse.setHeader(
          "Set-Cookie",
          `token=${jwtToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24}`
        );
        nextResponse.setHeader("Access-Control-Expose-Headers", "Set-Cookie");
        return nextResponse.redirect(307, "/signin");
      } catch (err) {
        console.error("IDP AUTH error", { status: err?.response?.status, message: err?.response?.data?.message });
        return nextResponse.redirect(307, "/signin?redirect_reason=idp_auth_error");
      }
    }
  }

  //something went wrong, redirect to signin page
  return nextResponse.redirect(307, "/signin?redirect_reason=idp_auth_error");
}
