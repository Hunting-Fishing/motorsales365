
-- Create parts_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.parts_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Clear existing data and insert the new categories
DELETE FROM parts_categories;

INSERT INTO parts_categories (name, description) VALUES
('Air & Fuel Delivery', 'Air filters, intake, fuel pumps, injectors'),
('Axles & Differentials', 'CV axles, differentials, U-joints'),
('Belts & Hoses', 'Serpentine belts, timing belts, hoses'),
('Body & Trim', 'Panels, bumpers, trim pieces'),
('Brakes - Hydraulic', 'Brake lines, master cylinders'),
('Brakes - Friction', 'Pads, rotors, calipers, drums'),
('Cooling System', 'Radiators, water pumps, thermostats'),
('Electrical - Charging & Starting', 'Batteries, alternators, starters'),
('Electrical - Lighting', 'Headlights, taillights, bulbs'),
('Electrical - Wiring & Controls', 'Wiring harnesses, fuses, relays'),
('Emissions & Exhaust', 'Catalytic converters, mufflers, sensors'),
('Engine - Internal', 'Pistons, valves, camshafts'),
('Engine - Gaskets & Seals', 'Gaskets, seals'),
('Engine - Mounts & Hardware', 'Engine mounts, brackets'),
('Fluids & Lubricants', 'Engine oil, ATF, additives'),
('Fuel System', 'Fuel tanks, filters'),
('Heating & Air Conditioning (HVAC)', 'Compressors, condensers, blowers'),
('Ignition System', 'Spark plugs, ignition coils'),
('Interior Components', 'Dash panels, seat hardware'),
('Maintenance Items', 'Oil filters, cabin filters, wipers'),
('Sensors & Electronics', 'ABS sensors, MAF, ECUs'),
('Steering - Linkage', 'Tie rods, pitman arms'),
('Steering - Power Assist', 'Power steering pumps, hoses'),
('Suspension - Springs & Shocks', 'Coil springs, shocks'),
('Suspension - Control Arms & Bushings', 'Control arms, bushings'),
('Tires & Wheels', 'Tires, rims, bearings'),
('Transmission & Clutch', 'Clutches, flywheels, solenoids'),
('Drive Shafts & U-Joints', 'Drive shafts, U-joints'),
('Glass, Mirrors & Wipers', 'Windshields, mirrors, wipers'),
('Hardware, Fasteners & Misc', 'Bolts, clips, fasteners'),
('Accessories & Add-ons', 'Floor mats, covers'),
('Shop Supplies', 'Shop rags, cleaner, sealants'),
('Other / Miscellaneous', 'Everything else');
