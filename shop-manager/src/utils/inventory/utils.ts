
import { InventoryItemExtended } from "@/types/inventory";

/**
 * Get inventory status based on quantity and reorder point
 */
export const getInventoryStatus = (item: InventoryItemExtended): string => {
  const quantity = Number(item.quantity) || 0;
  const reorderPoint = Number(item.reorder_point) || 0;

  if (quantity <= 0) {
    return "Out of Stock";
  } else if (quantity <= reorderPoint) {
    return "Low Stock";
  } else {
    return "In Stock";
  }
};

/**
 * Count low stock items in inventory
 */
export const countLowStockItems = (items: InventoryItemExtended[]): number => {
  return items.filter(item => {
    const quantity = Number(item.quantity) || 0;
    const reorderPoint = Number(item.reorder_point) || 0;
    return quantity > 0 && quantity <= reorderPoint;
  }).length;
};

/**
 * Count out of stock items in inventory
 */
export const countOutOfStockItems = (items: InventoryItemExtended[]): number => {
  return items.filter(item => {
    const quantity = Number(item.quantity) || 0;
    return quantity <= 0;
  }).length;
};

/**
 * Calculate total inventory value
 */
export const calculateTotalValue = (items: InventoryItemExtended[]): number => {
  return items.reduce((total, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    return total + (quantity * unitPrice);
  }, 0);
};

/**
 * Format inventory item from API
 */
export const formatInventoryItem = (item: Partial<InventoryItemExtended>): InventoryItemExtended => {
  const unitPrice = Number(item.unit_price || item.price) || 0;
  return {
    id: item.id || crypto.randomUUID(),
    name: item.name || '',
    sku: item.sku || '',
    category: item.category || '',
    description: item.description || '',
    quantity: Number(item.quantity) || 0,
    reorder_point: Number(item.reorder_point) || 10,
    unit_price: unitPrice,
    price: unitPrice,
    supplier: item.supplier || '',
    location: item.location || '',
    status: item.status || 'In Stock',
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString()
  };
};

/**
 * Format inventory item for API submission
 */
export const formatInventoryForApi = (item: Partial<InventoryItemExtended>): any => {
  return {
    ...item,
    quantity: Number(item.quantity),
    reorder_point: Number(item.reorder_point),
    unit_price: Number(item.unit_price || item.price),
  };
};

/**
 * Map database item to inventory item
 */
export const mapApiToInventoryItem = (apiItem: any): InventoryItemExtended => {
  return formatInventoryItem({
    ...apiItem,
    // Ensure proper field mapping
    unit_price: apiItem.unit_price || 0,
    reorder_point: apiItem.reorder_point || 10
  });
};
