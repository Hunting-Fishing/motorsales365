
import { InventoryItemExtended } from "@/types/inventory";

export const normalizeInventoryItem = (item: any): InventoryItemExtended => {
  console.log('normalizeInventoryItem: Processing item:', item);
  
  return {
    id: item.id,
    name: item.name || '',
    sku: item.sku || '',
    description: item.description || '',
    category: item.category || '',
    supplier: item.supplier || '',
    quantity: Number(item.quantity) || 0,
    reorder_point: Number(item.reorder_point) || 0,
    unit_price: Number(item.unit_price) || 0,
    price: Number(item.unit_price) || 0, // Ensure price property exists
    location: item.location || '',
    status: normalizeStatus(item.status),
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
    partNumber: item.part_number || item.partNumber || '',
    barcode: item.barcode || '',
    subcategory: item.subcategory || '',
    manufacturer: item.manufacturer || '',
    vehicleCompatibility: item.vehicle_compatibility || item.vehicleCompatibility || '',
    onHold: Number(item.on_hold) || Number(item.onHold) || 0,
    onOrder: Number(item.on_order) || Number(item.onOrder) || 0,
    cost: Number(item.cost) || 0,
    marginMarkup: Number(item.margin_markup) || Number(item.marginMarkup) || 0,
    warrantyPeriod: item.warranty_period || item.warrantyPeriod || '',
    dateBought: item.date_bought || item.dateBought || '',
    dateLast: item.date_last || item.dateLast || '',
    notes: item.notes || ''
  };
};

// Helper function to normalize status values
const normalizeStatus = (status: any): string => {
  if (!status) return 'In Stock';
  
  const statusStr = String(status).toLowerCase();
  
  // Map various status formats to consistent values
  switch (statusStr) {
    case 'active':
    case 'in_stock':
    case 'available':
      return 'In Stock';
    case 'inactive':
    case 'out_of_stock':
    case 'unavailable':
      return 'Out of Stock';
    case 'low_stock':
      return 'Low Stock';
    default:
      return status; // Keep original if not recognized
  }
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

// Export alias for backward compatibility
export const formatInventoryItem = normalizeInventoryItem;

// Additional utility functions that are expected by other files
export const formatInventoryForApi = (item: Partial<InventoryItemExtended>): any => {
  return {
    name: item.name,
    sku: item.sku,
    category: item.category,
    supplier: item.supplier,
    location: item.location,
    status: item.status,
    description: item.description,
    quantity: Number(item.quantity) || 0,
    reorder_point: Number(item.reorder_point) || 0,
    unit_price: Number(item.unit_price) || 0
  };
};

export const mapApiToInventoryItem = (apiItem: any): InventoryItemExtended => {
  return normalizeInventoryItem(apiItem);
};

export const countLowStockItems = (items: InventoryItemExtended[]): number => {
  return items.filter(item => {
    const quantity = Number(item.quantity) || 0;
    const reorderPoint = Number(item.reorder_point) || 0;
    return quantity > 0 && quantity <= reorderPoint;
  }).length;
};

export const countOutOfStockItems = (items: InventoryItemExtended[]): number => {
  return items.filter(item => {
    const quantity = Number(item.quantity) || 0;
    return quantity <= 0;
  }).length;
};

export const calculateTotalValue = (items: InventoryItemExtended[]): number => {
  console.log('calculateTotalValue: Calculating for', items.length, 'items');
  
  const total = items.reduce((total, item) => {
    // unit_price is now treated as the total price for the entire quantity
    const totalItemValue = Number(item.unit_price) || 0;
    
    console.log(`Item ${item.name}: total_value=${totalItemValue} (for ${item.quantity} units)`);
    
    return total + totalItemValue;
  }, 0);
  
  console.log('calculateTotalValue: Total calculated value:', total);
  return total;
};
