// Single source of truth for service-business tags. Used by sell, browse,
// listing-card, and listing detail. Tags within each group are alphabetized.

export type TagGroup = {
  key: string;
  label: string;
  tags: string[];
};

const sorted = (arr: string[]) => [...arr].sort((a, b) => a.localeCompare(b));

export const TAG_GROUPS: TagGroup[] = [
  {
    key: "parts",
    label: "Parts sold",
    tags: sorted([
      "Wiper blades",
      "Tires",
      "Wheels",
      "Batteries",
      "Brake pads",
      "Filters",
      "Belts & hoses",
      "Lights & bulbs",
      "Spark plugs",
      "Fluids & oils",
      "Body panels",
      "Glass",
      "Mirrors",
      "Bumpers",
      "Engines",
      "Transmissions",
      "Suspension parts",
      "Exhaust",
      "Electrical parts",
      "Interior trim",
      "Heavy duty parts",
      "Performance parts",
      "Audio & electronics",
    ]),
  },
  {
    key: "scope",
    label: "Vehicle scope",
    tags: sorted([
      "Cars",
      "Motorcycles",
      "Trucks",
      "SUVs",
      "Vans",
      "Heavy duty / Commercial",
      "Diesel",
      "EV / Hybrid",
      "Boats",
      "Heavy equipment",
    ]),
  },
  {
    key: "repair",
    label: "Repair services",
    tags: sorted([
      "Oil change",
      "Tune-up",
      "Brake service",
      "Tire mounting & balancing",
      "Wheel alignment",
      "AC service",
      "Battery service",
      "Diagnostics",
      "Engine repair",
      "Transmission service",
      "Electrical repair",
      "Suspension service",
      "Exhaust repair",
      "Pre-purchase inspection",
      "Roadside assist",
    ]),
  },
  {
    key: "body",
    label: "Body & paint",
    tags: sorted([
      "Collision repair",
      "Dent removal (PDR)",
      "Painting",
      "Bumper repair",
      "Frame straightening",
      "Glass replacement",
      "Detailing",
      "Ceramic coating",
      "Window tinting",
      "Rust repair",
    ]),
  },
  {
    key: "wash",
    label: "Wash services",
    tags: sorted([
      "Basic wash",
      "Full detail",
      "Interior cleaning",
      "Engine wash",
      "Motorcycle wash",
      "Hand wax",
      "Clay bar treatment",
    ]),
  },
  {
    key: "salvage",
    label: "Salvage & sourcing",
    tags: sorted([
      "Used parts",
      "OEM parts",
      "Aftermarket parts",
      "Rebuilt parts",
      "Core buyback",
      "Vehicle buyback",
      "Parts shipping",
      "Pick-a-part yard",
    ]),
  },
];

// Default expanded group keys per category. All other groups are accessible
// behind "Show more" so any service can tag across categories.
export const CATEGORY_DEFAULT_GROUPS: Record<string, string[]> = {
  repair: ["repair", "scope"],
  bodyshop: ["body", "scope"],
  parts: ["parts", "scope"],
  salvage: ["salvage", "parts"],
  carwash: ["wash"],
};

export const SERVICE_CATEGORIES = new Set(["repair", "bodyshop", "parts", "salvage", "carwash"]);

export function tagGroupFor(key: string): TagGroup | undefined {
  return TAG_GROUPS.find((g) => g.key === key);
}

// Short, lowercase facet tags shown as suggestions on each service row in the
// business editor. Keyed by business_type slug; "default" covers unknown types.
// Tags here power the public directory's filter chips, so keep them concise
// and standardized.
export const SERVICE_TAG_SUGGESTIONS: Record<string, string[]> = {
  default: ["24/7", "appointment", "walk-in", "warranty", "pickup-dropoff", "mobile"],
  tow: [
    "24/7",
    "flatbed",
    "wheel-lift",
    "heavy-duty",
    "motorcycle",
    "long-distance",
    "accident",
    "lockout",
    "winch-out",
  ],
  roadside: ["24/7", "jump-start", "tire-change", "fuel-delivery", "lockout", "battery"],
  fuel_station: ["diesel", "gas", "premium", "lpg", "e-payment", "convenience-store"],
  repair_shop: [
    "diagnostics",
    "warranty",
    "oem-parts",
    "diesel",
    "ev-hybrid",
    "performance",
    "appointment",
  ],
  tire_shop: ["mounting", "balancing", "alignment", "patch", "nitrogen", "tubeless"],
  battery_shop: ["delivery", "install", "warranty", "trade-in"],
  carwash: ["hand-wash", "interior", "engine-bay", "motorcycle", "wax", "ceramic"],
  bodyshop: ["insurance-accepted", "paint", "dent-repair", "frame", "loaner"],
  parts_supplier: ["oem", "aftermarket", "used", "rebuilt", "delivery", "cod"],
  dealership: ["brand-new", "test-drive", "trade-in", "financing", "warranty"],
  used_dealer: ["financing", "trade-in", "warranty", "casa-maintained"],
  rental: ["self-drive", "with-driver", "long-term", "airport-pickup", "delivery"],
  driving_school: ["lto-accredited", "manual", "automatic", "tdc", "pdc"],
  inspection: ["pms", "pre-purchase", "obd", "emissions"],
  insurance: ["ctpl", "comprehensive", "accredited-shops", "quick-claims"],
  motorcycle_shop: ["scooter", "underbone", "big-bike", "tuning", "parts"],
  audio_tint: ["sound-system", "ceramic-tint", "alarm", "dashcam"],
  accessories: ["led", "mats", "covers", "racks", "delivery"],
  transport: ["lipat-bahay", "delivery", "long-distance", "cold-chain", "fragile"],
  salvage: ["used-parts", "core-buyback", "pick-a-part", "vehicle-buyback"],
  financing: ["online-application", "fast-approval", "no-collateral", "trade-in"],
  lto: ["renewal", "registration", "drivers-license", "plate-pickup"],
  corporate_fleet: ["fleet-discount", "monthly-billing", "priority-service"],
};
