/** Seller-side picker: predefined parts/repairs grouped by system. */
export type NeededPartOption = {
  key: string;
  label: string;
  /** Maps to a parts_catalog.category for matching suggestions on the listing page. */
  category: string;
};

export type NeededPartGroup = {
  key: string;
  label: string;
  items: NeededPartOption[];
};

export const NEEDED_PARTS_GROUPS: NeededPartGroup[] = [
  {
    key: "brakes",
    label: "Brakes",
    items: [
      { key: "front_pads", label: "Front brake pads", category: "brakes" },
      { key: "rear_pads", label: "Rear brake pads", category: "brakes" },
      { key: "front_rotors", label: "Front rotors", category: "brakes" },
      { key: "rear_rotors", label: "Rear rotors", category: "brakes" },
      { key: "calipers", label: "Calipers", category: "brakes" },
      { key: "brake_lines", label: "Brake lines / hoses", category: "brakes" },
      { key: "brake_fluid", label: "Brake fluid flush", category: "fluids" },
    ],
  },
  {
    key: "tires",
    label: "Tires & wheels",
    items: [
      { key: "tires_all4", label: "All 4 tires", category: "tires" },
      { key: "tires_front", label: "Front tires only", category: "tires" },
      { key: "tires_rear", label: "Rear tires only", category: "tires" },
      { key: "alignment", label: "Wheel alignment", category: "tires" },
      { key: "balancing", label: "Tire balancing", category: "tires" },
    ],
  },
  {
    key: "suspension",
    label: "Suspension",
    items: [
      { key: "shocks_front", label: "Front shocks/struts", category: "suspension" },
      { key: "shocks_rear", label: "Rear shocks", category: "suspension" },
      { key: "bushings", label: "Control arm bushings", category: "suspension" },
      { key: "tie_rods", label: "Tie rod ends", category: "suspension" },
    ],
  },
  {
    key: "engine",
    label: "Engine",
    items: [
      { key: "oil_change", label: "Oil + filter change", category: "fluids" },
      { key: "timing_belt", label: "Timing belt service", category: "engine" },
      { key: "spark_plugs", label: "Spark plugs", category: "engine" },
      { key: "air_filter", label: "Air filter", category: "engine" },
      { key: "fuel_filter", label: "Fuel filter", category: "engine" },
    ],
  },
  {
    key: "electrical",
    label: "Electrical",
    items: [
      { key: "battery", label: "Battery", category: "electrical" },
      { key: "alternator", label: "Alternator", category: "electrical" },
      { key: "starter", label: "Starter", category: "electrical" },
      { key: "bulbs", label: "Headlights / bulbs", category: "electrical" },
    ],
  },
  {
    key: "fluids",
    label: "Fluids",
    items: [
      { key: "coolant", label: "Coolant flush", category: "fluids" },
      { key: "trans_fluid", label: "Transmission fluid", category: "fluids" },
      { key: "diff_fluid", label: "Differential fluid", category: "fluids" },
    ],
  },
];

export const NEEDED_PARTS_INDEX: Record<string, NeededPartOption> = Object.fromEntries(
  NEEDED_PARTS_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i])),
);
