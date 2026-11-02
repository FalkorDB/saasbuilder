import getSafeExternalURL from "src/utils/getSafeExternalURL";

//These apis are supposed to be used on the nextjs server only
//The Flexprice API key must never be exposed to the browser

const DEFAULT_FLEXPRICE_API_BASE_URL = "https://api.cloud.flexprice.io";
const REQUEST_TIMEOUT_MS = 10 * 1000;

// Same fallback as src/api/client.ts, read directly to keep client code out of the server bundle
const baseDomain = process.env.NEXT_PUBLIC_BACKEND_BASE_DOMAIN || "https://api.omnistrate.cloud";

export type FlexpriceUsageWindowSize = "HOUR" | "DAY";

export type FlexpriceUsagePoint = {
  timestamp: string;
  cost: number;
};

export type FlexpriceUsageGroup = {
  // null when the usage has no instance_id property
  instanceId: string | null;
  totalCost: number;
  // Only set when the group is billed by a single flat per-unit price
  unitPrice: number | null;
  unit: string | null;
  points: FlexpriceUsagePoint[];
};

export type FlexpriceUsage = {
  currency: string;
  totalCost: number;
  groups: FlexpriceUsageGroup[];
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
    throw new FlexpriceError("Billing is misconfigured");
  }

  return baseURL.replace(/\/+$/, "");
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

// Flexprice returns amounts as decimal strings
function toNumber(value: unknown) {
  const number = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : 0;
}

type UsageAnalyticsItem = {
  properties?: Record<string, string>;
  total_cost?: string;
  unit?: string;
  price?: { billing_model?: string; amount?: string } | null;
  points?: { timestamp?: string; cost?: string }[];
};

/**
 * Groups usage analytics items by their instance_id property.
 * Flexprice returns one item per feature and group, so an instance billed for
 * several features has several items whose costs and points are added together.
 */
function groupUsageByInstance(items: UsageAnalyticsItem[]): FlexpriceUsageGroup[] {
  const groups = new Map<string | null, { group: FlexpriceUsageGroup; items: UsageAnalyticsItem[] }>();

  items.forEach((item) => {
    const instanceId = item.properties?.instance_id || null;
    if (!groups.has(instanceId)) {
      groups.set(instanceId, {
        group: { instanceId, totalCost: 0, unitPrice: null, unit: null, points: [] },
        items: [],
      });
    }
    const entry = groups.get(instanceId)!;
    entry.items.push(item);
    entry.group.totalCost += toNumber(item.total_cost);
  });

  return Array.from(groups.values()).map(({ group, items }) => {
    const costByTimestamp = new Map<string, number>();
    items.forEach((item) => {
      item.points?.forEach((point) => {
        if (!point.timestamp) return;
        costByTimestamp.set(point.timestamp, (costByTimestamp.get(point.timestamp) || 0) + toNumber(point.cost));
      });
    });

    const [onlyItem] = items;
    const hasFlatUnitPrice = items.length === 1 && onlyItem.price?.billing_model === "FLAT_FEE";

    return {
      ...group,
      unitPrice: hasFlatUnitPrice ? toNumber(onlyItem.price?.amount) : null,
      unit: hasFlatUnitPrice ? onlyItem.unit || null : null,
      points: Array.from(costByTimestamp, ([timestamp, cost]) => ({ timestamp, cost })).sort((pointA, pointB) =>
        Date.parse(pointA.timestamp) < Date.parse(pointB.timestamp) ? -1 : 1
      ),
    };
  });
}

/**
 * Fetches the customer's usage cost between two times, grouped by instance.
 * https://docs.flexprice.io/api-reference/events/get-usage-analytics
 */
export async function getFlexpriceUsage(
  externalId: string,
  { startTime, endTime, windowSize }: { startTime: string; endTime: string; windowSize: FlexpriceUsageWindowSize }
): Promise<FlexpriceUsage> {
  const response = await fetchWithTimeout(`${getFlexpriceBaseURL()}/v1/events/analytics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.FLEXPRICE_API_KEY as string,
    },
    body: JSON.stringify({
      external_customer_id: externalId,
      start_time: startTime,
      end_time: endTime,
      window_size: windowSize,
      group_by: ["properties.instance_id"],
      expand: ["price"],
    }),
  });

  if (!response.ok) {
    console.error("Flexprice usage analytics error", response.status, response.body);

    if (response.status === 404) {
      throw new FlexpriceError("Billing account not found", 404);
    }
    throw new FlexpriceError("Failed to load usage");
  }

  const analytics = parseJSON(response.body);
  if (!analytics) {
    console.error("Flexprice usage analytics returned an invalid response");
    throw new FlexpriceError("Failed to load usage");
  }

  return {
    currency: typeof analytics.currency === "string" ? analytics.currency : "",
    totalCost: toNumber(analytics.total_cost),
    groups: groupUsageByInstance(Array.isArray(analytics.items) ? analytics.items : []),
  };
}
