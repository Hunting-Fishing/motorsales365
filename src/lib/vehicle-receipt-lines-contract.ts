import { z } from "zod";
import {
  parseReceiptItems,
  receiptReadProjections,
  type ReceiptReadDisplayItem,
} from "./vehicle-receipt-read-contract";

export const RECEIPT_LINES_PAGE_SIZE = 100;
export const RECEIPT_LINES_FAILURE = "Could not load these receipt lines. Please try again.";
export const RECEIPT_LINES_PARENT_PROJECTION = "id,vehicle_id,shop_vehicle_id,share_with_shop";
export const RECEIPT_LINES_ITEM_PROJECTION = receiptReadProjections.item;
const uuid = z.string().uuid();
const sameId = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();
function invalid(): never {
  throw new Error(RECEIPT_LINES_FAILURE);
}
function ownRecord(value: unknown, keys?: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid();
  const result: Record<string, unknown> = Object.create(null);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || (keys && !keys.includes(key))) invalid();
    const descriptor = descriptors[key];
    if (!("value" in descriptor) || !descriptor.enumerable) invalid();
    result[key] = descriptor.value;
  }
  return result;
}
function arraySnapshot(value: unknown): unknown[] {
  if (!Array.isArray(value)) invalid();
  const field = Object.getOwnPropertyDescriptor(value, "length");
  if (
    !field ||
    !("value" in field) ||
    !Number.isSafeInteger(field.value) ||
    field.value < 0 ||
    field.value > RECEIPT_LINES_PAGE_SIZE
  )
    invalid();
  if (Reflect.ownKeys(value).length !== field.value + 1) invalid();
  const rows: unknown[] = [];
  for (let index = 0; index < field.value; index++) {
    const item = Object.getOwnPropertyDescriptor(value, String(index));
    if (!item || !("value" in item) || !item.enumerable) invalid();
    rows.push(item.value);
  }
  return rows;
}
const requestKeys = [
  "expectedAccountId",
  "receiptId",
  "vehicleId",
  "shopVehicleId",
  "page",
] as const;
export const receiptLinesRequestSchema = z.preprocess(
  (value, context) => {
    try {
      return ownRecord(value, requestKeys);
    } catch {
      context.addIssue({ code: "custom", message: "Invalid receipt line request." });
      return z.NEVER;
    }
  },
  z
    .object({
      expectedAccountId: uuid,
      receiptId: uuid,
      vehicleId: uuid.optional(),
      shopVehicleId: uuid.optional(),
      page: z.number().int().min(0).max(1_000_000).default(0),
    })
    .strict()
    .refine(
      (value) =>
        Boolean(Object.hasOwn(value, "vehicleId") ? value.vehicleId : undefined) !==
        Boolean(Object.hasOwn(value, "shopVehicleId") ? value.shopVehicleId : undefined),
      "Choose exactly one vehicle",
    ),
);
export type ReceiptLinesRequest = Readonly<z.infer<typeof receiptLinesRequestSchema>>;
export type ReceiptLinesPage = Readonly<{
  receiptId: string;
  vehicleId: string | null;
  shopVehicleId: string | null;
  page: number;
  totalCount: number;
  hasNext: boolean;
  items: readonly Readonly<ReceiptReadDisplayItem>[];
}>;
const parentSchema = z
  .object({
    id: uuid,
    vehicle_id: uuid.nullable(),
    shop_vehicle_id: uuid.nullable(),
    share_with_shop: z.boolean(),
  })
  .strict();
export type ReceiptLinesParent = Readonly<z.infer<typeof parentSchema>>;
function request(value: ReceiptLinesRequest) {
  const parsed = receiptLinesRequestSchema.parse(value);
  return Object.freeze({
    expectedAccountId: parsed.expectedAccountId,
    receiptId: parsed.receiptId,
    vehicleId: Object.hasOwn(parsed, "vehicleId") ? parsed.vehicleId : undefined,
    shopVehicleId: Object.hasOwn(parsed, "shopVehicleId") ? parsed.shopVehicleId : undefined,
    page: parsed.page,
  });
}
function sdk(response: unknown, counted: boolean) {
  if (
    !response ||
    typeof response !== "object" ||
    Array.isArray(response) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(response))
  )
    invalid();
  const descriptors = Object.getOwnPropertyDescriptors(response);
  for (const key of counted ? ["data", "error", "count"] : ["data", "error"])
    if (
      !Object.hasOwn(descriptors, key) ||
      !("value" in descriptors[key]) ||
      !descriptors[key].enumerable
    )
      invalid();
  if (descriptors.error.value !== null) invalid();
  return { data: descriptors.data.value, count: counted ? descriptors.count.value : undefined };
}
export function parseReceiptLinesReadResponse(response: unknown, counted = false) {
  try {
    const result = sdk(response, counted);
    return { ...result, error: null };
  } catch {
    invalid();
  }
}
export function parseReceiptLinesParentResponse(
  response: unknown,
  intent: ReceiptLinesRequest,
  linkedVehicleId: string | null,
): ReceiptLinesParent {
  try {
    const scope = request(intent);
    const linked = linkedVehicleId === null ? null : uuid.parse(linkedVehicleId);
    if (scope.vehicleId && linked !== null) invalid();
    const row = parentSchema.parse(
      ownRecord(sdk(response, false).data, Object.keys(parentSchema.shape)),
    );
    if (
      !sameId(row.id, scope.receiptId) ||
      (row.vehicle_id === null && row.shop_vehicle_id === null)
    )
      invalid();
    const matches = scope.vehicleId
      ? row.vehicle_id !== null && sameId(row.vehicle_id, scope.vehicleId)
      : (row.shop_vehicle_id !== null && sameId(row.shop_vehicle_id, scope.shopVehicleId!)) ||
        (row.share_with_shop === true &&
          linked !== null &&
          row.vehicle_id !== null &&
          sameId(row.vehicle_id, linked));
    if (!matches) invalid();
    return Object.freeze(row);
  } catch {
    invalid();
  }
}
const displayKeys = RECEIPT_LINES_ITEM_PROJECTION.split(",").filter(
  (key) => !["installed_by", "installation_origin"].includes(key),
);
function page(
  raw: unknown,
  count: unknown,
  intent: ReceiptLinesRequest,
  displayOnly: boolean,
): ReceiptLinesPage {
  const scope = request(intent);
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) invalid();
  const rows = arraySnapshot(raw),
    offset = scope.page * RECEIPT_LINES_PAGE_SIZE;
  if (rows.length !== Math.min(RECEIPT_LINES_PAGE_SIZE, Math.max(0, count - offset))) invalid();
  // Reuse the unchanged native field/order/identity parser; its completeness
  // result is deliberately discarded. UI-only shape validation supplies no
  // installation metadata and must never be used to create an editable receipt.
  const input = displayOnly
    ? rows.map((row) => ({
        ...ownRecord(row, displayKeys),
        installed_by: null,
        installation_origin: null,
      }))
    : rows;
  const parsed = parseReceiptItems(input, rows.length, scope.receiptId);
  const items = parsed.items.map(
    ({ installed_by: _actor, installation_origin: _origin, ...item }) => Object.freeze(item),
  );
  return Object.freeze({
    receiptId: scope.receiptId,
    vehicleId: scope.vehicleId ?? null,
    shopVehicleId: scope.shopVehicleId ?? null,
    page: scope.page,
    totalCount: count,
    hasNext: offset + rows.length < count,
    items: Object.freeze(items),
  });
}
export function parseReceiptLinesPageResponse(
  response: unknown,
  intent: ReceiptLinesRequest,
): ReceiptLinesPage {
  try {
    const result = sdk(response, true);
    return page(result.data, result.count, intent, false);
  } catch {
    invalid();
  }
}
/** Strict display DTO validation only: no edit/share/install authority or total-set witness. */
export function parseReceiptLinesPage(
  value: unknown,
  intent: ReceiptLinesRequest,
): ReceiptLinesPage {
  try {
    const scope = request(intent),
      row = ownRecord(value, [
        "receiptId",
        "vehicleId",
        "shopVehicleId",
        "page",
        "totalCount",
        "hasNext",
        "items",
      ]);
    if (!sameId(uuid.parse(row.receiptId), scope.receiptId) || row.page !== scope.page) invalid();
    const vehicle = uuid.nullable().parse(row.vehicleId),
      shop = uuid.nullable().parse(row.shopVehicleId);
    if (
      scope.vehicleId
        ? vehicle === null || !sameId(vehicle, scope.vehicleId) || shop !== null
        : shop === null || !sameId(shop, scope.shopVehicleId!) || vehicle !== null
    )
      invalid();
    const result = page(row.items, row.totalCount, scope, true);
    if (row.hasNext !== result.hasNext) invalid();
    return result;
  } catch {
    invalid();
  }
}
