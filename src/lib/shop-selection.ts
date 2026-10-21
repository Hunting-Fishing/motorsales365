/** Explicit account-global selection. Membership and role mapping are server-owned. */
export type ShopSelectionRequest = {
  version: 1;
  expectedAccountId: string;
  operationId: string;
  profileId: string;
  expectedShopId: string | null;
  expectedUpdatedAt: string;
  targetShopId: string;
};
export type SelectionBlocker = "conflict" | "active_shift" | "open_register" | "role_review";
export type ShopSelectionView = {
  version: 1;
  accountId: string;
  profileId: string;
  selectedShopId: string | null;
  profileUpdatedAt: string;
  blocker: Exclude<SelectionBlocker, "conflict"> | null;
  shops: { shopId: string; businessId: string; name: string; role: string }[];
};
export type ShopSelectionOutcome =
  | {
      version: 1;
      status: "completed";
      request: ShopSelectionRequest;
      selectedShopId: string;
      profileUpdatedAt: string;
      nativeRole: string;
    }
  | { version: 1; status: "rejected"; request: ShopSelectionRequest; code: SelectionBlocker }
  | { version: 1; status: "not_observed"; request: ShopSelectionRequest }
  | { version: 1; status: "unknown" | "unavailable" };
const fields = [
  "version",
  "expectedAccountId",
  "operationId",
  "profileId",
  "expectedShopId",
  "expectedUpdatedAt",
  "targetShopId",
] as const;
const businessRoles = new Set([
  "owner",
  "manager",
  "assistant_manager",
  "dispatcher",
  "driver",
  "mechanic",
  "clerk",
]);
const nativeRoles = new Set([
  "owner",
  "manager",
  "dispatch",
  "truck_driver",
  "technician",
  "office_admin",
]);
export const selectionBlockers = new Set<SelectionBlocker>([
  "conflict",
  "active_shift",
  "open_register",
  "role_review",
]);
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
export function selectionId(v: unknown): string {
  if (typeof v !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v))
    throw Error("Invalid selection identifier.");
  return v.toLowerCase();
}
function timestamp(v: unknown): string {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v) ||
    !Number.isFinite(Date.parse(v))
  )
    throw Error("Reload the selected shop.");
  return v;
}
export function parseShopSelectionRequest(v: unknown): ShopSelectionRequest {
  if (
    !object(v) ||
    v.version !== 1 ||
    Object.keys(v).length !== fields.length ||
    fields.some((f) => !Object.hasOwn(v, f))
  )
    throw Error("Invalid selection request.");
  const a = selectionId(v.expectedAccountId),
    p = selectionId(v.profileId);
  if (a !== p) throw Error("Employee profile needs review.");
  return {
    version: 1,
    expectedAccountId: a,
    operationId: selectionId(v.operationId),
    profileId: p,
    expectedShopId: v.expectedShopId === null ? null : selectionId(v.expectedShopId),
    expectedUpdatedAt: timestamp(v.expectedUpdatedAt),
    targetShopId: selectionId(v.targetShopId),
  };
}
export const sameSelectionRequest = (a: ShopSelectionRequest, b: ShopSelectionRequest): boolean =>
  fields.every((f) => a[f] === b[f]);
export function parseShopSelectionOutcome(
  v: unknown,
  request: ShopSelectionRequest,
): ShopSelectionOutcome {
  const unknown: ShopSelectionOutcome = { version: 1, status: "unknown" };
  if (!object(v) || v.version !== 1) return unknown;
  if (v.status === "unknown" || v.status === "unavailable") return { version: 1, status: v.status };
  try {
    if (!sameSelectionRequest(parseShopSelectionRequest(v.request), request)) return unknown;
    if (v.status === "not_observed") return { version: 1, status: "not_observed", request };
    if (v.status === "rejected" && selectionBlockers.has(v.code as SelectionBlocker))
      return { version: 1, status: "rejected", request, code: v.code as SelectionBlocker };
    if (
      v.status !== "completed" ||
      selectionId(v.selectedShopId) !== request.targetShopId ||
      typeof v.nativeRole !== "string" ||
      !nativeRoles.has(v.nativeRole)
    )
      return unknown;
    return {
      version: 1,
      status: "completed",
      request,
      selectedShopId: request.targetShopId,
      profileUpdatedAt: timestamp(v.profileUpdatedAt),
      nativeRole: v.nativeRole,
    };
  } catch {
    return unknown;
  }
}
export function parseShopSelectionView(v: unknown, account: string): ShopSelectionView {
  if (
    !object(v) ||
    v.version !== 1 ||
    v.accountId !== account ||
    v.profileId !== account ||
    !Array.isArray(v.shops) ||
    v.shops.length > 100 ||
    (v.blocker !== null &&
      !["active_shift", "open_register", "role_review"].includes(String(v.blocker)))
  )
    throw Error("Shop selection unavailable.");
  const seen = new Set<string>();
  const shops = v.shops.map((s) => {
    if (
      !object(s) ||
      typeof s.name !== "string" ||
      !s.name.trim() ||
      s.name.length > 500 ||
      typeof s.role !== "string" ||
      !businessRoles.has(s.role)
    )
      throw Error("Shop selection unavailable.");
    const shopId = selectionId(s.shopId);
    if (seen.has(shopId)) throw Error("Shop selection unavailable.");
    seen.add(shopId);
    return { shopId, businessId: selectionId(s.businessId), name: s.name, role: s.role };
  });
  return {
    version: 1,
    accountId: selectionId(account),
    profileId: account,
    selectedShopId: v.selectedShopId === null ? null : selectionId(v.selectedShopId),
    profileUpdatedAt: timestamp(v.profileUpdatedAt),
    shops,
    blocker: v.blocker as ShopSelectionView["blocker"],
  };
}
export const selectionPendingKey = (account: string): string =>
  `365.shop.selection.pending.v1:${selectionId(account)}`;
export const selectionChangedKey = (account: string): string =>
  `365.shop.selection.changed.v1:${selectionId(account)}`;
export function loadSelectionPending(
  storage: Pick<Storage, "getItem">,
  account: string,
): ShopSelectionRequest | null {
  const raw = storage.getItem(selectionPendingKey(account));
  if (raw === null) return null;
  if (raw.length > 4096) throw Error("Recovery record unavailable.");
  const r = parseShopSelectionRequest(JSON.parse(raw));
  if (r.expectedAccountId !== account) throw Error("Recovery account mismatch.");
  return r;
}
export function saveSelectionPending(
  storage: Pick<Storage, "getItem" | "setItem">,
  r: ShopSelectionRequest,
): void {
  const checked = parseShopSelectionRequest(r),
    key = selectionPendingKey(checked.expectedAccountId),
    old = loadSelectionPending(storage, checked.expectedAccountId);
  if (old && !sameSelectionRequest(old, checked))
    throw Error("Resolve the existing selection request first.");
  const json = JSON.stringify(checked);
  storage.setItem(key, json);
  if (storage.getItem(key) !== json) throw Error("Recovery storage unavailable.");
}
export function clearSelectionPending(
  storage: Pick<Storage, "getItem" | "removeItem">,
  r: ShopSelectionRequest,
): void {
  const old = loadSelectionPending(storage, r.expectedAccountId);
  if (old && !sameSelectionRequest(old, r)) throw Error("Another selection needs review.");
  const key = selectionPendingKey(r.expectedAccountId);
  storage.removeItem(key);
  if (storage.getItem(key) !== null) throw Error("Recovery storage unavailable.");
}
/** Conservative tab-local guard; other tabs/devices still require the user's review. */
export function hasPendingStock(
  storage: Pick<Storage, "length" | "key">,
  account: string,
): boolean {
  const id = selectionId(account);
  for (let n = 0; n < storage.length; n++) {
    const key = storage.key(n);
    if (
      key?.startsWith(`365.stock.pending.v1:${id}:`) ||
      key?.startsWith(`365.shop.stock.pending.v1:${id}:`)
    )
      return true;
  }
  return false;
}
