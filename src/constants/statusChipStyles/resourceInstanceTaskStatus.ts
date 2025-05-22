import { Category, chipCategoryColors, ColorObject, defaultChipStyles } from "./index";

export const resourceInstanceStatusMap: Record<string, { category: Category; label: string }> = {
  "pending": { category: "pending", label: "Pending" },
  "in_progress": { category: "inProgress", label: "In progress" },
  "completed": { category: "success", label: "Completed" },
  "failed": { category: "failed", label: "Failed" }
};

export const getResourceInstanceTaskStatusStylesAndLabel = (status: string): ColorObject & { label?: string } => {
  const category = resourceInstanceStatusMap[status]?.category;
  const label = resourceInstanceStatusMap[status]?.label;
  return {
    ...(category ? chipCategoryColors[category] : { ...defaultChipStyles }),
    ...(label ? { label } : {}),
  };
};
