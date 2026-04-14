import { RESOURCE_TYPES } from "src/constants/resource";

const MIN_TIER_VERSION_FOR_USER_ACCESS = process.env.NEXT_PUBLIC_FALKORDB_LDAP_MIN_TIER_VERSION || "";

export const getTabs = (
  isMetricsEnabled,
  isLogsEnabled,
  isActive,
  isResourceBYOA,
  isCliManagedResource,
  resourceType,
  isBackup,
  isCustomDNS,
  tierVersion?: string,
  productTierName?: string
) => {
  const tabs: Record<string, string | undefined> = {
    resourceInstanceDetails: "Instance Details",
    connectivity: "Connectivity",
    nodes: "Nodes",
  };

  const isFreeTier = productTierName === "FalkorDB Free";
  if (isFreeTier && MIN_TIER_VERSION_FOR_USER_ACCESS && tierVersion && tierVersion > MIN_TIER_VERSION_FOR_USER_ACCESS) {
    tabs["userAccess"] = "User Access";
  }

  if (isMetricsEnabled && !isResourceBYOA && !isCliManagedResource) tabs["metrics"] = "Metrics";
  if (isLogsEnabled && !isResourceBYOA) tabs["logs"] = "Live Logs";

  if (!isActive || resourceType === RESOURCE_TYPES.Terraform) {
    delete tabs.connectivity;
    delete tabs.nodes;
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

export const checkCustomDNSEndpoint = (resources) => {
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
