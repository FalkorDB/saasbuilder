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
  { productTierName: "FalkorDB Pro", tierVersion: "88.0" },
  { productTierName: "FalkorDB Enterprise", tierVersion: "105.0", enterpriseModuleEnabled: "true" },
];

for (const tier of qualifying) {
  // Enterprise at its minimum also qualifies on sentinel; covered by sentinelCases below.
  for (const resourceName of tier.productTierName === "FalkorDB Enterprise" ? [] : ["Single-Zone", "Multi-Zone"]) {
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

// Sentinel deployments need Pro 103.0+ or Enterprise at its regular minimum; Free and Startup never qualify.
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

test("requires the Enterprise minimum version on every deployment type", () => {
  for (const tierVersion of ["104.9", undefined]) {
    const tabs = getTabs({
      ...base,
      productTierName: "FalkorDB Enterprise",
      tierVersion,
      enterpriseModuleEnabled: "true",
      resourceName: "Standalone",
    });
    assert.equal(tabs.userAccess, undefined);
  }
});

test("does not add User Access below the tier's minimum version", () => {
  const tabs = getTabs({ ...base, productTierName: "FalkorDB Pro", tierVersion: "87.0", resourceName: "Standalone" });
  assert.equal(tabs.userAccess, undefined);
});

test("adds User Access when the tier version has more digits than the minimum", () => {
  const tabs = getTabs({ ...base, productTierName: "FalkorDB Pro", tierVersion: "101.0", resourceName: "Standalone" });
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
