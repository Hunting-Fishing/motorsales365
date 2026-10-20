/** Shared wire contract. Decimal quantities remain exact strings throughout. */
export type StockRequest = {
  version: 1;
  operationId: string;
  expectedAccountId: string;
  businessId: string;
  itemId: string;
  expectedUpdatedAt: string;
  expectedQuantity: string;
  delta: string;
  reason: string;
};
export type StockOutcome =
  | {
      version: 1;
      status: "completed";
      request: StockRequest;
      movementId: string;
      quantityBefore: string;
      quantityAfter: string;
    }
  | {
      version: 1;
      status: "rejected";
      request: StockRequest;
      code: "conflict" | "reserved_stock" | "invalid_stock";
    }
  | { version: 1; status: "not_observed"; request: StockRequest }
  | { version: 1; status: "unavailable" | "unknown" };
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const FIELDS = [
  "version",
  "operationId",
  "expectedAccountId",
  "businessId",
  "itemId",
  "expectedUpdatedAt",
  "expectedQuantity",
  "delta",
  "reason",
] as const;
export function stockQuantity(value: unknown, signed = false): string {
  if (typeof value !== "string" || value.length > 20 || !/^-?\d{1,10}(?:\.\d{1,2})?$/.test(value))
    throw new Error("Enter a quantity with at most two decimal places.");
  const negative = value.startsWith("-");
  const [whole, decimal = ""] = (negative ? value.slice(1) : value).split(".");
  const units = BigInt(whole) * 100n + BigInt(decimal.padEnd(2, "0"));
  if (units > 999999999999n || (!signed && negative) || (signed && units === 0n))
    throw new Error("Quantity is outside the supported range.");
  return `${negative && units ? "-" : ""}${units / 100n}.${String(units % 100n).padStart(2, "0")}`;
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function parseStockRequest(value: unknown): StockRequest {
  if (
    !record(value) ||
    Object.keys(value).length !== FIELDS.length ||
    FIELDS.some((key) => !Object.hasOwn(value, key)) ||
    value.version !== 1
  )
    throw new Error("Invalid stock request.");
  for (const key of ["operationId", "expectedAccountId", "businessId", "itemId"] as const)
    if (typeof value[key] !== "string" || !UUID.test(value[key]))
      throw new Error("Invalid stock request.");
  if (
    typeof value.expectedUpdatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value.expectedUpdatedAt,
    ) ||
    !Number.isFinite(Date.parse(value.expectedUpdatedAt))
  )
    throw new Error("Reload the stock record before adjusting it.");
  if (
    typeof value.reason !== "string" ||
    !value.reason.trim() ||
    value.reason.length > 500 ||
    Array.from(value.reason).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
  )
    throw new Error("Enter a reason of 1–500 characters without control characters.");
  const quantity = stockQuantity(value.expectedQuantity);
  const delta = stockQuantity(value.delta, true);
  return {
    version: 1,
    operationId: (value.operationId as string).toLowerCase(),
    expectedAccountId: (value.expectedAccountId as string).toLowerCase(),
    businessId: (value.businessId as string).toLowerCase(),
    itemId: (value.itemId as string).toLowerCase(),
    expectedUpdatedAt: value.expectedUpdatedAt,
    expectedQuantity: quantity,
    delta,
    reason: value.reason.trim(),
  };
}
export function sameStockRequest(a: StockRequest, b: StockRequest): boolean {
  return FIELDS.every((key) => a[key] === b[key]);
}
/** Reject a reply from another account, store, item, operation or intent. */
export function parseStockOutcome(value: unknown, request: StockRequest): StockOutcome {
  if (!record(value) || value.version !== 1) return { version: 1, status: "unknown" };
  if (value.status === "unknown" || value.status === "unavailable")
    return { version: 1, status: value.status };
  try {
    const echoed = parseStockRequest(value.request);
    if (!sameStockRequest(echoed, request)) throw new Error("Unconfirmed intent");
    if (value.status === "not_observed") return { version: 1, status: "not_observed", request };
    if (
      value.status === "rejected" &&
      typeof value.code === "string" &&
      ["conflict", "reserved_stock", "invalid_stock"].includes(String(value.code))
    )
      return {
        version: 1,
        status: "rejected",
        request,
        code: value.code as "conflict" | "reserved_stock" | "invalid_stock",
      };
    if (
      value.status !== "completed" ||
      typeof value.movementId !== "string" ||
      !UUID.test(value.movementId)
    )
      throw new Error("Unconfirmed movement");
    const before = stockQuantity(value.quantityBefore);
    const after = stockQuantity(value.quantityAfter);
    const cents = (n: string) => BigInt(n.replace(".", ""));
    if (
      before !== request.expectedQuantity ||
      cents(before) + cents(request.delta) !== cents(after)
    )
      throw new Error("Unconfirmed quantity");
    return {
      version: 1,
      status: "completed",
      request,
      movementId: value.movementId,
      quantityBefore: before,
      quantityAfter: after,
    };
  } catch {
    return { version: 1, status: "unknown" };
  }
}
export function stockPendingKey(accountId: string, businessId: string): string {
  return `365.stock.pending.v1:${accountId}:${businessId}`;
}
/** Persist before dispatch. A failed/malformed recovery record never permits a fresh write. */
export function loadPendingStock(
  storage: Pick<Storage, "getItem">,
  accountId: string,
  businessId: string,
): StockRequest | null {
  const raw = storage.getItem(stockPendingKey(accountId, businessId));
  if (raw === null) return null;
  if (raw.length > 4096) throw new Error("Stock recovery record is unavailable.");
  const request = parseStockRequest(JSON.parse(raw));
  if (request.expectedAccountId !== accountId || request.businessId !== businessId)
    throw new Error("Stock recovery record does not match this account.");
  return request;
}
export function persistPendingStock(
  storage: Pick<Storage, "getItem" | "setItem">,
  request: StockRequest,
): void {
  const existing = loadPendingStock(storage, request.expectedAccountId, request.businessId);
  if (existing && !sameStockRequest(existing, request))
    throw new Error("Resolve the previous stock request first.");
  const key = stockPendingKey(request.expectedAccountId, request.businessId);
  const raw = JSON.stringify(request);
  storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) throw new Error("Stock recovery storage is unavailable.");
}
export function clearPendingStock(
  storage: Pick<Storage, "getItem" | "removeItem">,
  request: StockRequest,
): void {
  const existing = loadPendingStock(storage, request.expectedAccountId, request.businessId);
  if (existing && !sameStockRequest(existing, request))
    throw new Error("Another stock request needs review.");
  const key = stockPendingKey(request.expectedAccountId, request.businessId);
  storage.removeItem(key);
  if (storage.getItem(key) !== null)
    throw new Error("Unable to clear the confirmed recovery record.");
}
