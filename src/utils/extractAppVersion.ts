/**
 * Extracts the app version from a plan version name.
 * 
 * Expected patterns:
 * - "v0.1.1-v1.0.0-alpine" -> "v1.0.0-alpine"
 * - "v0.1.1-v1.0.0" -> "v1.0.0"
 * - "v2.3.4-v5.6.7" -> "v5.6.7"
 * 
 * @param planVersionName - The full plan version name (e.g., "v0.1.1-v1.0.0-alpine")
 * @returns The extracted app version or "unknown" if the pattern doesn't match
 * 
 * @example
 * extractAppVersion("v0.1.1-v1.0.0-alpine") // Returns "v1.0.0-alpine"
 * extractAppVersion("v0.1.1-v1.0.0") // Returns "v1.0.0"
 * extractAppVersion("invalid-format") // Returns "unknown"
 */
export const extractAppVersion = (planVersionName?: string): string => {
  if (!planVersionName || typeof planVersionName !== "string") {
    return "unknown";
  }

  // Pattern to match: vX.X.X-vX.X.X or vX.X.X-vX.X.X-suffix
  // We want to extract everything after the first version (the second 'v' onwards)
  const pattern = /^v\d+\.\d+\.\d+-(.+)$/;
  const match = planVersionName.match(pattern);

  if (match && match[1]) {
    return match[1];
  }

  return "unknown";
};
