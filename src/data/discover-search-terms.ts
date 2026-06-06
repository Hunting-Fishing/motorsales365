// Curated Facebook Page search terms grouped by 365 business field.
// Used to seed admins with high-yield queries when discovering pages.

export type DiscoverGroup = {
  kind: string; // matches BUSINESS_KIND_OPTIONS value where possible
  label: string;
  terms: string[];
};

export const DISCOVER_SEARCH_GROUPS: DiscoverGroup[] = [
  {
    kind: "dealership",
    label: "Dealership / Showroom",
    terms: [
      "car dealer",
      "Toyota dealer",
      "Honda dealer",
      "Mitsubishi dealer",
      "Ford dealer",
      "Nissan dealer",
      "Hyundai dealer",
      "Kia dealer",
      "Suzuki dealer",
      "Isuzu dealer",
      "used car dealer",
      "second hand car",
      "truck dealer",
    ],
  },
  {
    kind: "motorcycle_shop",
    label: "Motorcycle shop",
    terms: [
      "motorcycle dealer",
      "Yamaha dealer",
      "Kawasaki dealer",
      "Honda motorcycle dealer",
      "motorcycle shop",
      "motorcycle parts",
      "motorcycle repair",
    ],
  },
  {
    kind: "rental",
    label: "Vehicle rental",
    terms: ["car rental", "van rental", "self drive rental", "motorcycle rental", "scooter rental"],
  },
  {
    kind: "parts_accessories",
    label: "Parts supplier / shop",
    terms: [
      "auto parts",
      "auto supply",
      "spare parts",
      "surplus parts",
      "Japan surplus parts",
      "engine parts",
      "transmission parts",
      "OEM parts",
    ],
  },
  {
    kind: "repair_shop",
    label: "Repair shop / mechanic",
    terms: [
      "auto repair shop",
      "car mechanic",
      "engine overhaul",
      "transmission repair",
      "diesel mechanic",
      "electrical auto repair",
      "aircon repair car",
    ],
  },
  {
    kind: "body_paint",
    label: "Body shop / paint",
    terms: ["auto body shop", "car paint shop", "auto paint", "dent repair", "collision repair"],
  },
  {
    kind: "tire_shop",
    label: "Tire shop / wheels",
    terms: [
      "tire shop",
      "vulcanizing shop",
      "wheel alignment",
      "mags and tires",
      "rims shop",
      "tire change",
    ],
  },
  {
    kind: "battery_shop",
    label: "Battery shop",
    terms: ["car battery", "battery shop", "Motolite", "Amaron battery", "battery delivery"],
  },
  {
    kind: "towing",
    label: "Tow / roadside",
    terms: ["towing service", "tow truck", "roadside assistance", "24 hour towing", "wrecker"],
  },
  {
    kind: "fuel_station",
    label: "Fuel station",
    terms: ["gas station", "petrol station", "Petron station", "Shell station", "Caltex station", "Phoenix station"],
  },
  {
    kind: "carwash",
    label: "Carwash / detailing",
    terms: [
      "carwash",
      "car wash",
      "auto detailing",
      "ceramic coating",
      "car interior cleaning",
      "motorcycle wash",
    ],
  },
  {
    kind: "salvage",
    label: "Salvage / scrap",
    terms: ["salvage yard", "junk yard", "scrap car", "wrecked cars", "surplus auto parts"],
  },
  {
    kind: "accessories",
    label: "Accessories / customization",
    terms: [
      "car accessories",
      "auto accessories",
      "motorcycle accessories",
      "off road accessories",
      "4x4 accessories",
      "truck accessories",
      "lifestyle vehicle customization",
    ],
  },
  {
    kind: "audio_tint",
    label: "Audio / window tint",
    terms: ["car audio", "car stereo", "window tint", "car tinting", "sound system installer"],
  },
  {
    kind: "inspection",
    label: "Inspection / emissions",
    terms: ["PMVIC", "emission testing", "private motor vehicle inspection", "smoke emission test"],
  },
  {
    kind: "driving_school",
    label: "Driving school",
    terms: ["driving school", "driving lessons", "motorcycle driving school", "LTO driving course"],
  },
  {
    kind: "lto_services",
    label: "LTO / registration",
    terms: ["LTO services", "car registration services", "OR CR renewal", "vehicle registration"],
  },
  {
    kind: "insurance",
    label: "Insurance",
    terms: ["car insurance", "auto insurance", "CTPL insurance", "comprehensive insurance broker"],
  },
  {
    kind: "financing",
    label: "Financing / loans",
    terms: ["car loan", "auto loan", "motorcycle financing", "car financing"],
  },
  {
    kind: "transport",
    label: "Transport / logistics",
    terms: ["trucking services", "logistics", "lipat bahay", "cargo van for hire", "delivery service"],
  },
  {
    kind: "corporate",
    label: "Corporate / fleet",
    terms: ["fleet management", "corporate car leasing", "company vehicle leasing"],
  },
];

export const ALL_DISCOVER_TERMS = Array.from(
  new Set(DISCOVER_SEARCH_GROUPS.flatMap((g) => g.terms)),
).sort();
