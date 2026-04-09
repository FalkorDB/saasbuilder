import { Category, chipCategoryColors, ColorObject, defaultChipStyles } from "./index";

export const resourceInstanceStatusMap: Record<string, { category: Category; label: string }> = {
  SingleShardRDBExport: { category: "pending", label: "Export" },
  MultiShardRDBExport: { category: "pending", label: "Export" },
  RDBImport: { category: "inProgress", label: "Import" }
};

export const getResourceInstanceTaskTypeStatusStylesAndLabel = (status: string): ColorObject & { label?: string } => {
  const category = resourceInstanceStatusMap[status]?.category;
  const label = resourceInstanceStatusMap[status]?.label;
  return {
    ...(category ? chipCategoryColors[category] : { ...defaultChipStyles }),
    ...(label ? { label } : {}),
  };
};
