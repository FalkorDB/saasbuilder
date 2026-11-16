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

  if (!decoded.startsWith("/") || !checkRouteValidity(decoded)) return undefined;

  // Browsers normalize the path after this check: dot segments (`..`, `.`, and their `%2e` forms)
  // would turn e.g. `/instances/../../../api/provider-details` into `/api/provider-details`. Accept
  // only a path the URL parser leaves exactly as validated.
  return isNormalizedPath(decoded) ? decoded : undefined;
}

const PLACEHOLDER_ORIGIN = "https://destination.invalid";

function isNormalizedPath(path: string): boolean {
  try {
    const url = new URL(path, PLACEHOLDER_ORIGIN);
    const end = path.search(/[?#]/);
    return url.origin === PLACEHOLDER_ORIGIN && url.pathname === (end === -1 ? path : path.slice(0, end));
  } catch {
    return false;
  }
}
