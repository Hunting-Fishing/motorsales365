
import { InventoryItemExtended } from "@/types/inventory";

export const normalizeInventoryItem = (item: any): InventoryItemExtended => {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    description: item.description,
    category: item.category,
    supplier: item.supplier,
    quantity: item.quantity,
    reorder_point: item.reorder_point,
    unit_price: item.unit_price,
    price: item.unit_price || 0, // Ensure price property exists
    location: item.location,
    status: item.status || 'In Stock',
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
    partNumber: item.partNumber,
    barcode: item.barcode,
    subcategory: item.subcategory,
    manufacturer: item.manufacturer,
    vehicleCompatibility: item.vehicleCompatibility,
    onHold: item.onHold,
    onOrder: item.onOrder,
    cost: item.cost,
    marginMarkup: item.marginMarkup,
    warrantyPeriod: item.warrantyPeriod,
    dateBought: item.dateBought,
    dateLast: item.dateLast,
    notes: item.notes
  };
};

export const getInventoryStatus = (quantity: number, reorderPoint: number): string => {
  if (quantity <= 0) {
    return "Out of Stock";
  } else if (quantity <= reorderPoint) {
    return "Low Stock";
  } else {
    return "In Stock";
  }
};
