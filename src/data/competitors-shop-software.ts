/**
 * Comparison matrix — 365 vs global shop-software competitors.
 * Cell values: "yes" | "partial" | "no". Tooltip explains the nuance.
 * Sources: each competitor's public product/pricing pages as of 2026.
 */

export type Cell = { v: "yes" | "partial" | "no"; note?: string };

export type CompetitorMatrix = {
  competitors: { id: string; name: string; blurb: string }[];
  rows: { capability: string; cells: Record<string, Cell> }[];
};

export const SHOP_SOFTWARE_MATRIX: CompetitorMatrix = {
  competitors: [
    { id: "365", name: "365 Motor Sales", blurb: "PH-first, all-in-one" },
    { id: "shopmonkey", name: "Shopmonkey", blurb: "US SaaS, $199+/mo" },
    { id: "tekmetric", name: "Tekmetric", blurb: "US SaaS, contract pricing" },
    { id: "mitchell1", name: "Mitchell 1", blurb: "Legacy desktop-first" },
    { id: "autoleap", name: "AutoLeap", blurb: "US/CA SaaS" },
    { id: "garage360", name: "Garage360", blurb: "APAC SaaS" },
  ],
  rows: [
    {
      capability: "Work orders (RO lifecycle)",
      cells: {
        "365": { v: "yes" },
        shopmonkey: { v: "yes" },
        tekmetric: { v: "yes" },
        mitchell1: { v: "yes" },
        autoleap: { v: "yes" },
        garage360: { v: "yes" },
      },
    },
    {
      capability: "Inventory with alerts",
      cells: {
        "365": { v: "yes" },
        shopmonkey: { v: "yes" },
        tekmetric: { v: "yes" },
        mitchell1: { v: "yes" },
        autoleap: { v: "yes" },
        garage360: { v: "yes" },
      },
    },
    {
      capability: "Double-entry GL & P&L in-app",
      cells: {
        "365": { v: "yes", note: "Real ledger, not just KPIs" },
        shopmonkey: { v: "partial", note: "Integrates with QuickBooks" },
        tekmetric: { v: "partial", note: "QuickBooks integration" },
        mitchell1: { v: "partial" },
        autoleap: { v: "partial", note: "QuickBooks integration" },
        garage360: { v: "no" },
      },
    },
    {
      capability: "Cross-shop live parts stock",
      cells: {
        "365": { v: "yes", note: "network_stock view, real-time" },
        shopmonkey: { v: "no" },
        tekmetric: { v: "no" },
        mitchell1: { v: "no" },
        autoleap: { v: "no" },
        garage360: { v: "no" },
      },
    },
    {
      capability: "VIN-based parts catalog",
      cells: {
        "365": { v: "yes" },
        shopmonkey: { v: "partial", note: "Via 3rd-party" },
        tekmetric: { v: "partial", note: "Via Nexpart" },
        mitchell1: { v: "yes", note: "Native" },
        autoleap: { v: "partial" },
        garage360: { v: "no" },
      },
    },
    {
      capability: "Public marketplace (buy/sell vehicles)",
      cells: {
        "365": { v: "yes" },
        shopmonkey: { v: "no" },
        tekmetric: { v: "no" },
        mitchell1: { v: "no" },
        autoleap: { v: "no" },
        garage360: { v: "no" },
      },
    },
    {
      capability: "Franchise / network program",
      cells: {
        "365": { v: "yes" },
        shopmonkey: { v: "no" },
        tekmetric: { v: "no" },
        mitchell1: { v: "no" },
        autoleap: { v: "no" },
        garage360: { v: "no" },
      },
    },
    {
      capability: "Loyalty & promo codes built-in",
      cells: {
        "365": { v: "yes" },
        shopmonkey: { v: "partial", note: "Marketing add-on" },
        tekmetric: { v: "partial" },
        mitchell1: { v: "no" },
        autoleap: { v: "yes" },
        garage360: { v: "no" },
      },
    },
    {
      capability: "HR / leave / certificates",
      cells: {
        "365": { v: "yes" },
        shopmonkey: { v: "no" },
        tekmetric: { v: "no" },
        mitchell1: { v: "no" },
        autoleap: { v: "no" },
        garage360: { v: "no" },
      },
    },
    {
      capability: "Learning / courses in-app",
      cells: {
        "365": { v: "yes" },
        shopmonkey: { v: "partial", note: "Shopmonkey University" },
        tekmetric: { v: "no" },
        mitchell1: { v: "no" },
        autoleap: { v: "no" },
        garage360: { v: "no" },
      },
    },
    {
      capability: "Service-reminder automation",
      cells: {
        "365": { v: "yes" },
        shopmonkey: { v: "yes" },
        tekmetric: { v: "yes" },
        mitchell1: { v: "partial" },
        autoleap: { v: "yes" },
        garage360: { v: "partial" },
      },
    },
    {
      capability: "PH-local pricing & payments (GCash)",
      cells: {
        "365": { v: "yes" },
        shopmonkey: { v: "no" },
        tekmetric: { v: "no" },
        mitchell1: { v: "no" },
        autoleap: { v: "no" },
        garage360: { v: "partial" },
      },
    },
    {
      capability: "Mobile-first UI",
      cells: {
        "365": { v: "yes" },
        shopmonkey: { v: "yes" },
        tekmetric: { v: "yes" },
        mitchell1: { v: "no" },
        autoleap: { v: "yes" },
        garage360: { v: "yes" },
      },
    },
    {
      capability: "Referral / affiliate program",
      cells: {
        "365": { v: "yes" },
        shopmonkey: { v: "no" },
        tekmetric: { v: "no" },
        mitchell1: { v: "no" },
        autoleap: { v: "no" },
        garage360: { v: "no" },
      },
    },
  ],
};

export const MARKETPLACE_MATRIX: CompetitorMatrix = {
  competitors: [
    { id: "365", name: "365 Motor Sales", blurb: "PH-first, motor-focused" },
    { id: "carousell", name: "Carousell", blurb: "General C2C marketplace" },
    { id: "olx", name: "OLX", blurb: "General classifieds" },
    { id: "autodeal", name: "AutoDeal", blurb: "Dealer-first PH" },
    { id: "philkotse", name: "Philkotse", blurb: "PH auto classifieds" },
    { id: "fb", name: "Facebook Marketplace", blurb: "Social classifieds" },
  ],
  rows: [
    {
      capability: "Vehicle listings",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "yes" },
        olx: { v: "yes" },
        autodeal: { v: "yes" },
        philkotse: { v: "yes" },
        fb: { v: "yes" },
      },
    },
    {
      capability: "VIN decode on listing",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "no" },
        olx: { v: "no" },
        autodeal: { v: "partial" },
        philkotse: { v: "no" },
        fb: { v: "no" },
      },
    },
    {
      capability: "OR/CR verification",
      cells: {
        "365": { v: "yes", note: "AI-assisted LTO doc check" },
        carousell: { v: "no" },
        olx: { v: "no" },
        autodeal: { v: "partial", note: "Manual dealer check" },
        philkotse: { v: "no" },
        fb: { v: "no" },
      },
    },
    {
      capability: "Draft auto-save on listing form",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "no" },
        olx: { v: "no" },
        autodeal: { v: "no" },
        philkotse: { v: "no" },
        fb: { v: "partial" },
      },
    },
    {
      capability: "Smart map with filters + sidebar",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "no" },
        olx: { v: "partial" },
        autodeal: { v: "no" },
        philkotse: { v: "no" },
        fb: { v: "partial" },
      },
    },
    {
      capability: "Wanted listings board",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "no" },
        olx: { v: "no" },
        autodeal: { v: "no" },
        philkotse: { v: "no" },
        fb: { v: "no" },
      },
    },
    {
      capability: "Messenger inbox with folders + offers",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "partial" },
        olx: { v: "partial" },
        autodeal: { v: "no" },
        philkotse: { v: "no" },
        fb: { v: "partial" },
      },
    },
    {
      capability: "Seller tier rings on cards",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "no" },
        olx: { v: "no" },
        autodeal: { v: "no" },
        philkotse: { v: "no" },
        fb: { v: "no" },
      },
    },
    {
      capability: "Live cross-shop parts stock",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "no" },
        olx: { v: "no" },
        autodeal: { v: "no" },
        philkotse: { v: "no" },
        fb: { v: "no" },
      },
    },
    {
      capability: "Shop management for businesses",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "no" },
        olx: { v: "no" },
        autodeal: { v: "partial", note: "Dealer CRM" },
        philkotse: { v: "no" },
        fb: { v: "no" },
      },
    },
    {
      capability: "Franchise / partner shop program",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "no" },
        olx: { v: "no" },
        autodeal: { v: "no" },
        philkotse: { v: "no" },
        fb: { v: "no" },
      },
    },
    {
      capability: "Referral / QR attribution",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "no" },
        olx: { v: "no" },
        autodeal: { v: "no" },
        philkotse: { v: "no" },
        fb: { v: "no" },
      },
    },
    {
      capability: "Learning / driver ed hub",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "no" },
        olx: { v: "no" },
        autodeal: { v: "no" },
        philkotse: { v: "partial", note: "Blog only" },
        fb: { v: "no" },
      },
    },
    {
      capability: "Tow & dispatch",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "no" },
        olx: { v: "no" },
        autodeal: { v: "no" },
        philkotse: { v: "no" },
        fb: { v: "no" },
      },
    },
    {
      capability: "Accredited clubs directory",
      cells: {
        "365": { v: "yes" },
        carousell: { v: "no" },
        olx: { v: "no" },
        autodeal: { v: "no" },
        philkotse: { v: "no" },
        fb: { v: "partial", note: "Unmoderated groups" },
      },
    },
  ],
};
