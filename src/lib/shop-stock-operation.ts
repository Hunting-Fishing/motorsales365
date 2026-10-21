/** Native Shop Manager quantities are integers. They are not Parts Shop decimal stock. */
export type ShopStockRequest = {
  version: 1;
  operationId: string;
  expectedAccountId: string;
  shopId: string;
  itemId: string;
  expectedUpdatedAt: string;
  expectedQuantity: string;
  delta: string;
  reason: string;
};
export type ShopStockOutcome =
  | {
      version: 1;
      status: "completed";
      request: ShopStockRequest;
      transactionId: string;
      quantityBefore: string;
      quantityAfter: string;
    }
  | {
      version: 1;
      status: "rejected";
      request: ShopStockRequest;
      code: "conflict" | "reserved_stock" | "invalid_stock";
    }
  | { version: 1; status: "not_observed"; request: ShopStockRequest }
  | { version: 1; status: "unknown" | "unavailable" };
const fields = [
  "version",
  "operationId",
  "expectedAccountId",
  "shopId",
  "itemId",
  "expectedUpdatedAt",
  "expectedQuantity",
  "delta",
  "reason",
] as const;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
export function shopStockId(value: unknown): string {
  if (typeof value !== "string" || !uuid.test(value)) throw new Error("Invalid stock identifier.");
  return value.toLowerCase();
}
export function shopStockQuantity(value: unknown, signed = false): string {
  if (typeof value !== "string" || !/^-?\d{1,10}$/.test(value))
    throw new Error("Use a whole-number quantity.");
  const n = BigInt(value);
  if (n > 2147483647n || n < (signed ? -2147483647n : 0n) || (signed && n === 0n))
    throw new Error("Quantity is outside the supported range.");
  return n.toString();
}
export function parseShopStockRequest(value: unknown): ShopStockRequest {
  if (
    !object(value) ||
    value.version !== 1 ||
    Object.keys(value).length !== fields.length ||
    fields.some((f) => !Object.hasOwn(value, f))
  )
    throw new Error("Invalid stock request.");
  if (
    typeof value.expectedUpdatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value.expectedUpdatedAt,
    ) ||
    !Number.isFinite(Date.parse(value.expectedUpdatedAt))
  )
    throw new Error("Reload this stock record.");
  if (
    typeof value.reason !== "string" ||
    !value.reason.trim() ||
    value.reason.length > 500 ||
    Array.from(value.reason).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw new Error("Enter a reason of 1–500 characters without control characters.");
  return {
    version: 1,
    operationId: shopStockId(value.operationId),
    expectedAccountId: shopStockId(value.expectedAccountId),
    shopId: shopStockId(value.shopId),
    itemId: shopStockId(value.itemId),
    expectedUpdatedAt: value.expectedUpdatedAt,
    expectedQuantity: shopStockQuantity(value.expectedQuantity),
    delta: shopStockQuantity(value.delta, true),
    reason: value.reason.trim(),
  };
}
export const sameShopStockRequest = (a: ShopStockRequest, b: ShopStockRequest): boolean =>
  fields.every((f) => a[f] === b[f]);
export function parseShopStockOutcome(value: unknown, request: ShopStockRequest): ShopStockOutcome {
  const unknown: ShopStockOutcome = { version: 1, status: "unknown" };
  if (!object(value) || value.version !== 1) return unknown;
  if (value.status === "unknown" || value.status === "unavailable")
    return { version: 1, status: value.status };
  try {
    if (!sameShopStockRequest(parseShopStockRequest(value.request), request)) return unknown;
    if (value.status === "not_observed") return { version: 1, status: "not_observed", request };
    if (
      value.status === "rejected" &&
      (value.code === "conflict" ||
        value.code === "reserved_stock" ||
        value.code === "invalid_stock")
    )
      return { version: 1, status: "rejected", request, code: value.code };
    if (value.status !== "completed") return unknown;
    const before = shopStockQuantity(value.quantityBefore),
      after = shopStockQuantity(value.quantityAfter);
    if (
      before !== request.expectedQuantity ||
      BigInt(before) + BigInt(request.delta) !== BigInt(after)
    )
      return unknown;
    return {
      version: 1,
      status: "completed",
      request,
      transactionId: shopStockId(value.transactionId),
      quantityBefore: before,
      quantityAfter: after,
    };
  } catch {
    return unknown;
  }
}
export const shopStockPendingKey = (a: string, s: string): string =>
  `365.shop.stock.pending.v1:${shopStockId(a)}:${shopStockId(s)}`;
export function loadShopStockPending(
  storage: Pick<Storage, "getItem">,
  a: string,
  s: string,
): ShopStockRequest | null {
  const raw = storage.getItem(shopStockPendingKey(a, s));
  if (raw === null) return null;
  if (raw.length > 4096) throw new Error("Recovery record unavailable.");
  const value = parseShopStockRequest(JSON.parse(raw));
  if (value.expectedAccountId !== a || value.shopId !== s)
    throw new Error("Recovery scope mismatch.");
  return value;
}
export function saveShopStockPending(
  storage: Pick<Storage, "getItem" | "setItem">,
  request: ShopStockRequest,
): void {
  const checked = parseShopStockRequest(request);
  const previous = loadShopStockPending(storage, checked.expectedAccountId, checked.shopId);
  if (previous && !sameShopStockRequest(previous, checked))
    throw new Error("Resolve the previous stock request first.");
  const key = shopStockPendingKey(checked.expectedAccountId, checked.shopId),
    value = JSON.stringify(checked);
  storage.setItem(key, value);
  if (storage.getItem(key) !== value) throw new Error("Recovery storage unavailable.");
}
export function clearShopStockPending(
  storage: Pick<Storage, "getItem" | "removeItem">,
  request: ShopStockRequest,
): void {
  const previous = loadShopStockPending(storage, request.expectedAccountId, request.shopId);
  if (previous && !sameShopStockRequest(previous, request))
    throw new Error("Another request needs review.");
  const key = shopStockPendingKey(request.expectedAccountId, request.shopId);
  storage.removeItem(key);
  if (storage.getItem(key) !== null) throw new Error("Recovery storage unavailable.");
}
const texts = [
  "name",
  "sku",
  "part_number",
  "barcode",
  "category",
  "subcategory",
  "supplier",
  "manufacturer",
  "location",
  "status",
  "description",
  "vehicle_compatibility",
  "warranty_period",
  "notes",
  "created_at",
  "updated_at",
] as const;
const numbers = ["quantity", "quantity_in_stock", "reorder_point", "on_hold", "on_order"] as const;
const money = ["unit_price", "cost_per_unit", "sell_price_per_unit", "margin_markup"] as const;
export type ShopStockItem = { id: string; shop_id: string } & Record<
  (typeof texts)[number],
  string | null
> &
  Record<(typeof numbers)[number], number | null> &
  Record<(typeof money)[number], number | string | null>;
export type ShopStockTransaction = {
  id: string;
  inventory_item_id: string;
  transaction_type: string | null;
  quantity: number;
  transaction_date: string | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
};
export type ShopStockView = {
  version: 1;
  accountId: string;
  shopId: string;
  canAdjust: boolean;
  costRestricted: boolean;
  item: ShopStockItem;
  transactions: ShopStockTransaction[];
};
const nullableText = (v: unknown): v is string | null =>
  v === null || (typeof v === "string" && v.length <= 20000);
export function parseShopStockView(
  value: unknown,
  accountId: string,
  itemId: string,
): ShopStockView {
  if (
    !object(value) ||
    value.version !== 1 ||
    value.accountId !== accountId ||
    typeof value.canAdjust !== "boolean" ||
    typeof value.costRestricted !== "boolean" ||
    (value.canAdjust && value.costRestricted) ||
    !object(value.item)
  )
    throw new Error("Inventory read unavailable.");
  const shopId = shopStockId(value.shopId),
    raw = value.item;
  if (raw.id !== itemId || raw.shop_id !== shopId) throw new Error("Inventory read unavailable.");
  if (
    value.costRestricted &&
    ["supplier", "cost_per_unit", "margin_markup"].some((f) => Object.hasOwn(raw, f))
  )
    throw new Error("Inventory read unavailable.");
  const item: Record<string, unknown> = { id: shopStockId(raw.id), shop_id: shopId };
  for (const field of texts) {
    const data = field === "supplier" && value.costRestricted ? null : raw[field];
    if (!nullableText(data)) throw new Error("Inventory read unavailable.");
    item[field] = data;
  }
  for (const field of numbers) {
    const data = raw[field];
    if (data !== null && (typeof data !== "number" || !Number.isSafeInteger(data)))
      throw new Error("Inventory read unavailable.");
    item[field] = data;
  }
  for (const field of money) {
    const data =
      value.costRestricted && (field === "cost_per_unit" || field === "margin_markup")
        ? null
        : raw[field];
    if (
      data !== null &&
      !(typeof data === "number" && Number.isFinite(data)) &&
      !(typeof data === "string" && /^-?\d{1,14}(?:\.\d{1,10})?$/.test(data))
    )
      throw new Error("Inventory read unavailable.");
    item[field] = data;
  }
  if (!Array.isArray(value.transactions) || value.transactions.length > 50)
    throw new Error("History read unavailable.");
  const ids = new Set<string>();
  const transactions = value.transactions.map((v): ShopStockTransaction => {
    if (
      !object(v) ||
      v.inventory_item_id !== itemId ||
      typeof v.quantity !== "number" ||
      !Number.isSafeInteger(v.quantity)
    )
      throw new Error("History read unavailable.");
    const id = shopStockId(v.id);
    if (ids.has(id)) throw new Error("History read unavailable.");
    ids.add(id);
    const tx: Record<string, unknown> = { id, inventory_item_id: itemId, quantity: v.quantity };
    for (const f of [
      "transaction_type",
      "transaction_date",
      "reference_type",
      "reference_id",
      "notes",
    ] as const) {
      if (!nullableText(v[f])) throw new Error("History read unavailable.");
      tx[f] = v[f];
    }
    return tx as ShopStockTransaction;
  });
  return {
    version: 1,
    accountId,
    shopId,
    canAdjust: value.canAdjust,
    costRestricted: value.costRestricted,
    item: item as ShopStockItem,
    transactions,
  };
}
