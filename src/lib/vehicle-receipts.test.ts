import { describe, expect, it } from "vitest";
import {
  parseReceiptExtraction,
  receiptLineSchema,
  receiptDate,
  validateReceiptFile,
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
