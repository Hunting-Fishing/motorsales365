// Comprehensive hierarchical inventory categories for automotive, marine, and heavy-duty equipment

export interface CategoryOption {
  value: string;
  label: string;
  subcategories?: string[];
}

export const EXPANDED_INVENTORY_CATEGORIES: Record<string, CategoryOption> = {
  'Engine & Powertrain': {
    value: 'engine_powertrain',
    label: 'Engine & Powertrain',
    subcategories: [
      'Engine Block & Cylinder Head',
      'Pistons & Rings',
      'Crankshaft & Camshaft',
      'Timing Components',
      'Gaskets & Seals',
      'Oil Pumps & Oil Pans',
      'Turbochargers & Superchargers',
      'Transmission Assembly',
      'Clutch Systems',
      'Torque Converters',
      'Drive Shafts',
      'CV Joints & Axles'
    ]
  },
  'Fuel & Exhaust': {
    value: 'fuel_exhaust',
    label: 'Fuel & Exhaust',
    subcategories: [
      'Fuel Pumps',
      'Fuel Injectors',
      'Fuel Filters',
      'Fuel Lines & Hoses',
      'Carburetors',
      'Exhaust Manifolds',
      'Catalytic Converters',
      'Mufflers',
      'Exhaust Pipes',
      'O2 Sensors'
    ]
  },
  'Cooling & Climate': {
    value: 'cooling_climate',
    label: 'Cooling & Climate',
    subcategories: [
      'Radiators',
      'Water Pumps',
      'Thermostats',
      'Cooling Fans',
      'Coolant Hoses',
      'HVAC Compressors',
      'Condensers',
      'Evaporators',
      'Heater Cores',
      'Climate Control Units'
    ]
  },
  'Braking System': {
    value: 'braking',
    label: 'Braking System',
    subcategories: [
      'Brake Pads',
      'Brake Rotors',
      'Brake Calipers',
      'Brake Master Cylinders',
      'Brake Lines & Hoses',
      'ABS Components',
      'Parking Brake Parts',
      'Brake Fluid',
      'Brake Hardware Kits'
    ]
  },
  'Suspension & Steering': {
    value: 'suspension_steering',
    label: 'Suspension & Steering',
    subcategories: [
      'Shock Absorbers',
      'Struts',
      'Springs',
      'Control Arms',
      'Ball Joints',
      'Tie Rods',
      'Steering Racks',
      'Power Steering Pumps',
      'Sway Bars',
      'Bushings & Mounts'
    ]
  },
  'Tires & Wheels': {
    value: 'tires_wheels',
    label: 'Tires & Wheels',
    subcategories: [
      'Automotive Tires',
      'Truck Tires',
      'Heavy Duty Tires',
      'Marine Trailer Tires',
      'Specialty Tires',
      'Wheels & Rims',
      'Tire Pressure Sensors',
      'Wheel Bearings',
      'Hub Assemblies',
      'Lug Nuts & Studs'
    ]
  },
  'Electrical & Lighting': {
    value: 'electrical_lighting',
    label: 'Electrical & Lighting',
    subcategories: [
      'Batteries',
      'Alternators',
      'Starters',
      'Ignition Coils',
      'Spark Plugs & Wires',
      'Headlights',
      'Tail Lights',
      'LED Light Bars',
      'Wiring Harnesses',
      'Fuses & Relays',
      'Sensors & Switches'
    ]
  },
  'Seals & Gaskets': {
    value: 'seals_gaskets',
    label: 'Seals & Gaskets',
    subcategories: [
      'Engine Seals',
      'Transmission Seals',
      'Differential Seals',
      'Wheel Seals',
      'Oil Seals',
      'Shaft Seals',
      'O-Rings',
      'Head Gaskets',
      'Intake Gaskets',
      'Exhaust Gaskets',
      'Pan Gaskets',
      'Marine Seals',
      'Heavy Duty Seals'
    ]
  },
  'Marine Equipment': {
    value: 'marine',
    label: 'Marine Equipment',
    subcategories: [
      'Marine Engines',
      'Outboard Motors',
      'Inboard Motors',
      'Propellers',
      'Marine Pumps',
      'Fuel Systems - Marine',
      'Cooling Systems - Marine',
      'Marine Electrical',
      'Navigation Equipment',
      'Marine Seals & Gaskets',
      'Marine Hoses',
      'Steering Systems - Marine',
      'Marine Batteries',
      'Bilge Pumps',
      'Marine Hardware'
    ]
  },
  'Heavy Duty Equipment': {
    value: 'heavy_duty',
    label: 'Heavy Duty Equipment',
    subcategories: [
      'Heavy Duty Engines',
      'Heavy Duty Transmissions',
      'Heavy Duty Differentials',
      'Heavy Duty Brakes',
      'Air Brake Systems',
      'Heavy Duty Suspension',
      'Heavy Duty Tires',
      'Heavy Duty Batteries',
      'Heavy Duty Alternators',
      'Heavy Duty Starters',
      'Hydraulic Components',
      'Heavy Duty Seals',
      'Heavy Duty Filters',
      'PTO Components'
    ]
  },
  'Filters & Fluids': {
    value: 'filters_fluids',
    label: 'Filters & Fluids',
    subcategories: [
      'Oil Filters',
      'Air Filters',
      'Fuel Filters',
      'Cabin Air Filters',
      'Transmission Filters',
      'Hydraulic Filters',
      'Motor Oil',
      'Transmission Fluid',
      'Brake Fluid',
      'Coolant/Antifreeze',
      'Power Steering Fluid',
      'Hydraulic Fluid',
      'Grease & Lubricants'
    ]
  },
  'Body & Exterior': {
    value: 'body_exterior',
    label: 'Body & Exterior',
    subcategories: [
      'Bumpers',
      'Fenders',
      'Hoods',
      'Doors',
      'Mirrors',
      'Grilles',
      'Trim & Molding',
      'Windshields',
      'Weather Stripping',
      'Paint & Body Supplies'
    ]
  },
  'Interior & Accessories': {
    value: 'interior_accessories',
    label: 'Interior & Accessories',
    subcategories: [
      'Seats',
      'Seat Covers',
      'Floor Mats',
      'Dashboards',
      'Door Panels',
      'Interior Trim',
      'Audio Systems',
      'GPS & Electronics',
      'Storage Solutions',
      'Comfort Accessories'
    ]
  },
  'Tools & Equipment': {
    value: 'tools_equipment',
    label: 'Tools & Equipment',
    subcategories: [
      'Hand Tools',
      'Power Tools',
      'Diagnostic Tools',
      'Lifting Equipment',
      'Air Tools',
      'Specialty Tools',
      'Tool Storage',
      'Safety Equipment',
      'Shop Supplies'
    ]
  },
  'Belts & Hoses': {
    value: 'belts_hoses',
    label: 'Belts & Hoses',
    subcategories: [
      'Serpentine Belts',
      'Timing Belts',
      'V-Belts',
      'Coolant Hoses',
      'Fuel Hoses',
      'Vacuum Hoses',
      'Hydraulic Hoses',
      'Marine Hoses',
      'Heavy Duty Hoses',
      'Clamps & Fittings'
    ]
  },
  'Fasteners & Hardware': {
    value: 'fasteners_hardware',
    label: 'Fasteners & Hardware',
    subcategories: [
      'Bolts',
      'Nuts',
      'Screws',
      'Washers',
      'Clips & Retainers',
      'Rivets',
      'Pins',
      'Thread Repair',
      'Adhesives',
      'Hardware Kits'
    ]
  }
};

// Flatten for simple dropdown (backwards compatible)
export const FLAT_CATEGORY_LIST = Object.values(EXPANDED_INVENTORY_CATEGORIES).map(cat => cat.label);

// Get all subcategories for a main category
export function getSubcategories(mainCategory: string): string[] {
  const category = Object.values(EXPANDED_INVENTORY_CATEGORIES).find(
    cat => cat.label === mainCategory || cat.value === mainCategory
  );
  return category?.subcategories || [];
}

// Get main category from subcategory
export function getMainCategory(subcategory: string): string | null {
  for (const category of Object.values(EXPANDED_INVENTORY_CATEGORIES)) {
    if (category.subcategories?.includes(subcategory)) {
      return category.label;
    }
  }
  return null;
}
