/**
 * Curated parts categories for SEO landing pages. Each maps to keywords used
 * to filter partner_products by title ILIKE (since most feeds don't carry a
 * normalized category). Order = display order.
 */
export type PartsCategory = {
  slug: string;
  title: string;
  short: string;
  description: string;
  keywords: string[]; // OR-ed ILIKE tokens against partner_products.title
  emoji: string;
};

export const PARTS_CATEGORIES: PartsCategory[] = [
  {
    slug: "brakes",
    title: "Brakes — Pads, Rotors & Calipers",
    short: "Brakes",
    description:
      "Brake pads, rotors, calipers, brake fluid and full brake kits for Philippine vehicles. Compare prices from Shopee, Lazada and AliExpress.",
    keywords: ["brake", "rotor", "caliper", "brake pad", "brake disc"],
    emoji: "🛑",
  },
  {
    slug: "engine",
    title: "Engine Parts & Components",
    short: "Engine",
    description:
      "Engine internals, gaskets, timing belts, spark plugs, sensors and rebuild kits sourced from our Philippine partners.",
    keywords: ["engine", "piston", "gasket", "timing belt", "spark plug", "valve cover"],
    emoji: "⚙️",
  },
  {
    slug: "suspension",
    title: "Suspension & Steering",
    short: "Suspension",
    description:
      "Shocks, struts, coilovers, control arms, ball joints and bushings. Compatible with most JDM and PH-market vehicles.",
    keywords: ["shock", "strut", "coilover", "control arm", "suspension", "ball joint"],
    emoji: "🔧",
  },
  {
    slug: "filters-fluids",
    title: "Filters, Oils & Fluids",
    short: "Filters & Fluids",
    description: "Oil, air and cabin filters, engine oil, transmission fluid and coolant.",
    keywords: ["oil filter", "air filter", "cabin filter", "engine oil", "coolant", "atf"],
    emoji: "🛢️",
  },
  {
    slug: "tires-wheels",
    title: "Tires & Wheels",
    short: "Tires & Wheels",
    description: "Passenger, SUV, off-road and performance tires plus alloy and steel wheels.",
    keywords: ["tire", "tyre", "wheel", "rim", "alloy wheel"],
    emoji: "🛞",
  },
  {
    slug: "battery-electrical",
    title: "Battery & Electrical",
    short: "Battery & Electrical",
    description: "Batteries, alternators, starters, wiring harnesses, fuses and relays.",
    keywords: ["battery", "alternator", "starter", "wiring", "fuse", "relay", "headlight bulb"],
    emoji: "🔋",
  },
  {
    slug: "exhaust",
    title: "Exhaust & Emissions",
    short: "Exhaust",
    description: "Mufflers, catalytic converters, downpipes, headers and complete exhaust systems.",
    keywords: ["muffler", "exhaust", "catalytic", "downpipe", "header", "tailpipe"],
    emoji: "💨",
  },
  {
    slug: "body-exterior",
    title: "Body & Exterior",
    short: "Body & Exterior",
    description: "Bumpers, fenders, hoods, mirrors, grilles, lights and body trim.",
    keywords: ["bumper", "fender", "hood", "mirror", "grille", "headlight", "taillight"],
    emoji: "🚗",
  },
  {
    slug: "interior",
    title: "Interior & Accessories",
    short: "Interior",
    description: "Seat covers, floor mats, steering wheels, shift knobs and cabin accessories.",
    keywords: ["seat cover", "floor mat", "steering wheel", "shift knob", "dashboard"],
    emoji: "🪑",
  },
  {
    slug: "tools",
    title: "Tools & Garage Equipment",
    short: "Tools",
    description: "Hand tools, OBD2 scanners, jacks, stands and shop equipment.",
    keywords: ["obd2", "obd", "scanner", "jack", "wrench", "socket set", "tool kit"],
    emoji: "🧰",
  },
];

export function findCategory(slug: string): PartsCategory | undefined {
  return PARTS_CATEGORIES.find((c) => c.slug === slug);
}
