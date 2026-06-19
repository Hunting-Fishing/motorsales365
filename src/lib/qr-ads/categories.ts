/**
 * QR Advertisement category taxonomy. Used by:
 * - built-in templates (`templates.ts`)
 * - custom uploads (`qr_ad_templates.{category,subcategory}`)
 * - admin overrides for built-ins (`qr_ad_builtin_categories`)
 * - the AI classifier (the prompt is generated from this list)
 *
 * The taxonomy mirrors what 365 Motor Sales actually sells: a service
 * directory, vehicle/parts marketplace, towing/dispatch, training, and
 * brand/referral content.
 */

export type CategoryKey =
  | "repair-service"
  | "towing-roadside"
  | "sales-marketplace"
  | "insurance-finance"
  | "training-certification"
  | "membership-referrals"
  | "brand-format"
  | "other";

export type SubcategoryKey =
  // repair-service
  | "mechanic"
  | "body-paint"
  | "detailing-carwash"
  | "upholstery-interior"
  | "tire-wheel"
  | "glass-windshield"
  | "ac-electrical"
  | "diesel-heavy-duty"
  | "motorcycle-service"
  | "inspection-testing"
  // towing-roadside
  | "tow-247"
  | "roadside-assist"
  | "fleet-dispatch"
  | "heavy-recovery"
  // sales-marketplace
  | "cars-for-sale"
  | "motorcycles-for-sale"
  | "trucks-vans"
  | "heavy-equipment"
  | "boats-marine"
  | "parts-accessories"
  | "fuel-lubricants"
  | "tools-equipment"
  // insurance-finance
  | "insurance"
  | "financing"
  | "warranty-protection"
  // training-certification
  | "courses"
  | "instructor-referrals"
  | "workshops-events"
  // membership-referrals
  | "member-promo"
  | "referral-card"
  | "member-perks"
  // brand-format
  | "social-posts"
  | "stories-reels"
  | "landscape-banner"
  | "print-wearables"
  | "stickers-decals"
  | "business-cards"
  // catch-all
  | "other";

export type CategoryDef = {
  key: CategoryKey;
  label: string;
  subs: { key: SubcategoryKey; label: string }[];
};

export const CATEGORY_TREE: CategoryDef[] = [
  {
    key: "repair-service",
    label: "Repair & Service Shops",
    subs: [
      { key: "mechanic", label: "Auto Repair / Mechanic" },
      { key: "body-paint", label: "Body & Paint" },
      { key: "detailing-carwash", label: "Detailing & Carwash" },
      { key: "upholstery-interior", label: "Upholstery & Interior" },
      { key: "tire-wheel", label: "Tire / Wheel / Alignment" },
      { key: "glass-windshield", label: "Glass & Windshield" },
      { key: "ac-electrical", label: "AC / Electrical" },
      { key: "diesel-heavy-duty", label: "Diesel & Heavy-Duty" },
      { key: "motorcycle-service", label: "Motorcycle Service" },
      { key: "inspection-testing", label: "Inspection & Testing" },
    ],
  },
  {
    key: "towing-roadside",
    label: "Towing & Roadside",
    subs: [
      { key: "tow-247", label: "24/7 Tow" },
      { key: "roadside-assist", label: "Roadside Assistance" },
      { key: "fleet-dispatch", label: "Fleet & Dispatch" },
      { key: "heavy-recovery", label: "Heavy Recovery" },
    ],
  },
  {
    key: "sales-marketplace",
    label: "Sales & Marketplace",
    subs: [
      { key: "cars-for-sale", label: "Cars For Sale" },
      { key: "motorcycles-for-sale", label: "Motorcycles For Sale" },
      { key: "trucks-vans", label: "Trucks & Vans" },
      { key: "heavy-equipment", label: "Heavy Equipment" },
      { key: "boats-marine", label: "Boats & Marine" },
      { key: "parts-accessories", label: "Parts & Accessories" },
      { key: "fuel-lubricants", label: "Fuel / Lubricants" },
      { key: "tools-equipment", label: "Tools & Equipment" },
    ],
  },
  {
    key: "insurance-finance",
    label: "Insurance & Finance",
    subs: [
      { key: "insurance", label: "Insurance" },
      { key: "financing", label: "Financing & Loans" },
      { key: "warranty-protection", label: "Warranty & Protection" },
    ],
  },
  {
    key: "training-certification",
    label: "Training & Certification",
    subs: [
      { key: "courses", label: "Courses" },
      { key: "instructor-referrals", label: "Instructor Referrals" },
      { key: "workshops-events", label: "Workshops & Events" },
    ],
  },
  {
    key: "membership-referrals",
    label: "Membership & Referrals",
    subs: [
      { key: "member-promo", label: "365 Member Promo" },
      { key: "referral-card", label: "Referral Code Card" },
      { key: "member-perks", label: "Member Perks" },
    ],
  },
  {
    key: "brand-format",
    label: "Brand & Format",
    subs: [
      { key: "social-posts", label: "Social Posts (1:1)" },
      { key: "stories-reels", label: "Stories & Reels (9:16)" },
      { key: "landscape-banner", label: "Landscape Banner" },
      { key: "print-wearables", label: "Print & Wearables" },
      { key: "stickers-decals", label: "Stickers & Decals" },
      { key: "business-cards", label: "Business Cards" },
    ],
  },
  {
    key: "other",
    label: "Other",
    subs: [{ key: "other", label: "Other" }],
  },
];

const CATEGORY_INDEX = new Map(CATEGORY_TREE.map((c) => [c.key, c]));
const SUB_INDEX = new Map<SubcategoryKey, { cat: CategoryKey; label: string }>();
for (const c of CATEGORY_TREE) {
  for (const s of c.subs) SUB_INDEX.set(s.key, { cat: c.key, label: s.label });
}

export function categoryLabel(key: string | null | undefined): string {
  if (!key) return "Uncategorized";
  return CATEGORY_INDEX.get(key as CategoryKey)?.label ?? "Other";
}

export function subcategoryLabel(key: string | null | undefined): string {
  if (!key) return "";
  return SUB_INDEX.get(key as SubcategoryKey)?.label ?? "";
}

export function subsFor(cat: string | null | undefined) {
  if (!cat) return [];
  return CATEGORY_INDEX.get(cat as CategoryKey)?.subs ?? [];
}

export function isValidCategory(key: unknown): key is CategoryKey {
  return typeof key === "string" && CATEGORY_INDEX.has(key as CategoryKey);
}

export function isValidSubcategory(key: unknown): key is SubcategoryKey {
  return typeof key === "string" && SUB_INDEX.has(key as SubcategoryKey);
}

export function categoryFromSub(sub: string | null | undefined): CategoryKey | null {
  if (!sub) return null;
  return SUB_INDEX.get(sub as SubcategoryKey)?.cat ?? null;
}

/** Allowed `(category, subcategory)` pairs, formatted for the AI classifier prompt. */
export function classifierTaxonomyPrompt(): string {
  return CATEGORY_TREE.map(
    (c) => `- ${c.key} (${c.label}):\n${c.subs.map((s) => `    - ${s.key} (${s.label})`).join("\n")}`,
  ).join("\n");
}

export const UNCATEGORIZED_KEY = "__uncategorized__";
