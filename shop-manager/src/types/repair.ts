
export interface RepairService {
  id: string;
  name: string;
  description?: string;
  estimatedHours?: number;
  price?: number;
  category?: string;
}

export interface RepairPart {
  id: string;
  name: string;
  partNumber: string;
  description?: string;
  price?: number;
  inventoryItemId?: string;
}

export interface RepairTemplate {
  id: string;
  name: string;
  description?: string;
  services: RepairService[];
  parts: RepairPart[];
  estimatedHours: number;
  estimatedCost: number;
}
