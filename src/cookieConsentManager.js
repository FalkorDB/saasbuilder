import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { clarity } from "react-microsoft-clarity";
import { loadReoScript } from 'reodotdev'
import { getHubSpotScriptSrc } from "src/hubspotConfig";

const HUBSPOT_COOKIES = ["__hstc", "__hssc", "__hssrc", "hubspotutk"];

export const getCookieConsentInitialObject = (googleAnalyticsTagID) => ({
  version: 2,
  consentGiven: false,
  categories: [
    {
      category: "necessary",
      services: [
        {
          type: "auth",
          name: "token",
          cookies: ["token"],
        },
        {
          type: "OAuth_providers",
          name: "OAuth",
        },
      ],
      hide: false,
      editable: false,
      enabled: true,
    },
    {
      category: "analytics",
      services: [
        {
          type: "script", // We still treat GA as a script category for handler logic
          name: "googletagmanager",
          gtag: googleAnalyticsTagID,
          cookies: ["_ga", "_ga_*", "_gid"],
          handleEnable: "addGoogleAnalytics",
          handleDisable: "removeGoogleAnalyticsScriptsAndCookies",
        },
        {
          // clarity
          type: "script",
          src: "https://cdn.clarity.ms/gdpr/consent.js",
          name: "clarity",
          "consent-category": "analytics",
          handleEnable: "addClarity",
          handleDisable: "removeClarity",
        },
        {
          type: "script",
          name: "hubspot",
          cookies: HUBSPOT_COOKIES,
          handleEnable: "addHubSpot",
          handleDisable: "removeHubSpot",
        },
      ],
      hide: false,
      editable: true,
      enabled: false, // user must opt-in to enable
    }
  ]
})

const handlerMap = {
  addGoogleAnalytics,
  removeGoogleAnalyticsScriptsAndCookies,
  addClarity,
  removeClarity,
  addHubSpot,
  removeHubSpot,
};

const googleConsentDenied = {
  ad_storage: "denied",
  analytics_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  functionality_storage: "denied",
  personalization_storage: "denied",
  security_storage: "granted",
};

const googleConsentGranted = {
  ad_storage: "granted",
  analytics_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
  functionality_storage: "granted",
  personalization_storage: "granted",
  security_storage: "granted",
};

function updateGoogleConsent(granted) {
  const consent = granted ? googleConsentGranted : googleConsentDenied;

  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", consent);
    return;
  }

  window.dataLayer.push(["consent", "update", consent]);
}

function addGoogleAnalytics() {
  if (!this.gtag || this.gtag.toLowerCase() === "undefined") return;

  updateGoogleConsent(true);

  const id = `gtm-script-${this.name}`;
  if (document.getElementById(id)) return; // Avoid duplicate GTM script

  // Prime dataLayer before loading GTM so startup events are captured.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });

  // Create GTM script dynamically
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${this.gtag}`;

  document.head.appendChild(script);

  script.onload = () => {
    console.info(`Google Tag Manager (${this.gtag}) installed.`);
    initializeGoogleAnalytics.call(this);
  };

  script.onerror = () => {
    console.error(`Failed to load GTM script (${this.gtag}).`);
  };
}

function initializeGoogleAnalytics() {
  if (!this.gtag || this.gtag.toLowerCase() === "undefined") return;

  const id = `gtm-noscript-${this.name}`;
  if (document.getElementById(id)) return; // Avoid duplicate noscript

  // Create a <noscript> element with the GTM iframe
  const noscript = document.createElement("noscript");
  noscript.id = id;

  const iframe = document.createElement("iframe");
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${this.gtag}`;
  iframe.height = "0";
  iframe.width = "0";
  iframe.style.display = "none";
  iframe.style.visibility = "hidden";

  noscript.appendChild(iframe);

  // Append <noscript> to <body>
  document.body.appendChild(noscript);

  console.info(`Google Tag Manager (noscript) initialized for ${this.gtag}.`);

  startReo()
}

const removeScript = (id) => {
  const script = document.getElementById(id);
  if (script) {
    script.parentNode.removeChild(script);
  }
};

const removeCookies = (cookieNames) => {
  cookieNames?.forEach((name) => {
    const allCookies = document.cookie.split("; ");
    const labels = location.hostname.split(".");
    // Also clear cookies set on parent domains (e.g. ".example.com"), where third-party trackers usually put them.
    const parentDomains = labels.length > 2 ? labels.slice(1, -1).map((_, i) => `.${labels.slice(i + 1).join(".")}`) : [];
    const domains = [location.hostname, ...parentDomains];
    const paths = ["/"];
    const deleteCookie = (cookieName) => {
      domains.forEach((domain) =>
        paths.forEach(
          (path) =>
            (document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}`)
        )
      );
    };
    if (name.includes("*")) {
      const regex = new RegExp(`^${name.replace("*", ".*")}`);
      allCookies.forEach((cookie) => {
        const cookieName = cookie.split("=")[0];
        if (regex.test(cookieName)) deleteCookie(cookieName);
      });
    } else {
      deleteCookie(name);
    }
  });
};

function removeGoogleAnalyticsScriptsAndCookies() {
  updateGoogleConsent(false);

  // Remove the main GTM <script> tag
  removeScript(`gtm-script-${this.name}`);

  // Remove the <noscript> iframe block
  const noscript = document.getElementById(`gtm-noscript-${this.name}`);
  if (noscript) {
    noscript.remove();
  }

  // Remove any related cookies
  if (this.cookies && Array.isArray(this.cookies)) {
    removeCookies(this.cookies);
  }

  // Clear GTM-related globals
  window.dataLayer = undefined;
  window.google_tag_manager = undefined;

  console.info(`Google Tag Manager (${this.gtag}) scripts and cookies removed.`);
}


function addClarity() {
  try {
    if (process.env.NEXT_PUBLIC_CLARITY_ID) {
      if (!clarity) return;
      clarity.init(process.env.NEXT_PUBLIC_CLARITY_ID);
      clarity.consent();
      const token = Cookies.get("token");
      if (token) {
        const payload = jwtDecode(token);
        if (payload.userID) {
          clarity.identify(payload.userID);
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}

function removeClarity() {
  try {
    if (clarity && typeof clarity.clear === "function") {
      clarity.clear();
    }
  } catch (error) {
    console.error(error);
  }
}

const HUBSPOT_SCRIPT_ID = "hs-script-loader";
let hubSpotReady = false;
let hubSpotEnabled = false;

const CREDENTIAL_ROUTE_REGEX = /^\/(change-password|reset-password|idp-auth|sign-in-with-idp)$/i;
const CREDENTIAL_QUERY_KEYS = [
  "email",
  "token",
  "code",
  "state",
  "invitation",
  "invite",
  "otp",
  "password",
  "access_token",
  "id_token",
];

// Returns the path to report to HubSpot, or null when the page must not be tracked.
const getHubSpotPagePath = (pathname) => {
  const path = typeof pathname === "string" && pathname ? pathname : window.location.pathname;
  if (isCredentialUrl({ pathname: path, searchParams: new URLSearchParams(window.location.search) })) return null;
  return path.startsWith("/") && !path.startsWith("//") ? path : null;
};

function isCredentialUrl(url) {
  const normalizedPath = url.pathname.replace(/\/+$/, "") || "/";
  return (
    CREDENTIAL_ROUTE_REGEX.test(normalizedPath) ||
    [...url.searchParams.keys()].some((key) => CREDENTIAL_QUERY_KEYS.includes(key.toLowerCase()))
  );
}

function referrerHasCredentials() {
  try {
    return Boolean(document.referrer) && isCredentialUrl(new URL(document.referrer));
  } catch {
    return false;
  }
}

function loadHubSpot(pagePath) {
  try {
    const src = getHubSpotScriptSrc(process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID, process.env.NEXT_PUBLIC_HUBSPOT_REGION);
    if (!src || !pagePath) return;
    // The loader reads document.referrer, which keeps the full URL for same-origin navigations (e.g. after the
    // SSO redirect from /idp-auth?code=...). Don't start tracking while the referrer carries credentials.
    if (!document.getElementById(HUBSPOT_SCRIPT_ID) && referrerHasCredentials()) return;
    hubSpotEnabled = true;

    // Consent is managed by our own banner, so suppress HubSpot's built-in banner
    window.disableHubSpotCookieBanner = true;
    window._hsp = window._hsp || [];
    window._hsq = window._hsq || [];

    const existing = document.getElementById(HUBSPOT_SCRIPT_ID);
    if (existing) {
      // The script stays in the page after opt-out (it cannot be unloaded), so re-enabling must reuse it
      // instead of injecting a second copy.
      window._hsq.push(["doNotTrack", { track: true }]);
      window._hsq.push(["setPath", pagePath]);
      if (hubSpotReady) window._hsq.push(["trackPageView"]);
      return;
    }

    window._hsq.push(["doNotTrack", { track: true }]);
    window._hsq.push(["setPath", pagePath]);

    const script = document.createElement("script");
    script.id = HUBSPOT_SCRIPT_ID;
    script.type = "text/javascript";
    script.async = true;
    script.defer = true;
    script.src = src;
    script.onerror = () => {
      hubSpotReady = false;
      hubSpotEnabled = false; // allow the next eligible navigation / consent change to retry loading
      script.remove();
      console.error("Failed to load HubSpot tracking script.");
    };
    script.onload = () => {
      if (document.getElementById(HUBSPOT_SCRIPT_ID) === script) hubSpotReady = true;
    };
    document.head.appendChild(script);
  } catch (error) {
    console.error(error);
  }
}

function addHubSpot() {
  // Handlers re-run on every consent change; only act on the disabled -> enabled transition.
  if (hubSpotEnabled) return;
  loadHubSpot(getHubSpotPagePath());
}

export function trackHubSpotPageView(pathname) {
  if (!hubSpotEnabled) {
    loadHubSpot(getHubSpotPagePath(pathname));
    return;
  }

  const pagePath = getHubSpotPagePath(pathname);
  if (!pagePath) {
    // Excluded (credential) page: suspend tracking, including a loader that is still initializing.
    // The next eligible navigation re-enables it through loadHubSpot().
    window._hsq?.push(["doNotTrack"]);
    hubSpotEnabled = false;
    return;
  }
  if (!window._hsq) return;

  window._hsq.push(["setPath", pagePath]);
  // Before onload the loader fires its own pageview for the current path, so only track once ready.
  if (hubSpotReady) window._hsq.push(["trackPageView"]);
}

// Query-only navigations (same pathname): suspend tracking if the URL now carries credentials, and resume it
// once it no longer does. No extra pageview is sent.
export function syncHubSpotQueryChange(pathname) {
  const pagePath = getHubSpotPagePath(pathname);
  if (!pagePath) {
    window._hsq?.push(["doNotTrack"]);
    hubSpotEnabled = false;
  } else if (!hubSpotEnabled) {
    loadHubSpot(pagePath);
  }
}

function removeHubSpot() {
  try {
    hubSpotEnabled = false;
    // Tracking is stopped via the HubSpot API and cookies are cleared; the already-executed script stays
    // in the page (removing the tag would not stop it, and re-adding it would duplicate it).
    window._hsq?.push(["doNotTrack"]);
    window._hsp?.push(["revokeCookieConsent"]);
    removeCookies(HUBSPOT_COOKIES);
  } catch (error) {
    console.error(error);
  }
}

function startReo() {
  const clientID = process.env.NEXT_PUBLIC_REO_CLIENT_ID;
  if (!clientID || clientID.toLowerCase() === "undefined") return;

  // Resolve promise to get access to methods on Reo
  const reoPromise = loadReoScript({ clientID });
  reoPromise
    .then(Reo => {
      Reo.init({ clientID });
    })
    .catch(error => {
      console.error('Error loading Reo', error);
    })
}

export const handleConsentChanges = (categories) => {
  for (const cat of categories) {
    for (const svc of cat.services) {
      if (svc.type == "script" && cat.enabled) {
        handlerMap[svc.handleEnable]?.call(svc);
      }
      if (svc.type == "script" && !cat.enabled) {
        handlerMap[svc.handleDisable]?.call(svc);
      }
    }
  }
};
