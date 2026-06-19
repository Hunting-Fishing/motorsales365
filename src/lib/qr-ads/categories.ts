/**
 * QR Ads category taxonomy. Used by:
 * - built-in templates (`templates.ts`)
 * - custom uploads (`qr_ad_templates.{category,subcategory}`)
 * - admin overrides for built-ins (`qr_ad_builtin_categories`)
 * - the AI classifier (the prompt is generated from this list)
 */

export type CategoryKey =
  | "service-repair"
  | "sales-service"
  | "insurance-finance"
  | "advertising-365"
  | "other";

export type SubcategoryKey =
  | "mechanic"
  | "detailing-carwash"
  | "upholstery-interior"
  | "tow-roadside"
  | "inspection-testing"
  | "tire-wheel"
  | "vehicles-for-sale"
  | "parts-accessories"
  | "fuel-lubricants"
  | "insurance"
  | "financing"
  | "social-posts"
  | "stories-reels"
  | "print-wearables"
  | "other";

export type CategoryDef = {
  key: CategoryKey;
  label: string;
  subs: { key: SubcategoryKey; label: string }[];
};

export const CATEGORY_TREE: CategoryDef[] = [
  {
    key: "service-repair",
    label: "Service & Repair Shops",
    subs: [
      { key: "mechanic", label: "Auto Repair / Mechanic" },
      { key: "detailing-carwash", label: "Detailing & Carwash" },
      { key: "upholstery-interior", label: "Upholstery & Interior" },
      { key: "tow-roadside", label: "Tow & Roadside" },
      { key: "inspection-testing", label: "Inspection & Testing" },
      { key: "tire-wheel", label: "Tire / Wheel / Alignment" },
    ],
  },
  {
    key: "sales-service",
    label: "Sales & Service",
    subs: [
      { key: "vehicles-for-sale", label: "Vehicles For Sale" },
      { key: "parts-accessories", label: "Parts & Accessories" },
      { key: "fuel-lubricants", label: "Fuel / Lubricants" },
    ],
  },
  {
    key: "insurance-finance",
    label: "Insurance / Finance",
    subs: [
      { key: "insurance", label: "Insurance" },
      { key: "financing", label: "Financing & Loans" },
    ],
  },
  {
    key: "advertising-365",
    label: "Advertising 365",
    subs: [
      { key: "social-posts", label: "Social Posts" },
      { key: "stories-reels", label: "Stories & Reels" },
      { key: "print-wearables", label: "Print & Wearables" },
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
