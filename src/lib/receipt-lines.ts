/**
 * Pure helper that builds the ordered line items shown on an upgrade receipt.
 *
 * Contract (enforced by tests in receipt-lines.test.ts):
 *   1. Every charge line (plan, boost, add-ons, or the legacy single
 *      "subtotal" line) appears BEFORE the prorated credit line.
 *   2. When a prorated credit applies, the order is always:
 *        charges… → "subtotal" → "credit" → "net"
 *      so the gross price, the deduction, and the net due are visible
 *      in that sequence.
 *   3. Net due = subtotal − credit, rounded to the nearest peso.
 */

export type ReceiptInput = {
  plan_price_php?: number | string | null;
  boost_amount_php?: number | string | null;
  addons_amount_php?: number | string | null;
  gross_amount_php?: number | string | null;
  prorated_credit_php?: number | string | null;
  amount_php?: number | string | null;
};

export type ReceiptLineKind =
  | "plan"
  | "boost"
  | "addons"
  | "charge"
  | "subtotal"
  | "credit"
  | "net";

export type ReceiptLine = {
  kind: ReceiptLineKind;
  label: string;
  amount: number;
  /** negative lines (credits) are stored as positive amounts with sign = -1 */
  sign: 1 | -1;
};

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export function buildReceiptLines(p: ReceiptInput): ReceiptLine[] {
  const plan = num(p.plan_price_php);
  const boost = num(p.boost_amount_php);
  const addons = num(p.addons_amount_php);
  const gross = num(p.gross_amount_php);
  const credit = num(p.prorated_credit_php);
  const net = num(p.amount_php);

  const hasSplit = plan > 0 || boost > 0 || addons > 0;
  const subtotal = hasSplit ? plan + boost + addons : gross > 0 ? gross : net + credit;

  const lines: ReceiptLine[] = [];

  if (hasSplit) {
    if (plan > 0) lines.push({ kind: "plan", label: "Plan", amount: plan, sign: 1 });
    if (boost > 0) lines.push({ kind: "boost", label: "Boosted listing renewal", amount: boost, sign: 1 });
    if (addons > 0) lines.push({ kind: "addons", label: "Add-ons", amount: addons, sign: 1 });
  } else {
    lines.push({ kind: "charge", label: "Charge", amount: subtotal, sign: 1 });
  }

  lines.push({ kind: "subtotal", label: "Subtotal", amount: subtotal, sign: 1 });

  if (credit > 0) {
    lines.push({ kind: "credit", label: "Prorated credit", amount: credit, sign: -1 });
  }

  lines.push({ kind: "net", label: credit > 0 ? "Net due" : "Total", amount: Math.max(0, Math.round(subtotal - credit)), sign: 1 });

  return lines;
}

/**
 * Asserts the ordering contract. Throws if violated. Safe to call in dev
 * builds as a runtime check, and used by the test suite.
 */
export function assertReceiptOrder(lines: ReceiptLine[]): void {
  const idx = (k: ReceiptLineKind) => lines.findIndex((l) => l.kind === k);
  const subtotalIdx = idx("subtotal");
  const creditIdx = idx("credit");
  const netIdx = idx("net");

  if (subtotalIdx < 0) throw new Error("Receipt is missing a subtotal line");
  if (netIdx < 0) throw new Error("Receipt is missing a net/total line");

  // Every charge line must come before subtotal
  for (let i = 0; i < lines.length; i++) {
    const k = lines[i].kind;
    if ((k === "plan" || k === "boost" || k === "addons" || k === "charge") && i >= subtotalIdx) {
      throw new Error(`Charge line "${k}" must appear before subtotal`);
    }
  }

  if (creditIdx >= 0) {
    if (creditIdx <= subtotalIdx) {
      throw new Error("Prorated credit must appear after subtotal");
    }
    if (creditIdx >= netIdx) {
      throw new Error("Prorated credit must appear before net due");
    }
    // Net = subtotal − credit (rounded)
    const expected = Math.max(0, Math.round(lines[subtotalIdx].amount - lines[creditIdx].amount));
    if (lines[netIdx].amount !== expected) {
      throw new Error(
        `Net due ${lines[netIdx].amount} does not equal subtotal ${lines[subtotalIdx].amount} − credit ${lines[creditIdx].amount}`,
      );
    }
  }
}
