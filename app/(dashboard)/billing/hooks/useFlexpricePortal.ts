import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type FlexpricePortalStatus = {
  enabled: boolean;
};

type FlexpricePortalSession = {
  url: string;
  expiresAt: string;
};

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

export function useFlexpricePortalSession(enabled = false) {
  return useQuery({
    queryKey: ["flexprice-portal-session"],
    queryFn: async () => {
      const response = await axios.post<FlexpricePortalSession>("/api/flexprice-portal/session");
      return response.data;
    },
    enabled,
    // Session URLs carry a short-lived token, so never reuse one across page visits
    // and avoid refetching (which would reload the embedded portal) while it is valid
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
