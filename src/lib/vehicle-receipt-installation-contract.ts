import { z } from "zod";
import { receiptDate } from "./vehicle-receipts";

export const RECEIPT_INSTALLATION_FAILURE =
  "Installation change could not be confirmed. Check vehicle history before repeating this request.";

const uuid = z.string().uuid();
const fields = [
  "expectedAccountId",
  "receiptId",
  "itemId",
  "expectedVehicleId",
  "expectedShopVehicleId",
  "installedOn",
  "odometerKm",
] as const;

function fail(): never {
  throw new Error(RECEIPT_INSTALLATION_FAILURE);
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
  const source = record(value),
    actual = Reflect.ownKeys(source);
  if (
    actual.length !== keys.length ||
    actual.some((key) => typeof key !== "string" || !keys.includes(key))
  )
    fail();
  return Object.fromEntries(keys.map((key) => [key, own(source, key)]));
}
function sdkData(value: unknown): unknown {
  const source = record(value);
  if (own(source, "error") !== null) fail();
  return own(source, "data");
}

export const receiptInstallationRequestSchema = z.preprocess(
  (value, context) => {
    try {
      return exact(value, fields);
    } catch {
      context.addIssue({ code: "custom", message: "Invalid receipt installation request." });
      return z.NEVER;
    }
  },
  z
    .object({
      expectedAccountId: uuid,
      receiptId: uuid,
      itemId: uuid,
      expectedVehicleId: uuid.nullable(),
      expectedShopVehicleId: uuid.nullable(),
      installedOn: receiptDate,
      odometerKm: z.number().int().nonnegative().max(2000000).nullable(),
    })
    .strict()
    .refine(
      (value) => (value.expectedVehicleId === null) !== (value.expectedShopVehicleId === null),
      "Choose exactly one vehicle target",
    ),
);
export type ReceiptInstallationRequest = z.infer<typeof receiptInstallationRequestSchema>;
export type ReceiptInstallationAcknowledgment = Readonly<ReceiptInstallationRequest>;

function sameId(left: string | null, right: string | null) {
  return left === null || right === null
    ? left === right
    : left.toLowerCase() === right.toLowerCase();
}

/** Additional preflight binding, not native authorization or a transactional fence. */
export function parseReceiptInstallationItemResponse(
  response: unknown,
  intent: ReceiptInstallationRequest,
): void {
  try {
    const request = receiptInstallationRequestSchema.parse(intent);
    const row = exact(sdkData(response), ["id", "receipt_id"]);
    if (
      !sameId(uuid.parse(row.id), request.itemId) ||
      !sameId(uuid.parse(row.receipt_id), request.receiptId)
    )
      fail();
  } catch {
    fail();
  }
}
export function parseReceiptInstallationTargetResponse(
  response: unknown,
  intent: ReceiptInstallationRequest,
): void {
  try {
    const request = receiptInstallationRequestSchema.parse(intent);
    const row = exact(sdkData(response), ["id", "vehicle_id", "shop_vehicle_id"]);
    const receiptId = uuid.parse(row.id),
      vehicleId = uuid.nullable().parse(row.vehicle_id),
      shopVehicleId = uuid.nullable().parse(row.shop_vehicle_id);
    if (!sameId(receiptId, request.receiptId)) fail();
    if (request.expectedVehicleId !== null && !sameId(vehicleId, request.expectedVehicleId)) fail();
    if (
      request.expectedShopVehicleId !== null &&
      !sameId(shopVehicleId, request.expectedShopVehicleId)
    )
      fail();
  } catch {
    fail();
  }
}

/** Exact captured-intent transport acknowledgment; no persisted-state claim. */
export function parseReceiptInstallationAcknowledgment(
  value: unknown,
  intent: ReceiptInstallationRequest,
): ReceiptInstallationAcknowledgment {
  try {
    const request = receiptInstallationRequestSchema.parse(intent);
    const acknowledgment = receiptInstallationRequestSchema.parse(value);
    for (const field of [
      "expectedAccountId",
      "receiptId",
      "itemId",
      "expectedVehicleId",
      "expectedShopVehicleId",
    ] as const) {
      if (!sameId(acknowledgment[field], request[field])) fail();
    }
    if (
      acknowledgment.installedOn !== request.installedOn ||
      !Object.is(acknowledgment.odometerKm, request.odometerKm)
    )
      fail();
    return Object.freeze(acknowledgment);
  } catch {
    fail();
  }
}
export function parseReceiptInstallationResponse(
  response: unknown,
  intent: ReceiptInstallationRequest,
): ReceiptInstallationAcknowledgment {
  try {
    const request = receiptInstallationRequestSchema.parse(intent);
    if (sdkData(response) !== null) fail();
    return parseReceiptInstallationAcknowledgment(request, request);
  } catch {
    fail();
  }
}
