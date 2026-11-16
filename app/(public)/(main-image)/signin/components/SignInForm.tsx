import { FC, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next-nprogress-bar";
import { Stack } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useFormik } from "formik";
import Cookies from "js-cookie";
import ReCAPTCHA from "react-google-recaptcha";

import { AUTH_INDICATOR_COOKIE } from "src/api/authIndicatorCookie";
import { customerUserSignin } from "src/api/customer-user";
import { refreshAuth } from "src/api/refreshAuth";
import { Text } from "src/components/Typography/Typography";
import useEnvironmentType from "src/hooks/useEnvironmentType";
import useSnackbar from "src/hooks/useSnackbar";
import { useProviderOrgDetails } from "src/providers/ProviderOrgDetailsProvider";
import { IdentityProvider } from "src/types/identityProvider";
import { getReCaptchaToken } from "src/utils/getReCaptchaToken";
import { getInstancesRoute } from "src/utils/routes";

import { buildInvitationInfo, handleIDPButtonClick } from "../../shared/idp-utils";
import { createSigninValidationSchema } from "../constants";
import { findAutoStartIdp, getValidDestination, isHttpUrl } from "../findAutoStartIdp";
import { useLastLoginDetails } from "../hooks/useLastLoginDetails";

import EmailStep from "./EmailStep";
import LoginMethodStep from "./LoginMethodStep";

type SignInFormProps = {
  isPasswordLoginEnabled: boolean;
  identityProviders: IdentityProvider[];
  isReCaptchaSetup: boolean;
  googleReCaptchaSiteKey: string;
};

// Bound the session refresh so a stalled endpoint can't leave the user on "Redirecting…";
// on timeout, auto-start continues with the IdP (same limit as the middleware's /user check).
const REFRESH_TIMEOUT_MS = 5000;

function refreshAuthWithTimeout(): Promise<boolean> {
  return Promise.race([
    refreshAuth(),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), REFRESH_TIMEOUT_MS)),
  ]);
}

// useLastLoginDetails only loads the remembered email in an effect, so it is still ""
// when auto-start runs on mount; read it directly so the IdP gets a login_hint.
function getStoredLoginEmail(): string {
  try {
    return localStorage.getItem("lastLoginEmail") || "";
  } catch {
    return "";
  }
}

const SignInForm: FC<SignInFormProps> = ({
  identityProviders,
  isPasswordLoginEnabled,
  isReCaptchaSetup,
  googleReCaptchaSiteKey,
}) => {
  const [shouldRememberLoginDetails, setShouldRememberLoginDetails] = useState(true);
  const { email } = useLastLoginDetails();
  const [currentStep, setCurrentStep] = useState(email ? 1 : 0);
  const [isRecaptchaScriptLoaded, setIsRecaptchaScriptLoaded] = useState(false);
  const { setLoginMethod } = useLastLoginDetails();
  const router = useRouter();

  const searchParams = useSearchParams();
  const redirect_reason = searchParams?.get("redirect_reason");
  const destination = searchParams?.get("destination");
  const idpParam = searchParams?.get("idp");
  const snackbar = useSnackbar();

  const { orgName } = useProviderOrgDetails();
  const environmentType = useEnvironmentType();

  const reCaptchaRef = useRef<ReCAPTCHA | null>(null);

  const formik = useFormik({
    initialValues: {
      email: email || "",
      password: "",
    },
    // enableReinitialize: true,
    onSubmit: handleFormSubmit,
    validationSchema: createSigninValidationSchema,
  });

  // `/signin?idp=<name>` starts that identity provider's sign-in immediately,
  // through the same path as clicking its button (the nonce is still created here).
  // Resolved once on mount: later URL rewrites must not start (or cancel) a redirect.
  const [autoStartIdp, setAutoStartIdp] = useState(() =>
    findAutoStartIdp({ identityProviders, idpParam, redirectReason: redirect_reason })
  );
  const hasStartedIdpRef = useRef(false);

  useEffect(() => {
    if (!autoStartIdp || hasStartedIdpRef.current) return;
    hasStartedIdpRef.current = true;

    async function autoStart(idp: IdentityProvider) {
      // A malformed or unknown destination falls back to the default page (e.g. `?destination=%25`,
      // which useSearchParams has already decoded to `%`).
      const validDestination = getValidDestination(destination);

      // Possibly already signed in (the refresh-token case the middleware lets through):
      // if the session can be refreshed, go to the destination instead of round-tripping
      // through the IdP; if not (e.g. a stale indicator cookie), continue with the IdP.
      if (Cookies.get(AUTH_INDICATOR_COOKIE) && (await refreshAuthWithTimeout())) {
        // Yield once so the refreshed cookies are in place before navigating (as src/api/client.ts does).
        await Promise.resolve();
        window.location.replace(validDestination ? decodeURIComponent(validDestination) : getInstancesRoute());
        return;
      }

      // Navigate without a click only to an http(s) endpoint (never e.g. `javascript:`). Checked
      // before handleIDPButtonClick, which saves the auth state and last-used login method.
      if (!isHttpUrl(idp.renderedAuthorizationEndpoint)) {
        throw new Error("Identity provider authorization URL is not http(s)");
      }

      const invitationInfo = buildInvitationInfo({
        email: searchParams?.get("email"),
        org: searchParams?.get("org"),
        orgUrl: searchParams?.get("orgUrl"),
      });

      handleIDPButtonClick({
        idp,
        // An invitation link's email takes precedence, so the IdP picks the invited account
        userEmail: invitationInfo.invitedEmail || getStoredLoginEmail(),
        destination: validDestination,
        invitationInfo,
        affiliateCode: searchParams?.get("affiliateCode"),
        // replace, so Back from the IdP doesn't land on `/signin?idp=` and bounce again
        onRedirect: (url) => window.location.replace(url),
        onSetLoginMethod: (method) => setLoginMethod(method),
      });
    }

    autoStart(autoStartIdp).catch((error) => {
      // Unexpected failure: show the normal sign-in form instead of a stuck "Redirecting…"
      console.warn("Failed to auto-start identity provider sign-in:", error);
      setAutoStartIdp(undefined);
    });
    /*eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, [autoStartIdp]);

  useEffect(() => {
    if (redirect_reason === "idp_auth_error") {
      snackbar.showError("Something went wrong. Please retry");

      if (destination) router.replace(`/signin?destination=${encodeURIComponent(destination)}`);
      else router.replace("/signin");
    }
    /*eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, [redirect_reason]);

  function handlePasswordSignInSuccess() {
    Cookies.remove("token"); // Clean up legacy cookie from pre-httpOnly migration

    try {
      localStorage.removeItem("loggedInUsingSSO");
    } catch (error) {
      console.warn("Failed to set SSO state:", error);
    }

    // Redirect to the destination; a malformed or unknown one (e.g. `?destination=%25`, already
    // decoded to `%`) falls back to the default page instead of throwing after a successful sign-in.
    // Use full page navigation to ensure middleware reads fresh auth cookies.
    const validDestination = getValidDestination(destination);
    window.location.href = validDestination ? decodeURIComponent(validDestination) : getInstancesRoute();
  }

  const passwordSignInMutation = useMutation({
    mutationFn: (payload) => {
      return customerUserSignin(payload);
    },
    onSuccess: () => {
      setLoginMethod({
        methodType: "Password",
      });

      if (window["Reo"]?.identify) {
        try {
          const identity = {
            username: formik.values.email,
            type: "email",
          };
          window["Reo"].identify(identity);
        } catch (error) {
          console.warn("Failed to identify user for analytics:", error);
        }
      } else {
        console.warn("Reo identify function is not available");
      }

      /*eslint-disable-next-line no-use-before-define*/
      formik.setFieldValue("password", "");
      /*eslint-disable-next-line no-use-before-define*/
      formik.setFieldTouched("password", false);

      handlePasswordSignInSuccess();
    },
    onError: (error: any) => {
      if (error.response.data && error.response.data.message) {
        const errorMessage = error.response.data.message;
        snackbar.showError(errorMessage);
      } else {
        snackbar.showError("Failed to sign in. Either the credentials are incorrect or the user does not exist");
      }
    },
  });

  async function handleFormSubmit(values) {
    const data = { ...values, email: values.email.trim() };

    const token = await getReCaptchaToken(reCaptchaRef.current);
    if (token) data["reCaptchaToken"] = token;

    passwordSignInMutation.mutate(data);
  }

  if (autoStartIdp) {
    return (
      <Text
        size="medium"
        weight="semibold"
        sx={{ color: "#414651", textAlign: "center", marginTop: "48px" }}
        data-testid="idp-auto-start-message"
      >
        Redirecting to sign in…
      </Text>
    );
  }

  return (
    <>
      {currentStep === 0 && (
        <EmailStep
          formData={formik}
          setCurrentStep={setCurrentStep}
          setShouldRememberLoginDetails={setShouldRememberLoginDetails}
          shouldRememberLoginDetails={shouldRememberLoginDetails}
        />
      )}
      <Stack component="form" gap="24px" mt="32px">
        {currentStep === 1 && (
          <LoginMethodStep
            formData={formik}
            setCurrentStep={setCurrentStep}
            identityProviders={identityProviders}
            isPasswordLoginEnabled={isPasswordLoginEnabled}
            isPasswordSignInLoading={passwordSignInMutation.isPending}
            isReCaptchaSetup={isReCaptchaSetup}
            isRecaptchaScriptLoaded={isRecaptchaScriptLoaded}
          />
        )}
        {isReCaptchaSetup && (
          // @ts-ignore
          <ReCAPTCHA
            size="invisible"
            sitekey={googleReCaptchaSiteKey}
            ref={reCaptchaRef}
            asyncScriptOnLoad={() => {
              setIsRecaptchaScriptLoaded(true);
            }}
            onErrored={() => {
              // Enable submit anyway so the server can decide whether a token is required
              setIsRecaptchaScriptLoaded(true);
            }}
          />
        )}
      </Stack>

      {environmentType === "PROD" && (
        <Text size="small" weight="regular" sx={{ color: "#535862", textAlign: "center", fontSize: "15px" }}>
          New {orgName ? `to ${orgName}` : "here"}?{" "}
          <Link href="/signup" style={{ color: "#364152", fontWeight: 600 }}>
            Sign up
          </Link>
        </Text>
      )}
    </>
  );
};

export default SignInForm;
