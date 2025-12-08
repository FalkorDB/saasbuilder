/**
 * Extracts both cloud and FalkorDB versions from a plan version name.
 * 
 * Expected patterns:
 * - "v0.1.1-v1.0.0-alpine" -> { cloudVersion: "v0.1.1", falkordbVersion: "v1.0.0-alpine" }
 * - "v0.1.1-v1.0.0" -> { cloudVersion: "v0.1.1", falkordbVersion: "v1.0.0" }
 * - "v2.3.4-v5.6.7" -> { cloudVersion: "v2.3.4", falkordbVersion: "v5.6.7" }
 * 
 * @param planVersionName - The full plan version name (e.g., "v0.1.1-v1.0.0-alpine")
 * @returns An object with cloudVersion and falkordbVersion, or "unknown" for both if the pattern doesn't match
 * 
 * @example
 * extractAppVersion("v0.1.1-v1.0.0-alpine") // Returns { cloudVersion: "v0.1.1", falkordbVersion: "v1.0.0-alpine" }
 * extractAppVersion("v0.1.1-v1.0.0") // Returns { cloudVersion: "v0.1.1", falkordbVersion: "v1.0.0" }
 * extractAppVersion("invalid-format") // Returns { cloudVersion: "unknown", falkordbVersion: "unknown" }
 */
export const extractAppVersion = (
  planVersionName?: string
): { cloudVersion: string; falkordbVersion: string } => {
  if (!planVersionName || typeof planVersionName !== "string") {
    return { cloudVersion: "unknown", falkordbVersion: "unknown" };
  }

  // Pattern to match: vX.X.X-vX.X.X or vX.X.X-vX.X.X-suffix
  // Format is <cloud_version>-<falkordb_version>
  const pattern = /^(v\d+\.\d+\.\d+)-(.+)$/;
  const match = planVersionName.match(pattern);

  if (match && match[1] && match[2]) {
    return {
      cloudVersion: match[1],
      falkordbVersion: match[2],
    };
  }

  return { cloudVersion: "unknown", falkordbVersion: "unknown" };
};
