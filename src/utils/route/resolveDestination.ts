import checkRouteValidity from "./checkRouteValidity";

// C0 controls (incl. tab, LF, CR) and DEL
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

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

  // The URL parser deletes tabs/newlines anywhere and trims C0 controls and spaces at the ends
  // before resolving the path, so e.g. `.<TAB>.` would become `..` after this check. No real
  // destination contains them, so reject instead of trying to mirror that preprocessing.
  if (CONTROL_CHARS.test(decoded) || decoded.endsWith(" ")) return undefined;

  // Browsers normalize the path after this check: dot segments (`..`, `.`, and their `%2e` forms)
  // would turn e.g. `/instances/../../../api/provider-details` into `/api/provider-details`.
  return hasDotSegment(decoded) ? undefined : decoded;
}

// The segments the URL standard treats as `.` or `..` (ASCII case-insensitive)
const DOT_SEGMENTS = new Set([".", "%2e", "..", ".%2e", "%2e.", "%2e%2e"]);

function hasDotSegment(path: string): boolean {
  const end = path.search(/[?#]/);
  const pathOnly = end === -1 ? path : path.slice(0, end);
  return pathOnly.split("/").some((segment) => DOT_SEGMENTS.has(segment.toLowerCase()));
}
