"use client";

import { useCallback, useEffect } from "react";
import { Stack } from "@mui/material";
import axios from "axios";

import Button from "components/Button/Button";
import LoadingSpinner from "components/LoadingSpinner/LoadingSpinner";
import { DisplayText, Text } from "components/Typography/Typography";

import { useFlexpricePortalSession } from "../hooks/useFlexpricePortal";

// Refresh the session slightly before the token expires
const SESSION_REFRESH_BUFFER_MS = 60 * 1000;

const getErrorMessage = (error: Error | null) =>
  (axios.isAxiosError(error) && error.response?.data?.message) ||
  "Something went wrong while loading the billing portal. Please retry";

const FlexpricePortal = () => {
  const { data: session, isPending, isFetching, error, refetch } = useFlexpricePortalSession(true);

  // Every refetch creates a new portal session, so join an in-flight request instead of starting another
  const refresh = useCallback(() => refetch({ cancelRefetch: false }), [refetch]);

  useEffect(() => {
    if (!session?.expiresAt) return;

    const getRefreshIn = () => new Date(session.expiresAt).getTime() - Date.now() - SESSION_REFRESH_BUFFER_MS;
    const timeout = setTimeout(refresh, Math.max(getRefreshIn(), 0));

    // Timers are throttled in hidden tabs and paused while the device sleeps,
    // so re-check the expiry when the tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && getRefreshIn() <= 0) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session?.expiresAt, refresh]);

  if (isPending) return <LoadingSpinner />;

  const retryButton = (
    <Button variant="contained" onClick={refresh} disabled={isFetching}>
      Retry
    </Button>
  );

  if (!session?.url) {
    return (
      <Stack p={3} pt="200px" gap="24px" alignItems="center" justifyContent="center">
        <DisplayText
          // @ts-ignore
          size="xsmall"
          sx={{ wordBreak: "break-word", textAlign: "center", maxWidth: 900 }}
        >
          {getErrorMessage(error)}
        </DisplayText>
        {retryButton}
      </Stack>
    );
  }

  return (
    <>
      {/* A failed background refresh keeps the current portal and offers a manual retry */}
      {error && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap="16px" mb={2}>
          <Text size="small" weight="medium" color="#B42318">
            {getErrorMessage(error)}
          </Text>
          {retryButton}
        </Stack>
      )}
      <iframe
        src={session.url}
        title="Billing portal"
        // Hosted checkout and card forms open in a new tab; block top-level navigation of the dashboard
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        referrerPolicy="no-referrer"
        className="w-full border-0 rounded-xl"
        style={{ height: "calc(100vh - 220px)", minHeight: "800px" }}
      />
    </>
  );
};

export default FlexpricePortal;
