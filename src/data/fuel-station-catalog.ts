// Curated catalog of services & products found at fuel stations in PH.
// Owners pick from this in the dashboard "Add service" flow. Custom items
// stay private to the business (do not feed back into the shared catalog).

export type CatalogItem = {
  key: string;        // stable id, persisted as business_services.catalog_key
  title: string;
  description?: string;
  unit?: string;      // "L", "item", "kg", "service", "min"
  category: string;
};

export type CatalogGroup = {
  key: string;
  label: string;
  description?: string;
  items: CatalogItem[];
};

export const FUEL_STATION_CATALOG: CatalogGroup[] = [
  {
    key: "gasoline",
    label: "Gasoline (unleaded)",
    description: "Pump fuels classified by Research Octane Number (RON).",
    items: [
      { key: "gas_91", title: "Regular 91 RON", description: "Standard unleaded for commuter cars and motorcycles.", unit: "L", category: "gasoline" },
      { key: "gas_95", title: "Premium 95 RON", description: "Mid-grade for modern sedans, SUVs, performance commuters.", unit: "L", category: "gasoline" },
      { key: "gas_97", title: "Premium Plus 97 RON", description: "High-octane for European and performance vehicles.", unit: "L", category: "gasoline" },
      { key: "gas_100", title: "Race / 100 RON", description: "Track-grade (e.g. Petron Blaze 100, Shell V-Power Racing).", unit: "L", category: "gasoline" },
    ],
  },
  {
    key: "diesel",
    label: "Diesel",
    items: [
      { key: "diesel_std", title: "Standard Diesel", description: "Meets DOE Cetane ~50 CN. Most consumer & commercial diesel vehicles.", unit: "L", category: "diesel" },
      { key: "diesel_premium", title: "Premium / Performance Diesel", description: "Additised for cleaner combustion, lower emissions, better power.", unit: "L", category: "diesel" },
      { key: "diesel_bio", title: "Biodiesel Blend (B5)", description: "Diesel blended with coco-methyl ester per PH biofuels law.", unit: "L", category: "diesel" },
    ],
  },
  {
    key: "alt_fuel",
    label: "Alternative fuels",
    items: [
      { key: "autolpg", title: "Auto LPG", description: "Liquefied petroleum gas for converted vehicles.", unit: "L", category: "alt_fuel" },
      { key: "ev_ac", title: "EV charging — AC (Type 2)", description: "Slow / destination AC charging.", unit: "kWh", category: "alt_fuel" },
      { key: "ev_dc_ccs", title: "EV fast charging — DC CCS2", description: "DC fast charging (CCS2).", unit: "kWh", category: "alt_fuel" },
      { key: "ev_dc_chademo", title: "EV fast charging — CHAdeMO", description: "DC fast charging (CHAdeMO).", unit: "kWh", category: "alt_fuel" },
    ],
  },
  {
    key: "lubes",
    label: "Lubricants & fluids",
    items: [
      { key: "oil_change", title: "Oil change service", description: "Drain & refill, includes new filter on request.", unit: "service", category: "lubes" },
      { key: "engine_oil_synthetic", title: "Fully synthetic engine oil", unit: "L", category: "lubes" },
      { key: "engine_oil_semi", title: "Semi-synthetic engine oil", unit: "L", category: "lubes" },
      { key: "engine_oil_mineral", title: "Mineral engine oil", unit: "L", category: "lubes" },
      { key: "motorcycle_oil", title: "Motorcycle oil", unit: "L", category: "lubes" },
      { key: "atf", title: "Automatic transmission fluid (ATF)", unit: "L", category: "lubes" },
      { key: "brake_fluid", title: "Brake fluid (DOT 3 / DOT 4)", unit: "L", category: "lubes" },
      { key: "coolant", title: "Coolant / radiator fluid", unit: "L", category: "lubes" },
      { key: "power_steering", title: "Power steering fluid", unit: "L", category: "lubes" },
      { key: "grease", title: "Multipurpose grease", unit: "item", category: "lubes" },
    ],
  },
  {
    key: "carcare",
    label: "Car care & wash",
    items: [
      { key: "wash_basic", title: "Basic car wash", unit: "service", category: "carcare" },
      { key: "wash_premium", title: "Premium wash & wax", unit: "service", category: "carcare" },
      { key: "wash_motorcycle", title: "Motorcycle wash", unit: "service", category: "carcare" },
      { key: "interior_clean", title: "Interior vacuum & wipe", unit: "service", category: "carcare" },
      { key: "engine_wash", title: "Engine bay wash", unit: "service", category: "carcare" },
      { key: "tire_black", title: "Tire black / dressing", unit: "service", category: "carcare" },
      { key: "armor_all", title: "Dashboard armour / shine", unit: "service", category: "carcare" },
    ],
  },
  {
    key: "tire_air",
    label: "Tire, air & quick service",
    items: [
      { key: "free_air", title: "Free air for tires", unit: "service", category: "tire_air" },
      { key: "nitrogen", title: "Nitrogen tire inflation", unit: "service", category: "tire_air" },
      { key: "tire_patch", title: "Tire patch / vulcanizing", unit: "service", category: "tire_air" },
      { key: "tire_change", title: "Tire change & mounting", unit: "service", category: "tire_air" },
      { key: "battery_jump", title: "Battery jumpstart", unit: "service", category: "tire_air" },
      { key: "battery_swap", title: "Battery installation", unit: "service", category: "tire_air" },
      { key: "wiper_install", title: "Wiper blade install", unit: "service", category: "tire_air" },
      { key: "bulb_install", title: "Bulb replacement", unit: "service", category: "tire_air" },
    ],
  },
  {
    key: "lpg",
    label: "LPG & propane refill",
    items: [
      { key: "lpg_11kg", title: "11kg LPG cylinder refill", unit: "tank", category: "lpg" },
      { key: "lpg_22kg", title: "22kg LPG cylinder refill", unit: "tank", category: "lpg" },
      { key: "lpg_50kg", title: "50kg LPG cylinder refill", unit: "tank", category: "lpg" },
      { key: "lpg_swap", title: "LPG cylinder swap", unit: "tank", category: "lpg" },
    ],
  },
  {
    key: "amenities",
    label: "Station amenities",
    items: [
      { key: "restroom", title: "Public restroom", unit: "service", category: "amenities" },
      { key: "atm", title: "ATM on-site", unit: "service", category: "amenities" },
      { key: "wifi", title: "Free Wi-Fi", unit: "service", category: "amenities" },
      { key: "parking", title: "Parking", unit: "service", category: "amenities" },
      { key: "covered_bay", title: "Covered fuel bay", unit: "service", category: "amenities" },
      { key: "ev_lounge", title: "EV / driver lounge", unit: "service", category: "amenities" },
      { key: "praying_room", title: "Praying room", unit: "service", category: "amenities" },
    ],
  },
  {
    key: "convenience",
    label: "Convenience store",
    description: "Items stocked at the on-site convenience store.",
    items: [
      { key: "cs_water", title: "Bottled water", unit: "item", category: "convenience" },
      { key: "cs_softdrink", title: "Soft drinks", unit: "item", category: "convenience" },
      { key: "cs_energy", title: "Energy drinks", unit: "item", category: "convenience" },
      { key: "cs_coffee", title: "Brewed / instant coffee", unit: "cup", category: "convenience" },
      { key: "cs_snacks", title: "Chips & snacks", unit: "item", category: "convenience" },
      { key: "cs_sandwich", title: "Sandwiches", unit: "item", category: "convenience" },
      { key: "cs_hotmeal", title: "Hot meals / siopao", unit: "item", category: "convenience" },
      { key: "cs_icecream", title: "Ice cream", unit: "item", category: "convenience" },
      { key: "cs_ice", title: "Bagged ice", unit: "bag", category: "convenience" },
      { key: "cs_cigs", title: "Cigarettes / tobacco", unit: "pack", category: "convenience" },
    ],
  },
  {
    key: "sarisari",
    label: "Sari-Sari store",
    description: "Neighborhood store essentials.",
    items: [
      { key: "ss_load", title: "E-load / mobile load", unit: "load", category: "sarisari" },
      { key: "ss_rice", title: "Rice (per kilo)", unit: "kg", category: "sarisari" },
      { key: "ss_egg", title: "Eggs", unit: "tray", category: "sarisari" },
      { key: "ss_bread", title: "Pandesal / bread", unit: "pc", category: "sarisari" },
      { key: "ss_canned", title: "Canned goods", unit: "item", category: "sarisari" },
      { key: "ss_noodles", title: "Instant noodles", unit: "pack", category: "sarisari" },
      { key: "ss_softdrink", title: "Soft drinks (sakto)", unit: "item", category: "sarisari" },
      { key: "ss_detergent", title: "Detergent sachet", unit: "sachet", category: "sarisari" },
      { key: "ss_shampoo", title: "Shampoo sachet", unit: "sachet", category: "sarisari" },
      { key: "ss_softener", title: "Fabric softener sachet", unit: "sachet", category: "sarisari" },
      { key: "ss_candy", title: "Candies & sweets", unit: "pc", category: "sarisari" },
      { key: "ss_cigs", title: "Cigarettes per stick", unit: "stick", category: "sarisari" },
      { key: "ss_lpg5", title: "5kg LPG (gasul mini)", unit: "tank", category: "sarisari" },
    ],
  },
  {
    key: "food",
    label: "Food & beverage partners",
    description: "Co-located food brands (e.g. Mini Stop, 7-Eleven, Jollibee, Mang Inasal).",
    items: [
      { key: "food_jollibee", title: "Jollibee", unit: "service", category: "food" },
      { key: "food_mcdo", title: "McDonald's", unit: "service", category: "food" },
      { key: "food_chowking", title: "Chowking", unit: "service", category: "food" },
      { key: "food_manginasal", title: "Mang Inasal", unit: "service", category: "food" },
      { key: "food_starbucks", title: "Starbucks", unit: "service", category: "food" },
      { key: "food_dunkin", title: "Dunkin'", unit: "service", category: "food" },
      { key: "food_minigrocery", title: "Mini grocery / Treats", unit: "service", category: "food" },
    ],
  },
];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  FUEL_STATION_CATALOG.map((g) => [g.key, g.label]),
);

export const UNIT_OPTIONS: { value: string; label: string }[] = [
  { value: "L", label: "per Liter (₱/L)" },
  { value: "kWh", label: "per kWh (₱/kWh)" },
  { value: "item", label: "per item" },
  { value: "service", label: "per service" },
  { value: "kg", label: "per kilo" },
  { value: "tank", label: "per tank" },
  { value: "pack", label: "per pack" },
  { value: "pc", label: "per piece" },
  { value: "bag", label: "per bag" },
  { value: "cup", label: "per cup" },
  { value: "sachet", label: "per sachet" },
  { value: "tray", label: "per tray" },
  { value: "stick", label: "per stick" },
  { value: "load", label: "per load" },
];

export function findCatalogItem(key: string | null | undefined): CatalogItem | null {
  if (!key) return null;
  for (const g of FUEL_STATION_CATALOG) {
    const hit = g.items.find((i) => i.key === key);
    if (hit) return hit;
  }
  return null;
}
