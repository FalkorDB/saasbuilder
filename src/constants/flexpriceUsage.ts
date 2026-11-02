// Event properties the Flexprice usage breakdown can be grouped by
export const FLEXPRICE_USAGE_GROUP_BY_OPTIONS = [
  { key: "instance_id", label: "Instance ID" },
  { key: "cloud_provider", label: "Cloud Provider" },
  { key: "region", label: "Region" },
] as const;

export type FlexpriceUsageGroupByKey = (typeof FLEXPRICE_USAGE_GROUP_BY_OPTIONS)[number]["key"];

export const FLEXPRICE_USAGE_GROUP_BY_KEYS: readonly string[] = FLEXPRICE_USAGE_GROUP_BY_OPTIONS.map(({ key }) => key);
