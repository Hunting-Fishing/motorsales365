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
      "Wiper blades", "Tires", "Wheels", "Batteries", "Brake pads",
      "Filters", "Belts & hoses", "Lights & bulbs", "Spark plugs",
      "Fluids & oils", "Body panels", "Glass", "Mirrors", "Bumpers",
      "Engines", "Transmissions", "Suspension parts", "Exhaust",
      "Electrical parts", "Interior trim", "Heavy duty parts",
      "Performance parts", "Audio & electronics",
    ]),
  },
  {
    key: "scope",
    label: "Vehicle scope",
    tags: sorted([
      "Cars", "Motorcycles", "Trucks", "SUVs", "Vans",
      "Heavy duty / Commercial", "Diesel", "EV / Hybrid",
      "Boats", "Heavy equipment",
    ]),
  },
  {
    key: "repair",
    label: "Repair services",
    tags: sorted([
      "Oil change", "Tune-up", "Brake service",
      "Tire mounting & balancing", "Wheel alignment", "AC service",
      "Battery service", "Diagnostics", "Engine repair",
      "Transmission service", "Electrical repair", "Suspension service",
      "Exhaust repair", "Pre-purchase inspection", "Roadside assist",
    ]),
  },
  {
    key: "body",
    label: "Body & paint",
    tags: sorted([
      "Collision repair", "Dent removal (PDR)", "Painting",
      "Bumper repair", "Frame straightening", "Glass replacement",
      "Detailing", "Ceramic coating", "Window tinting", "Rust repair",
    ]),
  },
  {
    key: "wash",
    label: "Wash services",
    tags: sorted([
      "Basic wash", "Full detail", "Interior cleaning", "Engine wash",
      "Motorcycle wash", "Hand wax", "Clay bar treatment",
    ]),
  },
  {
    key: "salvage",
    label: "Salvage & sourcing",
    tags: sorted([
      "Used parts", "OEM parts", "Aftermarket parts", "Rebuilt parts",
      "Core buyback", "Vehicle buyback", "Parts shipping",
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

export const SERVICE_CATEGORIES = new Set([
  "repair", "bodyshop", "parts", "salvage", "carwash",
]);

export function tagGroupFor(key: string): TagGroup | undefined {
  return TAG_GROUPS.find((g) => g.key === key);
}
