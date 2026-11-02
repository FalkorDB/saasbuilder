import { useEffect, useRef } from "react";
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

const createSession = async (signal: AbortSignal) => {
  const response = await axios.post<FlexpricePortalSession>("/api/flexprice-portal/session", undefined, { signal });
  return response.data;
};

const isUnauthorized = (error: unknown) => axios.isAxiosError(error) && error.response?.status === 401;

const createSessionWithAuthRecovery = async (signal: AbortSignal) => {
  try {
    return await createSession(signal);
  } catch (error) {
    if (!isUnauthorized(error)) throw error;

    // Follow the app's auth recovery: refresh the token and retry once, otherwise sign in again
    if (await refreshAuth()) {
      try {
        return await createSession(signal);
      } catch (retryError) {
        if (!isUnauthorized(retryError)) throw retryError;
      }
    }
    // The user left the Billing page while recovering; don't log them out from elsewhere
    if (signal.aborted) throw error;

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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Abandon a pending session request when the user leaves the page
  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const mutation = useMutation({
    mutationFn: async ({ portalTab, signal }: { portalTab: Window; signal: AbortSignal }) => {
      try {
        const session = await createSessionWithAuthRecovery(signal);
        // The portal must not be able to navigate the dashboard
        portalTab.opener = null;
        portalTab.location.href = session.url;
      } catch (error) {
        portalTab.close();
        throw error;
      }
    },
    onError: (error, { signal }) => {
      if (signal.aborted) return;

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
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    mutation.mutate({ portalTab, signal: abortControllerRef.current.signal });
  };

  return { openPortal, isOpening: mutation.isPending };
}
