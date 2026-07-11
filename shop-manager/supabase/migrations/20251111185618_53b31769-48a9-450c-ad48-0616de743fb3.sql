-- Add missing equipment types to the enum
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'fleet_vehicle';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'courtesy_car';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'rental_vehicle';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'service_vehicle';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'heavy_truck';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'excavator';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'loader';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'dozer';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'crane';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'vessel';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'outboard';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'diagnostic';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'lifting';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'air_tools';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'hand_tools';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'electrical';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'generator';