
export type VehicleBodyStyle = 
  | 'sedan'
  | 'suv'
  | 'coupe'
  | 'truck'
  | 'van'
  | 'wagon'
  | 'hatchback'
  | 'convertible'
  | 'crossover'
  | 'minivan'
  | 'pickup'
  | 'bus'
  | 'motorcycle'
  | 'off-road'
  | 'other';

export interface VinDecodeResult {
  year: string | number | null;
  make: string | null;
  model: string | null;
  transmission?: string | null;
  transmission_type?: string | null;
  drive_type?: string | null;
  fuel_type?: string | null;
  body_style?: string | null;
  country?: string | null;
  engine?: string | null;
  gvwr?: string | null;
  trim?: string | null;
  color?: string | null;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  license_plate?: string;
  customer_id?: string; // Now optional for company assets
  owner_type: 'customer' | 'company';
  asset_category?: 'courtesy' | 'rental' | 'fleet' | 'service' | 'equipment' | 'other';
  asset_status?: 'available' | 'in_use' | 'maintenance' | 'out_of_service' | 'retired';
  checked_out_to?: string;
  checked_out_at?: string;
  expected_return_date?: string;
  current_location?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  transmission?: string;
  transmission_type?: string;
  drive_type?: string;
  engine?: string;
  fuel_type?: string;
  body_style?: string;
  country?: string;
  gvwr?: string;
  trim?: string;
  last_service_date?: string;
  color?: string;
}

export interface CompanyAsset extends Vehicle {
  owner_type: 'company';
  asset_category: 'courtesy' | 'rental' | 'fleet' | 'service' | 'equipment' | 'other';
  asset_status: 'available' | 'in_use' | 'maintenance' | 'out_of_service' | 'retired';
}

export interface CarMake {
  make_id: string;
  make_display: string;
  make_is_common?: string;
  make_country?: string;
}

export interface CarModel {
  model_name: string;
  model_display: string;
  make_id: string;
}

export const VEHICLE_BODY_STYLES: VehicleBodyStyle[] = [
  'sedan', 'suv', 'coupe', 'truck', 'van', 'wagon', 'hatchback',
  'convertible', 'crossover', 'minivan', 'pickup', 'bus',
  'motorcycle', 'off-road', 'other'
];
