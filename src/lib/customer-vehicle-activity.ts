import { z } from "zod";

export const activityKinds = ["receipts", "installations", "work_orders"] as const;
export type ActivityKind = (typeof activityKinds)[number];

// This is a context assertion, never an authorization source. The server compares
// expectedAccountId to the middleware's verified subject before calling the RPC.
export const activityInput = z
  .object({
    expectedAccountId: z.string().uuid(),
    customerId: z.string().uuid(),
    shopVehicleId: z.string().uuid(),
    kind: z.enum(activityKinds),
  })
  .strict();

const id = z.string().uuid();
const text = z.string().max(10_000);
const numeric = z.number().finite();
const timestamp = z.iso.datetime({ offset: true });
const receiptRow = z
  .object({
    id,
    vendor: text.nullable(),
    purchased_on: z.iso.date().nullable(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    total: numeric.nullable(),
  })
  .strict();
const installationRow = z
  .object({
    id,
    name_snapshot: text,
    part_number_snapshot: text.nullable(),
    installed_quantity: numeric,
    installed_at: timestamp,
    installed_odometer_km: numeric.int().nullable(),
    work_order_id: id.nullable(),
  })
  .strict();
const workOrderRow = z
  .object({
    id,
    work_order_number: text.nullable(),
    status: text,
    created_at: timestamp,
  })
  .strict();

export type ReceiptActivity = z.infer<typeof receiptRow>;
export type InstallationActivity = z.infer<typeof installationRow>;
export type WorkOrderActivity = z.infer<typeof workOrderRow>;
export type ActivityResult =
  | { kind: "receipts"; available: boolean; rows: ReceiptActivity[] }
  | { kind: "installations"; available: boolean; rows: InstallationActivity[] }
  | { kind: "work_orders"; available: boolean; rows: WorkOrderActivity[] };

function envelope<T extends z.ZodType>(row: T) {
  return z
    .object({ available: z.boolean(), rows: z.array(row).max(26) })
    .strict()
    .refine((value) => value.available || value.rows.length === 0)
    .refine((value) => {
      const ids = value.rows.map((item) => (item as { id: string }).id.toLowerCase());
      return new Set(ids).size === ids.length;
    });
}
const receiptResult = envelope(receiptRow);
const installationResult = envelope(installationRow);
const workOrderResult = envelope(workOrderRow);

export function parseActivityResult(kind: ActivityKind, payload: unknown): ActivityResult {
  switch (kind) {
    case "receipts":
      return { kind, ...receiptResult.parse(payload) };
    case "installations":
      return { kind, ...installationResult.parse(payload) };
    case "work_orders":
      return { kind, ...workOrderResult.parse(payload) };
  }
}
