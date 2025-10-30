import { clarity } from "react-microsoft-clarity";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { loadReoScript } from 'reodotdev'

export const getCookieConsentInitialObject = (googleAnalyticsTagID) => ({
  version: 1,
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
};

function addGoogleAnalytics() {
  if (!this.gtag || this.gtag.toLowerCase() === "undefined") return;

  const id = `gtm-script-${this.name}`;
  if (document.getElementById(id)) return; // Avoid duplicate GTM script

  // Create GTM script dynamically
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.text = `
    (function(w,d,s,l,i){
      w[l]=w[l]||[];
      w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),
          dl=l!='dataLayer'?'&l='+l:'';
      j.async=true;
      j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
      f.parentNode.insertBefore(j,f);
    })(window, document, 'script', 'dataLayer', '${this.gtag}');
  `;

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
    const domains = [location.hostname];
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
    if (clarity) {
      clarity.clear();
    }
  } catch (error) {
    console.error(error);
  }
}

function startReo() {
  // Declare clientID from environment variable or directly as string
  const clientID = process.env.NEXT_PUBLIC_REO_CLIENT_ID || "aa70f06a8dabbfd";

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
  for (let cat of categories) {
    for (let svc of cat.services) {
      if (svc.type == "script" && cat.enabled) {
        handlerMap[svc.handleEnable]?.call(svc);
      }
      if (svc.type == "script" && !cat.enabled) {
        handlerMap[svc.handleDisable]?.call(svc);
      }
    }
  }
};
