/**
 * Comparison matrix — 365 vs global shop-software competitors.
 * Cell values: "yes" | "partial" | "no". Tooltip explains the nuance.
 * Sources: each competitor's public product/pricing pages as of 2026.
 */

export type Cell = { v: "yes" | "partial" | "no"; note?: string };

export type CompetitorPricing = {
  /** null = free tier / not-published (custom); "free" wins the vs-365 comparison */
  startingUsd: number | null;
  /** Top-of-range price in same unit — renders as "$X–$Y/unit" when set. */
  topUsd?: number | null;
  unit: "mo" | "yr" | "custom" | "free";
  tierName: string;
  includes: string[];
  highest?: string;
  link: string;
};

export type Competitor = {
  id: string;
  name: string;
  blurb: string;
  pricing: CompetitorPricing;
};

export type CompetitorMatrix = {
  competitors: Competitor[];
  rows: { capability: string; cells: Record<string, Cell> }[];
};

// ---------- shared "Yes/No" builder ----------
const y: Cell = { v: "yes" };
const n: Cell = { v: "no" };
const p = (note?: string): Cell => ({ v: "partial", note });
const yy = (note?: string): Cell => ({ v: "yes", note });

// ================= SHOP SOFTWARE =================
const SHOP_COMPETITORS: Competitor[] = [
  {
    id: "365",
    name: "365 Motor Sales",
    blurb: "PH-first, all-in-one",
    pricing: {
      startingUsd: 5,
      topUsd: 25,
      unit: "mo",
      tierName: "Pay-as-you-go boosts",
      includes: ["Free core forever", "Boosts $5–$25/mo", "Full shop OS"],
      highest: "Premium boosts pay-as-you-go",
      link: "/pricing",
    },
  },
  {
    id: "shopmonkey",
    name: "Shopmonkey",
    blurb: "US SaaS",
    pricing: {
      startingUsd: 199,
      topUsd: 499,
      unit: "mo",
      tierName: "Basic → Ultimate",
      includes: ["1 location", "Unlimited ROs", "Invoicing"],
      highest: "Ultimate ≈ $499/mo",
      link: "https://www.shopmonkey.io/pricing",
    },
  },
  {
    id: "tekmetric",
    name: "Tekmetric",
    blurb: "US SaaS",
    pricing: {
      startingUsd: 199,
      topUsd: 399,
      unit: "mo",
      tierName: "Per-location est.",
      includes: ["Per-location quote", "US-only support", "Nexpart parts"],
      highest: "Enterprise ≈ $399/mo",
      link: "https://www.tekmetric.com/pricing",
    },
  },
  {
    id: "autoleap",
    name: "AutoLeap",
    blurb: "US/CA SaaS",
    pricing: {
      startingUsd: 199,
      topUsd: 449,
      unit: "mo",
      tierName: "Per-location est.",
      includes: ["Per-location quote", "QuickBooks sync", "Digital inspections"],
      highest: "Enterprise ≈ $449/mo",
      link: "https://autoleap.com/pricing/",
    },
  },
  {
    id: "mitchell1",
    name: "Mitchell 1 Manager SE",
    blurb: "Legacy desktop-first",
    pricing: {
      startingUsd: 179,
      topUsd: 329,
      unit: "mo",
      tierName: "Manager SE",
      includes: ["Desktop install", "ProDemand add-on", "Windows only"],
      highest: "Bundle w/ ProDemand ≈ $329/mo",
      link: "https://mitchell1.com/shop-management-software/",
    },
  },
  {
    id: "ari",
    name: "ARI (Auto Repair Invoicing)",
    blurb: "Solo/small shop",
    pricing: {
      startingUsd: 39.95,
      topUsd: 89.95,
      unit: "mo",
      tierName: "Basic",
      includes: ["1 user", "Invoicing + estimates", "VIN + license decode"],
      highest: "Premium ≈ $89.95/mo",
      link: "https://arimotive.com/pricing/",
    },
  },
  {
    id: "fullbay",
    name: "Fullbay",
    blurb: "Heavy-duty diesel",
    pricing: {
      startingUsd: 199,
      topUsd: 599,
      unit: "mo",
      tierName: "Per-bay est.",
      includes: ["Fleet + diesel focus", "Per-bay pricing", "US-only"],
      highest: "Enterprise ≈ $599/mo",
      link: "https://www.fullbay.com/pricing/",
    },
  },
  {
    id: "torque360",
    name: "Torque360",
    blurb: "US SaaS",
    pricing: {
      startingUsd: 59,
      topUsd: 159,
      unit: "mo",
      tierName: "Starter",
      includes: ["Unlimited users", "Digital inspections", "SMS reminders"],
      highest: "Enterprise ≈ $159/mo",
      link: "https://www.torque360.co/pricing",
    },
  },
  {
    id: "shopware",
    name: "Shop-Ware",
    blurb: "Independent shops",
    pricing: {
      startingUsd: 289,
      unit: "mo",
      tierName: "Solo",
      includes: ["Cloud-based", "Live inspections", "Parts markup engine"],
      highest: "Team from $549/mo",
      link: "https://www.shop-ware.com/pricing/",
    },
  },
  {
    id: "protractor",
    name: "Protractor",
    blurb: "Enterprise multi-shop",
    pricing: {
      startingUsd: 219,
      unit: "mo",
      tierName: "Base",
      includes: ["Multi-location", "Advanced accounting", "Windows client"],
      link: "https://www.protractor.com/pricing",
    },
  },
  {
    id: "napatracs",
    name: "NAPA TRACS",
    blurb: "NAPA-tied shops",
    pricing: {
      startingUsd: 129,
      unit: "mo",
      tierName: "Standard",
      includes: ["NAPA catalog", "Desktop-first", "US-only support"],
      link: "https://www.napatracs.com/",
    },
  },
  {
    id: "identifix",
    name: "Identifix Shop Manager",
    blurb: "Direct-Hit powered",
    pricing: {
      startingUsd: 149,
      unit: "mo",
      tierName: "Standard",
      includes: ["Diagnostic DB", "OEM procedures", "US-only"],
      link: "https://identifix.com/",
    },
  },
  {
    id: "garage360",
    name: "Garage360",
    blurb: "APAC SaaS",
    pricing: {
      startingUsd: 29,
      unit: "mo",
      tierName: "Starter",
      includes: ["Cloud-based", "SMS reminders", "APAC focus"],
      highest: "Pro ≈ $79/mo",
      link: "https://garage360.io/pricing",
    },
  },
  {
    id: "orderry",
    name: "Orderry",
    blurb: "SMB shop CRM",
    pricing: {
      startingUsd: 39,
      unit: "mo",
      tierName: "Startup",
      includes: ["Work orders", "Inventory + CRM", "Mobile app"],
      highest: "Enterprise ≈ $189/mo",
      link: "https://orderry.com/pricing/",
    },
  },
  {
    id: "garageplug",
    name: "GaragePlug",
    blurb: "APAC/EMEA SaaS",
    pricing: {
      startingUsd: 45,
      unit: "mo",
      tierName: "Essential",
      includes: ["Cloud DMS", "Digital job cards", "Multi-branch"],
      highest: "Premium ≈ $99/mo",
      link: "https://garageplug.com/pricing",
    },
  },
  {
    id: "workshop",
    name: "Workshop Software",
    blurb: "AU/NZ/UK SaaS",
    pricing: {
      startingUsd: 59,
      unit: "mo",
      tierName: "Lite",
      includes: ["Job cards", "Xero/QBO sync", "SMS reminders"],
      highest: "Pro ≈ $189/mo",
      link: "https://www.workshopsoftware.com/pricing/",
    },
  },
  {
    id: "rowriter",
    name: "R.O. Writer",
    blurb: "Legacy US DMS",
    pricing: {
      startingUsd: 189,
      unit: "mo",
      tierName: "Standard",
      includes: ["Windows install", "Catalog integrations", "US-only support"],
      link: "https://rowriter.com/pricing/",
    },
  },
  {
    id: "maxxtraxx",
    name: "MaxxTraxx",
    blurb: "US independent shops",
    pricing: {
      startingUsd: 109,
      unit: "mo",
      tierName: "SE",
      includes: ["Desktop client", "Accounting built-in", "Parts catalogs"],
      highest: "Enterprise ≈ $229/mo",
      link: "https://www.scottsystems.com/pricing/",
    },
  },
];

export const SHOP_SOFTWARE_MATRIX: CompetitorMatrix = {


  competitors: SHOP_COMPETITORS,
  rows: [
    row("Work orders (RO lifecycle)", { "365": y, shopmonkey: y, tekmetric: y, autoleap: y, mitchell1: y, ari: y, fullbay: y, torque360: y, shopware: y, protractor: y, napatracs: y, identifix: y, garage360: y, orderry: y, garageplug: y, workshop: y, rowriter: y, maxxtraxx: y }),
    row("Inventory with alerts", { "365": y, shopmonkey: y, tekmetric: y, autoleap: y, mitchell1: y, ari: y, fullbay: y, torque360: y, shopware: y, protractor: y, napatracs: y, identifix: p(), garage360: y, orderry: y, garageplug: y, workshop: y, rowriter: y, maxxtraxx: y }),
    row("Double-entry GL & P&L in-app", {
      "365": yy("Real ledger, not just KPIs"),
      shopmonkey: p("QuickBooks integration"),
      tekmetric: p("QuickBooks integration"),
      autoleap: p("QuickBooks integration"),
      mitchell1: p(),
      ari: p(),
      fullbay: p("QuickBooks integration"),
      torque360: p(),
      shopware: p("QuickBooks integration"),
      protractor: y,
      napatracs: p(),
      identifix: p(),
      garage360: n,
      orderry: p(),
      garageplug: p("Tally/Xero"),
      workshop: p("Xero/QBO"),
      rowriter: p(),
      maxxtraxx: y,
    }),
    row("Cross-shop live parts stock", {
      "365": yy("network_stock view, real-time"),
      shopmonkey: n, tekmetric: n, autoleap: n, mitchell1: n, ari: n, fullbay: n, torque360: n, shopware: n, protractor: n, napatracs: p("NAPA-only"), identifix: n, garage360: n, orderry: n, garageplug: n, workshop: n, rowriter: n, maxxtraxx: n,
    }),
    row("VIN-based parts catalog", {
      "365": y,
      shopmonkey: p("Via 3rd-party"),
      tekmetric: p("Via Nexpart"),
      autoleap: p(),
      mitchell1: y,
      ari: y,
      fullbay: y,
      torque360: p(),
      shopware: p(),
      protractor: p(),
      napatracs: y,
      identifix: y,
      garage360: n,
      orderry: p(),
      garageplug: p(),
      workshop: p(),
      rowriter: y,
      maxxtraxx: y,
    }),
    row("Public marketplace (buy/sell vehicles)", {
      "365": y, shopmonkey: n, tekmetric: n, autoleap: n, mitchell1: n, ari: n, fullbay: n, torque360: n, shopware: n, protractor: n, napatracs: n, identifix: n, garage360: n, orderry: n, garageplug: n, workshop: n, rowriter: n, maxxtraxx: n,
    }),
    row("Franchise / network program", {
      "365": y, shopmonkey: n, tekmetric: n, autoleap: n, mitchell1: n, ari: n, fullbay: n, torque360: n, shopware: n, protractor: n, napatracs: p("NAPA AutoCare"), identifix: n, garage360: n, orderry: n, garageplug: n, workshop: n, rowriter: n, maxxtraxx: n,
    }),
    row("Loyalty & promo codes built-in", {
      "365": y,
      shopmonkey: p("Marketing add-on"),
      tekmetric: p(),
      autoleap: y,
      mitchell1: n, ari: p(), fullbay: n, torque360: y, shopware: p(), protractor: n, napatracs: n, identifix: n, garage360: n, orderry: p(), garageplug: p(), workshop: p(), rowriter: n, maxxtraxx: n,
    }),
    row("HR / leave / certificates", {
      "365": y, shopmonkey: n, tekmetric: n, autoleap: n, mitchell1: n, ari: n, fullbay: p(), torque360: n, shopware: n, protractor: p(), napatracs: n, identifix: n, garage360: n, orderry: p(), garageplug: p(), workshop: n, rowriter: n, maxxtraxx: p(),
    }),
    row("Learning / courses in-app", {
      "365": y,
      shopmonkey: p("Shopmonkey University"),
      tekmetric: n, autoleap: n, mitchell1: p("ProDemand"), ari: n, fullbay: p(), torque360: n, shopware: n, protractor: n, napatracs: n, identifix: y, garage360: n, orderry: n, garageplug: p(), workshop: n, rowriter: n, maxxtraxx: n,
    }),
    row("Service-reminder automation", {
      "365": y, shopmonkey: y, tekmetric: y, autoleap: y, mitchell1: p(), ari: y, fullbay: y, torque360: y, shopware: y, protractor: y, napatracs: p(), identifix: p(), garage360: p(), orderry: y, garageplug: y, workshop: y, rowriter: p(), maxxtraxx: p(),
    }),
    row("PH-local pricing & payments (GCash)", {
      "365": y, shopmonkey: n, tekmetric: n, autoleap: n, mitchell1: n, ari: n, fullbay: n, torque360: n, shopware: n, protractor: n, napatracs: n, identifix: n, garage360: p(), orderry: n, garageplug: p("APAC pricing"), workshop: n, rowriter: n, maxxtraxx: n,
    }),
    row("Mobile-first UI", {
      "365": y, shopmonkey: y, tekmetric: y, autoleap: y, mitchell1: n, ari: y, fullbay: y, torque360: y, shopware: y, protractor: p(), napatracs: n, identifix: p(), garage360: y, orderry: y, garageplug: y, workshop: p(), rowriter: n, maxxtraxx: n,
    }),
    row("Referral / affiliate program", {
      "365": y, shopmonkey: n, tekmetric: n, autoleap: n, mitchell1: n, ari: n, fullbay: n, torque360: n, shopware: n, protractor: n, napatracs: n, identifix: n, garage360: n, orderry: n, garageplug: n, workshop: n, rowriter: n, maxxtraxx: n,
    }),
  ],
};

// ================= MARKETPLACES =================
const MARKETPLACE_COMPETITORS: Competitor[] = [
  {
    id: "365",
    name: "365 Motor Sales",
    blurb: "PH-first, motor-focused",
    pricing: {
      startingUsd: 0,
      unit: "free",
      tierName: "Free forever",
      includes: ["Free listings", "Boosts optional", "Full seller tools"],
      link: "/pricing",
    },
  },
  {
    id: "carousell",
    name: "Carousell",
    blurb: "General C2C",
    pricing: {
      startingUsd: 0,
      unit: "free",
      tierName: "Free basic",
      includes: ["Bumps paid", "Not vehicle-focused"],
      link: "https://www.carousell.ph/",
    },
  },
  {
    id: "olx",
    name: "OLX",
    blurb: "General classifieds",
    pricing: {
      startingUsd: 0,
      unit: "free",
      tierName: "Free basic",
      includes: ["Paid boosts", "No vehicle tools"],
      link: "https://www.olx.ph/",
    },
  },
  {
    id: "autodeal",
    name: "AutoDeal",
    blurb: "Dealer-first PH",
    pricing: {
      startingUsd: null,
      unit: "custom",
      tierName: "Dealer plan",
      includes: ["Dealer-only", "Lead-fee model", "No private sellers"],
      link: "https://www.autodeal.com.ph/",
    },
  },
  {
    id: "philkotse",
    name: "Philkotse",
    blurb: "PH auto classifieds",
    pricing: {
      startingUsd: null,
      unit: "custom",
      tierName: "Dealer plan",
      includes: ["Dealer subscriptions", "Private ads limited"],
      link: "https://philkotse.com/",
    },
  },
  {
    id: "carmudi",
    name: "Carmudi",
    blurb: "PH/SEA classifieds",
    pricing: {
      startingUsd: null,
      unit: "custom",
      tierName: "Dealer plan",
      includes: ["Dealer packages", "Featured spots paid"],
      link: "https://www.carmudi.com.ph/",
    },
  },
  {
    id: "carsph",
    name: "Cars.com.ph",
    blurb: "PH dealer marketplace",
    pricing: {
      startingUsd: null,
      unit: "custom",
      tierName: "Dealer plan",
      includes: ["Dealer packages", "Private posts limited"],
      link: "https://www.cars.com.ph/",
    },
  },
  {
    id: "fb",
    name: "Facebook Marketplace",
    blurb: "Social classifieds",
    pricing: {
      startingUsd: 0,
      unit: "free",
      tierName: "Free",
      includes: ["Unmoderated", "No vehicle tools", "Meta ads paid"],
      link: "https://www.facebook.com/marketplace/",
    },
  },
];

export const MARKETPLACE_MATRIX: CompetitorMatrix = {
  competitors: MARKETPLACE_COMPETITORS,
  rows: [
    row("Vehicle listings", { "365": y, carousell: y, olx: y, autodeal: y, philkotse: y, carmudi: y, carsph: y, fb: y }),
    row("VIN decode on listing", { "365": y, carousell: n, olx: n, autodeal: p(), philkotse: n, carmudi: n, carsph: n, fb: n }),
    row("OR/CR verification", {
      "365": yy("AI-assisted LTO doc check"),
      carousell: n, olx: n, autodeal: p("Manual dealer check"), philkotse: n, carmudi: p("Dealer only"), carsph: n, fb: n,
    }),
    row("Draft auto-save on listing form", { "365": y, carousell: n, olx: n, autodeal: n, philkotse: n, carmudi: n, carsph: n, fb: p() }),
    row("Smart map with filters + sidebar", { "365": y, carousell: n, olx: p(), autodeal: n, philkotse: n, carmudi: n, carsph: n, fb: p() }),
    row("Wanted listings board", { "365": y, carousell: n, olx: n, autodeal: n, philkotse: n, carmudi: n, carsph: n, fb: n }),
    row("Messenger inbox with folders + offers", { "365": y, carousell: p(), olx: p(), autodeal: n, philkotse: n, carmudi: n, carsph: n, fb: p() }),
    row("Seller tier rings on cards", { "365": y, carousell: n, olx: n, autodeal: n, philkotse: n, carmudi: n, carsph: n, fb: n }),
    row("Live cross-shop parts stock", { "365": y, carousell: n, olx: n, autodeal: n, philkotse: n, carmudi: n, carsph: n, fb: n }),
    row("Shop management for businesses", { "365": y, carousell: n, olx: n, autodeal: p("Dealer CRM"), philkotse: n, carmudi: p(), carsph: p(), fb: n }),
    row("Franchise / partner shop program", { "365": y, carousell: n, olx: n, autodeal: n, philkotse: n, carmudi: n, carsph: n, fb: n }),
    row("Referral / QR attribution", { "365": y, carousell: n, olx: n, autodeal: n, philkotse: n, carmudi: n, carsph: n, fb: n }),
    row("Learning / driver ed hub", { "365": y, carousell: n, olx: n, autodeal: n, philkotse: p("Blog only"), carmudi: p("Blog"), carsph: p("Blog"), fb: n }),
    row("Tow & dispatch", { "365": y, carousell: n, olx: n, autodeal: n, philkotse: n, carmudi: n, carsph: n, fb: n }),
    row("Accredited clubs directory", { "365": y, carousell: n, olx: n, autodeal: n, philkotse: n, carmudi: n, carsph: n, fb: p("Unmoderated groups") }),
  ],
};

function row(capability: string, cells: Record<string, Cell>) {
  return { capability, cells };
}
