import { receiptExtractionSchema } from "./vehicle-receipts";
import type { ReceiptExtraction } from "./vehicle-receipts";

function agreed<T>(values: Array<T | null>) {
  const known = values.filter((value): value is T => value !== null);
  return known.length && new Set(known).size === 1 ? known[0] : null;
}

/** Merge one receipt's ordered PDF pages, never sums, deduplicates or approves. */
export function mergeReceiptPages(input: ReceiptExtraction[]): ReceiptExtraction {
  if (!input.length || input.length > 3)
    throw new Error("Scan a receipt PDF with one to three pages.");
  const pages = input.map((page) => receiptExtractionSchema.parse(page));
  for (const page of pages) {
    if (
      !page.vendor &&
      !page.purchased_on &&
      !page.currency &&
      page.total === null &&
      !page.items.length
    )
      throw new Error(
        "A PDF page could not be read. Your entries were kept; review it manually or use clearer pages.",
      );
  }
  const items = pages.flatMap((page) =>
    page.items.map((item) => ({
      ...item,
      total: page.currency ? item.total : null,
      reviewed: false,
    })),
  );
  if (items.length > 100)
    throw new Error("This PDF has more than 100 candidate items. Enter it in smaller receipts.");
  const currency = agreed(pages.map((page) => page.currency));
  const knownCurrencies = new Set(pages.flatMap((page) => (page.currency ? [page.currency] : [])));
  const totalsHaveCurrency =
    currency !== null && pages.every((page) => page.total === null || page.currency === currency);
  return receiptExtractionSchema.parse({
    vendor: agreed(pages.map((page) => page.vendor)),
    purchased_on: agreed(pages.map((page) => page.purchased_on)),
    currency,
    total: totalsHaveCurrency ? agreed(pages.map((page) => page.total)) : null,
    // A mixed-currency document cannot turn page amounts into one currency.
    items: knownCurrencies.size > 1 ? items.map((item) => ({ ...item, total: null })) : items,
  });
}
