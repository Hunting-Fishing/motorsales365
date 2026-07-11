
// Equipment type categories for customer assets
export type CustomerEquipmentType = 
  | 'vehicle'           // Cars, trucks, SUVs
  | 'generator'         // Power generators
  | 'forklift'          // Forklifts
  | 'semi_truck'        // Semi trucks / tractor trailers
  | 'small_engine'      // Lawn mowers, pressure washers, etc.
  | 'outboard_motor'    // Boat motors
  | 'marine_equipment'  // Boats, jet skis, marine gear
  | 'heavy_equipment'   // Excavators, bulldozers, etc.
  | 'trailer'           // Trailers
  | 'rv'                // RVs, motorhomes
  | 'atv_utv'           // ATVs, UTVs, side-by-sides
  | 'other';

// Vehicle-related type definitions
export interface CustomerVehicle {
  id?: string;
  customer_id?: string;
  year: string | number; // Make year flexible to handle both string and number
  make: string;
  model: string;
  vin?: string;
  license_plate?: string;
  trim?: string;
  equipment_type?: CustomerEquipmentType; // Type of equipment/asset
  last_service_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Additional vehicle details
  transmission?: string;
  transmission_type?: string;
  drive_type?: string;
  fuel_type?: string;
  engine?: string;
  body_style?: string;
  country?: string;
  gvwr?: string;
  color?: string;
}

// Consistent conversion function to handle both string and number year values
export const formatVehicleYear = (year: number | string | undefined): string => {
  if (year === undefined || year === null) return '';
  return year.toString();
};

// Format vehicle display name consistently
export const getVehicleDisplayName = (vehicle: CustomerVehicle): string => {
  const year = formatVehicleYear(vehicle.year);
  const make = vehicle.make || '';
  const model = vehicle.model || '';
  const trim = vehicle.trim ? ` ${vehicle.trim}` : '';
  
  return `${year} ${make} ${model}${trim}`.trim();
};

// Convert form vehicle data to CustomerVehicle with proper year conversion
export const convertFormVehicleToCustomerVehicle = (formVehicle: any): CustomerVehicle => {
  return {
    id: formVehicle.id,
    customer_id: formVehicle.customer_id,
    year: formVehicle.year || '', // Keep as string for form compatibility
    make: formVehicle.make || '',
    model: formVehicle.model || '',
    vin: formVehicle.vin || undefined,
    license_plate: formVehicle.license_plate || undefined,
    trim: formVehicle.trim || undefined,
    equipment_type: formVehicle.equipment_type || 'vehicle',
    transmission: formVehicle.transmission || undefined,
    transmission_type: formVehicle.transmission_type || undefined,
    drive_type: formVehicle.drive_type || undefined,
    fuel_type: formVehicle.fuel_type || undefined,
    engine: formVehicle.engine || undefined,
    body_style: formVehicle.body_style || undefined,
    country: formVehicle.country || undefined,
    gvwr: formVehicle.gvwr || undefined,
    color: formVehicle.color || undefined,
    last_service_date: formVehicle.last_service_date || undefined,
    notes: formVehicle.notes || undefined,
    created_at: formVehicle.created_at,
    updated_at: formVehicle.updated_at
  };
};
