import { z } from "zod";

export const customerRemindersInput = z
  .object({
    expectedAccountId: z.string().uuid(),
    customerId: z.string().uuid(),
  })
  .strict();

const uuid = z.string().uuid();
const reminderSchema = z
  .object({
    id: uuid,
    customer_id: uuid,
    shop_id: uuid.nullable(),
    // Native TEXT has no enum CHECK. Preserve existing arbitrary/empty values.
    reminder_type: z.string(),
    title: z.string(),
    notes: z.string().nullable(),
    due_date: z.iso.date(),
    status: z.string(),
    completed_at: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();
const snapshotSchema = z.discriminatedUnion("available", [
  z
    .object({
      available: z.literal(false),
      customer_id: z.null(),
      shop_id: z.null(),
      rows: z.array(z.never()).length(0),
    })
    .strict(),
  z
    .object({
      available: z.literal(true),
      customer_id: uuid,
      shop_id: uuid,
      rows: z.array(reminderSchema).max(101),
    })
    .strict(),
]);

export type CustomerReminder = z.infer<typeof reminderSchema>;
export type CustomerRemindersResult = {
  available: boolean;
  rows: CustomerReminder[];
  hasMore: boolean;
};

const sameUuid = (actual: string, expected: string) =>
  actual.toLowerCase() === expected.toLowerCase();
export function parseCustomerRemindersSnapshot(
  payload: unknown,
  customerId: string,
): CustomerRemindersResult {
  // Validate the exact same-statement envelope and all101 rows, including the
  // sentinel. Never infer a shop or reinterpret errors as an unavailable list.
  const snapshot = snapshotSchema.parse(payload);
  if (!snapshot.available) return { available: false, rows: [], hasMore: false };
  if (!sameUuid(snapshot.customer_id, customerId))
    throw new Error("Invalid reminders snapshot scope.");
  const { rows } = snapshot;
  if (
    rows.some(
      (row) =>
        !sameUuid(row.customer_id, snapshot.customer_id) ||
        row.shop_id === null ||
        !sameUuid(row.shop_id, snapshot.shop_id),
    )
  )
    throw new Error("Invalid reminders snapshot scope.");
  if (new Set(rows.map((row) => row.id.toLowerCase())).size !== rows.length)
    throw new Error("Duplicate reminders snapshot records.");
  return { available: true, rows: rows.slice(0, 100), hasMore: rows.length > 100 };
}
