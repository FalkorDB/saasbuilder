# Instance Type Utilities

This module provides user-friendly filtering and display functionality for cloud provider instance types.

## Features

- **Cloud Provider Filtering**: Automatically filters instance types to show only those compatible with the selected cloud provider
- **Smart Detection**: Recognizes instance type patterns for AWS, GCP, and Azure
- **Categorization**: Groups instance types by purpose (General Purpose, Compute Optimized, Memory Optimized, etc.)
- **Sorting**: Organizes instance types in a logical order

## Usage

### In Instance Creation Form

When users select a cloud provider, the instance type dropdown automatically updates to show only compatible instance types:

```typescript
import {
  filterInstanceTypesByProvider,
  getInstanceTypeLabel,
  sortInstanceTypes,
} from "../utils/instanceTypeUtils";

// Filter instance types for the selected cloud provider
const filteredTypes = filterInstanceTypesByProvider(allInstanceTypes, "aws");
// Result: ["t3.micro", "t3.small", "m6i.large", "c6i.xlarge", ...]

// Sort them in a logical order
const sortedTypes = sortInstanceTypes(filteredTypes, "aws");

// Create menu items with user-friendly labels
const menuItems = sortedTypes.map((type) => ({
  label: getInstanceTypeLabel(type, "aws"),
  value: type,
}));
```

## Instance Type Patterns

### AWS
- **Format**: Contains a dot (e.g., `t3.micro`, `m6i.large`)
- **Examples**: 
  - General Purpose: `t3.micro`, `m6i.large`, `m7i.xlarge`
  - Compute Optimized: `c6i.large`, `c7i.xlarge`
  - Memory Optimized: `r6i.large`, `r7i.xlarge`

### GCP
- **Format**: Contains hyphens (e.g., `e2-standard-2`, `n2-highmem-4`)
- **Examples**:
  - General Purpose: `e2-standard-2`, `n2-standard-4`
  - Compute Optimized: `c2-standard-4`, `c3-standard-8`
  - Memory Optimized: `m1-megamem-96`, `m2-ultramem-208`

### Azure
- **Format**: Starts with `Standard_` or `Basic_` (e.g., `Standard_B1ls`, `Standard_D4s_v3`)
- **Examples**:
  - General Purpose: `Standard_B1ls`, `Standard_D2s_v3`
  - Compute Optimized: `Standard_F4s_v2`
  - Memory Optimized: `Standard_E4s_v3`

## Example Workflow

1. **User selects AWS** → Dropdown shows only AWS instance types:
   - ✅ t3.micro
   - ✅ m6i.large
   - ✅ c6i.xlarge
   - ❌ e2-standard-2 (GCP - hidden)
   - ❌ Standard_B1ls (Azure - hidden)

2. **User switches to GCP** → Dropdown updates to show only GCP instance types:
   - ❌ t3.micro (AWS - hidden)
   - ❌ m6i.large (AWS - hidden)
   - ✅ e2-standard-2
   - ✅ n2-standard-4
   - ✅ c2-standard-8

3. **User switches to Azure** → Dropdown updates to show only Azure instance types:
   - ❌ t3.micro (AWS - hidden)
   - ❌ e2-standard-2 (GCP - hidden)
   - ✅ Standard_B1ls
   - ✅ Standard_D2s_v3
   - ✅ Standard_F4s_v2

## YAML Template Configuration

In your service YAML template, you can specify instance types for multiple cloud providers:

### Option 1: Using `labeledOptions` (Recommended for Better UX)

```yaml
services:
  - name: Redis Cluster
    compute:
      instanceTypes:
        - cloudProvider: aws
          apiParam: instanceType
        - cloudProvider: gcp
          apiParam: instanceType
    apiParameters:
      - key: instanceType
        description: Instance Type
        name: Instance Type
        type: String
        modifiable: true
        required: true
        export: true
        defaultValue: "t2.medium"
        labeledOptions:
          "2 vCPUs, 4GB memory (gcp)": "e2-medium"
          "2 vCPUs, 8GB memory (gcp)": "e2-standard-2"
          "4 vCPUs, 16GB memory (gcp)": "e2-standard-4"
          "2 vCPUs, 4GB memory (aws)": "t2.medium"
          "2 vCPUs, 8GB memory (aws)": "m6i.large"
          "4 vCPUs, 16GB memory (aws)": "m6i.xlarge"
```

**Benefits:**
- User sees descriptive labels like "2 vCPUs, 4GB memory (aws)"
- Automatically filters by cloud provider (only shows AWS options when AWS is selected)
- Sorted by vCPU count for easy selection

### Option 2: Using Simple `options` Array

```yaml
apiParameters:
  - key: instanceType
    description: Instance Type
    name: Instance Type
    type: String
    options:
      - t3.micro
      - t3.small
      - m6i.large
      - e2-standard-2
      - e2-standard-4
      - n2-standard-2
    defaultValue: "t3.small"
```

**Benefits:**
- Simpler configuration
- Automatically filtered by cloud provider pattern matching
- Sorted by category and type

The utility functions will automatically:
1. Filter options based on the selected cloud provider
2. Sort instance types logically
3. Display user-friendly labels (either from labeledOptions or formatted instance type)
