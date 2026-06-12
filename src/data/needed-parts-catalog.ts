/** Seller-side picker: predefined parts/repairs grouped by system.
 *  Used for both the "Needed parts" tags on vehicle listings AND the
 *  used-parts buyer wizard at /parts. Items flagged `serviceOnly: true`
 *  are hidden from the used-parts wizard (they're labour, not parts). */
export type NeededPartOption = {
  key: string;
  label: string;
  /** Maps to a parts_catalog.category for matching suggestions on the listing page. */
  category: string;
  /** Service/labour items (oil change, alignment) — hidden from the used-parts wizard. */
  serviceOnly?: boolean;
};

export type NeededPartGroup = {
  key: string;
  label: string;
  items: NeededPartOption[];
};

export const NEEDED_PARTS_GROUPS: NeededPartGroup[] = [
  {
    key: "drivetrain",
    label: "Engine & Drivetrain",
    items: [
      { key: "engine_assembly", label: "Engine assembly (long block)", category: "engine" },
      { key: "engine_short_block", label: "Short block", category: "engine" },
      { key: "cylinder_head", label: "Cylinder head", category: "engine" },
      { key: "transmission_auto", label: "Automatic transmission", category: "drivetrain" },
      { key: "transmission_manual", label: "Manual transmission", category: "drivetrain" },
      { key: "transfer_case", label: "Transfer case", category: "drivetrain" },
      { key: "differential", label: "Differential / rear end", category: "drivetrain" },
      { key: "axle_shaft", label: "Axle shaft / CV axle", category: "drivetrain" },
      { key: "driveshaft", label: "Driveshaft / prop shaft", category: "drivetrain" },
      { key: "clutch", label: "Clutch kit / flywheel", category: "drivetrain" },
      { key: "turbo", label: "Turbocharger", category: "engine" },
      { key: "intake_manifold", label: "Intake manifold", category: "engine" },
      { key: "exhaust_manifold", label: "Exhaust manifold / header", category: "engine" },
      { key: "timing_belt", label: "Timing belt service", category: "engine", serviceOnly: true },
      { key: "spark_plugs", label: "Spark plugs", category: "engine" },
      { key: "air_filter", label: "Air filter", category: "engine" },
      { key: "fuel_filter", label: "Fuel filter", category: "engine" },
      { key: "fuel_pump", label: "Fuel pump", category: "engine" },
    ],
  },
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
      { key: "abs_module", label: "ABS module", category: "brakes" },
      { key: "master_cylinder", label: "Brake master cylinder", category: "brakes" },
      { key: "brake_booster", label: "Brake booster", category: "brakes" },
      { key: "brake_fluid", label: "Brake fluid flush", category: "fluids", serviceOnly: true },
    ],
  },
  {
    key: "suspension",
    label: "Suspension & Steering",
    items: [
      { key: "shocks_front", label: "Front shocks/struts", category: "suspension" },
      { key: "shocks_rear", label: "Rear shocks", category: "suspension" },
      { key: "coil_springs", label: "Coil springs", category: "suspension" },
      { key: "leaf_springs", label: "Leaf springs", category: "suspension" },
      { key: "control_arms", label: "Control arms", category: "suspension" },
      { key: "bushings", label: "Control arm bushings", category: "suspension" },
      { key: "tie_rods", label: "Tie rod ends", category: "suspension" },
      { key: "ball_joints", label: "Ball joints", category: "suspension" },
      { key: "sway_bar", label: "Sway bar / links", category: "suspension" },
      { key: "steering_rack", label: "Steering rack", category: "suspension" },
      { key: "power_steering_pump", label: "Power steering pump", category: "suspension" },
      { key: "alignment", label: "Wheel alignment", category: "tires", serviceOnly: true },
    ],
  },
  {
    key: "tires_wheels",
    label: "Tires & Wheels",
    items: [
      { key: "tires_all4", label: "Set of 4 tires", category: "tires" },
      { key: "tire_single", label: "Single tire", category: "tires" },
      { key: "rims_alloy", label: "Alloy rims / mags", category: "wheels" },
      { key: "rims_steel", label: "Steel rims", category: "wheels" },
      { key: "hub_assembly", label: "Wheel hub / bearing", category: "wheels" },
      { key: "hubcaps", label: "Hubcaps / center caps", category: "wheels" },
      { key: "spare_tire", label: "Spare tire", category: "tires" },
      { key: "balancing", label: "Tire balancing", category: "tires", serviceOnly: true },
    ],
  },
  {
    key: "body",
    label: "Body & Exterior",
    items: [
      { key: "hood", label: "Hood", category: "body" },
      { key: "fender_front", label: "Front fender", category: "body" },
      { key: "fender_rear", label: "Rear fender / quarter panel", category: "body" },
      { key: "door_front", label: "Front door", category: "body" },
      { key: "door_rear", label: "Rear door", category: "body" },
      { key: "tailgate", label: "Tailgate / trunk lid", category: "body" },
      { key: "bumper_front", label: "Front bumper", category: "body" },
      { key: "bumper_rear", label: "Rear bumper", category: "body" },
      { key: "grille", label: "Grille", category: "body" },
      { key: "mirror_side", label: "Side mirror", category: "body" },
      { key: "windshield", label: "Windshield", category: "body" },
      { key: "glass_door", label: "Door / quarter glass", category: "body" },
      { key: "weatherstrip", label: "Weatherstripping / seals", category: "body" },
      { key: "emblems", label: "Emblems / badges", category: "body" },
    ],
  },
  {
    key: "lighting",
    label: "Lighting",
    items: [
      { key: "headlight_assembly", label: "Headlight assembly", category: "electrical" },
      { key: "tail_light", label: "Tail light", category: "electrical" },
      { key: "fog_light", label: "Fog light", category: "electrical" },
      { key: "turn_signal", label: "Turn signal", category: "electrical" },
      { key: "interior_light", label: "Interior / dome light", category: "electrical" },
      { key: "bulbs", label: "Bulbs (replacement)", category: "electrical" },
    ],
  },
  {
    key: "electrical",
    label: "Electrical & Electronics",
    items: [
      { key: "battery", label: "Battery", category: "electrical" },
      { key: "alternator", label: "Alternator", category: "electrical" },
      { key: "starter", label: "Starter", category: "electrical" },
      { key: "ecu", label: "ECU / engine computer", category: "electrical" },
      { key: "wiring_harness", label: "Wiring harness", category: "electrical" },
      { key: "ignition_coil", label: "Ignition coil", category: "electrical" },
      { key: "ac_compressor", label: "A/C compressor", category: "electrical" },
      { key: "radiator_fan", label: "Radiator / cooling fan", category: "electrical" },
      { key: "horn", label: "Horn", category: "electrical" },
      { key: "stereo_head_unit", label: "Stereo / head unit", category: "electrical" },
    ],
  },
  {
    key: "interior",
    label: "Interior",
    items: [
      { key: "seat_front", label: "Front seat", category: "interior" },
      { key: "seat_rear", label: "Rear seat / bench", category: "interior" },
      { key: "dashboard", label: "Dashboard / dash panel", category: "interior" },
      { key: "steering_wheel", label: "Steering wheel", category: "interior" },
      { key: "door_panel", label: "Door panel / card", category: "interior" },
      { key: "headliner", label: "Headliner", category: "interior" },
      { key: "carpet", label: "Carpet / floor mats", category: "interior" },
      { key: "gauge_cluster", label: "Gauge cluster / instrument panel", category: "interior" },
      { key: "seatbelt", label: "Seat belt", category: "interior" },
      { key: "airbag", label: "Airbag (uninstalled)", category: "interior" },
    ],
  },
  {
    key: "cooling_fuel",
    label: "Cooling & Fuel",
    items: [
      { key: "radiator", label: "Radiator", category: "cooling" },
      { key: "water_pump", label: "Water pump", category: "cooling" },
      { key: "thermostat", label: "Thermostat", category: "cooling" },
      { key: "hoses_coolant", label: "Coolant hoses", category: "cooling" },
      { key: "fuel_tank", label: "Fuel tank", category: "fuel" },
      { key: "fuel_injectors", label: "Fuel injectors", category: "fuel" },
    ],
  },
  {
    key: "fluids",
    label: "Fluids & Maintenance",
    items: [
      { key: "oil_change", label: "Oil + filter change", category: "fluids", serviceOnly: true },
      { key: "coolant", label: "Coolant flush", category: "fluids", serviceOnly: true },
      { key: "trans_fluid", label: "Transmission fluid", category: "fluids", serviceOnly: true },
      { key: "diff_fluid", label: "Differential fluid", category: "fluids", serviceOnly: true },
    ],
  },
];

export const NEEDED_PARTS_INDEX: Record<string, NeededPartOption> = Object.fromEntries(
  NEEDED_PARTS_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i])),
);

/** Groups with all service-only items removed (used by the buyer parts wizard). */
export const USED_PARTS_GROUPS: NeededPartGroup[] = NEEDED_PARTS_GROUPS
  .map((g) => ({ ...g, items: g.items.filter((i) => !i.serviceOnly) }))
  .filter((g) => g.items.length > 0);
