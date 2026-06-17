// Curated, Philippine-market brand suggestions per business kind.
// Used by the dashboard Brands editor to one-click add common brands,
// while still allowing free-form manual entry.

const CAR_OEMS = [
  "Toyota", "Honda", "Mitsubishi", "Nissan", "Ford", "Hyundai", "Kia",
  "Suzuki", "Chevrolet", "Isuzu", "Mazda", "MG", "Geely", "BYD", "Foton",
  "Subaru", "Lexus", "BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Volvo",
  "Jeep", "Peugeot", "GAC", "Chery", "Maxus",
];

const MOTO_OEMS = [
  "Honda", "Yamaha", "Suzuki", "Kawasaki", "KTM", "Royal Enfield",
  "Rusi", "Kymco", "SYM", "Vespa", "CFMoto", "Ducati", "Triumph", "Aprilia",
];

const TIRE_BRANDS = [
  "Michelin", "Bridgestone", "Yokohama", "BFGoodrich", "Goodyear",
  "Dunlop", "Continental", "Pirelli", "Maxxis", "GT Radial", "Westlake",
  "Toyo", "Hankook", "Nitto", "Kumho", "Falken", "Cooper",
];

const BATTERY_BRANDS = [
  "Motolite", "Amaron", "GS", "3K", "Yuasa", "ACDelco", "Bosch", "Exide",
];

const FUEL_BRANDS = [
  "Shell", "Petron", "Caltex", "Phoenix", "Total", "Seaoil", "Cleanfuel",
  "Unioil", "PTT", "Flying V", "Jetti",
];

const PARTS_BRANDS = [
  "Bosch", "Denso", "NGK", "Brembo", "KYB", "Monroe", "Sachs",
  "Mann-Filter", "Mahle", "Valeo", "Aisin", "Gates", "NSK", "NTN",
  "Castrol", "Mobil 1", "Shell Helix", "Liqui Moly", "OEM",
];

const DETAILING_BRANDS = [
  "3M", "Meguiar's", "Chemical Guys", "Sonax", "Llumar", "V-Kool",
  "Solar Gard", "SunTek", "XPEL", "Gtechniq", "CarPro", "Koch-Chemie",
];

const PAINT_BRANDS = [
  "Sikkens", "PPG", "DuPont", "Axalta", "Nippon Paint", "Sherwin-Williams",
  "3M", "Wurth", "U-Pol",
];

const AUDIO_BRANDS = [
  "Pioneer", "Kenwood", "Alpine", "Sony", "JBL", "Focal", "Rockford Fosgate",
  "JL Audio", "Hertz", "Kicker", "Andrian Audio",
];

const INSURANCE_BRANDS = [
  "Malayan", "Standard Insurance", "Mercantile", "FPG", "BPI/MS",
  "Charter Ping An", "Pioneer", "AIG", "Stronghold", "Prudential Guarantee",
];

const BRANDS_BY_KIND: Record<string, string[]> = {
  dealership: CAR_OEMS,
  used_dealership: CAR_OEMS,
  rental: CAR_OEMS,
  corporate: CAR_OEMS,
  transport: CAR_OEMS,
  motorcycle_shop: MOTO_OEMS,
  tire_shop: TIRE_BRANDS,
  battery_shop: BATTERY_BRANDS,
  fuel_station: FUEL_BRANDS,
  parts_accessories: PARTS_BRANDS,
  accessories: [...PARTS_BRANDS, ...AUDIO_BRANDS],
  repair_shop: PARTS_BRANDS,
  body_paint: PAINT_BRANDS,
  carwash: DETAILING_BRANDS,
  audio_tint: [...AUDIO_BRANDS, ...DETAILING_BRANDS],
  insurance: INSURANCE_BRANDS,
  financing: ["BPI", "BDO", "Metrobank", "Security Bank", "PSBank", "RCBC", "EastWest", "UnionBank"],
  salvage: [...CAR_OEMS, ...PARTS_BRANDS],
  towing: [],
  lto_services: [],
  inspection: [],
  driving_school: [],
  other: CAR_OEMS,
};

/** Returns deduped brand suggestions for the given business kind. */
export function getBrandSuggestions(kind: string | null | undefined): string[] {
  const list = (kind && BRANDS_BY_KIND[kind]) || BRANDS_BY_KIND.other;
  return Array.from(new Set(list));
}

/** Normalize a brand name into a stable slug for dedupe + filtering. */
export function brandSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
