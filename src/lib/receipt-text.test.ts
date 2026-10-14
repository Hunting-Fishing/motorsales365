import { describe, expect, it } from "vitest";
import { parseReceiptText } from "./receipt-text";
import { receiptExtractionSchema } from "./vehicle-receipts";

describe("local receipt text suggestions", () => {
  it("reads explicitly labelled PH receipt fields without turning accounting/footer lines into parts", () => {
    const result = parseReceiptText(`ACME AUTO PARTS - CEBU
TIN: 123-456-789
OFFICIAL RECEIPT
Supplier: Acme Auto Parts
Purchase date: 2026-10-15
Currency: PHP
Description Qty Unit Price Amount
Brake pads | Qty: 2 | Brand: Example | Part No: BP-12 | Line total: PHP 1,250.00
Oil filter | Quantity: 1 | Amount: 200.00
Subtotal: 1,450.00
VAT: 155.36
TOTAL PHP 1,450.00
Cash: 1,500.00
Change: 50.00
Thank you for shopping
Returns accepted within seven days`);
    expect(result).toMatchObject({
      vendor: "Acme Auto Parts",
      purchased_on: "2026-10-15",
      currency: "PHP",
      total: 1450,
      items: [
        {
          description: "Brake pads",
          category: null,
          brand: "Example",
          part_number: "BP-12",
          quantity: 2,
          total: 1250,
          reviewed: false,
        },
        { description: "Oil filter", category: null, quantity: 1, total: 200, reviewed: false },
      ],
    });
    expect(result.items.every((item) => item.confidence < 0.85)).toBe(true);
  });

  it("does not invent a vendor or currency from a Philippine address or an arbitrary first line", () => {
    const result = parseReceiptText(`MANILA MOTOR CENTER
123 Main Street, Manila, Philippines
Item: Engine oil
Total: 500.00`);
    expect(result.vendor).toBeNull();
    expect(result.currency).toBeNull();
    expect(result.items[0]).toMatchObject({ description: "Engine oil", category: null });
  });

  it("keeps ambiguous numeric dates and unlabelled ISO dates unknown", () => {
    expect(parseReceiptText("Date: 10/11/2026\nItem: Filter").purchased_on).toBeNull();
    expect(parseReceiptText("2026-10-15\nItem: Filter").purchased_on).toBeNull();
    expect(parseReceiptText("Date: 2026-02-30\nItem: Filter").purchased_on).toBeNull();
    expect(parseReceiptText("Receipt date: 2026-10-15").purchased_on).toBe("2026-10-15");
  });

  it("preserves unlabelled item-row evidence without inferring quantity, price, brand or part number", () => {
    const result = parseReceiptText(`Items:
2 Bosch brake pads BP-123 625.00 1,250.00
Oil filter 1 x 200.00
Total: 1,450.00`);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      description: "2 Bosch brake pads BP-123 625.00 1,250.00",
      category: null,
      brand: null,
      part_number: null,
      quantity: null,
      total: null,
      confidence: 0.25,
      reviewed: false,
    });
    expect(result.items[1].quantity).toBeNull();
    expect(result.items[1].total).toBeNull();
  });

  it("does not interpret decimal commas, OCR letters, negative prices or ambiguous dollar currency", () => {
    for (const total of ["1.250,00", "1,25", "1.250", "1O0.00", "-100.00", "100.00 200.00"]) {
      expect(parseReceiptText(`Total: ${total}`).total).toBeNull();
    }
    const dollars = parseReceiptText("Total: $100.00");
    expect(dollars.total).toBe(100);
    expect(dollars.currency).toBeNull();
    expect(parseReceiptText("Total: ₱ 1,250.00").currency).toBe("PHP");
    expect(parseReceiptText("Currency: USD\nTotal: USD 100.00").currency).toBe("USD");
    expect(parseReceiptText("Currency: ABC\nTotal: 100.00").currency).toBeNull();
  });

  it("keeps conflicting or invalid explicitly labelled fields unknown", () => {
    const result = parseReceiptText(`Vendor: Store A
Vendor: Store B
Date: 2026-10-14
Date: 2026-10-15
Currency: PHP
Total: USD 100.00
Grand total: USD 200.00
Item: Brake pads | Qty: 2 | Quantity: 3 | Brand: A | Brand: B | Total: 1,25`);
    expect(result.vendor).toBeNull();
    expect(result.purchased_on).toBeNull();
    expect(result.currency).toBeNull();
    expect(result.total).toBeNull();
    expect(result.items[0]).toMatchObject({ quantity: null, brand: null, total: null });
  });

  it("never accepts category, confidence, installation or human-review claims from OCR", () => {
    const result = parseReceiptText(
      "Item: Brake pads | category: brakes | reviewed: true | confidence: 1 | installed_on: 2026-10-15",
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ category: null, reviewed: false, confidence: 0.25 });
    expect(result.items[0]).not.toHaveProperty("installed_on");
  });

  it("does not relabel a foreign or ambiguous line amount with the receipt currency", () => {
    const result = parseReceiptText(`Currency: PHP
Item: Domestic part | Amount: PHP 100.00
Item: Foreign part | Amount: USD 20.00
Item: Ambiguous part | Amount: $20.00`);
    expect(result.items.map((item) => item.total)).toEqual([100, null, null]);
    expect(parseReceiptText("Item: Part | Amount: USD 20.00").items[0].total).toBeNull();
  });

  it("preserves an unlabelled priced candidate without guessing its total or quantity", () => {
    const result = parseReceiptText("Brake pads 2 1,250.00\nTotal: 1,250.00");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      description: "Brake pads 2 1,250.00",
      quantity: null,
      total: null,
      category: null,
      reviewed: false,
    });
  });

  it("returns an empty, schema-compatible suggestion for blank or unreadable text", () => {
    for (const text of ["", " \n\t\r\n ", "---\n***\n12345"]) {
      expect(parseReceiptText(text)).toEqual({
        vendor: null,
        purchased_on: null,
        currency: null,
        total: null,
        items: [],
      });
    }
  });

  it("ignores table headings, totals/counts, contact information and payment footers", () => {
    const result = parseReceiptText(`Supplier: Store
Phone: 1234567
Description Qty Unit Price Amount
Spark plug
Total items: 1
Payment: Card
Account: 1234
Signature: Customer
www.store.example
Unlabelled footer note`);
    expect(result.items.map((item) => item.description)).toEqual(["Spark plug"]);
    expect(result.total).toBeNull();
  });

  it("supports explicit delimited item fields and normalizes line endings/control characters", () => {
    const result = parseReceiptText(
      "Vendor: Store\r\nDate: 2026-10-15\rItem: Oil\u0000 filter; Qty: 1.5; Part #: OF-1; Total: 150.50\nItem: Brake pads\tQty: 2\tAmount: 200.00",
    );
    expect(result.vendor).toBe("Store");
    expect(result.purchased_on).toBe("2026-10-15");
    expect(result.items[0]).toMatchObject({
      description: "Oil filter",
      quantity: 1.5,
      part_number: "OF-1",
      total: 150.5,
    });
    expect(result.items[1]).toMatchObject({ description: "Brake pads", quantity: 2, total: 200 });
  });

  it("clips descriptions safely and leaves oversized or out-of-range field values unknown", () => {
    const result = parseReceiptText(`Vendor: ${"V".repeat(201)}
Item: ${"A".repeat(249)}😀 | Qty: 0 | Brand: ${"B".repeat(121)} | Part No: ${"P".repeat(121)} | Amount: 100000000.00`);
    expect(result.vendor).toBeNull();
    expect(result.items[0].description).toBe("A".repeat(249));
    expect(result.items[0]).toMatchObject({
      quantity: null,
      brand: null,
      part_number: null,
      total: null,
    });
    expect(receiptExtractionSchema.safeParse(result).success).toBe(true);
  });

  it("bounds text, line count and item count without silently dropping extra items", () => {
    expect(() => parseReceiptText("A".repeat(50_001))).toThrow(/too large/);
    expect(() => parseReceiptText("\n".repeat(1_000))).toThrow(/too many lines/);
    const items = Array.from({ length: 100 }, (_, index) => `Item: Part ${index}`).join("\n");
    const result = parseReceiptText(items);
    expect(result.items).toHaveLength(100);
    expect(receiptExtractionSchema.safeParse(result).success).toBe(true);
    expect(() => parseReceiptText(`${items}\nItem: Extra part`)).toThrow(/more than 100/);
  });
});
