import { describe, it, expect } from "vitest";
import { buildReceiptLines, assertReceiptOrder } from "./receipt-lines";

describe("upgrade receipt ordering", () => {
  it("split upgrade: plan + boost + add-ons → subtotal → credit → net", () => {
    const lines = buildReceiptLines({
      plan_price_php: 1500,
      boost_amount_php: 300,
      addons_amount_php: 100,
      prorated_credit_php: 400,
      amount_php: 1500, // 1900 − 400
    });
    expect(lines.map((l) => l.kind)).toEqual([
      "plan",
      "boost",
      "addons",
      "subtotal",
      "credit",
      "net",
    ]);
    expect(lines.find((l) => l.kind === "subtotal")!.amount).toBe(1900);
    expect(lines.find((l) => l.kind === "credit")!.amount).toBe(400);
    expect(lines.find((l) => l.kind === "net")!.amount).toBe(1500);
    expect(() => assertReceiptOrder(lines)).not.toThrow();
  });

  it("legacy gross-only upgrade still orders subtotal → credit → net", () => {
    const lines = buildReceiptLines({
      gross_amount_php: 1200,
      prorated_credit_php: 200,
      amount_php: 1000,
    });
    const kinds = lines.map((l) => l.kind);
    expect(kinds.indexOf("subtotal")).toBeLessThan(kinds.indexOf("credit"));
    expect(kinds.indexOf("credit")).toBeLessThan(kinds.indexOf("net"));
    expect(() => assertReceiptOrder(lines)).not.toThrow();
  });

  it("omits credit line when no credit applies", () => {
    const lines = buildReceiptLines({ plan_price_php: 500, amount_php: 500 });
    expect(lines.some((l) => l.kind === "credit")).toBe(false);
    expect(lines.at(-1)!.kind).toBe("net");
    expect(() => assertReceiptOrder(lines)).not.toThrow();
  });

  it("assertReceiptOrder throws if credit precedes subtotal", () => {
    expect(() =>
      assertReceiptOrder([
        { kind: "credit", label: "x", amount: 100, sign: -1 },
        { kind: "subtotal", label: "x", amount: 500, sign: 1 },
        { kind: "net", label: "x", amount: 400, sign: 1 },
      ]),
    ).toThrow(/after subtotal/);
  });

  it("assertReceiptOrder throws if net does not equal subtotal − credit", () => {
    expect(() =>
      assertReceiptOrder([
        { kind: "plan", label: "x", amount: 1000, sign: 1 },
        { kind: "subtotal", label: "x", amount: 1000, sign: 1 },
        { kind: "credit", label: "x", amount: 200, sign: -1 },
        { kind: "net", label: "x", amount: 900, sign: 1 }, // wrong, should be 800
      ]),
    ).toThrow(/Net due/);
  });

  it("assertReceiptOrder throws if a charge appears after subtotal", () => {
    expect(() =>
      assertReceiptOrder([
        { kind: "subtotal", label: "x", amount: 500, sign: 1 },
        { kind: "boost", label: "x", amount: 300, sign: 1 },
        { kind: "net", label: "x", amount: 500, sign: 1 },
      ]),
    ).toThrow(/before subtotal/);
  });
});
