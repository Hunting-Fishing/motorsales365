
// Define the possible vehicle body styles
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

// Available body style options for UI selection
export const VEHICLE_BODY_STYLES: Array<{ value: VehicleBodyStyle; label: string }> = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'truck', label: 'Truck' },
  { value: 'van', label: 'Van' },
  { value: 'wagon', label: 'Wagon' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'convertible', label: 'Convertible' },
  { value: 'crossover', label: 'Crossover' },
  { value: 'minivan', label: 'Minivan' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'bus', label: 'Bus' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'off-road', label: 'Off-road' },
  { value: 'other', label: 'Other' }
];
