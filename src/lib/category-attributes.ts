// Shared option lists + attribute-key registry for category-specific listing
// fields. Used by both the browse-page filters and the listing editor so the
// keys stored in `listings.attributes` always match what the filters query.

export type Opt = { value: string; label: string };

export const TRANSMISSIONS: Opt[] = [
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
  { value: "cvt", label: "CVT" },
  { value: "dct", label: "DCT / dual-clutch" },
];

export const FUEL_TYPES: Opt[] = [
  { value: "gasoline", label: "Gasoline" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Hybrid" },
  { value: "electric", label: "Electric" },
  { value: "lpg", label: "LPG / CNG" },
];

export const BODY_TYPES: Opt[] = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV / Crossover" },
  { value: "hatchback", label: "Hatchback" },
  { value: "pickup", label: "Pickup" },
  { value: "van", label: "Van" },
  { value: "coupe", label: "Coupe" },
  { value: "mpv", label: "MPV / AUV" },
  { value: "wagon", label: "Wagon" },
  { value: "convertible", label: "Convertible" },
];

export const OWNER_STATUS: Opt[] = [
  { value: "1st", label: "1st owner" },
  { value: "2nd", label: "2nd owner" },
  { value: "3rd_plus", label: "3rd owner or more" },
];

export const DRIVETRAINS: Opt[] = [
  { value: "fwd", label: "FWD (front-wheel drive)" },
  { value: "rwd", label: "RWD (rear-wheel drive)" },
  { value: "awd", label: "AWD (all-wheel drive)" },
  { value: "4x4", label: "4x4 / 4WD" },
  { value: "4x2", label: "4x2 / 2WD" },
];

export const DRIVETRAIN_VALUES = DRIVETRAINS.map((o) => o.value);

export function isValidDrivetrain(v: string | undefined | null): boolean {
  if (!v) return true; // empty is allowed (optional field)
  return DRIVETRAIN_VALUES.includes(v);
}

export const OR_CR_STATUS: Opt[] = [
  { value: "complete", label: "Complete OR/CR" },
  { value: "lost", label: "Lost / for re-issuance" },
  { value: "in_process", label: "In process" },
];

export const YES_NO_UNKNOWN: Opt[] = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
  { value: "unknown", label: "Unknown" },
];

export const MOTO_TYPES: Opt[] = [
  { value: "scooter", label: "Scooter" },
  { value: "underbone", label: "Underbone" },
  { value: "big_bike", label: "Big bike" },
  { value: "sport", label: "Sport" },
  { value: "cruiser", label: "Cruiser" },
  { value: "tricycle", label: "Tricycle" },
  { value: "dirt_bike", label: "Dirt bike / off-road" },
];

export const PLATE_STATUS: Opt[] = [
  { value: "with_plate", label: "With plate" },
  { value: "without_plate", label: "Without plate" },
  { value: "temporary", label: "Temporary / conduction sticker" },
];

export const MOTO_CONDITION: Opt[] = [
  { value: "stock", label: "Stock / unmodified" },
  { value: "modified", label: "Modified" },
];

export const EQUIPMENT_TYPES: Opt[] = [
  { value: "excavator", label: "Excavator / backhoe" },
  { value: "loader", label: "Wheel loader" },
  { value: "bulldozer", label: "Bulldozer" },
  { value: "crane", label: "Crane" },
  { value: "forklift", label: "Forklift" },
  { value: "dump_truck", label: "Dump truck" },
  { value: "grader", label: "Motor grader" },
  { value: "compactor", label: "Compactor / roller" },
  { value: "generator", label: "Generator" },
  { value: "other", label: "Other" },
];

export const RENTAL_OR_SALE: Opt[] = [
  { value: "sale", label: "For sale" },
  { value: "rental", label: "For rent" },
  { value: "both", label: "Sale or rent" },
];

export const BOAT_TYPES: Opt[] = [
  { value: "banca", label: "Banca / outrigger" },
  { value: "yacht", label: "Yacht" },
  { value: "speedboat", label: "Speedboat" },
  { value: "sailboat", label: "Sailboat" },
  { value: "fishing", label: "Fishing boat" },
  { value: "jetski", label: "Jet ski / PWC" },
  { value: "pontoon", label: "Pontoon" },
];

export const HULL_MATERIALS: Opt[] = [
  { value: "fiberglass", label: "Fiberglass" },
  { value: "aluminum", label: "Aluminum" },
  { value: "wood", label: "Wood" },
  { value: "steel", label: "Steel" },
  { value: "inflatable", label: "Inflatable / RIB" },
];

export const BOAT_ENGINE_TYPES: Opt[] = [
  { value: "outboard", label: "Outboard" },
  { value: "inboard", label: "Inboard" },
  { value: "sail", label: "Sail / no engine" },
  { value: "electric", label: "Electric" },
];

export const BOAT_REG_STATUS: Opt[] = [
  { value: "registered", label: "Marina-registered" },
  { value: "unregistered", label: "Unregistered" },
  { value: "in_process", label: "In process" },
];

export const BOAT_USAGE: Opt[] = [
  { value: "recreation", label: "Recreation" },
  { value: "fishing", label: "Fishing" },
  { value: "commercial", label: "Commercial" },
];

export const AIRWORTHINESS: Opt[] = [
  { value: "current", label: "Current" },
  { value: "expired", label: "Expired" },
  { value: "in_process", label: "In process / renewing" },
];

export const MAINTENANCE_LOGS: Opt[] = [
  { value: "complete", label: "Complete logs" },
  { value: "partial", label: "Partial logs" },
  { value: "none", label: "Not available" },
];

export const AIRCRAFT_SELLER: Opt[] = [
  { value: "owner", label: "Owner" },
  { value: "broker", label: "Broker" },
  { value: "dealer", label: "Dealer" },
];

export const optLabel = (opts: Opt[], v: string | undefined | null) =>
  opts.find((o) => o.value === v)?.label ?? v ?? "";

// Categories that have extra attribute fields beyond title/price/location.
export const ATTR_CATEGORIES = ["car", "motorcycle", "equipment", "boat", "airplane"] as const;
export type AttrCategory = (typeof ATTR_CATEGORIES)[number];

export function isAttrCategory(c: string | undefined | null): c is AttrCategory {
  return !!c && (ATTR_CATEGORIES as readonly string[]).includes(c);
}
