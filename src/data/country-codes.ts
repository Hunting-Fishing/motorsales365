// Common ITU E.164 country dial codes. Ordered with PH first, then a curated
// global list. iso = ISO 3166-1 alpha-2, dial = "+63" style string.
export type CountryCode = { iso: string; name: string; dial: string; flag: string };

export const COUNTRY_CODES: CountryCode[] = [
  { iso: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { iso: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { iso: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
  { iso: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { iso: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { iso: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩" },
  { iso: "TH", name: "Thailand", dial: "+66", flag: "🇹🇭" },
  { iso: "VN", name: "Vietnam", dial: "+84", flag: "🇻🇳" },
  { iso: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { iso: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷" },
  { iso: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
  { iso: "HK", name: "Hong Kong", dial: "+852", flag: "🇭🇰" },
  { iso: "TW", name: "Taiwan", dial: "+886", flag: "🇹🇼" },
  { iso: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { iso: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { iso: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { iso: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦" },
  { iso: "KW", name: "Kuwait", dial: "+965", flag: "🇰🇼" },
  { iso: "BH", name: "Bahrain", dial: "+973", flag: "🇧🇭" },
  { iso: "OM", name: "Oman", dial: "+968", flag: "🇴🇲" },
  { iso: "IL", name: "Israel", dial: "+972", flag: "🇮🇱" },
  { iso: "TR", name: "Turkey", dial: "+90", flag: "🇹🇷" },
  { iso: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { iso: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { iso: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪" },
  { iso: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬" },
  { iso: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { iso: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { iso: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { iso: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { iso: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { iso: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { iso: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭" },
  { iso: "AT", name: "Austria", dial: "+43", flag: "🇦🇹" },
  { iso: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪" },
  { iso: "NO", name: "Norway", dial: "+47", flag: "🇳🇴" },
  { iso: "DK", name: "Denmark", dial: "+45", flag: "🇩🇰" },
  { iso: "FI", name: "Finland", dial: "+358", flag: "🇫🇮" },
  { iso: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { iso: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { iso: "GR", name: "Greece", dial: "+30", flag: "🇬🇷" },
  { iso: "PL", name: "Poland", dial: "+48", flag: "🇵🇱" },
  { iso: "CZ", name: "Czechia", dial: "+420", flag: "🇨🇿" },
  { iso: "RO", name: "Romania", dial: "+40", flag: "🇷🇴" },
  { iso: "RU", name: "Russia", dial: "+7", flag: "🇷🇺" },
  { iso: "UA", name: "Ukraine", dial: "+380", flag: "🇺🇦" },
  { iso: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
  { iso: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
  { iso: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { iso: "CL", name: "Chile", dial: "+56", flag: "🇨🇱" },
  { iso: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴" },
  { iso: "PE", name: "Peru", dial: "+51", flag: "🇵🇪" },
];

export function findCountryByDial(dial: string): CountryCode | undefined {
  // Longest dial match wins (e.g. +1 vs +1-...)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  return sorted.find((c) => dial.startsWith(c.dial));
}

export function parseE164(value: string | null | undefined): { iso: string; national: string } {
  if (!value) return { iso: "PH", national: "" };
  const v = value.startsWith("+") ? value : `+${value.replace(/\D/g, "")}`;
  const c = findCountryByDial(v);
  if (!c) return { iso: "PH", national: v.replace(/^\+/, "") };
  return { iso: c.iso, national: v.slice(c.dial.length).replace(/\D/g, "") };
}

export function buildE164(iso: string, national: string): string | null {
  const c = COUNTRY_CODES.find((x) => x.iso === iso);
  if (!c) return null;
  let digits = national.replace(/\D/g, "");
  // Strip leading "0" trunk prefix common in PH/UK/etc.
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.length < 4) return null;
  return `${c.dial}${digits}`;
}

// Country-aware formatter: groups national digits with dashes so PH
// `9694343430` displays as `969-434-3430`. Falls back to 3-3-rest for unknown
// ISO codes. Pass only national digits (no dial code).
export function formatNational(national: string, iso?: string): string {
  const d = national.replace(/\D/g, "");
  if (!d) return "";
  const code = (iso ?? "").toUpperCase();
  const groupings: Record<string, number[]> = {
    PH: [3, 3, 4],
    US: [3, 3, 4],
    CA: [3, 3, 4],
    AU: [3, 3, 3],
    NZ: [2, 3, 4],
    GB: [4, 6],
    SG: [4, 4],
    MY: [2, 3, 4],
    ID: [3, 4, 4],
    TH: [2, 3, 4],
    VN: [3, 3, 3],
    JP: [2, 4, 4],
    KR: [2, 4, 4],
    CN: [3, 4, 4],
    HK: [4, 4],
    TW: [3, 3, 3],
    IN: [5, 5],
    AE: [2, 3, 4],
    SA: [2, 3, 4],
    DE: [4, 3, 4],
    FR: [1, 2, 2, 2, 2],
    ES: [3, 3, 3],
    IT: [3, 3, 4],
    NL: [2, 4, 4],
    BR: [2, 4, 4],
    MX: [3, 3, 4],
  };
  const pattern = groupings[code] ?? [3, 3, 4];
  const parts: string[] = [];
  let i = 0;
  for (const size of pattern) {
    if (i >= d.length) break;
    parts.push(d.slice(i, i + size));
    i += size;
  }
  if (i < d.length) parts.push(d.slice(i));
  return parts.filter(Boolean).join("-");
}

/** Format a stored E.164 phone (`+639694343430`) for display, e.g. `+63 969-434-3430`. */
export function formatE164(value: string | null | undefined): string {
  if (!value) return "";
  const { iso, national } = parseE164(value);
  const country = COUNTRY_CODES.find((c) => c.iso === iso);
  const formatted = formatNational(national, iso);
  return country ? `${country.dial} ${formatted}` : value;
}

