import DOMPurify from "dompurify";

/**
 * Browser-only HTML sanitizer.
 *
 * On the server we return an empty string so that nothing unsanitized is ever
 * written to the SSR HTML stream. The component will re-render on the client
 * and sanitize properly there. This avoids pulling `isomorphic-dompurify`
 * (and its `jsdom` -> `html-encoding-sniffer` -> ESM-only `@exodus/bytes`
 * chain) into the server bundle, which currently breaks SSR with
 * ERR_REQUIRE_ESM.
 */
export const sanitizeHtml = (html: string | undefined | null): string => {
  if (!html) return "";
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html);
};
