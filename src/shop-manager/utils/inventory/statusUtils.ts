
import { InventoryItemExtended } from "@/types/inventory";

/**
 * Status calculation utilities for inventory items
 */

export type InventoryStatus = "out_of_stock" | "low_stock" | "in_stock";

/**
 * Get inventory status based on quantity and reorder point
 */
export const getInventoryStatus = (item: Partial<InventoryItemExtended>): InventoryStatus => {
  const quantity = Number(item.quantity) || 0;
  const reorderPoint = Number(item.reorder_point) || 0;
  
  if (quantity <= 0) {
    return "out_of_stock";
  } else if (quantity <= reorderPoint) {
    return "low_stock";
  } else {
    return "in_stock";
  }
};

/**
 * Get status display properties
 */
export const getStatusDisplayProps = (status: InventoryStatus) => {
  switch (status) {
    case "out_of_stock":
      return {
        label: "Out of Stock",
        className: "bg-red-100 text-red-800 border-red-300",
        priority: 3
      };
    case "low_stock":
      return {
        label: "Low Stock",
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
        priority: 2
      };
    case "in_stock":
      return {
        label: "In Stock",
        className: "bg-green-100 text-green-800 border-green-300",
        priority: 1
      };
    default:
      return {
        label: "Unknown",
        className: "bg-gray-100 text-gray-800 border-gray-300",
        priority: 0
      };
  }
};

/**
 * Check if item needs reordering
 */
export const needsReorder = (item: Partial<InventoryItemExtended>): boolean => {
  const status = getInventoryStatus(item);
  return status === "low_stock" || status === "out_of_stock";
};

/**
 * Sort items by status priority (critical items first)
 */
export const sortByStatusPriority = (items: InventoryItemExtended[]): InventoryItemExtended[] => {
  return [...items].sort((a, b) => {
    const statusA = getInventoryStatus(a);
    const statusB = getInventoryStatus(b);
    const propsA = getStatusDisplayProps(statusA);
    const propsB = getStatusDisplayProps(statusB);
    
    return propsB.priority - propsA.priority;
  });
};
