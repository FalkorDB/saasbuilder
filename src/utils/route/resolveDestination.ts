import checkRouteValidity from "./checkRouteValidity";

/**
 * The page a `destination` query value leads to. Shared by the middleware (`proxy.js`) and the
 * sign-in page, so the same link resolves to the same page whether or not there's a session.
 *
 * Takes the value as `searchParams.get()` returns it (decoded once) and decodes it once more, as
 * the sign-in page always has. Returns undefined for absent, malformed (e.g. `%E0`) or unknown
 * values, so callers fall back to the default page.
 */
export function resolveDestination(value?: string | null): string | undefined {
  if (!value) return undefined;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return undefined;
  }

  return decoded.startsWith("/") && checkRouteValidity(decoded) ? decoded : undefined;
}
