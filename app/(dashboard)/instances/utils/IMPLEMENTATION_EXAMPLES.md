# Instance Type Implementation Examples

## How It Works Now

### Scenario 1: Using `labeledOptions` (Admin-defined descriptive labels)

**YAML Configuration:**
```yaml
apiParameters:
  - key: instanceType
    name: Instance Type
    type: String
    labeledOptions:
      "2 vCPUs, 4GB memory (gcp)": "e2-medium"
      "2 vCPUs ,8GB memory (gcp)": "e2-standard-2"
      "4 vCPUs, 16GB memory (gcp)": "e2-standard-4"
      "4 vCPUs, 8GB memory (gcp)": "e2-custom-4-8192"
      "8 vCPUs, 16GB memory (gcp)": "e2-custom-8-16384"
      "16 vCPUs, 32GB memory (gcp)": "e2-custom-16-32768"
      "32 vCPUs, 64GB memory (gcp)": "e2-custom-32-65536"
      "2 vCPUs, 4GB memory (aws)": "t2.medium"
      "2 vCPUs, 8GB memory (aws)": "m6i.large"
      "4 vCPUs, 16GB memory (aws)": "m6i.xlarge"
      "4 vCPU, 8GB memory (aws)": "c6i.xlarge"
      "8 vCPUs, 16GB memory (aws)": "c6i.2xlarge"
      "16 vCPUs, 32GB memory (aws)": "c6i.4xlarge"
      "32 vCPUs, 64GB memory (aws)": "c6i.8xlarge"
```

**User Experience:**

#### When AWS is selected:
```
Instance Type dropdown shows:
✅ 2 vCPUs, 4GB memory (aws)      → value: t2.medium
✅ 2 vCPUs, 8GB memory (aws)      → value: m6i.large
✅ 4 vCPU, 8GB memory (aws)       → value: c6i.xlarge
✅ 4 vCPUs, 16GB memory (aws)     → value: m6i.xlarge
✅ 8 vCPUs, 16GB memory (aws)     → value: c6i.2xlarge
✅ 16 vCPUs, 32GB memory (aws)    → value: c6i.4xlarge
✅ 32 vCPUs, 64GB memory (aws)    → value: c6i.8xlarge

❌ (All GCP options are hidden)
```

#### When GCP is selected:
```
Instance Type dropdown shows:
✅ 2 vCPUs, 4GB memory (gcp)      → value: e2-medium
✅ 2 vCPUs ,8GB memory (gcp)      → value: e2-standard-2
✅ 4 vCPUs, 8GB memory (gcp)      → value: e2-custom-4-8192
✅ 4 vCPUs, 16GB memory (gcp)     → value: e2-standard-4
✅ 8 vCPUs, 16GB memory (gcp)     → value: e2-custom-8-16384
✅ 16 vCPUs, 32GB memory (gcp)    → value: e2-custom-16-32768
✅ 32 vCPUs, 64GB memory (gcp)    → value: e2-custom-32-65536

❌ (All AWS options are hidden)
```

**Sorting Logic:**
Options are sorted by vCPU count (ascending): 2 vCPUs → 4 vCPUs → 8 vCPUs → 16 vCPUs → 32 vCPUs

---

### Scenario 2: Using Simple `options` Array (Auto-filtered by pattern)

**YAML Configuration:**
```yaml
apiParameters:
  - key: instanceType
    name: Instance Type
    type: String
    options:
      - t3.micro
      - t3.small
      - t3.medium
      - m6i.large
      - m6i.xlarge
      - c6i.xlarge
      - c6i.2xlarge
      - e2-medium
      - e2-standard-2
      - e2-standard-4
      - n2-standard-2
      - Standard_B1ls
      - Standard_D2s_v3
```

**User Experience:**

#### When AWS is selected:
```
Instance Type dropdown shows:
✅ t3.micro        (General Purpose)
✅ t3.small        (General Purpose)
✅ t3.medium       (General Purpose)
✅ m6i.large       (General Purpose)
✅ m6i.xlarge      (General Purpose)
✅ c6i.xlarge      (Compute Optimized)
✅ c6i.2xlarge     (Compute Optimized)

❌ e2-medium       (GCP - hidden)
❌ e2-standard-2   (GCP - hidden)
❌ Standard_B1ls   (Azure - hidden)
```

#### When GCP is selected:
```
Instance Type dropdown shows:
✅ e2-medium       (General Purpose)
✅ e2-standard-2   (General Purpose)
✅ e2-standard-4   (General Purpose)
✅ n2-standard-2   (General Purpose)

❌ t3.micro        (AWS - hidden)
❌ m6i.large       (AWS - hidden)
❌ Standard_B1ls   (Azure - hidden)
```

#### When Azure is selected:
```
Instance Type dropdown shows:
✅ Standard_B1ls    (General Purpose)
✅ Standard_D2s_v3  (General Purpose)

❌ t3.micro         (AWS - hidden)
❌ e2-medium        (GCP - hidden)
```

**Sorting Logic:**
Options are sorted by category first (General Purpose, Compute Optimized, etc.), then alphabetically within each category.

---

## Technical Implementation

### Pattern Detection

The system automatically detects cloud provider from instance type format:

| Cloud Provider | Pattern | Examples |
|---------------|---------|----------|
| **AWS** | Contains `.` | `t3.micro`, `m6i.large`, `c6i.xlarge` |
| **GCP** | Contains `-` (no `.`) | `e2-medium`, `n2-standard-2`, `c2-standard-4` |
| **Azure** | Starts with `Standard_` or `Basic_` | `Standard_B1ls`, `Standard_D2s_v3` |

### LabeledOptions Detection

When using `labeledOptions`, the system looks for cloud provider identifiers in the label:
- `(aws)` → AWS instance
- `(gcp)` → GCP instance
- `(azure)` → Azure instance

**Example:**
```
"2 vCPUs, 4GB memory (aws)" → Shown only when AWS is selected
"2 vCPUs, 4GB memory (gcp)" → Shown only when GCP is selected
```

---

## Benefits

### For End Users
- ✅ Only see relevant instance types for their selected cloud provider
- ✅ Clear, descriptive labels (when using labeledOptions)
- ✅ Logical sorting (by specs or category)
- ✅ No confusion between cloud provider instance types

### For Admins/Developers
- ✅ Simple YAML configuration
- ✅ Support for both labeled and simple formats
- ✅ Automatic filtering and sorting
- ✅ Extensible for new cloud providers
- ✅ Type-safe implementation

---

## Migration Guide

### If you're using simple options:
```yaml
# Before (shows all types regardless of cloud provider)
options:
  - t3.micro
  - e2-medium
  - Standard_B1ls

# After (automatically filtered - no changes needed!)
options:
  - t3.micro
  - e2-medium
  - Standard_B1ls
```

### If you want better UX with descriptions:
```yaml
# Add labeledOptions for user-friendly labels
labeledOptions:
  "2 vCPUs, 4GB memory (aws)": "t3.micro"
  "2 vCPUs, 4GB memory (gcp)": "e2-medium"
  "1 vCPU, 0.5GB memory (azure)": "Standard_B1ls"
```

The system automatically handles both formats! 🎉
