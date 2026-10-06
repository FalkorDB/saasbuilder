import getSafeExternalURL from "src/utils/getSafeExternalURL";

import { getSaaSDomainURL } from "../utils/getSaaSDomainURL";

//These apis are supposed to be used on the nextjs server only
//The Flexprice API key must never be exposed to the browser

const DEFAULT_FLEXPRICE_API_BASE_URL = "https://api.cloud.flexprice.io";
const REQUEST_TIMEOUT_MS = 10 * 1000;

// Same fallback as src/api/client.ts, read directly to keep client code out of the server bundle
const baseDomain = process.env.NEXT_PUBLIC_BACKEND_BASE_DOMAIN || "https://api.omnistrate.cloud";

export type FlexpricePortalSession = {
  token: string;
  url: string;
  expires_at: string;
};

export class FlexpriceError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "FlexpriceError";
    this.status = status;
  }
}

export function isFlexpriceEnabled() {
  return Boolean(process.env.FLEXPRICE_API_KEY);
}

// The API key is sent with every request, so only allow https (http allowed outside production)
function getFlexpriceBaseURL() {
  const baseURL = getSafeExternalURL(process.env.FLEXPRICE_API_BASE_URL || DEFAULT_FLEXPRICE_API_BASE_URL);
  if (!baseURL) {
    console.error("FLEXPRICE_API_BASE_URL must be a valid https url");
    throw new FlexpriceError("Billing portal is misconfigured");
  }

  return baseURL.replace(/\/+$/, "");
}

// Portal urls carry the session token, so they must always be https (no development exception)
function getHttpsOrigin(url?: string) {
  try {
    const parsedURL = url ? new URL(url.trim()) : null;
    return parsedURL?.protocol === "https:" ? parsedURL.origin.toLowerCase() : "";
  } catch {
    return "";
  }
}

function getOrigin(url?: string) {
  try {
    return url ? new URL(url).origin.toLowerCase() : "";
  } catch {
    return "";
  }
}

/**
 * Fetches a url and reads its body, both under the same timeout,
 * so a stalled response body also maps to a retryable 504.
 */
async function fetchWithTimeout(url: string, init: Parameters<typeof fetch>[1]) {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const body = await response.text();
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new FlexpriceError("Billing service timed out. Please retry", 504);
    }
    throw error;
  }
}

function parseJSON(body: string) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/**
 * The portal url is embedded in an iframe that allows scripts and same-origin access,
 * so it must be an https url that is never served from this application's origin.
 * When FLEXPRICE_PORTAL_ORIGIN is set, the url must also match it exactly.
 * Returns the reason when the url is rejected, so operators can fix the configuration.
 */
function validatePortalURL(url: string | undefined): { url: string } | { reason: string } {
  const portalOrigin = getHttpsOrigin(url);
  if (!portalOrigin) {
    return { reason: "Flexprice returned a portal url that is not a valid https url" };
  }

  const appOrigin = getOrigin(getSaaSDomainURL());
  if (!appOrigin) {
    return { reason: "YOUR_SAAS_DOMAIN_URL (or YOUR_SAAS_DOMAIN_ALIAS) must be set to validate the portal url" };
  }
  if (portalOrigin === appOrigin) {
    return { reason: "The Flexprice portal url must not be served from the application's origin" };
  }

  if (process.env.FLEXPRICE_PORTAL_ORIGIN) {
    // An invalid configured origin rejects every session instead of falling back
    const expectedOrigin = getHttpsOrigin(process.env.FLEXPRICE_PORTAL_ORIGIN);
    if (!expectedOrigin) {
      return { reason: "FLEXPRICE_PORTAL_ORIGIN must be a valid https origin" };
    }
    if (portalOrigin !== expectedOrigin) {
      return { reason: `The Flexprice portal url origin ${portalOrigin} does not match FLEXPRICE_PORTAL_ORIGIN` };
    }
  }

  return { url: new URL((url as string).trim()).toString() };
}

/**
 * Resolves the logged in customer's user id from their Omnistrate JWT.
 * The id is used as the Flexprice customer external_id.
 */
export async function getCustomerUserId(authToken: string): Promise<string> {
  const response = await fetchWithTimeout(`${baseDomain}/2022-09-01-00/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new FlexpriceError(
      response.status === 401 ? "Unauthorized" : "Failed to fetch user details",
      response.status === 401 ? 401 : 500
    );
  }

  const user = parseJSON(response.body);
  if (!user?.id) {
    throw new FlexpriceError("Failed to fetch user details");
  }

  return user.id;
}

/**
 * Generates a short-lived (1 hour) Flexprice customer portal session.
 * https://docs.flexprice.io/docs/customers/customer-portal#generating-a-portal-session
 */
export async function createFlexpricePortalSession(externalId: string): Promise<FlexpricePortalSession> {
  const response = await fetchWithTimeout(
    `${getFlexpriceBaseURL()}/v1/customers/portal/${encodeURIComponent(externalId)}`,
    {
      method: "GET",
      headers: {
        "x-api-key": process.env.FLEXPRICE_API_KEY as string,
      },
    }
  );

  if (!response.ok) {
    console.error("Flexprice portal session error", response.status, response.body);

    if (response.status === 404) {
      throw new FlexpriceError("Billing account not found", 404);
    }
    throw new FlexpriceError("Failed to create billing portal session");
  }

  const session = parseJSON(response.body) as FlexpricePortalSession | null;
  const result = validatePortalURL(session?.url);
  if ("reason" in result) {
    console.error(`Rejected Flexprice portal session: ${result.reason}`);
    throw new FlexpriceError("Failed to create billing portal session");
  }

  // The client schedules the session refresh from expires_at, so it must be a valid future time
  const expiresAt = Date.parse(session?.expires_at ?? "");
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    console.error("Rejected Flexprice portal session: expires_at is missing, invalid or in the past");
    throw new FlexpriceError("Failed to create billing portal session");
  }

  return { ...(session as FlexpricePortalSession), url: result.url };
}
