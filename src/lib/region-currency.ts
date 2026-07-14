// Lightweight region-currency helper. Detects the visitor's currency from
// their browser locale and converts USD reference prices using a small
// static rate table. Rates are approximate — the UI labels them "≈".

export type RegionCurrency = {
  code: string;
  symbol: string;
  rate: number; // 1 USD -> N of this currency
  locale: string;
};

// Approx USD→X mid-market rates (updated periodically; UI shows "≈").
const RATES: Record<string, { symbol: string; rate: number; locale: string }> = {
  USD: { symbol: "$", rate: 1, locale: "en-US" },
  PHP: { symbol: "₱", rate: 58, locale: "en-PH" },
  EUR: { symbol: "€", rate: 0.92, locale: "de-DE" },
  GBP: { symbol: "£", rate: 0.78, locale: "en-GB" },
  CAD: { symbol: "C$", rate: 1.37, locale: "en-CA" },
  AUD: { symbol: "A$", rate: 1.52, locale: "en-AU" },
  SGD: { symbol: "S$", rate: 1.34, locale: "en-SG" },
  MYR: { symbol: "RM", rate: 4.7, locale: "ms-MY" },
  THB: { symbol: "฿", rate: 36, locale: "th-TH" },
  IDR: { symbol: "Rp", rate: 15800, locale: "id-ID" },
  VND: { symbol: "₫", rate: 25000, locale: "vi-VN" },
  INR: { symbol: "₹", rate: 84, locale: "en-IN" },
  JPY: { symbol: "¥", rate: 150, locale: "ja-JP" },
  KRW: { symbol: "₩", rate: 1380, locale: "ko-KR" },
  HKD: { symbol: "HK$", rate: 7.8, locale: "zh-HK" },
  MXN: { symbol: "MX$", rate: 18, locale: "es-MX" },
  BRL: { symbol: "R$", rate: 5.5, locale: "pt-BR" },
};

// Region → currency shortcut (used when Intl currency is unavailable).
const REGION_TO_CCY: Record<string, string> = {
  US: "USD", PH: "PHP", GB: "GBP", CA: "CAD", AU: "AUD", SG: "SGD",
  MY: "MYR", TH: "THB", ID: "IDR", VN: "VND", IN: "INR", JP: "JPY",
  KR: "KRW", HK: "HKD", MX: "MXN", BR: "BRL",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR", PT: "EUR",
};

export function detectRegionCurrency(): RegionCurrency {
  if (typeof navigator === "undefined") return { code: "USD", ...RATES.USD };
  try {
    const locale = navigator.language || "en-US";
    // Try Intl API to pull the region currency.
    const anyLocale = (Intl as any).Locale;
    if (anyLocale) {
      const loc = new anyLocale(locale);
      const region: string | undefined = loc.region ?? locale.split("-")[1];
      if (region) {
        const code = REGION_TO_CCY[region.toUpperCase()];
        if (code && RATES[code]) return { code, ...RATES[code] };
      }
    }
    const region = locale.split("-")[1]?.toUpperCase();
    if (region && REGION_TO_CCY[region] && RATES[REGION_TO_CCY[region]]) {
      const code = REGION_TO_CCY[region];
      return { code, ...RATES[code] };
    }
  } catch {
    /* fall through */
  }
  return { code: "USD", ...RATES.USD };
}

export function formatMoney(usd: number, ccy: RegionCurrency): string {
  const value = usd * ccy.rate;
  try {
    const digits = value >= 100 ? 0 : value >= 10 ? 0 : 2;
    return new Intl.NumberFormat(ccy.locale, {
      style: "currency",
      currency: ccy.code,
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    const rounded = value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
    return `${ccy.symbol}${rounded}`;
  }
}
