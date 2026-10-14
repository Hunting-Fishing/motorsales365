import { describe, expect, it } from "vitest";
import { mergeReceiptPages } from "./receipt-pages";
import type { ReceiptExtraction } from "./vehicle-receipts";

const page = (patch: Partial<ReceiptExtraction> = {}): ReceiptExtraction => ({
  vendor: "Parts Shop",
  purchased_on: "2026-10-15",
  currency: "PHP",
  total: 250,
  items: [
    {
      description: "Oil filter",
      category: null,
      brand: null,
      part_number: null,
      quantity: 1,
      total: 250,
      confidence: 0.25,
      reviewed: true,
    },
  ],
  ...patch,
});
describe("receipt PDF page merging", () => {
  it("preserves page order and repeated parts without summing repeated totals", () => {
    const result = mergeReceiptPages([
      page(),
      page({ items: [{ ...page().items[0], description: "Brake pads" }] }),
      page(),
    ]);
    expect(result.total).toBe(250);
    expect(result.items.map((item) => item.description)).toEqual([
      "Oil filter",
      "Brake pads",
      "Oil filter",
    ]);
    expect(result.items.every((item) => !item.reviewed)).toBe(true);
  });
  it("keeps conflicting receipt metadata unknown", () => {
    const result = mergeReceiptPages([
      page(),
      page({ vendor: "Another Shop", purchased_on: "2026-10-16", total: 400 }),
    ]);
    expect(result.vendor).toBeNull();
    expect(result.purchased_on).toBeNull();
    expect(result.total).toBeNull();
  });
  it("accepts known metadata from another page without inventing missing values", () => {
    const result = mergeReceiptPages([
      page(),
      page({ vendor: null, purchased_on: null, currency: null, total: null }),
    ]);
    expect(result.vendor).toBe("Parts Shop");
    expect(result.currency).toBe("PHP");
    expect(result.items.length).toBe(2);
    expect(result.items[1].total).toBeNull();
  });
  it("clears incompatible amounts when page currencies conflict", () => {
    const result = mergeReceiptPages([page(), page({ currency: "USD" })]);
    expect(result.currency).toBeNull();
    expect(result.total).toBeNull();
    expect(result.items.every((item) => item.total === null)).toBe(true);
  });
  it("never assigns another page's currency to an unknown-currency receipt total", () => {
    for (const knownTotal of [null, 250, 500]) {
      const result = mergeReceiptPages([
        page({ total: knownTotal }),
        page({ currency: null, total: 500 }),
      ]);
      expect(result.currency).toBe("PHP");
      expect(result.total).toBeNull();
    }
    expect(mergeReceiptPages([page({ currency: null })]).total).toBeNull();
  });
  it("rejects unreadable pages instead of silently omitting them", () => {
    expect(() =>
      mergeReceiptPages([
        page(),
        page({ vendor: null, purchased_on: null, currency: null, total: null, items: [] }),
      ]),
    ).toThrow("could not be read");
  });
  it("rejects too many pages or candidate items", () => {
    expect(() => mergeReceiptPages([])).toThrow("one to three");
    expect(() => mergeReceiptPages([page(), page(), page(), page()])).toThrow("one to three");
    expect(() =>
      mergeReceiptPages([
        page({ items: Array(60).fill(page().items[0]) }),
        page({ items: Array(60).fill(page().items[0]) }),
      ]),
    ).toThrow("more than 100");
  });
});
