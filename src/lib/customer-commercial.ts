import { z } from "zod";

export const customerCommercialKinds = ["invoices", "quotes"] as const;
export type CustomerCommercialKind = (typeof customerCommercialKinds)[number];
export const customerCommercialInput = z
  .object({
    expectedAccountId: z.string().uuid(),
    customerId: z.string().uuid(),
    kind: z.enum(customerCommercialKinds),
  })
  .strict();

// Fixed summary fields only. customer_id validates the returned scope; this is
// not authorization. Invoice dates/IDs are native TEXT, not SQL dates/UUIDs.
export const customerCommercialProjections = {
  invoices: "id,customer_id,date,due_date,status,total,created_at",
  quotes: "id,customer_id,quote_number,created_at,expiry_date,status,total_amount",
} as const;

const uuid = z.string().uuid();
const timestamp = z.iso.datetime({ offset: true });
const amount = z.number().finite().nullable();
const invoiceSchema = z
  .object({
    id: z.string(),
    customer_id: uuid.nullable(),
    date: z.string(),
    due_date: z.string(),
    status: z.string(),
    total: amount,
    created_at: timestamp.nullable(),
  })
  .strict();
const quoteSchema = z
  .object({
    id: uuid,
    customer_id: uuid.nullable(),
    quote_number: z.string().nullable(),
    created_at: timestamp,
    expiry_date: z.iso.date().nullable(),
    status: z.string(),
    total_amount: amount,
  })
  .strict();
const identitySchema = z.object({ id: uuid }).strict();

export type CustomerCommercialInvoice = z.infer<typeof invoiceSchema>;
export type CustomerCommercialQuote = z.infer<typeof quoteSchema>;
export type CustomerCommercialResult =
  | { kind: "invoices"; available: boolean; rows: CustomerCommercialInvoice[]; hasMore: boolean }
  | { kind: "quotes"; available: boolean; rows: CustomerCommercialQuote[]; hasMore: boolean };

const sameUuid = (actual: string, expected: string) =>
  actual.toLowerCase() === expected.toLowerCase();
export function parseCustomerCommercialIdentity(payload: unknown, customerId: string): boolean {
  if (payload === null) return false;
  const customer = identitySchema.parse(payload);
  if (!sameUuid(customer.id, customerId)) throw new Error("Invalid commercial snapshot scope.");
  return true;
}
function assertListScope(
  kind: CustomerCommercialKind,
  rows: readonly { id: string; customer_id: string | null }[],
  customerId: string,
) {
  if (rows.some((row) => row.customer_id === null || !sameUuid(row.customer_id, customerId)))
    throw new Error("Invalid commercial snapshot scope.");
  const identities = rows.map((row) => (kind === "quotes" ? row.id.toLowerCase() : row.id));
  if (new Set(identities).size !== rows.length)
    throw new Error("Duplicate commercial snapshot records.");
}
export function parseCustomerCommercialList(
  kind: CustomerCommercialKind,
  payload: unknown,
  customerId: string,
): CustomerCommercialResult {
  // Validate the overflow sentinel too; never silently discard a malformed or
  // out-of-scope 26th row while reporting a successful bounded snapshot.
  if (kind === "invoices") {
    const rows = z.array(invoiceSchema).max(26).parse(payload);
    assertListScope(kind, rows, customerId);
    return { kind, available: true, rows: rows.slice(0, 25), hasMore: rows.length > 25 };
  }
  const rows = z.array(quoteSchema).max(26).parse(payload);
  assertListScope(kind, rows, customerId);
  return { kind, available: true, rows: rows.slice(0, 25), hasMore: rows.length > 25 };
}

// Amounts preserve received finite JavaScript numbers, not arbitrary SQL NUMERIC
// precision. These summaries do not establish financial reconciliation.
