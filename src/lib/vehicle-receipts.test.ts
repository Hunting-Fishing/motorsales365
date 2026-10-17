import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  parseReceiptExtraction,
  receiptLineSchema,
  receiptDate,
  validateReceiptFile,
  receiptEntrySchema,
  receiptSaveSchema,
} from "./vehicle-receipts";
const item = {
  description: "Brake pads",
  category: "brakes",
  quantity: 1,
  total: 250,
  confidence: 0.99,
  reviewed: true,
};
const extraction = {
  vendor: "Parts store",
  purchased_on: "2026-10-01",
  currency: "PHP",
  total: 250,
  items: [item],
};
describe("receipt extraction and evidence review", () => {
  it("does not let a confident AI approve its own evidence", () => {
    expect(parseReceiptExtraction(JSON.stringify(extraction)).items[0].reviewed).toBe(false);
  });
  it("keeps uncertain category and quantity available for manual correction", () => {
    const r = parseReceiptExtraction(
      JSON.stringify({
        ...extraction,
        items: [{ ...item, category: null, quantity: null, confidence: 0 }],
      }),
    );
    expect(r.items[0].category).toBeNull();
    expect(r.items[0].quantity).toBeNull();
  });
  it("accepts fenced provider JSON and rejects malformed responses", () => {
    expect(parseReceiptExtraction("```json\n" + JSON.stringify(extraction) + "\n```").vendor).toBe(
      "Parts store",
    );
    expect(() => parseReceiptExtraction("not JSON")).toThrow();
  });
  it("rejects impossible dates, categories and negative line totals", () => {
    expect(() => receiptDate.parse("2026-02-30")).toThrow();
    expect(() => receiptLineSchema.parse({ ...item, category: "guessed_category" })).toThrow();
    expect(() => receiptLineSchema.parse({ ...item, total: -1 })).toThrow();
  });
  it("accepts PDFs and rejects oversized or unsupported uploads", () => {
    expect(() => validateReceiptFile({ type: "application/pdf", size: 1000 })).not.toThrow();
    expect(() => validateReceiptFile({ type: "image/svg+xml", size: 100 })).toThrow();
    expect(() => validateReceiptFile({ type: "image/png", size: 11 * 1024 * 1024 })).toThrow();
  });
});

describe("shared receipt entry preflight preserves the existing server validator", () => {
  // Exact former inline server validator, not a PostgreSQL persistence oracle.
  const prior = z
    .object({
      id: z.string().uuid(),
      vendor: z.string().trim().max(200).nullable(),
      purchasedOn: receiptDate.nullable(),
      currency: z.string().regex(/^[A-Z]{3}$/),
      total: z.number().nonnegative().max(99999999).nullable(),
      items: z.array(receiptLineSchema).min(1).max(100),
      confirm: z.boolean(),
    })
    .superRefine((d, ctx) => {
      if (
        d.confirm &&
        (!d.purchasedOn || d.items.some((i) => !i.reviewed || !i.category || i.quantity === null))
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Set the purchase date and review the name, category and quantity of every item.",
        });
    });
  const valid = {
    id: "20000000-0000-4000-8000-000000000001",
    vendor: "  Supplier  ",
    purchasedOn: "2026-10-01",
    currency: "PHP",
    total: 250,
    items: [item],
    confirm: true,
  };
  const cases: unknown[] = [
    valid,
    { ...valid, extra: "stripped" },
    {
      ...valid,
      confirm: false,
      purchasedOn: null,
      items: [{ ...item, category: null, quantity: null, reviewed: false }],
    },
    undefined,
    null,
    {},
    { ...valid, id: "opaque" },
    { ...valid, vendor: "x".repeat(201) },
    { ...valid, purchasedOn: "2026-02-30" },
    { ...valid, currency: "php" },
    { ...valid, total: -1 },
    { ...valid, total: Infinity },
    { ...valid, total: 100000000 },
    { ...valid, items: [] },
    { ...valid, items: Array.from({ length: 101 }, () => item) },
    { ...valid, items: [{ ...item, description: " " }] },
    { ...valid, items: [{ ...item, category: "unknown" }] },
    { ...valid, items: [{ ...item, quantity: 0 }] },
    { ...valid, items: [{ ...item, total: -1 }] },
    { ...valid, items: [{ ...item, confidence: 2 }] },
    { ...valid, purchasedOn: null },
    { ...valid, items: [{ ...item, reviewed: false }] },
    { ...valid, items: [{ ...item, category: null }] },
    { ...valid, items: [{ ...item, quantity: null }] },
    { ...valid, confirm: "true" },
  ];
  it.each(cases.map((input, index) => ({ input, index })))(
    "preserves old parse result and issues for case $index",
    ({ input }) => {
      const old = prior.safeParse(input),
        current = receiptSaveSchema.safeParse(input);
      expect(current.success).toBe(old.success);
      if (old.success && current.success) expect(current.data).toEqual(old.data);
      else if (!old.success && !current.success)
        expect(current.error.issues).toEqual(old.error.issues);
    },
  );
  it("preflights the same non-ID fields before draft creation and owns a separate snapshot", () => {
    const { id: _id, ...fields } = valid;
    const parsed = receiptEntrySchema.parse(fields);
    const { id: _savedId, ...saved } = receiptSaveSchema.parse(valid);
    expect(parsed).toEqual(saved);
    expect(parsed.items).not.toBe(fields.items);
    expect(parsed.items[0]).not.toBe(fields.items[0]);
    expect(parsed.vendor).toBe("Supplier");
  });
});
