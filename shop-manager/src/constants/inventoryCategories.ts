
// This file now serves as a reference for the comprehensive automotive inventory categories
// The actual categories are stored in and loaded from the database

// Comprehensive automotive inventory category structure for reference
export const AUTOMOTIVE_CATEGORY_SYSTEMS = {
  'Engine & Powertrain': [
    'Engine Parts',
    'Transmission', 
    'Fuel System',
    'Cooling System',
    'Exhaust System',
    'Drivetrain',
    'Belts & Hoses'
  ],
  'Chassis & Safety': [
    'Braking System',
    'Suspension',
    'Steering', 
    'Safety Equipment',
    'Tires & Wheels'
  ],
  'Electrical & Comfort': [
    'Electrical Components',
    'HVAC Components',
    'Lighting'
  ],
  'Body & Interior': [
    'Body Parts',
    'Interior Parts', 
    'Exterior Parts'
  ],
  'Maintenance & Tools': [
    'Maintenance & Fluids',
    'Tools',
    'Consumables',
    'Fasteners & Hardware'
  ],
  'Aftermarket & Accessories': [
    'Performance Parts',
    'Accessories'
  ]
};

// Legacy export for backwards compatibility
// Note: Categories are now loaded dynamically from the database
export const INVENTORY_CATEGORIES = [
  "Accessories",
  "Belts & Hoses", 
  "Body Parts",
  "Braking System",
  "Consumables",
  "Cooling System",
  "Drivetrain",
  "Electrical Components",
  "Engine Parts",
  "Exhaust System",
  "Exterior Parts",
  "Fasteners & Hardware",
  "Fuel System",
  "HVAC Components",
  "Interior Parts",
  "Lighting",
  "Maintenance & Fluids",
  "Performance Parts",
  "Safety Equipment",
  "Steering",
  "Suspension",
  "Tires & Wheels",
  "Tools",
  "Transmission"
];
