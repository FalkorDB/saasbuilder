import extractQueryParam from "src/constants/extractQueryParam";
import { IdentityProvider } from "src/types/identityProvider";
import getSafeExternalURL from "src/utils/getSafeExternalURL";
import { safeDecodeURIComponent } from "src/utils/safeDecodeURIComponent";

type InvitationInfo = {
  invitedEmail?: string;
  legalCompanyName?: string;
  companyUrl?: string;
};

type HandleIDPButtonClickParams = {
  idp: IdentityProvider;
  userEmail: string;
  destination?: string | null;
  invitationInfo: InvitationInfo;
  affiliateCode?: string | null;
  onRedirect: (url: string) => void;
  onSetLoginMethod?: (method: { methodType: string; idpName: string }) => void;
};

export function buildInvitationInfo(params: {
  email?: string | null;
  org?: string | null;
  orgUrl?: string | null;
}): InvitationInfo {
  const { email, org, orgUrl } = params;
  const info: InvitationInfo = {};

  if (email) {
    info.invitedEmail = safeDecodeURIComponent(email).trim();
  }
  if (org) {
    info.legalCompanyName = safeDecodeURIComponent(org).trim();
  }
  if (orgUrl) {
    info.companyUrl = safeDecodeURIComponent(orgUrl).trim();
  }

  return info;
}

export function handleIDPButtonClick(params: HandleIDPButtonClickParams) {
  const { idp, userEmail, destination, invitationInfo, affiliateCode, onRedirect, onSetLoginMethod } = params;

  const safeAuthorizationEndpoint = getSafeExternalURL(idp.renderedAuthorizationEndpoint);
  if (!safeAuthorizationEndpoint) {
    console.error("Blocked IdP sign-in: unsafe authorization URL");
    return;
  }

  const stateFromURL = extractQueryParam(safeAuthorizationEndpoint, "state");
  const state = idp.state;
  let redirectURL = safeAuthorizationEndpoint;

  if (!stateFromURL && state) {
    redirectURL += (redirectURL.includes("?") ? "&" : "?") + `state=${state}`;
  }
  if (userEmail?.trim()) {
    redirectURL += (redirectURL.includes("?") ? "&" : "?") + `login_hint=${encodeURIComponent(userEmail.trim())}`;
  }

  const localAuthState: {
    destination: string | undefined | null;
    identityProvider: string;
    invitationInfo: InvitationInfo;
    nonce?: string;
    affiliateCode?: string;
  } = {
    destination: destination,
    identityProvider: idp.name || idp.identityProviderName,
    invitationInfo,
  };

  if (stateFromURL || state) {
    localAuthState.nonce = stateFromURL || state;
  }
  if (affiliateCode) {
    localAuthState.affiliateCode = safeDecodeURIComponent(affiliateCode).trim();
  }

  const encodedLocalAuthState = Buffer.from(JSON.stringify(localAuthState), "utf8").toString("base64");
  sessionStorage.setItem("authState", encodedLocalAuthState);

  if (onSetLoginMethod) {
    onSetLoginMethod({
      methodType: idp.identityProviderName,
      idpName: idp.name,
    });
  }

  onRedirect(redirectURL);
}
