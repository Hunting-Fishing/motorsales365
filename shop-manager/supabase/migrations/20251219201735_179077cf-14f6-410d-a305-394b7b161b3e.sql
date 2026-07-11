-- Disable only the audit trail trigger
ALTER TABLE equipment_assets DISABLE TRIGGER equipment_assets_audit;

-- Update fleet assets (vessels, trucks, vehicles, heavy equipment) to asset_class = 'fleet'
UPDATE equipment_assets 
SET asset_class = 'fleet' 
WHERE equipment_type::text IN (
  'vessel', 'marine', 'outboard',
  'flat_deck', 'fuel_truck', 'heavy_truck', 'roll_on_roll_off', 'semi', 'transport',
  'fleet_vehicle', 'courtesy_car', 'rental_vehicle', 'service_vehicle',
  'crane', 'dozer', 'excavator', 'forklift', 'loader', 'skid_steer'
);

-- Update shop equipment to asset_class = 'shop_equipment'  
UPDATE equipment_assets 
SET asset_class = 'shop_equipment' 
WHERE equipment_type::text IN (
  'air_tools', 'diagnostic', 'electrical', 'hand_tools', 'lifting',
  'generator', 'small_engine',
  'epirb', 'fire_extinguisher', 'first_aid_kit', 'flare', 'immersion_suit', 
  'life_jacket', 'life_raft', 'life_ring', 'safety_harness', 'survival_suit',
  'other'
);

-- Re-enable the trigger
ALTER TABLE equipment_assets ENABLE TRIGGER equipment_assets_audit;

-- Update equipment_categories table to have correct asset_class values
UPDATE equipment_categories 
SET asset_class = 'fleet' 
WHERE name IN ('Heavy Trucks', 'Heavy Equipment', 'Vehicles', 'Marine');

UPDATE equipment_categories 
SET asset_class = 'shop_equipment' 
WHERE name IN ('Shop Equipment', 'Small Engines', 'Safety Equipment', 'Other');