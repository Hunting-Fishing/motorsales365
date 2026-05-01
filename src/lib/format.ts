export function formatPHP(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : value ?? 0;
  if (Number.isNaN(num)) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export const PH_REGIONS = [
  "Metro Manila (NCR)",
  "Cordillera (CAR)",
  "Ilocos Region (I)",
  "Cagayan Valley (II)",
  "Central Luzon (III)",
  "CALABARZON (IV-A)",
  "MIMAROPA (IV-B)",
  "Bicol Region (V)",
  "Western Visayas (VI)",
  "Central Visayas (VII)",
  "Eastern Visayas (VIII)",
  "Zamboanga Peninsula (IX)",
  "Northern Mindanao (X)",
  "Davao Region (XI)",
  "SOCCSKSARGEN (XII)",
  "Caraga (XIII)",
  "BARMM",
];
