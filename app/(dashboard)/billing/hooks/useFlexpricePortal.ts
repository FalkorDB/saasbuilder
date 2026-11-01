import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
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
 * Omnistrate usage pages that are hidden from the sidebar in that mode.
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

const createSessionWithAuthRecovery = async () => {
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
};

/**
 * Opens the Flexprice customer portal in a new tab.
 * Flexprice doesn't allow the portal to be framed, and session urls carry a
 * short-lived token, so a new session is created on every click.
 */
export function useOpenFlexpricePortal({ onError }: { onError: (message: string) => void }) {
  const mutation = useMutation({
    mutationFn: async (portalTab: Window) => {
      try {
        const session = await createSessionWithAuthRecovery();
        // The portal must not be able to navigate the dashboard
        portalTab.opener = null;
        portalTab.location.href = session.url;
      } catch (error) {
        portalTab.close();
        throw error;
      }
    },
    onError: (error) => {
      onError(
        (axios.isAxiosError(error) && error.response?.data?.message) ||
          "Failed to open the billing portal. Please retry"
      );
    },
  });

  // Must be called from a click handler: the tab is opened synchronously so popup blockers allow it
  const openPortal = () => {
    const portalTab = window.open("", "_blank");
    if (!portalTab) {
      onError("Please allow popups to open the billing portal");
      return;
    }
    mutation.mutate(portalTab);
  };

  return { openPortal, isOpening: mutation.isPending };
}
