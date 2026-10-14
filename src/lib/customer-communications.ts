import { z } from "zod";

export const customerCommunicationsInput = z
  .object({
    expectedAccountId: z.string().uuid(),
    customerId: z.string().uuid(),
  })
  .strict();

// Fixed log-summary fields only. Returned customer_id validates response scope;
// it does not replace RLS. No private staff identifier or attachment projection.
export const customerCommunicationsProjection =
  "id,customer_id,type,direction,subject,content,date,staff_member_name,status";

const uuid = z.string().uuid();
const communicationSchema = z
  .object({
    id: uuid,
    customer_id: uuid,
    type: z.enum(["email", "phone", "text", "in-person"]),
    direction: z.enum(["incoming", "outgoing"]),
    subject: z.string().nullable(),
    content: z.string(),
    date: z.iso.datetime({ offset: true }),
    staff_member_name: z.string(),
    status: z.enum(["completed", "pending", "failed"]),
  })
  .strict();
const identitySchema = z.object({ id: uuid }).strict();

export type CustomerCommunication = z.infer<typeof communicationSchema>;
export type CustomerCommunicationsResult = {
  available: boolean;
  rows: CustomerCommunication[];
  hasMore: boolean;
};

const sameUuid = (actual: string, expected: string) =>
  actual.toLowerCase() === expected.toLowerCase();
export function parseCustomerCommunicationsIdentity(payload: unknown, customerId: string): boolean {
  if (payload === null) return false;
  const customer = identitySchema.parse(payload);
  if (!sameUuid(customer.id, customerId)) throw new Error("Invalid communications snapshot scope.");
  return true;
}
export function parseCustomerCommunicationsList(
  payload: unknown,
  customerId: string,
): CustomerCommunicationsResult {
  // Validate the entire bounded response, including the overflow sentinel.
  // Existing text is not coerced, trimmed, or assigned invented short caps.
  const rows = z.array(communicationSchema).max(201).parse(payload);
  if (rows.some((row) => !sameUuid(row.customer_id, customerId)))
    throw new Error("Invalid communications snapshot scope.");
  if (new Set(rows.map((row) => row.id.toLowerCase())).size !== rows.length)
    throw new Error("Duplicate communications snapshot records.");
  return { available: true, rows: rows.slice(0, 200), hasMore: rows.length > 200 };
}
