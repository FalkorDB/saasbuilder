import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { forceLogout } from "src/api/forceLogout";
import { refreshAuth } from "src/api/refreshAuth";
import type { FlexpriceUsageGroupByKey } from "src/constants/flexpriceUsage";
import type { FlexpriceUsage, FlexpriceUsageWindowSize } from "src/server/api/flexprice";
import { getBillingRoute } from "src/utils/routes";

type FlexpriceStatus = {
  enabled: boolean;
};

export type FlexpriceUsageParams = {
  startTime: string;
  endTime: string;
  windowSize: FlexpriceUsageWindowSize;
  groupBy: FlexpriceUsageGroupByKey;
};

/**
 * Sends users to the Billing page when Flexprice handles billing, for legacy
 * Omnistrate usage pages that are hidden from the sidebar in that mode.
 */
export function useRedirectToBillingInFlexpriceMode() {
  const router = useRouter();
  const { data } = useFlexpriceStatus();
  const isFlexpriceEnabled = Boolean(data?.enabled);

  useEffect(() => {
    if (isFlexpriceEnabled) {
      router.replace(getBillingRoute());
    }
  }, [isFlexpriceEnabled, router]);

  return isFlexpriceEnabled;
}

export function useFlexpriceStatus() {
  return useQuery({
    queryKey: ["flexprice-status"],
    queryFn: async () => {
      const response = await axios.get<FlexpriceStatus>("/api/flexprice/status");
      return response.data;
    },
    staleTime: Infinity,
  });
}

const fetchUsage = async (params: FlexpriceUsageParams, signal: AbortSignal) => {
  const response = await axios.post<FlexpriceUsage>("/api/flexprice/usage", params, { signal });
  return response.data;
};

const isUnauthorized = (error: unknown) => axios.isAxiosError(error) && error.response?.status === 401;

// Retry network errors and server failures once; client errors and timeouts (already 10s) won't change
const isRetryable = (error: unknown) => {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === undefined || (status >= 500 && status !== 504);
};

async function fetchUsageWithAuthRecovery(params: FlexpriceUsageParams, signal: AbortSignal) {
  try {
    return await fetchUsage(params, signal);
  } catch (error) {
    if (!isUnauthorized(error)) throw error;

    // Follow the app's auth recovery: refresh the token and retry once, otherwise sign in again
    if (await refreshAuth()) {
      try {
        return await fetchUsage(params, signal);
      } catch (retryError) {
        if (!isUnauthorized(retryError)) throw retryError;
      }
    }
    // The user left the Billing page while recovering; don't log them out from elsewhere
    if (signal.aborted) throw error;

    await forceLogout();
    throw error;
  }
}

/**
 * Loads the customer's Flexprice usage cost, grouped by an event property.
 * The result includes the params it was loaded for, since a previous range
 * stays displayed while a newly selected one loads.
 */
export function useFlexpriceUsage(params: FlexpriceUsageParams, enabled = true) {
  return useQuery({
    queryKey: ["flexprice-usage", params],
    queryFn: async ({ signal }) => ({ ...(await fetchUsageWithAuthRecovery(params, signal)), params }),
    enabled,
    // Keep showing the previous range while a newly selected one loads
    placeholderData: (previousData) => previousData,
    retry: (failureCount, error) => isRetryable(error) && failureCount < 1,
  });
}
