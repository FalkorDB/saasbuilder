/**
 * Extracts both cloud and FalkorDB versions from a plan version name.
 * 
 * Expected patterns:
 * - "v0.1.1-v1.0.0-alpine" -> { cloudVersion: "v0.1.1", falkordbVersion: "v1.0.0-alpine" }
 * - "v0.1.1-v1.0.0" -> { cloudVersion: "v0.1.1", falkordbVersion: "v1.0.0" }
 * - "v1.0.0" -> { cloudVersion: "v1.0.0", falkordbVersion: "unknown" }
 * - "v1.0.0malformed" -> { cloudVersion: "unknown", falkordbVersion: "unknown" }
 * 
 * @param planVersionName - The full plan version name (e.g., "v0.1.1-v1.0.0-alpine")
 * @returns An object with cloudVersion and falkordbVersion, or "unknown" for each if not found
 * 
 * @example
 * extractAppVersion("v0.1.1-v1.0.0-alpine") // Returns { cloudVersion: "v0.1.1", falkordbVersion: "v1.0.0-alpine" }
 * extractAppVersion("v0.1.1-v1.0.0") // Returns { cloudVersion: "v0.1.1", falkordbVersion: "v1.0.0" }
 * extractAppVersion("v1.0.0") // Returns { cloudVersion: "v1.0.0", falkordbVersion: "unknown" }
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
  const fullPattern = /^(v\d+\.\d+\.\d+)-(.+)$/;
  const fullMatch = planVersionName.match(fullPattern);

  if (fullMatch && fullMatch[1] && fullMatch[2]) {
    return {
      cloudVersion: fullMatch[1],
      falkordbVersion: fullMatch[2],
    };
  }

  // Pattern to match cloud version only: vX.X.X
  const cloudOnlyPattern = /^(v\d+\.\d+\.\d+)$/;
  const cloudOnlyMatch = planVersionName.match(cloudOnlyPattern);

  if (cloudOnlyMatch && cloudOnlyMatch[1]) {
    return {
      cloudVersion: cloudOnlyMatch[1],
      falkordbVersion: "unknown",
    };
  }

  return { cloudVersion: "unknown", falkordbVersion: "unknown" };
};
