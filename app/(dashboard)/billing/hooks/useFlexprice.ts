import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { forceLogout } from "src/api/forceLogout";
import { refreshAuth } from "src/api/refreshAuth";
import type { FlexpriceUsage, FlexpriceUsageWindowSize } from "src/server/api/flexprice";
import { getBillingRoute } from "src/utils/routes";

type FlexpriceStatus = {
  enabled: boolean;
};

export type FlexpriceUsageParams = {
  startTime: string;
  endTime: string;
  windowSize: FlexpriceUsageWindowSize;
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

/**
 * Loads the customer's Flexprice usage cost, grouped by instance.
 */
export function useFlexpriceUsage(params: FlexpriceUsageParams, enabled = true) {
  return useQuery({
    queryKey: ["flexprice-usage", params],
    queryFn: async ({ signal }) => {
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
    },
    enabled,
    // Keep showing the previous range while a newly selected one loads
    placeholderData: (previousData) => previousData,
    retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 2,
  });
}
