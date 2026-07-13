
export interface InventoryLocation {
  id: string;
  name: string;
  type?: string;
  description?: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: InventoryLocation[]; // Add this property for hierarchy support
}

// Data transfer object for creating new locations
export interface CreateInventoryLocationDto {
  name: string;
  type?: string;
  description?: string;
  parent_id?: string;
  is_active?: boolean;
}
