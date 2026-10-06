import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { forceLogout } from "src/api/forceLogout";
import { refreshAuth } from "src/api/refreshAuth";
import { getBillingRoute } from "src/utils/routes";

type FlexpricePortalStatus = {
  enabled: boolean;
};

type FlexpricePortalSession = {
  url: string;
  expiresAt: string;
};

/**
 * Sends users to the Billing page when Flexprice handles billing, for legacy
 * Omnistrate billing pages that are hidden from the sidebar in that mode.
 */
export function useRedirectToBillingInFlexpriceMode() {
  const router = useRouter();
  const { data } = useFlexpricePortalStatus();
  const isFlexpriceEnabled = Boolean(data?.enabled);

  useEffect(() => {
    if (isFlexpriceEnabled) {
      router.replace(getBillingRoute());
    }
  }, [isFlexpriceEnabled, router]);

  return isFlexpriceEnabled;
}

export function useFlexpricePortalStatus() {
  return useQuery({
    queryKey: ["flexprice-portal-status"],
    queryFn: async () => {
      const response = await axios.get<FlexpricePortalStatus>("/api/flexprice-portal/status");
      return response.data;
    },
    staleTime: Infinity,
  });
}

const createSession = async () => {
  const response = await axios.post<FlexpricePortalSession>("/api/flexprice-portal/session");
  return response.data;
};

const isUnauthorized = (error: unknown) => axios.isAxiosError(error) && error.response?.status === 401;

export function useFlexpricePortalSession(enabled = false) {
  return useQuery({
    queryKey: ["flexprice-portal-session"],
    queryFn: async () => {
      try {
        return await createSession();
      } catch (error) {
        if (!isUnauthorized(error)) throw error;

        // Follow the app's auth recovery: refresh the token and retry once, otherwise sign in again
        if (await refreshAuth()) {
          try {
            return await createSession();
          } catch (retryError) {
            if (!isUnauthorized(retryError)) throw retryError;
          }
        }
        await forceLogout();
        throw error;
      }
    },
    enabled,
    // Session URLs carry a short-lived token, so never reuse one across page visits
    // and avoid refetching (which would reload the embedded portal) while it is valid
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    // Every request creates a new portal session, so don't retry automatically
    retry: false,
  });
}
