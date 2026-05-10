import type { NextApiRequest, NextApiResponse } from "next";

import {
  COOKIE_NAME,
  INDICATOR_COOKIE_NAME,
  INDICATOR_MAX_AGE,
  isSecureCookie,
  maxAgeFromJWT,
  REFRESH_COOKIE_NAME,
  REFRESH_MAX_AGE,
} from "./authCookieConstants";

export { COOKIE_NAME, REFRESH_COOKIE_NAME };

/**
 * Optional shared cookie domain (e.g. ".falkordb.cloud").
 * When set, auth cookies are accessible to all subdomains under this domain,
 * which allows the Grafana iframe (on a sibling subdomain) to receive them.
 */
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

/**
 * Appends a Set-Cookie header without overwriting existing ones.
 * Next.js's res.setHeader("Set-Cookie", ...) overwrites previous values,
 * so we read existing cookies and append to the array.
 */
function appendSetCookieHeader(res: NextApiResponse, cookie: string) {
  const existing = res.getHeader("Set-Cookie");
  const cookies = Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : [];
  res.setHeader("Set-Cookie", [...cookies, cookie]);
}

/**
 * Clears a cookie WITHOUT a Domain attribute (host-only cookie).
 * Used to remove legacy cookies that were set before the domain-scoped cookie
 * migration so the browser stops sending duplicate cookies with the same name.
 */
function clearHostOnlyCookie(res: NextApiResponse, name: string, httpOnly = true) {
  const parts = [`${name}=`, `Path=/`, `SameSite=Lax`, `Max-Age=0`];
  if (httpOnly) parts.push("HttpOnly");
  if (isSecureCookie) parts.push("Secure");
  appendSetCookieHeader(res, parts.join("; "));
}

/**
 * Sets the httpOnly auth cookie on the response.
 * Max-Age is derived from the JWT's own `exp` claim so the cookie tracks
 * the backend's actual token lifetime (Dev = 15 min, Prod = longer).
 */
export function setAuthCookie(res: NextApiResponse, token: string) {
  // When switching to a domain-scoped cookie, clear the old host-only cookie
  // to prevent the browser from sending duplicate cookies with the same name.
  if (cookieDomain) clearHostOnlyCookie(res, COOKIE_NAME);

  const parts = [`${COOKIE_NAME}=${token}`, `Path=/`, `HttpOnly`, `SameSite=Lax`, `Max-Age=${maxAgeFromJWT(token)}`];
  if (cookieDomain) parts.push(`Domain=${cookieDomain}`);
  if (isSecureCookie) parts.push("Secure");

  appendSetCookieHeader(res, parts.join("; "));
}

/**
 * Sets the httpOnly refresh token cookie on the response.
 */
export function setRefreshCookie(res: NextApiResponse, refreshToken: string) {
  if (cookieDomain) clearHostOnlyCookie(res, REFRESH_COOKIE_NAME);

  const parts = [
    `${REFRESH_COOKIE_NAME}=${refreshToken}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${REFRESH_MAX_AGE}`,
  ];
  if (cookieDomain) parts.push(`Domain=${cookieDomain}`);
  if (isSecureCookie) parts.push("Secure");

  appendSetCookieHeader(res, parts.join("; "));
}

/**
 * Sets the non-httpOnly indicator cookie so client-side auth guards know the user is logged in.
 * Used by server-side auth handlers (idp-auth, signin) that redirect before client JS runs.
 */
export function setIndicatorCookie(res: NextApiResponse) {
  if (cookieDomain) clearHostOnlyCookie(res, "omnistrate_logged_in", false);

  // Not HttpOnly — must be readable by client-side JavaScript
  const parts = [`${INDICATOR_COOKIE_NAME}=true`, `Path=/`, `SameSite=Lax`, `Max-Age=${INDICATOR_MAX_AGE}`];
  if (cookieDomain) parts.push(`Domain=${cookieDomain}`);
  if (isSecureCookie) parts.push("Secure");

  appendSetCookieHeader(res, parts.join("; "));
}

/**
 * Clears the httpOnly auth cookie by setting Max-Age=0.
 */
export function clearAuthCookie(res: NextApiResponse) {
  // Also clear the old host-only cookie if we're using domain-scoped cookies
  if (cookieDomain) clearHostOnlyCookie(res, COOKIE_NAME);

  const parts = [`${COOKIE_NAME}=`, `Path=/`, `HttpOnly`, `SameSite=Lax`, `Max-Age=0`];
  if (cookieDomain) parts.push(`Domain=${cookieDomain}`);
  if (isSecureCookie) parts.push("Secure");

  appendSetCookieHeader(res, parts.join("; "));
}

/**
 * Clears the httpOnly refresh token cookie by setting Max-Age=0.
 */
export function clearRefreshCookie(res: NextApiResponse) {
  if (cookieDomain) clearHostOnlyCookie(res, REFRESH_COOKIE_NAME);

  const parts = [`${REFRESH_COOKIE_NAME}=`, `Path=/`, `HttpOnly`, `SameSite=Lax`, `Max-Age=0`];
  if (cookieDomain) parts.push(`Domain=${cookieDomain}`);
  if (isSecureCookie) parts.push("Secure");

  appendSetCookieHeader(res, parts.join("; "));
}

/**
 * Clears the non-httpOnly indicator cookie by setting Max-Age=0.
 * Must stay in lockstep with clearIndicatorCookieEdge.
 */
export function clearIndicatorCookie(res: NextApiResponse) {
  if (cookieDomain) clearHostOnlyCookie(res, INDICATOR_COOKIE_NAME, false);

  const parts = [`${INDICATOR_COOKIE_NAME}=`, `Path=/`, `SameSite=Lax`, `Max-Age=0`];
  if (cookieDomain) parts.push(`Domain=${cookieDomain}`);
  if (isSecureCookie) parts.push("Secure");

  appendSetCookieHeader(res, parts.join("; "));
}

// Request type that works with both Pages API routes and Edge middleware.
// Pages Router: req.cookies is a plain object { [name]: value }
// Edge Runtime: req.cookies is a RequestCookies with .get(name) method
type CookieRequest = NextApiRequest | { cookies: { get(name: string): { value: string } | undefined } };

/**
 * Reads the auth token from the request cookies.
 * Works with both Pages API routes (req.cookies is plain object) and Edge middleware (req.cookies.get()).
 */
export function getAuthToken(req: CookieRequest): string | undefined {
  if (
    req.cookies &&
    typeof req.cookies === "object" &&
    !("get" in req.cookies && typeof req.cookies.get === "function")
  ) {
    return (req.cookies as Record<string, string>)[COOKIE_NAME];
  }
  return (req.cookies as { get(name: string): { value: string } | undefined })?.get(COOKIE_NAME)?.value;
}

/**
 * Reads the refresh token from the request cookies.
 */
export function getRefreshToken(req: CookieRequest): string | undefined {
  if (
    req.cookies &&
    typeof req.cookies === "object" &&
    !("get" in req.cookies && typeof req.cookies.get === "function")
  ) {
    return (req.cookies as Record<string, string>)[REFRESH_COOKIE_NAME];
  }
  return (req.cookies as { get(name: string): { value: string } | undefined })?.get(REFRESH_COOKIE_NAME)?.value;
}
