export interface PricingFormula {
  id: string;
  shop_id: string;
  name: string;
  surface_type: string;
  application: string;
  category: string;
  price_per_sqft_light: number;
  price_per_sqft_medium: number;
  price_per_sqft_heavy: number;
  minimum_charge: number;
  sh_concentration_light: number;
  sh_concentration_medium: number;
  sh_concentration_heavy: number;
  mix_coverage_sqft: number;
  minutes_per_100sqft: number;
  setup_minutes: number;
  labor_rate_type: string;
  notes: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type ConditionLevel = 'light' | 'medium' | 'heavy';

export interface QuoteCalculation {
  price: number;
  chemicalCost: number;
  shCost: number;
  surfactantCost: number;
  surfactantOzNeeded: number;
  laborMinutes: number;
  laborCost: number;
  totalCost: number;
  profit: number;
  margin: number;
  shGallonsNeeded: number;
  mixGallonsNeeded: number;
}

export const SURFACE_TYPES = [
  { value: 'concrete', label: 'Concrete' },
  { value: 'vinyl', label: 'Vinyl Siding' },
  { value: 'brick', label: 'Brick' },
  { value: 'stucco', label: 'Stucco' },
  { value: 'wood', label: 'Wood' },
  { value: 'asphalt', label: 'Asphalt Shingles' },
  { value: 'tile', label: 'Tile' },
  { value: 'metal', label: 'Metal' },
  { value: 'composite', label: 'Composite' },
] as const;

export const APPLICATIONS = [
  { value: 'driveway', label: 'Driveway' },
  { value: 'sidewalk', label: 'Sidewalk' },
  { value: 'parking_lot', label: 'Parking Lot' },
  { value: 'house_wash', label: 'House Wash' },
  { value: 'roof', label: 'Roof' },
  { value: 'deck', label: 'Deck' },
  { value: 'fence', label: 'Fence' },
  { value: 'patio', label: 'Patio' },
  { value: 'pool_deck', label: 'Pool Deck' },
] as const;

export const CATEGORIES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
] as const;

export const LABOR_RATE_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'heavy_equipment', label: 'Heavy Equipment' },
  { value: 'roof', label: 'Roof Work' },
] as const;

// SH (Sodium Hypochlorite) concentration options - diluted from 12.5% stock
export const SH_SOURCE_CONCENTRATION = 12.5;

export const SH_CONCENTRATIONS = [
  { value: 1.0, label: '1%' },
  { value: 3.0, label: '3%' },
  { value: 5.0, label: '5%' },
  { value: 8.0, label: '8%' },
  { value: 10.0, label: '10%' },
  { value: 12.5, label: '12.5% (Full Strength)' },
] as const;
