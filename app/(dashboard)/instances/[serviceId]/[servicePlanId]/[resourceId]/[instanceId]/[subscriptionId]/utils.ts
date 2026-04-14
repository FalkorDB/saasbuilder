import { RESOURCE_TYPES } from "src/constants/resource";

type GetTabsParams = {
  isMetricsEnabled: boolean | undefined;
  isLogsEnabled: boolean | undefined;
  isActive: boolean | undefined;
  isResourceBYOA: boolean;
  isCliManagedResource: boolean;
  productTierName: string | undefined;
  resourceType: string | undefined;
  isBackup: number | undefined;
  isCustomDNS: boolean;
  serviceModelType: string | undefined;
};

export const getTabs = ({
  isMetricsEnabled,
  isLogsEnabled,
  isActive,
  isResourceBYOA,
  isCliManagedResource,
  resourceType,
  isBackup,
  isCustomDNS,
  serviceModelType,
}: GetTabsParams) => {
  const tabs: Record<string, string | undefined> = {
    resourceInstanceDetails: "Instance Details",
    connectivity: "Connectivity",
    nodes: "Nodes",
  };
  if (isMetricsEnabled && !isResourceBYOA && !isCliManagedResource) tabs["metrics"] = "Metrics";
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
