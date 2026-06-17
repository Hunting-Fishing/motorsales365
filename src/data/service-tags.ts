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
  default: [
    "24/7", "appointment", "walk-in", "warranty", "pickup-dropoff", "mobile",
    "cod", "cash", "gcash", "maya", "credit-card", "bank-transfer",
    "english-speaking", "tagalog", "senior-discount", "pwd-discount",
    "free-estimate", "free-inspection", "delivery", "online-booking",
  ],
  tow: [
    "24/7", "flatbed", "wheel-lift", "heavy-duty", "light-duty", "medium-duty",
    "motorcycle", "suv", "van", "truck", "bus", "long-distance",
    "accident-recovery", "lockout", "winch-out", "off-road-recovery",
    "battery-jump", "tire-change", "fuel-delivery", "expressway",
    "insurance-billing", "secured-storage", "police-coordination", "english-speaking",
  ],
  roadside: [
    "24/7", "jump-start", "tire-change", "fuel-delivery", "lockout", "battery",
    "minor-repair", "mobile", "on-the-spot", "expressway", "motorcycle",
    "diesel-delivery", "winch", "tow-coordination", "insurance-accepted",
  ],
  fuel_station: [
    "diesel", "gas-91", "gas-95", "gas-97", "premium", "lpg", "autolpg",
    "ev-charging", "e-payment", "gcash", "maya", "fleet-card", "credit-card",
    "convenience-store", "atm", "restroom", "air-water", "car-wash-onsite",
    "loyalty-card", "24/7",
  ],
  repair_shop: [
    "diagnostics", "warranty", "oem-parts", "aftermarket-parts", "diesel",
    "gasoline", "ev-hybrid", "electrical", "aircon", "transmission", "engine-overhaul",
    "brakes", "suspension", "tune-up", "pms", "obd-scan", "performance",
    "appointment", "walk-in", "loaner-car", "shuttle", "insurance-accepted",
    "casa-trained", "lifetime-warranty",
  ],
  tire_shop: [
    "mounting", "balancing", "alignment", "rotation", "patch", "vulcanizing",
    "nitrogen", "tubeless", "off-road", "performance", "run-flat", "trucks",
    "motorcycle", "passenger", "suv-4x4", "free-air", "free-inspection",
    "installment", "mobile-fitting",
  ],
  battery_shop: [
    "delivery", "install", "warranty", "trade-in", "maintenance-free",
    "deep-cycle", "motorcycle", "truck", "marine", "agm", "free-testing", "24/7",
  ],
  carwash: [
    "hand-wash", "interior", "engine-bay", "underchassis", "motorcycle", "wax",
    "ceramic-coating", "paint-correction", "buffing", "polishing", "claybar",
    "armor-all", "leather-treatment", "ozone", "appointment", "express-wash",
  ],
  bodyshop: [
    "insurance-accepted", "paint", "color-match", "dent-repair", "pdr",
    "frame-straightening", "fiberglass", "plastic-welding", "rust-repair",
    "loaner", "pickup-dropoff", "casa-finish", "lifetime-warranty",
    "estimate-photos", "spray-booth",
  ],
  parts_supplier: [
    "oem", "aftermarket", "used", "japan-surplus", "korea-surplus", "taiwan",
    "rebuilt", "delivery", "cod", "nationwide-shipping", "lalamove",
    "fitment-guaranteed", "warranty", "bulk-discount",
  ],
  dealership: [
    "brand-new", "test-drive", "trade-in", "financing", "bank-financing",
    "in-house-financing", "warranty", "casa-service", "free-pms", "demo-unit",
    "low-downpayment", "0-percent-interest", "insurance",
  ],
  used_dealer: [
    "financing", "trade-in", "warranty", "casa-maintained", "low-mileage",
    "complete-papers", "or-cr", "free-coc", "lto-assist", "test-drive",
    "viewing-by-appointment", "bank-financing", "in-house-financing",
  ],
  rental: [
    "self-drive", "with-driver", "long-term", "monthly", "weekly", "daily",
    "airport-pickup", "delivery", "hotel-delivery", "fullsize", "compact",
    "suv", "van", "luxury", "wedding", "events", "outoftown-allowed",
    "unlimited-mileage", "insurance-included",
  ],
  driving_school: [
    "lto-accredited", "manual", "automatic", "tdc", "pdc", "refresher",
    "private-lesson", "group-lesson", "english", "tagalog", "female-instructor",
    "pickup-dropoff", "freebie-lto-assist",
  ],
  inspection: [
    "pms", "pre-purchase-inspection", "ppi", "obd-scan", "emissions",
    "private-mvis", "smoke-test", "compression-test", "frame-check",
    "title-verification", "photo-report", "mobile-inspection",
  ],
  insurance: [
    "ctpl", "comprehensive", "accredited-shops", "quick-claims",
    "online-issuance", "installment", "act-of-nature", "acts-of-god",
    "personal-accident", "auto-passenger", "fleet", "motorcycle",
    "lto-renewal-assist",
  ],
  motorcycle_shop: [
    "scooter", "underbone", "big-bike", "tuning", "parts", "oil-change",
    "tire", "brake", "electrical", "performance", "custom-build", "registration",
  ],
  audio_tint: [
    "sound-system", "subwoofer", "amplifier", "head-unit", "speakers",
    "ceramic-tint", "carbon-tint", "regular-tint", "uv-rejection", "alarm",
    "dashcam", "reverse-camera", "android-auto", "carplay",
  ],
  accessories: [
    "led", "hid", "mats", "seat-covers", "covers", "racks", "running-boards",
    "spoilers", "body-kits", "delivery", "installation",
  ],
  transport: [
    "lipat-bahay", "delivery", "long-distance", "cold-chain", "fragile",
    "appliance", "motorcycle-transport", "vehicle-transport", "office-relocation",
    "manpower", "insurance-covered",
  ],
  salvage: [
    "used-parts", "core-buyback", "pick-a-part", "vehicle-buyback", "scrap",
    "engine", "transmission", "body-panels", "interior", "electronics",
  ],
  financing: [
    "online-application", "fast-approval", "no-collateral", "trade-in",
    "bank", "in-house", "second-hand", "brand-new", "motorcycle", "truck",
  ],
  lto: [
    "renewal", "registration", "drivers-license", "plate-pickup", "transfer",
    "duplicate-or", "duplicate-cr", "smoke-emission", "stencil",
  ],
  corporate_fleet: [
    "fleet-discount", "monthly-billing", "priority-service", "dedicated-mechanic",
    "pickup-dropoff", "telematics", "fuel-management", "preventive-maintenance",
  ],
};
