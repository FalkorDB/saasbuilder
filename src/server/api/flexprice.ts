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

function getFlexpriceBaseURL() {
  return (process.env.FLEXPRICE_API_BASE_URL || DEFAULT_FLEXPRICE_API_BASE_URL).replace(/\/+$/, "");
}

function getOrigin(url?: string) {
  try {
    return url ? new URL(url).origin.toLowerCase() : "";
  } catch {
    return "";
  }
}

async function fetchWithTimeout(url: string, init: Parameters<typeof fetch>[1]) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new FlexpriceError("Billing service timed out. Please retry", 504);
    }
    throw error;
  }
}

/**
 * The portal url is embedded in an iframe that allows scripts and same-origin access,
 * so it must be an https url that is not served from this application's origin.
 * When FLEXPRICE_PORTAL_ORIGIN is set, the url must match it exactly.
 */
function getSafePortalURL(url: string | undefined, requestHost?: string) {
  const safeURL = getSafeExternalURL(url);
  if (!safeURL) return "";

  const portalOrigin = getOrigin(safeURL);
  const expectedOrigin = getOrigin(process.env.FLEXPRICE_PORTAL_ORIGIN);
  if (expectedOrigin) {
    return portalOrigin === expectedOrigin ? safeURL : "";
  }

  const appOrigins = [
    requestHost && `https://${requestHost}`,
    requestHost && `http://${requestHost}`,
    getSaaSDomainURL(),
  ]
    .map(getOrigin)
    .filter(Boolean);

  return appOrigins.includes(portalOrigin) ? "" : safeURL;
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

  const user = await response.json();
  if (!user?.id) {
    throw new FlexpriceError("Failed to fetch user details");
  }

  return user.id;
}

/**
 * Generates a short-lived (1 hour) Flexprice customer portal session.
 * https://docs.flexprice.io/docs/customers/customer-portal#generating-a-portal-session
 */
export async function createFlexpricePortalSession(
  externalId: string,
  requestHost?: string
): Promise<FlexpricePortalSession> {
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
    const text = await response.text().catch(() => "");
    console.error("Flexprice portal session error", response.status, text);

    if (response.status === 404) {
      throw new FlexpriceError("Billing account not found", 404);
    }
    throw new FlexpriceError("Failed to create billing portal session");
  }

  const session = (await response.json()) as FlexpricePortalSession;
  const safeURL = getSafePortalURL(session?.url, requestHost);
  if (!safeURL) {
    console.error("Flexprice portal session returned an invalid url");
    throw new FlexpriceError("Failed to create billing portal session");
  }

  return { ...session, url: safeURL };
}
