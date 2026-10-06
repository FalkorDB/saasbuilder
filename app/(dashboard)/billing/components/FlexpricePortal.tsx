"use client";

import { useEffect } from "react";
import { Stack } from "@mui/material";
import axios from "axios";

import LoadingSpinner from "components/LoadingSpinner/LoadingSpinner";
import { DisplayText } from "components/Typography/Typography";

import { useFlexpricePortalSession } from "../hooks/useFlexpricePortal";

// Refresh the session slightly before the token expires
const SESSION_REFRESH_BUFFER_MS = 60 * 1000;

const FlexpricePortal = () => {
  const { data: session, isPending, error, refetch } = useFlexpricePortalSession(true);

  useEffect(() => {
    if (!session?.expiresAt) return;

    const refreshIn = new Date(session.expiresAt).getTime() - Date.now() - SESSION_REFRESH_BUFFER_MS;
    const timeout = setTimeout(() => refetch(), Math.max(refreshIn, 0));

    return () => clearTimeout(timeout);
  }, [session?.expiresAt, refetch]);

  if (isPending) return <LoadingSpinner />;

  if (error || !session?.url) {
    const message =
      (axios.isAxiosError(error) && error.response?.data?.message) ||
      "Something went wrong while loading the billing portal. Please retry";

    return (
      <Stack p={3} pt="200px" alignItems="center" justifyContent="center">
        <DisplayText
          // @ts-ignore
          size="xsmall"
          sx={{ wordBreak: "break-word", textAlign: "center", maxWidth: 900 }}
        >
          {message}
        </DisplayText>
      </Stack>
    );
  }

  return (
    <iframe
      src={session.url}
      title="Billing portal"
      className="w-full border-0 rounded-xl"
      style={{ height: "calc(100vh - 220px)", minHeight: "800px" }}
    />
  );
};

export default FlexpricePortal;
