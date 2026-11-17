import assert from "node:assert/strict";
import { test } from "node:test";

import { getTabs, isVersionAtLeast } from "./utils";

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
  { productTierName: "FalkorDB Pro", tierVersion: "103.0" },
  { productTierName: "FalkorDB Enterprise", tierVersion: "105.0", enterpriseModuleEnabled: "true" },
];

for (const tier of qualifying) {
  // Pro and Enterprise also qualify on sentinel; covered by sentinelCases below.
  const sentinelTier = ["FalkorDB Pro", "FalkorDB Enterprise"].includes(tier.productTierName);
  for (const resourceName of sentinelTier ? [] : ["Single-Zone", "Multi-Zone"]) {
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

// On sentinel deployments Pro and Enterprise follow their regular minimums; Free and Startup never qualify.
const sentinelCases = [
  { productTierName: "FalkorDB Pro", tierVersion: "103.0", expected: "User Access" },
  { productTierName: "FalkorDB Pro", tierVersion: "110.0", expected: "User Access" },
  { productTierName: "FalkorDB Pro", tierVersion: "102.9", expected: undefined },
  { productTierName: "FalkorDB Enterprise", tierVersion: "105.0", enterpriseModuleEnabled: "true", expected: "User Access" },
  { productTierName: "FalkorDB Enterprise", tierVersion: "104.0", enterpriseModuleEnabled: "true", expected: undefined },
  { productTierName: "FalkorDB Enterprise", tierVersion: "105.0", enterpriseModuleEnabled: undefined, expected: undefined },
  { productTierName: "FalkorDB Enterprise", tierVersion: undefined, enterpriseModuleEnabled: "true", expected: undefined },
  { productTierName: "FalkorDB Free", tierVersion: "200.0", expected: undefined },
  { productTierName: "FalkorDB Startup", tierVersion: "200.0", expected: undefined },
];

for (const { expected, ...tier } of sentinelCases) {
  for (const resourceName of ["Single-Zone", "Multi-Zone"]) {
    test(`${expected ? "shows" : "hides"} User Access for ${resourceName} on ${tier.productTierName} ${tier.tierVersion ?? "(no version)"}${tier.productTierName === "FalkorDB Enterprise" && !tier.enterpriseModuleEnabled ? " without enterprise module" : ""}`, () => {
      const tabs = getTabs({ ...base, ...tier, resourceName });
      assert.equal(tabs.userAccess, expected);
    });
  }
}

test("requires the Pro and Enterprise minimum versions on every deployment type", () => {
  const below = [
    { productTierName: "FalkorDB Pro", tierVersion: "102.9" },
    { productTierName: "FalkorDB Pro", tierVersion: undefined },
    { productTierName: "FalkorDB Enterprise", tierVersion: "104.9", enterpriseModuleEnabled: "true" },
    { productTierName: "FalkorDB Enterprise", tierVersion: undefined, enterpriseModuleEnabled: "true" },
  ];
  for (const tier of below) {
    const tabs = getTabs({ ...base, ...tier, resourceName: "Standalone" });
    assert.equal(tabs.userAccess, undefined);
  }
});

test("adds User Access when the tier version has more digits than the minimum", () => {
  const tabs = getTabs({ ...base, productTierName: "FalkorDB Free", tierVersion: "100.0", resourceName: "Standalone" });
  assert.equal(tabs.userAccess, "User Access");
});

test("isVersionAtLeast compares numerically, not lexicographically", () => {
  assert.equal(isVersionAtLeast("101.0", "88.0"), true);
  assert.equal(isVersionAtLeast("9.0", "88.0"), false);
  assert.equal(isVersionAtLeast("88.0", "88.0"), true);
  assert.equal(isVersionAtLeast("88.10", "88.9"), true);
  assert.equal(isVersionAtLeast("88", "88.0"), true);
  assert.equal(isVersionAtLeast("87.99", "88.0"), false);
  assert.equal(isVersionAtLeast("abc", "88.0"), false);
});
