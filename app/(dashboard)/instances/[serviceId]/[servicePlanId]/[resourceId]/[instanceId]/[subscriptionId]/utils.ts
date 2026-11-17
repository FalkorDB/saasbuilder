import { RESOURCE_TYPES } from "src/constants/resource";

const LDAP_MIN_TIER_VERSION_FREE = process.env.LDAP_MIN_TIER_VERSION_FREE || "80.0";
const LDAP_MIN_TIER_VERSION_STARTUP = process.env.LDAP_MIN_TIER_VERSION_STARTUP || "58.0";
const LDAP_MIN_TIER_VERSION_PRO = process.env.LDAP_MIN_TIER_VERSION_PRO || "88.0";
const LDAP_MIN_TIER_VERSION_ENTERPRISE = process.env.LDAP_MIN_TIER_VERSION_ENTERPRISE || "105.0";

// Sentinel-based deployments need a higher Pro version; Enterprise uses its regular minimum.
const LDAP_SENTINEL_RESOURCES = ["Single-Zone", "Multi-Zone"];
const LDAP_SENTINEL_MIN_TIER_VERSION_PRO = process.env.LDAP_SENTINEL_MIN_TIER_VERSION_PRO || "103.0";

// Compares dotted numeric versions ("101.0" vs "88.0") segment by segment.
// Plain string comparison is lexicographic and gets multi-digit majors wrong.
export const isVersionAtLeast = (version: string, min: string) => {
  const a = version.split(".").map(Number);
  const b = min.split(".").map(Number);
  if ([...a, ...b].some(Number.isNaN)) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return true;
};

type GetTabsParams = {
  isMetricsEnabled: boolean | undefined;
  isLogsEnabled: boolean | undefined;
  isActive: boolean | undefined;
  isResourceBYOA: boolean;
  productTierName: string | undefined;
  tierVersion: string | undefined;
  resourceType: string | undefined;
  resourceName: string | undefined;
  isBackup: number | undefined;
  isCustomDNS: boolean;
  serviceModelType: string | undefined;
  enterpriseModuleEnabled: string | undefined;
};

export const getTabs = ({
  isMetricsEnabled,
  isLogsEnabled,
  isActive,
  isResourceBYOA,
  resourceType,
  resourceName,
  isBackup,
  isCustomDNS,
  serviceModelType,
  tierVersion,
  productTierName,
  enterpriseModuleEnabled,
}: GetTabsParams) => {
  const tabs: Record<string, string | undefined> = {
    resourceInstanceDetails: "Instance Details",
    connectivity: "Connectivity",
    nodes: "Nodes",
  };

  if (tierVersion) {
    if (
      (productTierName === "FalkorDB Free" && isVersionAtLeast(tierVersion, LDAP_MIN_TIER_VERSION_FREE)) ||
      (productTierName === "FalkorDB Startup" && isVersionAtLeast(tierVersion, LDAP_MIN_TIER_VERSION_STARTUP)) ||
      (productTierName === "FalkorDB Pro" && isVersionAtLeast(tierVersion, LDAP_MIN_TIER_VERSION_PRO)) ||
      (productTierName === "FalkorDB Enterprise" &&
        enterpriseModuleEnabled &&
        isVersionAtLeast(tierVersion, LDAP_MIN_TIER_VERSION_ENTERPRISE))
    ) {
      tabs["userAccess"] = "User Access";
    }
  }
  if (resourceName && LDAP_SENTINEL_RESOURCES.includes(resourceName)) {
    const sentinelSupported =
      productTierName === "FalkorDB Enterprise" ||
      (productTierName === "FalkorDB Pro" &&
        !!tierVersion &&
        isVersionAtLeast(tierVersion, LDAP_SENTINEL_MIN_TIER_VERSION_PRO));
    if (!sentinelSupported) delete tabs.userAccess;
  }

  if (isMetricsEnabled && !isResourceBYOA) tabs["metrics"] = "Metrics";

  if (isLogsEnabled && !isResourceBYOA) tabs["logs"] = "Live Logs";

  if (!isActive || resourceType === RESOURCE_TYPES.Terraform) {
    delete tabs.connectivity;
    delete tabs.nodes;
  }
  if (serviceModelType === "ON_PREM") {
    tabs["installerHub"] = "Installer Hub";
  }

  tabs["auditLogs"] = "Audit Logs";
  if (isBackup) {
    tabs["backups"] = "Backups";
    tabs["snapshots"] = "Snapshots";
  }
  if (isCustomDNS) {
    tabs["customDNS"] = "Custom DNS";
  }

  tabs["importExportRDB"] = "Import/Export RDB";

  return tabs;
};

type CustomDNSEndpoint = {
  enabled?: boolean;
};

type CustomDNSResources = {
  primary?: { customDNSEndpoint?: CustomDNSEndpoint };
  others?: Array<{ customDNSEndpoint?: CustomDNSEndpoint }>;
};

export const checkCustomDNSEndpoint = (resources: CustomDNSResources): boolean => {
  if (resources.primary?.customDNSEndpoint && resources.primary?.customDNSEndpoint.enabled === true) {
    return true;
  }

  if (Array.isArray(resources.others)) {
    return resources.others.some(
      (resource) => resource.customDNSEndpoint && resource.customDNSEndpoint.enabled === true
    );
  }

  return false;
};
