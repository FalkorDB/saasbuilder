import assert from "node:assert/strict";
import { test } from "node:test";

import { getTabs } from "./utils";

const base = {
  isMetricsEnabled: false,
  isLogsEnabled: false,
  isActive: true,
  isResourceBYOA: false,
  resourceType: undefined,
  isBackup: undefined,
  isCustomDNS: false,
  serviceModelType: undefined,
  enterpriseModuleEnabled: undefined,
};

// Each case qualifies for User Access on tier/version alone.
const qualifying = [
  { productTierName: "FalkorDB Free", tierVersion: "80.0" },
  { productTierName: "FalkorDB Startup", tierVersion: "58.0" },
  { productTierName: "FalkorDB Pro", tierVersion: "88.0" },
  { productTierName: "FalkorDB Enterprise", tierVersion: "1.0", enterpriseModuleEnabled: "true" },
];

for (const tier of qualifying) {
  for (const resourceName of ["Single-Zone", "Multi-Zone"]) {
    test(`hides User Access for ${resourceName} on ${tier.productTierName}`, () => {
      const tabs = getTabs({ ...base, ...tier, resourceName });
      assert.equal(tabs.userAccess, undefined);
    });
  }

  for (const resourceName of ["Standalone", "Cluster-Single-Zone", "Cluster-Multi-Zone", undefined]) {
    test(`keeps User Access for ${resourceName ?? "unknown resource"} on ${tier.productTierName}`, () => {
      const tabs = getTabs({ ...base, ...tier, resourceName });
      assert.equal(tabs.userAccess, "User Access");
    });
  }
}

test("does not add User Access below the tier's minimum version", () => {
  const tabs = getTabs({ ...base, productTierName: "FalkorDB Pro", tierVersion: "87.0", resourceName: "Standalone" });
  assert.equal(tabs.userAccess, undefined);
});
