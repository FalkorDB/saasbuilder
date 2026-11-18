const { getHubSpotCspOrigins } = require("../../hubspotConfig");

// Fork-specific script origins (HubSpot, Reo, Bing, CSP_SRC). With a nonce the policy uses
// 'strict-dynamic', so these only matter for the nonce-less policy and for older browsers.
const getAdditionalScriptOrigins = () =>
  [
    "https://bat.bing.com",
    ...(process.env.NEXT_PUBLIC_REO_CLIENT_ID ? ["https://static.reo.dev"] : []),
    ...getHubSpotCspOrigins(process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID, process.env.NEXT_PUBLIC_HUBSPOT_REGION),
    (process.env.CSP_SRC || "").trim(),
  ]
    .filter(Boolean)
    .map((origin) => ` ${origin}`)
    .join("");

const buildContentSecurityPolicy = (nonce) => {
  const scriptNonce = nonce ? ` 'nonce-${nonce}' 'strict-dynamic'` : "";
  const inlineScript = nonce ? "" : " 'unsafe-inline'";
  // next dev needs eval; production pages do not
  const evalScript = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

  return `default-src 'self'; script-src 'self'${scriptNonce} https://www.googletagmanager.com https://accounts.google.com/gsi/client https://www.google.com https://www.gstatic.com https://js.stripe.com${getAdditionalScriptOrigins()}${evalScript}${inlineScript} https://cdn.jsdelivr.net; worker-src 'self' blob: https://www.google.com https://www.gstatic.com; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; connect-src *; img-src * data:; media-src *; frame-src * https://js.stripe.com https://hooks.stripe.com; object-src 'none'; form-action 'self'; base-uri 'self'`;
};

module.exports = { buildContentSecurityPolicy };
