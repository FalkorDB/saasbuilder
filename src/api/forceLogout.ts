import Cookies from "js-cookie";

import { logoutBroadcastChannel } from "src/broadcastChannel";

import { AUTH_INDICATOR_COOKIE } from "./authIndicatorCookie";

/**
 * Clears the session and hard-navigates to /signin after an unrecoverable auth error.
 * The server must finish clearing the httpOnly cookies before /signin loads, because
 * the middleware bounces users with valid auth cookies away from /signin.
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

  // Broadcast so other open tabs/windows also log out
  if (logoutBroadcastChannel) {
    try {
      logoutBroadcastChannel.postMessage("logout");
    } catch (error) {
      console.warn("Failed to broadcast logout:", error);
    }
  }

  // Use replace so /signin doesn't get added to history (Back would
  // land on the protected page and trigger another 401 bounce)
  window.location.replace("/signin");
}
