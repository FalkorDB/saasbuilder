import Cookies from "js-cookie";

import { logoutBroadcastChannel } from "src/broadcastChannel";

import { AUTH_INDICATOR_COOKIE } from "./authIndicatorCookie";

const LOGOUT_REQUEST_TIMEOUT_MS = 5 * 1000;
const LOGOUT_REQUEST_ATTEMPTS = 2;

/**
 * Clears the client-side auth state shared by every logout path.
 */
export function clearClientAuthState() {
  Cookies.remove(AUTH_INDICATOR_COOKIE);
  try {
    localStorage.removeItem("paymentNotificationHidden");
    localStorage.removeItem("loggedInUsingSSO");
  } catch (error) {
    console.warn("Failed to clear local auth state:", error);
  }
}

/**
 * Broadcasts the logout so other open tabs/windows also log out.
 */
export function broadcastLogout() {
  if (logoutBroadcastChannel) {
    try {
      logoutBroadcastChannel.postMessage("logout");
    } catch (error) {
      console.warn("Failed to broadcast logout:", error);
    }
  }
}

/**
 * Asks the server to clear the httpOnly auth cookies. Each attempt is bounded by a
 * timeout so a hanging request can't keep the user on the protected page.
 */
async function requestServerLogout() {
  for (let attempt = 1; attempt <= LOGOUT_REQUEST_ATTEMPTS; attempt++) {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        keepalive: true,
        signal: AbortSignal.timeout(LOGOUT_REQUEST_TIMEOUT_MS),
      });
      if (response.ok) return;
    } catch {
      // Retry below; we're redirecting regardless once attempts run out.
    }
  }
}

/**
 * Clears the session and hard-navigates to /signin after an unrecoverable auth error.
 * The server must finish clearing the httpOnly cookies before /signin loads, because
 * the middleware bounces users with valid auth cookies away from /signin.
 */
export async function forceLogout() {
  await requestServerLogout();

  clearClientAuthState();
  broadcastLogout();

  // Use replace so /signin doesn't get added to history (Back would
  // land on the protected page and trigger another 401 bounce)
  window.location.replace("/signin");
}
