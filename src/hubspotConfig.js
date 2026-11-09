// Shared by next.config.js (CSP) and src/cookieConsentManager.js (script loading).
// Plain CommonJS so it can be required from next.config.js.

const warnInvalid = (name, value) => {
  console.warn(`HubSpot tracking disabled: invalid ${name} "${value}".`);
  return null;
};

const getHubSpotConfig = (portalId, region) => {
  const id = String(portalId ?? "").trim();
  if (!id) return null; // not configured
  if (!/^\d+$/.test(id)) return warnInvalid("NEXT_PUBLIC_HUBSPOT_PORTAL_ID", id);

  const normalizedRegion = String(region ?? "")
    .trim()
    .toLowerCase();
  if (normalizedRegion && !/^[a-z0-9]+$/.test(normalizedRegion))
    return warnInvalid("NEXT_PUBLIC_HUBSPOT_REGION", normalizedRegion);

  return { id, suffix: !normalizedRegion || normalizedRegion === "na1" ? "" : `-${normalizedRegion}` };
};

const getHubSpotScriptSrc = (portalId, region) => {
  const config = getHubSpotConfig(portalId, region);
  return config ? `https://js${config.suffix}.hs-scripts.com/${config.id}.js` : null;
};

const getHubSpotCspOrigins = (portalId, region) => {
  const config = getHubSpotConfig(portalId, region);
  if (!config) return [];
  const { suffix } = config;
  return [
    `https://js${suffix}.hs-scripts.com`,
    `https://js${suffix}.hs-analytics.net`,
    `https://js${suffix}.hs-banner.com`,
    `https://js${suffix}.hscollectedforms.net`,
    `https://js${suffix}.hsadspixel.net`,
    `https://js${suffix}.hsleadflows.net`,
    `https://js${suffix}.usemessages.com`,
    `https://api${suffix}.usemessages.com`,
    `https://track${suffix}.hubspot.com`,
    `https://forms${suffix}.hscollectedforms.net`,
  ];
};

module.exports = { getHubSpotConfig, getHubSpotScriptSrc, getHubSpotCspOrigins };
