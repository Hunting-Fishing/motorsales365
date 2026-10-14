import { receiptDate, receiptExtractionSchema } from "./vehicle-receipts";
import type { ReceiptExtraction, ReceiptLine } from "./vehicle-receipts";

const MAX_TEXT_LENGTH = 50_000;
const MAX_LINES = 1_000;
const MAX_ITEMS = 100;

// Unsupported/unclear currency tokens stay unknown, rather than defaulting to
// the user's country or interpreting an ambiguous "$" as USD.
const currencies = new Set(
  "PHP USD EUR GBP JPY CNY HKD SGD AUD CAD NZD THB IDR MYR VND KRW TWD INR AED SAR CHF SEK NOK DKK ZAR KWD BHD QAR KHR LAK MMK MOP BND RUB BRL MXN".split(
    " ",
  ),
);

function currencyCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return code === "₱" ? "PHP" : currencies.has(code) ? code : null;
}

function onlyCandidate<T>(values: Array<T | null>): T | null {
  if (!values.length || values.some((value) => value === null)) return null;
  const unique = new Set(values);
  return unique.size === 1 ? values[0] : null;
}

function number(value: string, maximum: number): number | null {
  // Do not reinterpret decimal commas, OCR letters, signs or unit-price math.
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value)) return null;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) && parsed <= maximum ? parsed : null;
}

function amount(value: string) {
  const match = value.match(/^(?:(₱|[A-Z]{3}|\$)\s*)?([\d,.]+)(?:\s*([A-Z]{3}))?$/i);
  if (!match) return { value: null, currency: null, hasCurrency: false };
  const tokens = [match[1], match[3]].filter((token): token is string => Boolean(token));
  const currency = onlyCandidate(tokens.map(currencyCode));
  return {
    value: tokens.length > 1 && !currency ? null : number(match[2], 99_999_999),
    currency,
    hasCurrency: tokens.length > 0,
  };
}

function clippedDescription(value: string): string {
  // Zod's string limit counts UTF-16 units; do not cut a surrogate pair in half.
  return value
    .slice(0, 250)
    .replace(/[\uD800-\uDBFF]$/, "")
    .trim();
}

const itemLabel = /^(?:item|product|part|description)\s*[:=]\s*(.*)$/i;
const fieldLabel =
  /^(qty|quantity|brand|part\s*(?:no\.?|number|#)|line\s+total|item\s+total|total|amount)\s*[:=]\s*(.*)$/i;

function itemDescription(line: string): string {
  return clippedDescription(
    line
      .split(/[|;\t]/, 1)[0]
      .replace(itemLabel, "$1")
      .replace(/\s+/g, " "),
  );
}

function item(line: string, receiptCurrency: string | null): ReceiptLine {
  const segments = line.split(/\s*(?:\||;|\t+)\s*/);
  const quantities: Array<number | null> = [];
  const totals: Array<number | null> = [];
  const brands: Array<string | null> = [];
  const partNumbers: Array<string | null> = [];
  for (const segment of segments.slice(1)) {
    const field = segment.match(fieldLabel);
    if (!field) continue;
    const label = field[1].toLowerCase();
    const value = field[2].trim();
    if (label === "qty" || label === "quantity") {
      const parsed = number(value, 99_999);
      quantities.push(parsed !== null && parsed > 0 ? parsed : null);
    } else if (label === "brand") {
      brands.push(value && value.length <= 120 ? value : null);
    } else if (label.startsWith("part")) {
      partNumbers.push(value && value.length <= 120 ? value : null);
    } else {
      const parsed = amount(value);
      // A line's explicit currency cannot be stored separately by the current
      // receipt model. Do not silently relabel a foreign/unknown amount.
      totals.push(
        parsed.hasCurrency && (!parsed.currency || parsed.currency !== receiptCurrency)
          ? null
          : parsed.value,
      );
    }
  }
  return {
    description: itemDescription(line),
    category: null,
    brand: onlyCandidate(brands),
    part_number: onlyCandidate(partNumbers),
    quantity: onlyCandidate(quantities),
    total: onlyCandidate(totals),
    confidence: 0.25,
    reviewed: false,
  };
}

function itemsHeader(line: string) {
  const columns = line.replace(/[|;\t]/g, " ").trim();
  return (
    /^(?:items?|purchases?|purchased\s+items?|description)\s*:?(?:\s*)$/i.test(line) ||
    (/^(?:(?:qty|quantity|description|item|product|part|unit\s+price|price|amount|total|no\.?|number|#)\s*){3,}$/i.test(
      columns,
    ) &&
      /\b(?:description|item|product|part)\b/i.test(columns) &&
      /\b(?:qty|quantity)\b/i.test(columns) &&
      /\b(?:amount|price|total)\b/i.test(columns))
  );
}

// These are evidence/header/accounting fields, not a list of purchased parts.
const metadata =
  /^(?:vendor|supplier|merchant|store|shop|currency|date|purchase\s+date|purchased\s+on|invoice\s+date|receipt\s+date|time|address|tel(?:ephone)?|phone|mobile|e-?mail|tin|vat\s+reg|official\s+receipt|sales\s+invoice|invoice|receipt|transaction|reference|authorization|terminal|order\s+(?:no|number)|customer|sold\s+to|bill\s+to|ship\s+to|cashier|served\s+by|salesperson|qty|quantity|unit\s+price|brand|part\s*(?:no\.?|number|#)|barcode|qr\s+code)\b/i;
const footer =
  /^(?:(?:sub\s*total|grand\s+total|total|amount\s+(?:due|paid|tendered)|vat(?:able|\s+exempt|\s+sales)?|non[-\s]?vat|tax|discount|rounding|payment|paid|cash|card|credit|debit|change|balance|tendered|less|thank(?:s|\s+you)|please|terms|returns?|warranty|refund|received\s+by|signature|bank|account)\b|www\.|https?:\/\/)/i;

/**
 * Convert untrusted OCR text into conservative, human-review-only suggestions.
 * No arithmetic, category/fitment inference, installation claims, or writes.
 * Only labelled metadata and delimited, labelled item fields are interpreted.
 */
export function parseReceiptText(text: string): ReceiptExtraction {
  if (text.length > MAX_TEXT_LENGTH)
    throw new Error("Receipt text is too large to process safely. Manual entry is available.");
  const lines = text
    .replace(/\r\n?/g, "\n")
    // OCR may contain control bytes; preserve only tabs and normalized newlines.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .split("\n");
  if (lines.length > MAX_LINES)
    throw new Error(
      "Receipt text has too many lines to process safely. Manual entry is available.",
    );

  const vendors: Array<string | null> = [];
  const dates: Array<string | null> = [];
  const currencyCandidates: Array<string | null> = [];
  const totals: Array<number | null> = [];
  const itemLines: string[] = [];
  let inItems = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || !/[\p{L}\p{N}]/u.test(line)) continue;
    if (itemsHeader(line)) {
      inItems = true;
      continue;
    }
    const vendor = line.match(
      /^(?:vendor|supplier|merchant|store|shop)(?:\s+name)?\s*[:=]\s*(.*)$/i,
    );
    if (vendor) {
      const value = vendor[1].trim();
      vendors.push(value && value.length <= 200 ? value : null);
      continue;
    }
    const date = line.match(
      /^(?:date|purchase\s+date|purchased\s+on|invoice\s+date|receipt\s+date)\s*[:=]?\s*(.*)$/i,
    );
    if (date) {
      const parsed = receiptDate.safeParse(date[1].trim());
      dates.push(parsed.success ? parsed.data : null);
      continue;
    }
    const currency = line.match(/^currency\s*[:=]?\s*(.*)$/i);
    if (currency) {
      currencyCandidates.push(currencyCode(currency[1]));
      continue;
    }
    const total = line.match(/^(?:grand\s+total|total(?:\s+amount)?)\b\s*[:=]?\s*(.*)$/i);
    if (total && !/^total\s+(?:items?|qty|quantity)\b/i.test(line)) {
      const parsed = amount(total[1].trim());
      totals.push(parsed.value);
      if (parsed.hasCurrency) currencyCandidates.push(parsed.currency);
      inItems = false;
      continue;
    }
    if (footer.test(line)) {
      inItems = false;
      continue;
    }
    if (metadata.test(line) || /^\d{4}-\d{2}-\d{2}$/.test(line)) continue;

    const labelledFields = line
      .split(/[|;\t]/)
      .slice(1)
      .some((value) => fieldLabel.test(value.trim()));
    const pricedRow =
      /(?:₱|\b[A-Z]{3})\s*[\d,.]+\s*$/.test(line) || /\b\d[\d,]*\.\d{2}\s*$/.test(line);
    if (!inItems && !itemLabel.test(line) && !labelledFields && !pricedRow) continue;
    if (!/\p{L}/u.test(itemDescription(line))) continue;
    if (itemLines.length >= MAX_ITEMS)
      throw new Error(
        "This receipt has more than 100 candidate items. Review a smaller section manually.",
      );
    itemLines.push(line);
  }
  const currency = onlyCandidate(currencyCandidates);
  return receiptExtractionSchema.parse({
    vendor: onlyCandidate(vendors),
    purchased_on: onlyCandidate(dates),
    currency,
    total: onlyCandidate(totals),
    items: itemLines.map((line) => item(line, currency)),
  });
}
