
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
  items?: InventoryPurchaseOrderItem[]; // Add items array for convenience
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

// Add these type aliases for backward compatibility
export type PurchaseOrder = InventoryPurchaseOrder;
export type PurchaseOrderItem = InventoryPurchaseOrderItem;
