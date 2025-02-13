import { clarity } from "react-microsoft-clarity";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

export const cookieConsentInitialObject = {
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
          type: "script",
          src:
            "https://www.googletagmanager.com/gtag/js?id=" +
            process.env.GOOGLE_ANALYTICS_TAG_ID,
          name: "googletagmanager",
          "consent-category": "analytics",
          gtag: process.env.GOOGLE_ANALYTICS_TAG_ID,
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
      ],
      hide: false,
      editable: true,
      enabled: false,
    },
  ],
};

const handlerMap = {
  addGoogleAnalytics,
  removeGoogleAnalyticsScriptsAndCookies,
  addClarity,
  removeClarity,
};

function addGoogleAnalytics() {
  window[`ga-disable-${this.gtag}`] = false;
  const id = `script-${this.name}`;
  if (document.getElementById(id)) return; // Avoid duplicate scripts

  const script = document.createElement("script");
  script.src = this.src;
  script.id = id;
  script.async = true;
  document.head.appendChild(script);

  script.onload = () => {
    initializeGoogleAnalytics.call(this);
  };

  script.onerror = () => {
    console.error(`Failed to load script ${id}.`);
  };
}

function initializeGoogleAnalytics() {
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", this.gtag);
}

const removeScript = (id) => {
  const script = document.getElementById(id);
  if (script) {
    script.parentNode.removeChild(script);
  }
};

const removeCookies = (cookieNames) => {
  cookieNames.forEach((name) => {
    const allCookies = document.cookie.split("; "); // Get all cookies as an array of "key=value" strings
    const domains = [location.hostname]; // Current and parent domain
    const paths = ["/"]; // Default path

    if (name.includes("*")) {
      // Handle wildcard pattern
      const regex = new RegExp(`^${name.replace("*", ".*")}`);
      allCookies.forEach((cookie) => {
        const cookieName = cookie.split("=")[0];
        if (regex.test(cookieName)) {
          // Attempt deletion for all domain-path combinations
          domains.forEach((domain) => {
            paths.forEach((path) => {
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}`;
            });
          });
        }
      });
    } else {
      // Exact match removal
      domains.forEach((domain) => {
        paths.forEach((path) => {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}`;
        });
      });
    }
  });
};

function removeGoogleAnalyticsScriptsAndCookies() {
  removeScript(`script-${this.name}`);
  removeCookies(this.cookies);
  window[`ga-disable-${this.gtag}`] = true;
  window.dataLayer = undefined; // Clear global state
  window.gaGlobal = undefined;
  window.google_tag_data = undefined;
  window.google_tag_manager = undefined;
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
    if (clarity) {
      clarity.clear();
    }
  } catch (error) {
    console.error(error);
  }
}

export const handleConsentChanges = (categories) => {
  categories.forEach((cat) => {
    cat.services?.forEach((srv) => {
      if (srv.type === "script") {
        if (cat.enabled) {
          // Load script dynamically if category is enabled
          if (srv.handleEnable) handlerMap[srv.handleEnable]?.call(srv);
        } else {
          // Remove script and associated cookies if category is disabled
          if (srv.handleDisable) handlerMap[srv.handleDisable]?.call(srv);
        }
      }
    });
  });
};
