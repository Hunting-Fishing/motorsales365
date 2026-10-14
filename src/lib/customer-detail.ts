import { z } from "zod";

export const customerDetailKinds = ["customer", "vehicles", "work_orders"] as const;
export type CustomerDetailKind = (typeof customerDetailKinds)[number];
export const customerDetailInput = z
  .object({
    expectedAccountId: z.string().uuid(),
    customerId: z.string().uuid(),
    kind: z.enum(customerDetailKinds),
  })
  .strict();

// Exact native route fields, never full rows. The extra work-order customer_id
// allows response scope validation; it is not an authorization substitute.
export const customerDetailProjections = {
  customer:
    "id,first_name,last_name,email,phone,address,city,state,postal_code,country,company,notes,is_fleet,fleet_company,business_type,business_email,business_phone,communication_preference,referral_source,created_at",
  vehicles: "id,customer_id,make,model,year,vin,license_plate,color,last_service_date",
  work_orders:
    "id,customer_id,work_order_number,status,description,total_cost,created_at,vehicle_id",
} as const;

const id = z.string().uuid();
const text = z.string().nullable(); // No invented short cap on existing native notes/text.
const timestamp = z.iso.datetime({ offset: true });
const customerSchema = z
  .object({
    id,
    first_name: text,
    last_name: text,
    email: text,
    phone: text,
    address: text,
    city: text,
    state: text,
    postal_code: text,
    country: text,
    company: text,
    notes: text,
    is_fleet: z.boolean().nullable(),
    fleet_company: text,
    business_type: text,
    business_email: text,
    business_phone: text,
    communication_preference: text,
    referral_source: text,
    created_at: timestamp,
  })
  .strict();
const vehicleSchema = z
  .object({
    id,
    customer_id: id.nullable(),
    make: text,
    model: text,
    year: z.number().int().nullable(),
    vin: text,
    license_plate: text,
    color: text,
    last_service_date: timestamp.nullable(),
  })
  .strict();
const workOrderSchema = z
  .object({
    id,
    customer_id: id.nullable(),
    work_order_number: text,
    status: text,
    description: text,
    total_cost: z.number().finite().nullable(),
    created_at: timestamp,
    vehicle_id: id.nullable(),
  })
  .strict();
const identitySchema = z.object({ id }).strict();

export type CustomerDetail = z.infer<typeof customerSchema>;
export type CustomerDetailVehicle = z.infer<typeof vehicleSchema>;
export type CustomerDetailWorkOrder = z.infer<typeof workOrderSchema>;
export type CustomerDetailResult =
  | { kind: "customer"; customer: CustomerDetail | null }
  | { kind: "vehicles"; available: boolean; rows: CustomerDetailVehicle[]; hasMore: boolean }
  | { kind: "work_orders"; available: boolean; rows: CustomerDetailWorkOrder[]; hasMore: boolean };

const sameId = (actual: string, expected: string) =>
  actual.toLowerCase() === expected.toLowerCase();
export function parseCustomerDetailCustomer(
  payload: unknown,
  customerId: string,
): CustomerDetail | null {
  if (payload === null) return null;
  const customer = customerSchema.parse(payload);
  if (!sameId(customer.id, customerId)) throw new Error("Invalid customer snapshot scope.");
  return customer;
}
export function parseCustomerDetailIdentity(payload: unknown, customerId: string): boolean {
  if (payload === null) return false;
  const customer = identitySchema.parse(payload);
  if (!sameId(customer.id, customerId)) throw new Error("Invalid customer snapshot scope.");
  return true;
}
function assertListScope(
  rows: readonly { id: string; customer_id: string | null }[],
  customerId: string,
) {
  if (rows.some((row) => row.customer_id === null || !sameId(row.customer_id, customerId)))
    throw new Error("Invalid customer snapshot scope.");
  if (new Set(rows.map((row) => row.id.toLowerCase())).size !== rows.length)
    throw new Error("Duplicate customer snapshot records.");
}
export function parseCustomerDetailList(
  kind: "vehicles" | "work_orders",
  payload: unknown,
  customerId: string,
): Exclude<CustomerDetailResult, { kind: "customer" }> {
  if (kind === "vehicles") {
    const rows = z.array(vehicleSchema).max(101).parse(payload);
    assertListScope(rows, customerId);
    return { kind, available: true, rows: rows.slice(0, 100), hasMore: rows.length > 100 };
  }
  const rows = z.array(workOrderSchema).max(101).parse(payload);
  assertListScope(rows, customerId);
  return { kind, available: true, rows: rows.slice(0, 100), hasMore: rows.length > 100 };
}
