// Inspection Template Types
export type InspectionItemType = 'gyr_status' | 'text' | 'number' | 'checkbox' | 'date' | 'hour_meter' | 'photo' | 'video' | 'notes';

export type AssetType = 'vessel' | 'skiff' | 'automobile' | 'heavy_truck' | 'equipment' | 'forklift' | 'trailer' | 'septic_system';

export interface InspectionFormItem {
  id: string;
  section_id: string;
  item_name: string;
  item_key: string;
  item_type: InspectionItemType;
  description?: string;
  is_required: boolean;
  display_order: number;
  default_value?: string;
  // Component linking fields
  component_category?: string;
  linked_component_type?: string;
  unit?: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionFormSection {
  id: string;
  template_id: string;
  title: string;
  description?: string;
  display_order: number;
  items: InspectionFormItem[];
  created_at: string;
  updated_at: string;
}

export interface InspectionFormTemplate {
  id: string;
  shop_id?: string;
  name: string;
  asset_type: AssetType;
  description?: string;
  is_base_template: boolean;
  parent_template_id?: string;
  is_published: boolean;
  version: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  sections: InspectionFormSection[];
}

export interface InspectionFormTemplateListItem {
  id: string;
  name: string;
  asset_type: AssetType;
  description?: string;
  is_base_template: boolean;
  is_published: boolean;
  version: number;
  created_at: string;
  section_count?: number;
  item_count?: number;
}

// For creating/updating
export interface CreateInspectionFormItem {
  item_name: string;
  item_key: string;
  item_type: InspectionItemType;
  description?: string;
  is_required?: boolean;
  display_order: number;
  default_value?: string;
  component_category?: string;
  linked_component_type?: string;
  unit?: string;
}

export interface CreateInspectionFormSection {
  title: string;
  description?: string;
  display_order: number;
  items: CreateInspectionFormItem[];
}

export interface CreateInspectionFormTemplate {
  name: string;
  asset_type: AssetType;
  description?: string;
  is_base_template?: boolean;
  parent_template_id?: string;
  is_published?: boolean;
  sections: CreateInspectionFormSection[];
}

// Inspection data stored in JSONB
export interface InspectionDataValue {
  item_key: string;
  item_type: InspectionItemType;
  value: string | number | boolean | null;
}

export interface InspectionData {
  template_id: string;
  template_version: number;
  values: Record<string, InspectionDataValue>;
}

// Asset type labels
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  vessel: 'Vessel',
  skiff: 'Skiff',
  automobile: 'Automobile',
  heavy_truck: 'Heavy Truck',
  equipment: 'Equipment',
  forklift: 'Forklift',
  trailer: 'Trailer',
  septic_system: 'Septic System',
};

// Item type labels
export const ITEM_TYPE_LABELS: Record<InspectionItemType, string> = {
  gyr_status: 'Green/Yellow/Red Status',
  text: 'Text Input',
  number: 'Number Input',
  checkbox: 'Checkbox',
  date: 'Date Input',
  hour_meter: 'Hour Meter',
  photo: 'Photo Upload',
  video: 'Video Upload',
  notes: 'Notes / Comments',
};
