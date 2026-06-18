// Single source of truth for placement catalog used by /advertise,
// /dashboard/sponsorships, and /admin/advertisements/inquiries.

export const SECTIONS = [
  {
    value: "marketplace_home",
    label: "Marketplace homepage",
    blurb: "Hero carousel + featured strip on the 365 MotorSales home page.",
    audience: "All buyers — highest reach across the site.",
    tier: "Premium",
    formats: ["banner", "carousel_slide"],
    placement: "homepage_banner" as const,
  },
  {
    value: "marketplace_category",
    label: "Category pages (Cars, Motorcycles, Boats, Airplanes, Heavy Equipment, Parts)",
    blurb: "Top banner on a chosen vehicle category page.",
    audience: "In-market buyers actively browsing a category.",
    tier: "Growth",
    formats: ["banner", "sponsored_card"],
    placement: "category_banner" as const,
  },
  {
    value: "marketplace_listing",
    label: "Listing detail sidebar",
    blurb: "Sidebar tile rendered next to every individual listing.",
    audience: "Buyers comparing specific vehicles.",
    tier: "Growth",
    formats: ["sidebar_tile"],
    placement: "listing_sidebar" as const,
  },
  {
    value: "browse",
    label: "Browse / search results",
    blurb: "Top banner on browse and filtered search results.",
    audience: "Active shoppers with intent filters set.",
    tier: "Growth",
    formats: ["banner", "sponsored_card"],
    placement: "browse_top" as const,
  },
  {
    value: "rides",
    label: "Rides feed",
    blurb: "Top banner on the community Rides feed.",
    audience: "Enthusiasts and ride builders.",
    tier: "Starter",
    formats: ["banner", "sponsored_card"],
    placement: "rides_top" as const,
  },
  {
    value: "export",
    label: "Export inquiries",
    blurb: "Top banner on the export inquiry workflow.",
    audience: "International buyers and exporters.",
    tier: "Starter",
    formats: ["banner"],
    placement: "export_top" as const,
  },
  {
    value: "shop",
    label: "Parts shop",
    blurb: "Top banner and sidebar tiles across the parts shop.",
    audience: "Owners shopping for parts, tools and accessories.",
    tier: "Growth",
    formats: ["banner", "sidebar_tile", "sponsored_card"],
    placement: "shop_top" as const,
  },
  {
    value: "learn",
    label: "Academy / Learn",
    blurb: "Sponsor your Academy, Institution, School, or Learning Center spot on /learn.",
    audience: "Drivers and students researching training.",
    tier: "Growth",
    formats: ["academy_card", "sponsored_card"],
    placement: "learn_rail" as const,
  },
  {
    value: "businesses",
    label: "Business directory",
    blurb: "Featured placement on the business directory.",
    audience: "Buyers looking for verified service providers.",
    tier: "Growth",
    formats: ["sponsored_card", "sidebar_tile"],
    placement: "sponsored_post" as const,
  },
  {
    value: "newsletter",
    label: "Email newsletter",
    blurb: "Sponsored slot in the 365 MotorSales newsletter.",
    audience: "Engaged subscribers and repeat visitors.",
    tier: "Starter",
    formats: ["newsletter_slot"],
    placement: "newsletter" as const,
  },
  {
    value: "custom",
    label: "Something else / custom partnership",
    blurb: "Co-marketing, events, content series — tell us what you have in mind.",
    audience: "Defined together with our team.",
    tier: "Custom",
    formats: ["sponsored_card"],
    placement: "other" as const,
  },
] as const;

export type SectionValue = (typeof SECTIONS)[number]["value"];

export const FORMATS = [
  { value: "banner", label: "Banner" },
  { value: "carousel_slide", label: "Carousel slide" },
  { value: "sidebar_tile", label: "Sidebar tile" },
  { value: "sponsored_card", label: "Sponsored card" },
  { value: "academy_card", label: "Academy card (Learn)" },
  { value: "newsletter_slot", label: "Newsletter slot" },
] as const;

export type FormatValue = (typeof FORMATS)[number]["value"];

export const TIER_TONE: Record<string, string> = {
  Starter: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Growth: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Premium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Custom: "bg-muted text-muted-foreground border-border",
};

export const sectionLabel = (v: string) =>
  SECTIONS.find((s) => s.value === v)?.label ?? v.replace(/_/g, " ");
export const formatLabel = (v: string) =>
  FORMATS.find((f) => f.value === v)?.label ?? v.replace(/_/g, " ");
