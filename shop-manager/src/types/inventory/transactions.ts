
export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  quantity: number;
  transaction_date: string;
  reference_id?: string;
  transaction_type: string;
  reference_type?: string;
  notes?: string;
  performed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryAdjustment {
  inventory_item_id: string;
  quantity: number;
  adjustment_type: string;
  notes?: string;
  performed_by?: string;
}
