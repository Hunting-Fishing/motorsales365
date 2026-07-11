
export interface AutomotiveSupplier {
  name: string;
  category: string;
  description?: string;
  contactInfo?: {
    phone?: string;
    website?: string;
    email?: string;
  };
  specialties?: string[];
}

export const AUTOMOTIVE_SUPPLIERS: AutomotiveSupplier[] = [
  // Major Auto Parts Chains
  {
    name: "NAPA Auto Parts",
    category: "Major Chain",
    description: "National automotive parts distributor",
    contactInfo: {
      phone: "1-800-LET-NAPA",
      website: "https://www.napaonline.com"
    },
    specialties: ["OEM Parts", "Aftermarket Parts", "Tools", "Fluids"]
  },
  {
    name: "AutoZone",
    category: "Major Chain",
    description: "Leading retailer and distributor of automotive replacement parts",
    contactInfo: {
      phone: "1-800-AUTOZONE",
      website: "https://www.autozone.com"
    },
    specialties: ["DIY Parts", "Professional Parts", "Tools", "Batteries"]
  },
  {
    name: "O'Reilly Auto Parts",
    category: "Major Chain",
    description: "Professional auto parts retailer",
    contactInfo: {
      phone: "1-800-GET-HELP",
      website: "https://www.oreillyauto.com"
    },
    specialties: ["Professional Parts", "Heavy Duty", "Tools", "Equipment"]
  },
  {
    name: "Advance Auto Parts",
    category: "Major Chain",
    description: "Automotive aftermarket parts provider",
    contactInfo: {
      phone: "1-877-ADVANCE",
      website: "https://www.advanceautoparts.com"
    },
    specialties: ["Professional Parts", "Performance Parts", "Tools"]
  },
  {
    name: "Bumper to Bumper",
    category: "Professional",
    description: "Professional automotive parts distributor",
    contactInfo: {
      website: "https://www.bumpertobumper.ca"
    },
    specialties: ["Professional Parts", "Heavy Duty", "Commercial Vehicle Parts"]
  },
  
  // Professional Distributors
  {
    name: "Worldpac",
    category: "Professional",
    description: "Professional automotive parts distributor specializing in import parts",
    contactInfo: {
      phone: "1-800-888-2772",
      website: "https://www.worldpac.com"
    },
    specialties: ["Import Parts", "European Parts", "Asian Parts", "OEM Parts"]
  },
  {
    name: "Parts Authority",
    category: "Professional",
    description: "Professional automotive parts distributor",
    specialties: ["Professional Parts", "Heavy Duty", "Commercial Parts"]
  },
  {
    name: "LKQ Corporation",
    category: "Professional",
    description: "Leading provider of alternative and specialty parts",
    contactInfo: {
      phone: "1-877-557-2677",
      website: "https://www.lkqcorp.com"
    },
    specialties: ["Recycled Parts", "Aftermarket Parts", "Collision Parts"]
  },
  {
    name: "Standard Motor Products",
    category: "Manufacturer",
    description: "Automotive replacement parts manufacturer",
    contactInfo: {
      website: "https://www.smpcorp.com"
    },
    specialties: ["Engine Management", "Temperature Control", "Electrical Parts"]
  },
  
  // Specialty Suppliers
  {
    name: "AC Delco",
    category: "OEM",
    description: "General Motors original equipment parts",
    contactInfo: {
      website: "https://www.acdelco.com"
    },
    specialties: ["GM OEM Parts", "Batteries", "Filters", "Fluids"]
  },
  {
    name: "Motorcraft",
    category: "OEM", 
    description: "Ford Motor Company original equipment parts",
    contactInfo: {
      website: "https://www.motorcraftservice.com"
    },
    specialties: ["Ford OEM Parts", "Filters", "Fluids", "Batteries"]
  },
  {
    name: "Mopar",
    category: "OEM",
    description: "Chrysler, Dodge, Jeep, Ram original equipment parts",
    contactInfo: {
      website: "https://www.mopar.com"
    },
    specialties: ["Chrysler OEM Parts", "Performance Parts", "Accessories"]
  },
  {
    name: "Genuine Toyota Parts",
    category: "OEM",
    description: "Toyota original equipment parts",
    contactInfo: {
      website: "https://www.toyota.com/parts"
    },
    specialties: ["Toyota OEM Parts", "Lexus Parts", "Hybrid Components"]
  },
  {
    name: "Honda Genuine Parts",
    category: "OEM",
    description: "Honda original equipment parts",
    contactInfo: {
      website: "https://www.hondapartsnow.com"
    },
    specialties: ["Honda OEM Parts", "Acura Parts", "Motorcycle Parts"]
  },
  
  // Performance & Specialty
  {
    name: "Summit Racing",
    category: "Performance",
    description: "Performance and racing parts supplier",
    contactInfo: {
      phone: "1-800-230-3030",
      website: "https://www.summitracing.com"
    },
    specialties: ["Performance Parts", "Racing Parts", "Custom Parts"]
  },
  {
    name: "JEGS",
    category: "Performance",
    description: "High performance automotive parts",
    contactInfo: {
      phone: "1-800-345-4545",
      website: "https://www.jegs.com"
    },
    specialties: ["Performance Parts", "Racing Parts", "Tools"]
  },
  
  // Filters & Fluids
  {
    name: "WIX Filters",
    category: "Specialty",
    description: "Filtration products manufacturer",
    contactInfo: {
      website: "https://www.wixfilters.com"
    },
    specialties: ["Oil Filters", "Air Filters", "Fuel Filters", "Cabin Filters"]
  },
  {
    name: "Fram",
    category: "Specialty",
    description: "Automotive filtration products",
    contactInfo: {
      website: "https://www.fram.com"
    },
    specialties: ["Oil Filters", "Air Filters", "Fuel Filters"]
  },
  {
    name: "Mobil 1",
    category: "Specialty",
    description: "Synthetic motor oil and automotive lubricants",
    contactInfo: {
      website: "https://www.mobil1.com"
    },
    specialties: ["Synthetic Oil", "Conventional Oil", "Transmission Fluid"]
  },
  {
    name: "Valvoline",
    category: "Specialty", 
    description: "Motor oil and automotive lubricants",
    contactInfo: {
      website: "https://www.valvoline.com"
    },
    specialties: ["Motor Oil", "Transmission Fluid", "Coolant", "Brake Fluid"]
  },
  
  // Tires
  {
    name: "Discount Tire",
    category: "Tires",
    description: "Tire retailer and distributor",
    contactInfo: {
      phone: "1-800-DISCOUNT",
      website: "https://www.discounttire.com"
    },
    specialties: ["Tires", "Wheels", "TPMS", "Tire Services"]
  },
  {
    name: "Tire Rack",
    category: "Tires",
    description: "Online tire and wheel retailer",
    contactInfo: {
      phone: "1-888-541-1777",
      website: "https://www.tirerack.com"
    },
    specialties: ["Tires", "Wheels", "Performance Tires", "Winter Tires"]
  },
  
  // Heavy Duty & Commercial
  {
    name: "Fleetpride",
    category: "Heavy Duty",
    description: "Heavy duty truck parts distributor",
    contactInfo: {
      phone: "1-800-FLEET-1",
      website: "https://www.fleetpride.com"
    },
    specialties: ["Heavy Duty Parts", "Truck Parts", "Trailer Parts", "Fleet Services"]
  },
  {
    name: "4 State Trucks",
    category: "Heavy Duty",
    description: "Heavy duty truck parts and accessories",
    contactInfo: {
      phone: "1-800-TRUCKS-1",
      website: "https://www.4statetrucks.com"
    },
    specialties: ["Truck Parts", "Chrome Accessories", "Performance Parts"]
  }
];

export const SUPPLIER_CATEGORIES = [
  "Major Chain",
  "Professional", 
  "OEM",
  "Performance",
  "Specialty",
  "Tires",
  "Heavy Duty",
  "Manufacturer"
] as const;

export type SupplierCategory = typeof SUPPLIER_CATEGORIES[number];
