
import { InventoryItemExtended } from "@/types/inventory";
import { supabase } from "@/integrations/supabase/client";
import { getInventoryStatus, needsReorder } from "./statusUtils";

/**
 * Get inventory item by ID
 */
export const getInventoryItemById = async (id: string): Promise<InventoryItemExtended | null> => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return formatInventoryItem(data);
  } catch (error) {
    console.error("Error fetching inventory item by ID:", error);
    throw error;
  }
};

/**
 * Format inventory item from database to application format
 */
export const formatInventoryItem = (dbItem: any): InventoryItemExtended => {
  return {
    id: dbItem.id,
    name: dbItem.name || '',
    sku: dbItem.sku || '',
    description: dbItem.description || '',
    price: dbItem.unit_price || 0, // Legacy field
    unit_price: dbItem.unit_price || 0,
    category: dbItem.category || '',
    supplier: dbItem.supplier || '',
    status: dbItem.status || 'active',
    quantity: dbItem.quantity || 0,
    reorder_point: dbItem.reorder_point || 0,
    location: dbItem.location || '',
    created_at: dbItem.created_at,
    updated_at: dbItem.updated_at,
    
    // Extended fields from all form sections
    partNumber: dbItem.part_number || '',
    barcode: dbItem.barcode || '',
    subcategory: dbItem.subcategory || '',
    manufacturer: dbItem.manufacturer || '',
    vehicleCompatibility: dbItem.vehicle_compatibility || '',
    
    // Inventory Management
    onHold: dbItem.on_hold || 0,
    onOrder: dbItem.on_order || 0,
    
    // Pricing - using correct property names from type definition
    marginMarkup: dbItem.margin_markup || 0,
    sellPricePerUnit: dbItem.sell_price_per_unit || 0,
    costPerUnit: dbItem.cost_per_unit || 0,
    
    // Product Details - only including properties that exist in InventoryItemExtended type
    weight: dbItem.weight || 0,
    dimensions: dbItem.dimensions || '',
    warrantyPeriod: dbItem.warranty_period || '',
    
    // Additional Info
    dateBought: dbItem.date_bought || '',
    dateLast: dbItem.date_last || '',
    notes: dbItem.notes || '',
    webLinks: dbItem.web_links ? (Array.isArray(dbItem.web_links) ? dbItem.web_links : []) : []
  } as InventoryItemExtended;
};

/**
 * Format inventory item for API submission
 */
export const formatInventoryForApi = (item: Partial<InventoryItemExtended>) => {
  const apiData: any = {
    name: item.name,
    sku: item.sku,
    category: item.category,
    supplier: item.supplier,
    location: item.location,
    status: item.status,
    description: item.description,
    quantity: item.quantity,
    reorder_point: item.reorder_point,
    unit_price: item.unit_price,
    
    // Extended fields - use snake_case for database columns
    part_number: item.partNumber,
    barcode: item.barcode,
    subcategory: item.subcategory,
    manufacturer: item.manufacturer,
    vehicle_compatibility: item.vehicleCompatibility,
    
    // Inventory Management
    on_hold: item.onHold,
    on_order: item.onOrder,
    
    // Pricing - handle both camelCase and snake_case
    margin_markup: item.marginMarkup,
    sell_price_per_unit: (item as any).sell_price_per_unit || (item as any).sellPricePerUnit,
    cost_per_unit: (item as any).cost_per_unit || (item as any).costPerUnit,
    
    // Product Details
    weight: item.weight,
    dimensions: item.dimensions,
    warranty_period: item.warrantyPeriod,
    
    // Additional Info
    date_bought: item.dateBought,
    date_last: item.dateLast,
    notes: item.notes,
    web_links: (item as any).webLinks || (item as any).web_links || []
  };
  
  console.log('Formatting for API - webLinks:', (item as any).webLinks);
  console.log('Formatting for API - web_links output:', apiData.web_links);
  
  // Remove undefined values
  Object.keys(apiData).forEach(key => {
    if (apiData[key] === undefined) {
      delete apiData[key];
    }
  });
  
  return apiData;
};

/**
 * Map API response to inventory item format
 */
export const mapApiToInventoryItem = (apiItem: any): InventoryItemExtended => {
  return formatInventoryItem(apiItem);
};

/**
 * Count items with low stock - now using centralized status logic
 */
export const countLowStockItems = (items: InventoryItemExtended[]): number => {
  return items.filter(item => getInventoryStatus(item) === "low_stock").length;
};

/**
 * Count items that are out of stock - now using centralized status logic
 */
export const countOutOfStockItems = (items: InventoryItemExtended[]): number => {
  return items.filter(item => getInventoryStatus(item) === "out_of_stock").length;
};

/**
 * Calculate total inventory value
 */
export const calculateTotalValue = (items: InventoryItemExtended[]): number => {
  return items.reduce((total, item) => {
    return total + (item.unit_price * item.quantity);
  }, 0);
};

// Re-export from status utils for backward compatibility
export { getInventoryStatus, needsReorder } from "./statusUtils";
