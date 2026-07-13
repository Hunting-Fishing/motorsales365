
// Export all inventory-related types from a single file

// Basic inventory item interface
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  unit_price?: number; // alias for price for db compatibility
  category?: string;
  supplier?: string;
  status?: string;
  quantity?: number;
  reorder_point?: number;
}

// Extended inventory item with all properties
export interface InventoryItemExtended extends InventoryItem {
  quantity: number;
  reorder_point: number;
  unit_price: number;
  created_at?: string;
  updated_at?: string;
  location?: string;
  status: string;
  supplier: string;
  
  // Additional fields from form sections
  partNumber?: string;
  barcode?: string;
  subcategory?: string;
  manufacturer?: string;
  vehicleCompatibility?: string;
  
  // Inventory Management
  measurementUnit?: string;
  onHold?: number;
  onOrder?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  
  // Pricing
  sellPricePerUnit?: number;
  sell_price_per_unit?: number;
  costPerUnit?: number;
  cost_per_unit?: number;
  marginMarkup?: number;
  
  // Taxes & Fees
  taxRate?: number;
  taxExempt?: boolean;
  environmentalFee?: number;
  coreCharge?: number;
  hazmatFee?: number;
  
  // Product Details
  weight?: number;
  dimensions?: string;
  color?: string;
  material?: string;
  modelYear?: string;
  oemPartNumber?: string;
  universalPart?: boolean;
  warrantyPeriod?: string;
  
  // Additional Info
  dateBought?: string;
  dateLast?: string;
  notes?: string;
  webLinks?: Array<{
    id: string;
    type: string;
    label: string;
    url: string;
  }>;
  
  // Legacy fields for backward compatibility
  cost?: number;
}

// Auto-reorder settings
export interface AutoReorderSettings {
  enabled: boolean;
  threshold: number;
  quantity: number;
}

export interface ReorderSettings {
  [itemId: string]: AutoReorderSettings;
}

// Filter interface
export interface InventoryFilter {
  search?: string;
  category?: string[];
  status?: string[];
  supplier?: string;
  location?: string;
  stockLevel?: 'low' | 'out' | 'in';
  priceRange?: {
    min?: number;
    max?: number;
  };
}

// Inventory purchase order
export interface InventoryPurchaseOrder {
  id: string;
  vendor_id?: string;
  order_date: string;
  expected_delivery_date?: string;
  received_date?: string;
  total_amount?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  status: string;
  notes?: string;
}

export interface InventoryPurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  inventory_item_id: string;
  quantity: number;
  quantity_received: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
}

// Re-export for backward compatibility
export * from './transactions';
export * from './vendors';
export * from './purchaseOrders';
export * from './locations';
export * from './predictive';
