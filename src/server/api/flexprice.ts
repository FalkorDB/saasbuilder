import { baseDomain } from "src/api/client";

//These apis are supposed to be used on the nextjs server only
//The Flexprice API key must never be exposed to the browser

const DEFAULT_FLEXPRICE_API_BASE_URL = "https://api.cloud.flexprice.io";

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

/**
 * Resolves the logged in customer's user id from their Omnistrate JWT.
 * The id is used as the Flexprice customer external_id.
 */
export async function getCustomerUserId(authToken: string): Promise<string> {
  const response = await fetch(`${baseDomain}/2022-09-01-00/user`, {
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
export async function createFlexpricePortalSession(externalId: string): Promise<FlexpricePortalSession> {
  const response = await fetch(`${getFlexpriceBaseURL()}/v1/customers/portal/${encodeURIComponent(externalId)}`, {
    method: "GET",
    headers: {
      "x-api-key": process.env.FLEXPRICE_API_KEY as string,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("Flexprice portal session error", response.status, text);

    if (response.status === 404) {
      throw new FlexpriceError("Billing account not found", 404);
    }
    throw new FlexpriceError("Failed to create billing portal session");
  }

  const session = (await response.json()) as FlexpricePortalSession;
  if (!session?.url) {
    throw new FlexpriceError("Failed to create billing portal session");
  }

  return session;
}
