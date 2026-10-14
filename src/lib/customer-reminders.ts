import { z } from "zod";

export const customerRemindersInput = z
  .object({
    expectedAccountId: z.string().uuid(),
    customerId: z.string().uuid(),
  })
  .strict();

// Fixed read-only summary. Both bindings are checked against the requested
// customer and its visible native shop, never a client-supplied shop identifier.
export const customerRemindersProjection =
  "id,customer_id,shop_id,reminder_type,title,notes,due_date,status,completed_at";

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
const parentSchema = z.object({ id: uuid, shop_id: uuid }).strict();

export type CustomerReminder = z.infer<typeof reminderSchema>;
export type CustomerRemindersResult = {
  available: boolean;
  rows: CustomerReminder[];
  hasMore: boolean;
};

const sameUuid = (actual: string, expected: string) =>
  actual.toLowerCase() === expected.toLowerCase();
export function parseCustomerRemindersParent(
  payload: unknown,
  customerId: string,
): z.infer<typeof parentSchema> | null {
  if (payload === null) return null;
  const customer = parentSchema.parse(payload);
  if (!sameUuid(customer.id, customerId)) throw new Error("Invalid reminders snapshot scope.");
  return customer;
}
export function parseCustomerRemindersList(
  payload: unknown,
  customerId: string,
  shopId: string,
): CustomerRemindersResult {
  // Validate all101 records, including the sentinel. Nullable physical shop_id
  // is not an acceptable matching binding; no text is trimmed/coerced/capped.
  const rows = z.array(reminderSchema).max(101).parse(payload);
  if (
    rows.some(
      (row) =>
        !sameUuid(row.customer_id, customerId) ||
        row.shop_id === null ||
        !sameUuid(row.shop_id, shopId),
    )
  )
    throw new Error("Invalid reminders snapshot scope.");
  if (new Set(rows.map((row) => row.id.toLowerCase())).size !== rows.length)
    throw new Error("Duplicate reminders snapshot records.");
  return { available: true, rows: rows.slice(0, 100), hasMore: rows.length > 100 };
}
