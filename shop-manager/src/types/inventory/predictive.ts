// Predictive Inventory Management Types

export type UsageMetric = 
  | 'engine_hours' 
  | 'mileage' 
  | 'days' 
  | 'weeks' 
  | 'months' 
  | 'years';

export type AssetType = 'vehicle' | 'equipment' | 'machinery' | 'tool';

export interface AssetUsageConfig {
  id: string;
  asset_id: string;
  asset_type: AssetType;
  usage_metric: UsageMetric;
  current_reading: number;
  last_reading_date: string;
  average_usage_per_day?: number;
  created_at: string;
  updated_at: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  description?: string;
  category?: 'maintenance' | 'repair' | 'inspection';
  interval_value: number;
  interval_metric: UsageMetric;
  estimated_duration_minutes?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items?: ServicePackageItem[];
}

export interface ServicePackageItem {
  id: string;
  service_package_id: string;
  inventory_item_id?: string;
  part_number?: string;
  part_name: string;
  quantity: number;
  unit: string;
  is_optional: boolean;
  notes?: string;
  created_at: string;
}

export interface ConsumptionRate {
  id: string;
  inventory_item_id: string;
  usage_metric: UsageMetric;
  consumption_per_unit: number;
  average_consumption?: number;
  variance_percentage?: number;
  last_calculated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ConsumptionHistory {
  id: string;
  inventory_item_id: string;
  quantity_consumed: number;
  usage_metric: UsageMetric;
  usage_value: number;
  service_package_id?: string;
  work_order_id?: string;
  consumed_at: string;
  notes?: string;
}

export interface InventoryForecast {
  id: string;
  inventory_item_id: string;
  forecast_type: 'usage_based' | 'time_based' | 'seasonal';
  predicted_runout_date?: string;
  predicted_runout_usage?: number;
  current_stock: number;
  average_consumption_rate: number;
  confidence_level?: number;
  recommended_reorder_date?: string;
  recommended_reorder_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface SeasonalFactor {
  id: string;
  inventory_item_id?: string;
  category?: string;
  month: number;
  adjustment_factor: number;
  notes?: string;
  created_at: string;
}

export const USAGE_METRICS: { value: UsageMetric; label: string }[] = [
  { value: 'engine_hours', label: 'Engine Hours' },
  { value: 'mileage', label: 'Mileage (km/miles)' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

export const UNIT_OPTIONS = [
  'each',
  'litres',
  'liters',
  'gallons',
  'kg',
  'lbs',
  'oz',
  'ml',
  'quarts',
  'pints',
];
