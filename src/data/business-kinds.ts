// Shared list of business categories used by signup, verification, admin,
// the public business directory (business_types.slug), and discovery search-terms.
// MUST stay in sync with the public.business_types rows and the
// public.business_kind Postgres enum.
export const BUSINESS_KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "dealership", label: "Dealership / Showroom" },
  { value: "motorcycle_shop", label: "Motorcycle shop" },
  { value: "rental", label: "Vehicle rental" },
  { value: "parts_accessories", label: "Parts supplier / shop" },
  { value: "repair_shop", label: "Repair shop / mechanic" },
  { value: "body_paint", label: "Body shop / paint" },
  { value: "tire_shop", label: "Tire shop / wheels" },
  { value: "battery_shop", label: "Battery shop" },
  { value: "towing", label: "Tow / roadside assistance" },
  { value: "fuel_station", label: "Fuel station" },
  { value: "carwash", label: "Carwash / detailing" },
  { value: "salvage", label: "Salvage yard / scrap" },
  { value: "accessories", label: "Accessories / customization" },
  { value: "audio_tint", label: "Audio / window tint" },
  { value: "inspection", label: "Inspection / emissions" },
  { value: "driving_school", label: "Driving school" },
  { value: "lto_services", label: "LTO / registration services" },
  { value: "insurance", label: "Insurance" },
  { value: "financing", label: "Financing / loans" },
  { value: "transport", label: "Transport / logistics" },
  { value: "corporate", label: "Corporate / fleet" },
  { value: "other", label: "Other" },
];

export const BUSINESS_KIND_VALUES = BUSINESS_KIND_OPTIONS.map((o) => o.value) as [
  string,
  ...string[],
];

export function businessKindLabel(value: string | null | undefined): string {
  if (!value) return "Other";
  return BUSINESS_KIND_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
