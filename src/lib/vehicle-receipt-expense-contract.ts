import { z } from "zod";

export const RECEIPT_EXPENSE_FAILURE =
  "Expense change could not be confirmed. Check shop expenses before repeating this request.";

/** Transport acknowledgment only, not posting/reconciliation or retry proof. */
export type ReceiptExpenseAcknowledgment = Readonly<{
  receiptId: string;
  shopVehicleId: string;
  expenseId: string;
}>;

const uuid = z.string().uuid();

function fail(): never {
  throw new Error(RECEIPT_EXPENSE_FAILURE);
}
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail();
  return value as Record<string, unknown>;
}
function own(source: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) fail();
  return descriptor.value;
}
function exact(value: unknown, keys: readonly string[]): Record<string, unknown> {
  const source = record(value);
  const fields = Reflect.ownKeys(source);
  if (
    fields.length !== keys.length ||
    fields.some((key) => typeof key !== "string" || !keys.includes(key))
  )
    fail();
  return Object.fromEntries(keys.map((key) => [key, own(source, key)]));
}

export const receiptExpenseRequestSchema = z.preprocess(
  (value, context) => {
    try {
      return exact(value, ["expectedAccountId", "id", "expectedShopVehicleId"]);
    } catch {
      context.addIssue({ code: "custom", message: "Invalid receipt expense request." });
      return z.NEVER;
    }
  },
  z.object({ expectedAccountId: uuid, id: uuid, expectedShopVehicleId: uuid }).strict(),
);

export function parseReceiptExpenseTargetResponse(
  response: unknown,
  expectedReceiptId: string,
  expectedShopVehicleId: string,
): void {
  try {
    const receiptId = uuid.parse(expectedReceiptId);
    const shopVehicleId = uuid.parse(expectedShopVehicleId);
    const source = record(response);
    if (own(source, "error") !== null) fail();
    const fields = exact(own(source, "data"), ["id", "shop_vehicle_id"]);
    if (
      uuid.parse(fields.id).toLowerCase() !== receiptId.toLowerCase() ||
      uuid.parse(fields.shop_vehicle_id).toLowerCase() !== shopVehicleId.toLowerCase()
    )
      fail();
  } catch {
    fail();
  }
}

export function parseReceiptExpenseAcknowledgment(
  value: unknown,
  expectedReceiptId: string,
  expectedShopVehicleId: string,
): ReceiptExpenseAcknowledgment {
  try {
    const expected = uuid.parse(expectedReceiptId);
    const expectedShop = uuid.parse(expectedShopVehicleId);
    const fields = exact(value, ["receiptId", "shopVehicleId", "expenseId"]);
    const receiptId = uuid.parse(fields.receiptId);
    const shopVehicleId = uuid.parse(fields.shopVehicleId);
    const expenseId = uuid.parse(fields.expenseId);
    if (
      receiptId.toLowerCase() !== expected.toLowerCase() ||
      shopVehicleId.toLowerCase() !== expectedShop.toLowerCase()
    )
      fail();
    return Object.freeze({ receiptId, shopVehicleId, expenseId });
  } catch {
    fail();
  }
}

export function parseReceiptExpenseResponse(
  response: unknown,
  expectedReceiptId: string,
  expectedShopVehicleId: string,
): ReceiptExpenseAcknowledgment {
  try {
    const receiptId = uuid.parse(expectedReceiptId);
    const shopVehicleId = uuid.parse(expectedShopVehicleId);
    const source = record(response);
    if (own(source, "error") !== null) fail();
    const expenseId = uuid.parse(own(source, "data"));
    return parseReceiptExpenseAcknowledgment(
      { receiptId, shopVehicleId, expenseId },
      receiptId,
      shopVehicleId,
    );
  } catch {
    fail();
  }
}
