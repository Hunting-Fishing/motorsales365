// Export all inventory-related types from a single file

// Basic inventory item interface
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price?: number;
  unit_price?: number; // alias for price for db compatibility
  category?: string;
  supplier?: string;
  status?: string;
  quantity?: number;
  reorder_point?: number;
}

// Extended inventory item with all properties including new tax, fee, and measurement fields
export interface InventoryItemExtended extends InventoryItem {
  quantity: number;
  reorder_point: number;
  unit_price: number;
  price: number; // Add price property for UI consistency
  created_at?: string;
  updated_at?: string;
  location?: string;
  status: string;
  supplier: string;
  
  // Existing additional fields
  partNumber?: string;
  barcode?: string;
  subcategory?: string;
  manufacturer?: string;
  vehicleCompatibility?: string;
  onHold?: number;
  onOrder?: number;
  cost?: number;
  marginMarkup?: number;
  warrantyPeriod?: string;
  dateBought?: string;
  dateLast?: string;
  notes?: string;
  
  // New measurement and quantity fields
  unitOfMeasurement?: string;
  measurementType?: 'weight' | 'volume' | 'length' | 'count' | 'other';
  minQuantity?: number;
  maxQuantity?: number;
  optimalQuantity?: number;
  
  // New tax fields
  pstRate?: number;
  gstRate?: number;
  hstRate?: number;
  pstApplicable?: boolean;
  gstApplicable?: boolean;
  hstApplicable?: boolean;
  
  // New fee fields
  coreCharge?: number;
  coreChargeApplicable?: boolean;
  hazardousFee?: number;
  hazardousFeeApplicable?: boolean;
  shippingFee?: number;
  otherFees?: number;
  feeDescription?: string;
  
  // Additional product details
  weight?: number;
  weightUnit?: string;
  dimensions?: string;
  serialNumberRequired?: boolean;
  lotNumberRequired?: boolean;
  expirationDate?: string;
  batchNumber?: string;
  countryOfOrigin?: string;
  hsCode?: string;
  
  // Pricing and cost details
  lastCost?: number;
  averageCost?: number;
  listPrice?: number;
  msrp?: number;
  discountPercent?: number;
  
  // Additional inventory management
  binLocation?: string;
  shelfLife?: number;
  shelfLifeUnit?: string;
  temperatureRequirement?: string;
  handlingInstructions?: string;
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

// Additional inventory type definitions
export interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
}

export interface InventorySupplier {
  id: string;
  name: string;
  contact_info?: string;
}

export interface InventoryLocation {
  id: string;
  name: string;
  description?: string;
}

export interface InventoryStatus {
  value: string;
  label: string;
  color?: string;
}

// Transaction types
export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

// Vendor types
export interface Vendor {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// New measurement unit options
export interface MeasurementUnit {
  value: string;
  label: string;
  type: 'weight' | 'volume' | 'length' | 'count' | 'other';
}

export const MEASUREMENT_UNITS: MeasurementUnit[] = [
  // Weight
  { value: 'lb', label: 'Pounds (lb)', type: 'weight' },
  { value: 'oz', label: 'Ounces (oz)', type: 'weight' },
  { value: 'kg', label: 'Kilograms (kg)', type: 'weight' },
  { value: 'g', label: 'Grams (g)', type: 'weight' },
  { value: 'mg', label: 'Milligrams (mg)', type: 'weight' },
  { value: 'ton', label: 'Tons', type: 'weight' },
  
  // Volume
  { value: 'gal', label: 'Gallons (gal)', type: 'volume' },
  { value: 'qt', label: 'Quarts (qt)', type: 'volume' },
  { value: 'pt', label: 'Pints (pt)', type: 'volume' },
  { value: 'fl_oz', label: 'Fluid Ounces (fl oz)', type: 'volume' },
  { value: 'l', label: 'Liters (L)', type: 'volume' },
  { value: 'ml', label: 'Milliliters (mL)', type: 'volume' },
  
  // Length
  { value: 'ft', label: 'Feet (ft)', type: 'length' },
  { value: 'in', label: 'Inches (in)', type: 'length' },
  { value: 'm', label: 'Meters (m)', type: 'length' },
  { value: 'cm', label: 'Centimeters (cm)', type: 'length' },
  { value: 'mm', label: 'Millimeters (mm)', type: 'length' },
  
  // Count
  { value: 'each', label: 'Each', type: 'count' },
  { value: 'pair', label: 'Pair', type: 'count' },
  { value: 'set', label: 'Set', type: 'count' },
  { value: 'pack', label: 'Pack', type: 'count' },
  { value: 'box', label: 'Box', type: 'count' },
  { value: 'case', label: 'Case', type: 'count' },
  { value: 'dozen', label: 'Dozen', type: 'count' },
  
  // Other
  { value: 'roll', label: 'Roll', type: 'other' },
  { value: 'sheet', label: 'Sheet', type: 'other' },
  { value: 'linear_ft', label: 'Linear Feet', type: 'other' },
  { value: 'sq_ft', label: 'Square Feet', type: 'other' },
];

// Tax rate presets
export const TAX_PRESETS = {
  GST_RATE: 5,
  PST_BC: 7,
  PST_SK: 6,
  PST_MB: 7,
  PST_QC: 9.975,
  HST_ON: 13,
  HST_NB: 15,
  HST_NS: 15,
  HST_PE: 15,
  HST_NL: 15,
};
