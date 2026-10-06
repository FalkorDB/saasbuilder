import Cookies from "js-cookie";

import { logoutBroadcastChannel } from "src/broadcastChannel";

import { AUTH_INDICATOR_COOKIE } from "./client";

/**
 * Clears the session and hard-navigates to /signin, mirroring the logout
 * sequence in src/api/client.ts. A soft redirect is not enough because the
 * middleware bounces users with valid auth cookies away from /signin.
 */
export async function forceLogout() {
  try {
    await fetch("/api/logout", { method: "POST", keepalive: true });
  } catch {
    // Ignore — we're redirecting regardless.
  }

  Cookies.remove(AUTH_INDICATOR_COOKIE);
  try {
    localStorage.removeItem("paymentNotificationHidden");
    localStorage.removeItem("loggedInUsingSSO");
  } catch (error) {
    console.warn("Failed to clear local auth state:", error);
  }

  if (logoutBroadcastChannel) {
    try {
      logoutBroadcastChannel.postMessage("logout");
    } catch (error) {
      console.warn("Failed to broadcast logout:", error);
    }
  }

  window.location.replace("/signin");
}
