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

// Per-country expected NATIONAL number length (digits after dial code, trunk
// prefix stripped). Ranges are inclusive. `mobilePrefix` (optional) is a list
// of acceptable first-digit(s) after trunk-strip — used to reject landlines
// or clearly wrong numbers. Countries not listed fall back to a generic
// E.164-wide range of 6–14 national digits.
type PhoneRule = { min: number; max: number; mobilePrefix?: string[] };
const PHONE_RULES: Record<string, PhoneRule> = {
  PH: { min: 10, max: 10, mobilePrefix: ["9"] },
  US: { min: 10, max: 10 },
  CA: { min: 10, max: 10 },
  GB: { min: 10, max: 10, mobilePrefix: ["7"] },
  AU: { min: 9, max: 9, mobilePrefix: ["4"] },
  NZ: { min: 8, max: 10 },
  SG: { min: 8, max: 8, mobilePrefix: ["8", "9"] },
  MY: { min: 9, max: 10, mobilePrefix: ["1"] },
  ID: { min: 9, max: 12, mobilePrefix: ["8"] },
  TH: { min: 9, max: 9, mobilePrefix: ["6", "8", "9"] },
  VN: { min: 9, max: 10 },
  JP: { min: 10, max: 10 },
  KR: { min: 9, max: 10, mobilePrefix: ["1"] },
  CN: { min: 11, max: 11, mobilePrefix: ["1"] },
  HK: { min: 8, max: 8 },
  TW: { min: 9, max: 9, mobilePrefix: ["9"] },
  IN: { min: 10, max: 10, mobilePrefix: ["6", "7", "8", "9"] },
  PK: { min: 10, max: 10, mobilePrefix: ["3"] },
  BD: { min: 10, max: 10 },
  AE: { min: 9, max: 9, mobilePrefix: ["5"] },
  SA: { min: 9, max: 9, mobilePrefix: ["5"] },
  QA: { min: 8, max: 8 },
  KW: { min: 8, max: 8 },
  BH: { min: 8, max: 8 },
  OM: { min: 8, max: 8 },
  IL: { min: 9, max: 9 },
  TR: { min: 10, max: 10, mobilePrefix: ["5"] },
  ZA: { min: 9, max: 9 },
  NG: { min: 10, max: 10 },
  KE: { min: 9, max: 9, mobilePrefix: ["7", "1"] },
  EG: { min: 10, max: 10, mobilePrefix: ["1"] },
  DE: { min: 10, max: 11 },
  FR: { min: 9, max: 9, mobilePrefix: ["6", "7"] },
  ES: { min: 9, max: 9, mobilePrefix: ["6", "7"] },
  IT: { min: 9, max: 11 },
  NL: { min: 9, max: 9, mobilePrefix: ["6"] },
  BE: { min: 8, max: 9 },
  CH: { min: 9, max: 9, mobilePrefix: ["7"] },
  AT: { min: 10, max: 11 },
  SE: { min: 7, max: 10 },
  NO: { min: 8, max: 8 },
  DK: { min: 8, max: 8 },
  FI: { min: 8, max: 10 },
  IE: { min: 9, max: 9, mobilePrefix: ["8"] },
  PT: { min: 9, max: 9, mobilePrefix: ["9"] },
  GR: { min: 10, max: 10, mobilePrefix: ["6"] },
  PL: { min: 9, max: 9 },
  CZ: { min: 9, max: 9 },
  RO: { min: 9, max: 9, mobilePrefix: ["7"] },
  RU: { min: 10, max: 10, mobilePrefix: ["9"] },
  UA: { min: 9, max: 9 },
  MX: { min: 10, max: 10 },
  BR: { min: 10, max: 11 },
  AR: { min: 10, max: 11 },
  CL: { min: 9, max: 9, mobilePrefix: ["9"] },
  CO: { min: 10, max: 10, mobilePrefix: ["3"] },
  PE: { min: 9, max: 9, mobilePrefix: ["9"] },
};

export type PhoneValidation = { valid: boolean; message?: string; e164?: string };

/**
 * Strictly validate a national phone number against the per-country rule.
 * Returns the normalized E.164 string when valid. Trunk-strip is applied
 * before length checks (e.g. PH `09694343430` → `9694343430`).
 */
export function validatePhone(iso: string, national: string): PhoneValidation {
  const c = COUNTRY_CODES.find((x) => x.iso === iso);
  if (!c) return { valid: false, message: "Pick a country." };
  const raw = national.trim();
  if (!raw) return { valid: false, message: "Enter your mobile number." };
  let digits = raw.replace(/\D/g, "");
  if (!digits) return { valid: false, message: "Enter digits only for the number." };
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  const rule = PHONE_RULES[iso] ?? { min: 6, max: 14 };
  if (digits.length < rule.min || digits.length > rule.max) {
    const range = rule.min === rule.max ? `${rule.min}` : `${rule.min}–${rule.max}`;
    return {
      valid: false,
      message: `${c.name} numbers need ${range} digits after ${c.dial}.`,
    };
  }
  if (rule.mobilePrefix && !rule.mobilePrefix.some((p) => digits.startsWith(p))) {
    return {
      valid: false,
      message: `${c.name} mobile numbers start with ${rule.mobilePrefix
        .map((p) => `${p}`)
        .join(" or ")} after ${c.dial}.`,
    };
  }
  return { valid: true, e164: `${c.dial}${digits}` };
}

// --- Inline hint helper -----------------------------------------------------
// Produces a UI-friendly status for a phone-in-progress. Distinguishes
// "incomplete" (user is still typing) from "invalid" (wrong prefix / too many
// digits / landline) so we can color amber vs red and show a helpful hint.
export type PhoneHintStatus = "idle" | "incomplete" | "invalid" | "valid";
export type PhoneHint = {
  status: PhoneHintStatus;
  message: string;
  example: string;
  expected: string; // e.g. "10 digits" or "9–11 digits"
  current: number;
  e164?: string;
};

const EXAMPLES: Record<string, string> = {
  PH: "917 123 4567",
  US: "415 555 0132",
  CA: "416 555 0199",
  GB: "7400 123456",
  AU: "412 345 678",
  SG: "8123 4567",
  MY: "12 345 6789",
  ID: "812 3456 7890",
  TH: "81 234 5678",
  VN: "912 345 678",
  JP: "90 1234 5678",
  KR: "10 1234 5678",
  CN: "131 2345 6789",
  HK: "5123 4567",
  TW: "912 345 678",
  IN: "98765 43210",
  AE: "50 123 4567",
  SA: "51 234 5678",
  DE: "1512 3456789",
  FR: "6 12 34 56 78",
  ES: "612 345 678",
  IT: "312 345 6789",
  NL: "6 12345678",
  BR: "11 91234 5678",
  MX: "55 1234 5678",
};

export function getPhoneHint(iso: string, national: string): PhoneHint {
  const c = COUNTRY_CODES.find((x) => x.iso === iso) ?? COUNTRY_CODES[0];
  const rule = PHONE_RULES[iso] ?? { min: 6, max: 14 };
  const expected =
    rule.min === rule.max ? `${rule.min} digits` : `${rule.min}–${rule.max} digits`;
  const example = `${c.dial} ${EXAMPLES[iso] ?? "123 456 7890"}`;

  const raw = national.trim();
  if (!raw) {
    return {
      status: "idle",
      message: `Enter your ${c.name} mobile number.`,
      example,
      expected,
      current: 0,
    };
  }

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");

  // Still typing — under the minimum length
  if (digits.length < rule.min) {
    const remaining = rule.min - digits.length;
    return {
      status: "incomplete",
      message: `${digits.length} of ${rule.min} digits — ${remaining} more to go.`,
      example,
      expected,
      current: digits.length,
    };
  }

  // Over the maximum
  if (digits.length > rule.max) {
    return {
      status: "invalid",
      message: `Too many digits. ${c.name} numbers use ${expected} after ${c.dial}.`,
      example,
      expected,
      current: digits.length,
    };
  }

  // Wrong mobile prefix (landline or malformed)
  if (rule.mobilePrefix && !rule.mobilePrefix.some((p) => digits.startsWith(p))) {
    const prefixes = rule.mobilePrefix.join(" or ");
    return {
      status: "invalid",
      message: `${c.name} mobile numbers start with ${prefixes} after ${c.dial}.`,
      example,
      expected,
      current: digits.length,
    };
  }

  return {
    status: "valid",
    message: "Looks good.",
    example,
    expected,
    current: digits.length,
    e164: `${c.dial}${digits}`,
  };
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

