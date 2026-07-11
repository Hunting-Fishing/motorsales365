export interface Engine {
  id: string;
  manufacturer: string;
  model: string;
  engine_type?: string;
  horsepower?: number;
  displacement?: string;
  cylinders?: number;
  fuel_type?: string;
  cooling_system?: string;
  year_introduced?: number;
  year_discontinued?: number;
  common_applications?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const ENGINE_TYPES = [
  'Diesel',
  'Gas',
  'Electric',
  'Hybrid',
  'Two-Stroke',
  'Four-Stroke',
  'Rotary',
  'Other'
] as const;

export const FUEL_TYPES = [
  'Diesel',
  'Gasoline',
  'Electric',
  'Hybrid',
  'Propane',
  'Natural Gas',
  'Biodiesel',
  'Other'
] as const;

export const COOLING_SYSTEMS = [
  'Air-Cooled',
  'Water-Cooled',
  'Liquid-Cooled',
  'Oil-Cooled',
  'Other'
] as const;
