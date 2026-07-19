// Inventory taxonomy per business kind.
//
// Each business kind maps to a set of main categories, each with matching
// subcategories. A COMMON block is merged into every kind so shared items
// (shop supplies, packaging, uniforms, etc.) are always available.
//
// Keys must stay aligned with `src/data/business-kinds.ts` (business_kind).

export type CategoryTree = Record<string, string[]>;

const COMMON: CategoryTree = {
  "Shop Supplies": ["Rags & Wipes", "Gloves", "Cleaners & Degreasers", "Absorbents", "Tape & Adhesives", "PPE"],
  "Packaging": ["Boxes", "Bags", "Labels", "Receipt Paper"],
  "Office & Admin": ["Stationery", "Printer Ink", "Forms"],
  "Uniforms & Apparel": ["Shirts", "Coveralls", "Caps", "Safety Vests"],
  "Other": ["Miscellaneous"],
};

const KIND_TREES: Record<string, CategoryTree> = {
  dealership: {
    "Vehicles": ["New Units", "Demo Units", "Pre-Owned"],
    "Accessories": ["Floor Mats", "Seat Covers", "Roof Racks", "Dash Cams"],
    "Documents & Plates": ["OR/CR Folders", "Plate Holders", "Temporary Plates"],
    "Detailing": ["Wax", "Polish", "Interior Cleaner"],
  },
  used_dealership: {
    "Vehicles": ["Sedans", "SUVs", "Pickups", "Vans", "Motorcycles"],
    "Reconditioning": ["Touch-Up Paint", "Buffing Compound", "Interior Shampoo"],
    "Documents & Plates": ["OR/CR Folders", "Deed Forms", "Plate Holders"],
  },
  motorcycle_shop: {
    "Motorcycles": ["Scooters", "Underbones", "Sport", "Cruiser", "Off-Road"],
    "Parts": ["Engine", "Transmission", "Brakes", "Suspension", "Electrical", "Body & Plastics"],
    "Tires & Wheels": ["Street Tires", "Off-Road Tires", "Tubes", "Rims"],
    "Fluids & Chemicals": ["Engine Oil", "Chain Lube", "Brake Fluid", "Coolant"],
    "Riding Gear": ["Helmets", "Gloves", "Jackets", "Boots"],
    "Accessories": ["Top Boxes", "Crash Bars", "Phone Mounts", "LED Lights"],
  },
  rental: {
    "Fleet Vehicles": ["Sedans", "SUVs", "Vans", "Motorcycles"],
    "Fleet Consumables": ["Fuel Cards", "Air Fresheners", "Seat Covers"],
    "Documents": ["Rental Agreements", "Waivers", "Inspection Forms"],
    "Cleaning": ["Interior Cleaner", "Vacuum Bags", "Disinfectant"],
  },
  parts_accessories: {
    "Engine Parts": ["Belts", "Hoses", "Gaskets", "Sensors", "Pistons"],
    "Drivetrain": ["Clutch", "CV Joints", "Bearings"],
    "Suspension & Steering": ["Shocks", "Struts", "Bushings", "Tie Rods"],
    "Brakes": ["Pads", "Rotors", "Calipers", "Brake Lines"],
    "Electrical": ["Batteries", "Alternators", "Starters", "Wiring"],
    "Filters": ["Oil", "Air", "Fuel", "Cabin"],
    "Fluids & Chemicals": ["Engine Oil", "ATF", "Coolant", "Brake Fluid"],
    "Tires & Wheels": ["Tires", "Rims", "TPMS Sensors"],
    "Accessories": ["Floor Mats", "Seat Covers", "Lighting", "Audio"],
  },
  repair_shop: {
    "Parts": ["Engine", "Transmission", "Brakes", "Suspension", "Electrical", "Cooling"],
    "Filters": ["Oil", "Air", "Fuel", "Cabin"],
    "Fluids & Chemicals": ["Engine Oil", "ATF", "Coolant", "Brake Fluid", "Power Steering"],
    "Tools & Equipment": ["Hand Tools", "Power Tools", "Diagnostic", "Lifts"],
    "Consumables": ["Nuts & Bolts", "Zip Ties", "Wire", "Fuses"],
    "Batteries": ["Automotive", "Motorcycle", "Heavy Duty"],
  },
  body_paint: {
    "Paint & Coatings": ["Basecoat", "Clearcoat", "Primer", "Reducer", "Hardener"],
    "Body Parts": ["Panels", "Bumpers", "Fenders", "Hoods"],
    "Materials": ["Sandpaper", "Body Filler", "Masking Tape", "Masking Paper"],
    "Tools & Equipment": ["Spray Guns", "Sanders", "Buffers", "Booth Filters"],
    "PPE": ["Respirators", "Suits", "Gloves"],
  },
  tire_shop: {
    "Tires": ["Passenger", "SUV/Light Truck", "Commercial", "Motorcycle", "Off-Road"],
    "Wheels": ["Alloy", "Steel", "Custom"],
    "Valves & TPMS": ["Rubber Valves", "Metal Valves", "TPMS Sensors"],
    "Balancing & Repair": ["Weights", "Patches", "Plugs", "Sealant"],
    "Tools & Equipment": ["Tire Machines", "Balancers", "Torque Wrenches"],
  },
  battery_shop: {
    "Batteries": ["Automotive", "Motorcycle", "Truck / Bus", "Marine", "Deep Cycle", "Solar"],
    "Chargers & Testers": ["Chargers", "Load Testers", "Jump Starters"],
    "Terminals & Cables": ["Terminals", "Cable Lugs", "Battery Cables"],
    "Accessories": ["Trays", "Hold-Downs", "Corrosion Spray"],
  },
  towing: {
    "Straps & Chains": ["Ratchet Straps", "Tow Chains", "Winch Straps"],
    "Dollies & Skates": ["Wheel Dollies", "Go-Jaks", "Skates"],
    "Fluids & Chemicals": ["Diesel", "Gasoline", "Hydraulic Oil"],
    "Tools & Equipment": ["Winches", "Jump Packs", "Lockout Kits"],
    "Safety": ["Cones", "Triangles", "Flares", "Hi-Vis Vests"],
  },
  fuel_station: {
    "Fuels": ["Gasoline (91)", "Gasoline (95)", "Gasoline (97)", "Diesel", "Kerosene", "LPG Auto"],
    "Lubricants": ["Engine Oil", "2T Oil", "Gear Oil", "Grease"],
    "Automotive Consumables": ["Coolant", "Brake Fluid", "Washer Fluid", "Wiper Blades"],
    "LPG & Cylinders": ["11kg LPG", "22kg LPG", "50kg LPG"],
    "Convenience — Food": ["Snacks", "Hot Meals", "Sandwiches", "Rice Meals", "Pastries"],
    "Convenience — Beverages": ["Bottled Water", "Soft Drinks", "Coffee", "Energy Drinks", "Juice"],
    "Convenience — Grocery": ["Instant Noodles", "Canned Goods", "Bread", "Chips"],
    "Tobacco & Vape": ["Cigarettes", "Vape Pods", "E-Liquid"],
    "Automotive Accessories": ["Air Fresheners", "Phone Chargers", "Floor Mats"],
    "Prepaid & Load": ["e-Load", "Prepaid Cards", "Toll RFID"],
  },
  carwash: {
    "Wash Chemicals": ["Shampoo", "Foam", "Tire Black", "Wax", "Glass Cleaner"],
    "Interior Care": ["Vinyl Dressing", "Fabric Cleaner", "Leather Cleaner", "Air Fresheners"],
    "Materials": ["Microfiber Towels", "Sponges", "Chamois", "Applicator Pads"],
    "Detailing": ["Compound", "Polish", "Ceramic Coating", "Clay Bar"],
    "Equipment": ["Pressure Washers", "Vacuums", "Foam Cannons"],
  },
  salvage: {
    "Used Parts": ["Engines", "Transmissions", "Body Panels", "Interior", "Electrical"],
    "Scrap Metal": ["Ferrous", "Non-Ferrous", "Aluminum", "Copper"],
    "Cores": ["Alternators", "Starters", "Compressors", "Batteries"],
    "Wheels & Tires": ["Used Rims", "Used Tires"],
  },
  accessories: {
    "Exterior": ["Body Kits", "Spoilers", "Grilles", "Roof Racks"],
    "Interior": ["Seat Covers", "Floor Mats", "Dash Kits", "Steering Covers"],
    "Lighting": ["LED Bulbs", "Light Bars", "HID Kits"],
    "Electronics": ["Dash Cams", "GPS", "Phone Mounts", "Chargers"],
    "Performance": ["Air Intakes", "Exhaust Tips", "Chips / Tuners"],
  },
  audio_tint: {
    "Head Units": ["Single DIN", "Double DIN", "Android Auto"],
    "Speakers & Amps": ["Component Sets", "Coaxial", "Subwoofers", "Amplifiers"],
    "Wiring & Install": ["Wiring Kits", "Harnesses", "Dampening"],
    "Window Film": ["Dyed", "Carbon", "Ceramic", "Security"],
    "Tools": ["Heat Guns", "Squeegees", "Blades"],
  },
  inspection: {
    "Test Equipment": ["OBD Scanners", "Emission Analyzers", "Brake Testers"],
    "Consumables": ["Forms", "Stickers", "Printer Paper"],
    "Reference": ["Standards Manuals", "Charts"],
  },
  driving_school: {
    "Learning Materials": ["Textbooks", "Workbooks", "Practice Tests", "Videos"],
    "Vehicle Consumables": ["Fuel", "Oil", "Windshield Fluid"],
    "Signage & Cones": ["Cones", "Barriers", "Student Driver Signs"],
    "Merchandise": ["Uniforms", "Reflectors"],
  },
  lto_services: {
    "Forms & Documents": ["Application Forms", "Envelopes", "Folders"],
    "Consumables": ["Photocopy Paper", "Printer Ink", "Laminating Pouches"],
    "Merchandise": ["Plate Holders", "Sticker Frames"],
  },
  insurance: {
    "Policies & Forms": ["Comprehensive", "CTPL", "Endorsement Forms"],
    "Marketing": ["Brochures", "Flyers", "Signage"],
    "Office": ["Printer Ink", "Envelopes", "Stationery"],
  },
  financing: {
    "Documents": ["Loan Applications", "Contracts", "Disclosure Statements"],
    "Marketing": ["Brochures", "Flyers"],
    "Office": ["Stationery", "Printer Ink"],
  },
  transport: {
    "Fleet Vehicles": ["Trucks", "Vans", "Trailers"],
    "Fluids & Fuel": ["Diesel", "Engine Oil", "DEF / AdBlue", "Hydraulic Oil"],
    "Parts": ["Filters", "Brakes", "Belts", "Hoses"],
    "Tires": ["Truck Tires", "Retreads"],
    "Cargo Handling": ["Straps", "Chains", "Pallets", "Tarps"],
  },
  corporate: {
    "Fleet Vehicles": ["Sedans", "SUVs", "Vans", "Trucks"],
    "Fleet Consumables": ["Fuel Cards", "Oil", "Filters"],
    "Office": ["Stationery", "Printer Ink"],
  },
  other: {},
};

function merge(a: CategoryTree, b: CategoryTree): CategoryTree {
  const out: CategoryTree = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = Array.from(new Set([...(out[k] ?? []), ...v]));
  }
  return out;
}

export function inventoryTreeFor(kind: string | null | undefined): CategoryTree {
  const base = (kind && KIND_TREES[kind]) || {};
  return merge(base, COMMON);
}

export function mainCategoriesFor(kind: string | null | undefined): string[] {
  return Object.keys(inventoryTreeFor(kind));
}

export function subcategoriesFor(
  kind: string | null | undefined,
  main: string | null | undefined,
): string[] {
  if (!main) return [];
  return inventoryTreeFor(kind)[main] ?? [];
}
