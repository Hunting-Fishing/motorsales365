export interface EquipmentManual {
  id: string;
  title: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  manual_type?: string;
  document_number?: string;
  version?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  tags?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentManualLink {
  id: string;
  equipment_id: string;
  manual_id: string;
  linked_by?: string;
  notes?: string;
  created_at: string;
  manual?: EquipmentManual;
}

export const MANUAL_TYPES = [
  'service',
  'parts',
  'operator',
  'installation',
  'maintenance',
  'troubleshooting',
  'safety',
  'other'
] as const;

export type ManualType = typeof MANUAL_TYPES[number];
