const withYaml = require("next-plugin-yaml");

const toOrigin = (value) => {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const analyticsOrigins = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://region1.google-analytics.com",
  "https://accounts.google.com",
  "https://www.google.com",
  "https://www.gstatic.com",
  "https://cdn.jsdelivr.net",
  "https://bat.bing.com",
];

const imageOrigins = ["https://avatars.githubusercontent.com", "https://githubusercontent.com", "https://c.clarity.ms", "https://perf-eu1.hsforms.com", "https://c.bing.com", "https://bat.bing.com", "https://track-eu1.hubspot.com"];

const runtimeOrigins = unique([
  toOrigin(process.env.NEXT_PUBLIC_BACKEND_BASE_DOMAIN),
  toOrigin(process.env.NEXT_PUBLIC_FALKORDB_API_BASE_URL),
  toOrigin(process.env.NEXT_PUBLIC_FALKORDB_LDAP_API_BASE_URL),
  toOrigin(process.env.NEXT_PUBLIC_GRAFANA_URL),
]);

const reoOrigins = process.env.NEXT_PUBLIC_REO_CLIENT_ID
  ? ["https://static.reo.dev", "https://api.reo.dev"]
  : [];

const additionalScriptSources = (process.env.CSP_SRC || "").trim();
const isAnalyticsEnabled = Boolean(process.env.GOOGLE_ANALYTICS_TAG_ID);

const buildCsp = ({ reportOnly = false } = {}) => {
  const scriptSrc = unique([
    "'self'",
    ...(isAnalyticsEnabled ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
    ...analyticsOrigins,
    ...reoOrigins,
    additionalScriptSources,
  ]);

  const strictConnectSrc = unique([
    "'self'",
    ...analyticsOrigins,
    ...reoOrigins,
    ...runtimeOrigins,
    "https:",
    "wss:",
  ]);

  const strictImgSrc = unique([
    "'self'",
    "data:",
    "blob:",
    ...analyticsOrigins,
    ...imageOrigins,
    ...reoOrigins,
    ...runtimeOrigins,
  ]);

  const strictFrameSrc = unique([
    "'self'",
    "https://www.googletagmanager.com",
    "https://www.google.com",
    "https://vercel.live",
    ...runtimeOrigins,
  ]);

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "worker-src 'self' https://www.google.com https://www.gstatic.com",
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    reportOnly ? `connect-src ${strictConnectSrc.join(" ")}` : "connect-src *",
    reportOnly ? `img-src ${strictImgSrc.join(" ")}` : "img-src * data:",
    reportOnly ? "media-src 'self' blob:" : "media-src *",
    reportOnly ? `frame-src ${strictFrameSrc.join(" ")}` : "frame-src *",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ];

  return directives.join("; ");
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["isomorphic-dompurify"],
  turbopack: {},
  async redirects() {
    return [
      {
        source: "/",
        destination: "/instances",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "accelerometer=(), camera=(), microphone=(), geolocation=(), gyroscope=(), magnetometer=(), usb=(), screen-wake-lock=()",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: buildCsp({ reportOnly: true }),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

module.exports = withYaml(nextConfig);
