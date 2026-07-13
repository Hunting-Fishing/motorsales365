
export interface InventoryOrder {
  id: string;
  item_id: string;
  item_name?: string; // Joined from inventory_items
  order_date: string;
  expected_arrival: string;
  quantity_ordered: number;
  quantity_received: number;
  supplier: string;
  status: 'ordered' | 'partially received' | 'received' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateInventoryOrderDto {
  item_id: string;
  expected_arrival: string;
  quantity_ordered: number;
  supplier: string;
  notes?: string;
}

export interface UpdateInventoryOrderDto {
  expected_arrival?: string;
  quantity_ordered?: number;
  supplier?: string;
  status?: 'ordered' | 'partially received' | 'received' | 'cancelled';
  notes?: string;
}

export interface ReceiveInventoryOrderDto {
  order_id: string;
  quantity_to_receive: number;
}
