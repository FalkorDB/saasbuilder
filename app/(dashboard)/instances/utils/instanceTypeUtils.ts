/**
 * Instance Type Utilities
 * Provides user-friendly formatting and filtering for cloud provider instance types
 */

import { CloudProvider } from "src/types/common/enums";

/**
 * AWS Instance Type Categories
 */
const AWS_INSTANCE_TYPE_PATTERNS = {
  general_purpose: /^(t2|t3|t4g|m5|m6i|m6a|m7i|m7a)\./,
  compute_optimized: /^(c5|c6i|c6a|c7i|c7a)\./,
  memory_optimized: /^(r5|r6i|r6a|r7i|r7a|x1|x2)\./,
  storage_optimized: /^(i3|i4i|d2|d3)\./,
  accelerated_computing: /^(p3|p4|g4|g5|inf1|inf2)\./,
};

/**
 * GCP Instance Type Categories
 */
const GCP_INSTANCE_TYPE_PATTERNS = {
  general_purpose: /^(e2|n1|n2|n2d)\-/,
  compute_optimized: /^(c2|c2d|c3)\-/,
  memory_optimized: /^(m1|m2|m3)\-/,
  accelerated_computing: /^(a2|a3|g2)\-/,
};

/**
 * Azure Instance Type Categories
 */
const AZURE_INSTANCE_TYPE_PATTERNS = {
  general_purpose: /^(Standard_B|Standard_D|Standard_A)/,
  compute_optimized: /^(Standard_F)/,
  memory_optimized: /^(Standard_E|Standard_M)/,
  storage_optimized: /^(Standard_L)/,
  accelerated_computing: /^(Standard_N)/,
};

/**
 * Format instance type with user-friendly display
 */
export const formatInstanceType = (instanceType: string, cloudProvider: CloudProvider): string => {
  if (!instanceType) return "";

  // For AWS
  if (cloudProvider === "aws") {
    // Example: t3.micro -> t3.micro (Burstable, 2 vCPU, 1 GiB RAM)
    // We keep it simple and just return the instance type
    // You can expand this with actual specs if needed
    return instanceType;
  }

  // For GCP
  if (cloudProvider === "gcp") {
    // Example: e2-standard-2 -> e2-standard-2 (2 vCPU, 8 GB RAM)
    // We keep it simple and just return the instance type
    return instanceType;
  }

  // For Azure
  if (cloudProvider === "azure") {
    // Example: Standard_B1ls -> Standard_B1ls (1 vCPU, 0.5 GB RAM)
    return instanceType;
  }

  return instanceType;
};

/**
 * Get instance type category for better organization
 */
export const getInstanceTypeCategory = (instanceType: string, cloudProvider: CloudProvider): string => {
  const patterns =
    cloudProvider === "aws"
      ? AWS_INSTANCE_TYPE_PATTERNS
      : cloudProvider === "gcp"
        ? GCP_INSTANCE_TYPE_PATTERNS
        : AZURE_INSTANCE_TYPE_PATTERNS;

  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(instanceType)) {
      return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }

  return "Other";
};

/**
 * Check if instance type is valid for the selected cloud provider
 */
export const isInstanceTypeValidForProvider = (instanceType: string, cloudProvider: CloudProvider): boolean => {
  if (!instanceType || !cloudProvider) return false;

  switch (cloudProvider) {
    case "aws":
      // AWS instance types typically contain a dot (e.g., t3.micro, m6i.large)
      return instanceType.includes(".");

    case "gcp":
      // GCP instance types typically contain a hyphen (e.g., e2-standard-2, n2-standard-4)
      return instanceType.includes("-") && !instanceType.includes(".");

    case "azure":
      // Azure instance types typically start with Standard_ or Basic_
      return instanceType.startsWith("Standard_") || instanceType.startsWith("Basic_");

    default:
      return false;
  }
};

/**
 * Filter instance types based on cloud provider
 */
export const filterInstanceTypesByProvider = (
  instanceTypes: string[],
  cloudProvider: CloudProvider
): string[] => {
  if (!instanceTypes || !cloudProvider) return [];

  return instanceTypes.filter((instanceType) => isInstanceTypeValidForProvider(instanceType, cloudProvider));
};

/**
 * Get user-friendly label for instance type menu items
 */
export const getInstanceTypeLabel = (instanceType: string, cloudProvider: CloudProvider): string => {
  const category = getInstanceTypeCategory(instanceType, cloudProvider);
  const formattedType = formatInstanceType(instanceType, cloudProvider);

  // Return just the instance type for now
  // You can customize this to include more details if needed
  return formattedType;
};

/**
 * Sort instance types in a logical order
 */
export const sortInstanceTypes = (instanceTypes: string[], cloudProvider: CloudProvider): string[] => {
  return [...instanceTypes].sort((a, b) => {
    // Get categories
    const catA = getInstanceTypeCategory(a, cloudProvider);
    const catB = getInstanceTypeCategory(b, cloudProvider);

    // Sort by category first
    if (catA !== catB) {
      return catA.localeCompare(catB);
    }

    // Within same category, sort alphabetically
    return a.localeCompare(b);
  });
};
