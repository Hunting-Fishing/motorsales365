export interface EquipmentCategory {
  id: string;
  shop_id: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// Category to equipment type mapping
export const CATEGORY_TYPE_MAP: Record<string, { label: string; value: string }[]> = {
  'Heavy Trucks': [
    { label: 'Flat Deck', value: 'flat_deck' },
    { label: 'Fuel Truck', value: 'fuel_truck' },
    { label: 'Heavy Truck', value: 'heavy_truck' },
    { label: 'Roll On Roll Off (Ro-Ro)', value: 'roll_on_roll_off' },
    { label: 'Semi Truck', value: 'semi' },
    { label: 'Transport', value: 'transport' },
  ],
  'Heavy Equipment': [
    { label: 'Crane', value: 'crane' },
    { label: 'Dozer', value: 'dozer' },
    { label: 'Excavator', value: 'excavator' },
    { label: 'Forklift', value: 'forklift' },
    { label: 'Loader', value: 'loader' },
    { label: 'Skid Steer', value: 'skid_steer' },
  ],
  'Vehicles': [
    { label: 'Courtesy Car', value: 'courtesy_car' },
    { label: 'Fleet Vehicle', value: 'fleet_vehicle' },
    { label: 'Rental Vehicle', value: 'rental_vehicle' },
    { label: 'Service Vehicle', value: 'service_vehicle' },
  ],
  'Marine': [
    { label: 'Marine Equipment', value: 'marine' },
    { label: 'Outboard Motor', value: 'outboard' },
    { label: 'Vessel', value: 'vessel' },
  ],
  'Shop Equipment': [
    { label: 'Air Tools', value: 'air_tools' },
    { label: 'Diagnostic Equipment', value: 'diagnostic' },
    { label: 'Electrical Equipment', value: 'electrical' },
    { label: 'Hand Tools', value: 'hand_tools' },
    { label: 'Lifting Equipment', value: 'lifting' },
  ],
  'Small Engines': [
    { label: 'Generator', value: 'generator' },
    { label: 'Small Engine', value: 'small_engine' },
  ],
  'Safety Equipment': [
    { label: 'EPIRB', value: 'epirb' },
    { label: 'Fire Extinguisher', value: 'fire_extinguisher' },
    { label: 'First Aid Kit', value: 'first_aid_kit' },
    { label: 'Flare', value: 'flare' },
    { label: 'Immersion Suit', value: 'immersion_suit' },
    { label: 'Life Jacket', value: 'life_jacket' },
    { label: 'Life Raft', value: 'life_raft' },
    { label: 'Life Ring', value: 'life_ring' },
    { label: 'Safety Harness', value: 'safety_harness' },
    { label: 'Survival Suit', value: 'survival_suit' },
  ],
  'Other': [
    { label: 'Other', value: 'other' },
  ],
};

// Get all types sorted alphabetically
export const getAllEquipmentTypes = (): { label: string; value: string; category: string }[] => {
  const allTypes: { label: string; value: string; category: string }[] = [];
  
  Object.entries(CATEGORY_TYPE_MAP).forEach(([category, types]) => {
    types.forEach(type => {
      allTypes.push({ ...type, category });
    });
  });
  
  return allTypes.sort((a, b) => a.label.localeCompare(b.label));
};

// Get types for a specific category, sorted alphabetically
export const getTypesForCategory = (categoryName: string): { label: string; value: string }[] => {
  const types = CATEGORY_TYPE_MAP[categoryName] || [];
  return [...types].sort((a, b) => a.label.localeCompare(b.label));
};

// Get category name from equipment type
export const getCategoryForType = (typeValue: string): string | null => {
  for (const [category, types] of Object.entries(CATEGORY_TYPE_MAP)) {
    if (types.some(t => t.value === typeValue)) {
      return category;
    }
  }
  return null;
};

// Asset class mapping - Fleet vs Shop Equipment
export const CATEGORY_ASSET_CLASS_MAP: Record<string, 'fleet' | 'shop_equipment'> = {
  'Heavy Trucks': 'fleet',
  'Heavy Equipment': 'fleet',
  'Vehicles': 'fleet',
  'Marine': 'fleet',
  'Shop Equipment': 'shop_equipment',
  'Small Engines': 'shop_equipment',
  'Safety Equipment': 'shop_equipment',
  'Other': 'shop_equipment',
};

// Get asset_class from category name
export const getAssetClassForCategory = (categoryName: string): 'fleet' | 'shop_equipment' => {
  return CATEGORY_ASSET_CLASS_MAP[categoryName] || 'shop_equipment';
};

// Get asset_class from equipment type value
export const getAssetClassForType = (typeValue: string): 'fleet' | 'shop_equipment' => {
  const category = getCategoryForType(typeValue);
  return category ? getAssetClassForCategory(category) : 'shop_equipment';
};
