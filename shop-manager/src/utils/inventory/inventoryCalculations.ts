
import { InventoryItem } from "@/types/inventory";
import { WorkOrderInventoryItem } from "@/types/workOrder";

export function calculateInventoryTotal(items: WorkOrderInventoryItem[]): number {
  return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
}

export function calculateItemTotal(item: WorkOrderInventoryItem): number {
  return item.quantity * item.unit_price;
}

export function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.reorder_point;
}

export function getInventoryValue(items: InventoryItem[]): number {
  return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
}

export function getInventoryStatus(quantity: number, reorderPoint: number): string {
  if (quantity <= 0) {
    return "Out of Stock";
  } else if (quantity <= reorderPoint) {
    return "Low Stock";
  } else {
    return "In Stock";
  }
}

export function getStatusColorClass(status: string): string {
  switch (status) {
    case "In Stock":
      return "bg-green-100 text-green-800 border-green-300";
    case "Low Stock":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "Out of Stock":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}
