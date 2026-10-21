/** Caller contracts. SQL independently validates identity, authority and totals. */
export type QuoteAction = "approve" | "convert";
export type QuoteRequest = Readonly<{
  version: 1;
  expectedAccountId: string;
  shopId: string;
  quoteId: string;
  operationId: string;
  action: QuoteAction;
  expectedUpdatedAt: string;
  expectedFingerprint: string;
  expectedProfileId: string;
  expectedProfileUpdatedAt: string;
  reason: string;
}>;
export type QuoteView = {
  version: 1;
  accountId: string;
  shopId: string;
  quoteId: string;
  profileId: string;
  profileUpdatedAt: string;
  updatedAt: string;
  fingerprint: string;
  quoteNumber: string | null;
  quoteStatus: string;
  subtotal: string | null;
  tax: string | null;
  total: string | null;
  expiryDate: string | null;
  issue: string | null;
  workOrderId: string | null;
  items: {
    id: string;
    name: string;
    kind: string;
    quantity: string;
    unitPrice: string;
    total: string;
  }[];
};
export type QuoteOutcome =
  | { version: 1; status: "unknown" | "unavailable" }
  | {
      version: 1;
      status: "completed" | "rejected" | "not_observed";
      operationId: string;
      accountId: string;
      shopId: string;
      quoteId: string;
      action: QuoteAction;
      reason?: string | null;
      workOrderId?: string | null;
      quoteStatus?: string;
    };
const requestKeys = [
  "version",
  "expectedAccountId",
  "shopId",
  "quoteId",
  "operationId",
  "action",
  "expectedUpdatedAt",
  "expectedFingerprint",
  "expectedProfileId",
  "expectedProfileUpdatedAt",
  "reason",
];
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid quote data.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 128): string {
  if (typeof value !== "string" || !value.length || value.length > max || value.includes("\0"))
    throw Error("Invalid quote data.");
  return value;
}
export function quoteId(value: unknown): string {
  const id = text(value);
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id))
    throw Error("Invalid quote identifier.");
  return id;
}
const nullable = (v: unknown, max = 128) => (v === null ? null : text(v, max));
export function parseQuoteRequest(value: unknown): QuoteRequest {
  const v = record(value);
  if (
    v.version !== 1 ||
    Object.keys(v).length !== requestKeys.length ||
    requestKeys.some((k) => !Object.hasOwn(v, k))
  )
    throw Error("Invalid quote request.");
  if (v.action !== "approve" && v.action !== "convert") throw Error("Invalid quote action.");
  if (!/^[0-9a-f]{64}$/.test(text(v.expectedFingerprint))) throw Error("Invalid quote version.");
  const reason = text(v.reason, 2000);
  if (!reason.trim()) throw Error("A reason is required.");
  return Object.freeze({
    version: 1,
    expectedAccountId: quoteId(v.expectedAccountId),
    shopId: quoteId(v.shopId),
    quoteId: quoteId(v.quoteId),
    operationId: quoteId(v.operationId),
    action: v.action,
    expectedUpdatedAt: text(v.expectedUpdatedAt),
    expectedFingerprint: text(v.expectedFingerprint),
    expectedProfileId: quoteId(v.expectedProfileId),
    expectedProfileUpdatedAt: text(v.expectedProfileUpdatedAt),
    reason,
  });
}
export function parseQuoteView(value: unknown, account: string, id: string): QuoteView {
  const v = record(value);
  if (
    v.version !== 1 ||
    v.accountId !== account ||
    v.quoteId !== id ||
    !Array.isArray(v.items) ||
    v.items.length > 501 ||
    !/^[0-9a-f]{64}$/.test(text(v.fingerprint))
  )
    throw Error("Quote unavailable.");
  const seen = new Set<string>();
  const items = v.items.map((item) => {
    const r = record(item);
    const id = quoteId(r.id);
    if (seen.has(id) || !["service", "labor", "part"].includes(text(r.kind)))
      throw Error("Quote items unavailable.");
    seen.add(id);
    return {
      id,
      name: text(r.name, 500),
      kind: text(r.kind),
      quantity: text(r.quantity),
      unitPrice: text(r.unitPrice),
      total: text(r.total),
    };
  });
  return {
    version: 1,
    accountId: quoteId(v.accountId),
    shopId: quoteId(v.shopId),
    quoteId: quoteId(v.quoteId),
    profileId: quoteId(v.profileId),
    profileUpdatedAt: text(v.profileUpdatedAt),
    updatedAt: text(v.updatedAt),
    fingerprint: text(v.fingerprint),
    quoteNumber: nullable(v.quoteNumber),
    quoteStatus: text(v.quoteStatus),
    subtotal: nullable(v.subtotal),
    tax: nullable(v.tax),
    total: nullable(v.total),
    expiryDate: nullable(v.expiryDate),
    issue: nullable(v.issue),
    workOrderId: v.workOrderId === null ? null : quoteId(v.workOrderId),
    items,
  };
}
export function parseQuoteOutcome(value: unknown, r: QuoteRequest): QuoteOutcome {
  const v = record(value);
  if (
    v.version !== 1 ||
    !["completed", "rejected", "not_observed"].includes(String(v.status)) ||
    v.operationId !== r.operationId ||
    v.accountId !== r.expectedAccountId ||
    v.shopId !== r.shopId ||
    v.quoteId !== r.quoteId ||
    v.action !== r.action
  )
    throw Error("Quote outcome unconfirmed.");
  const result = {
    version: 1 as const,
    operationId: r.operationId,
    accountId: r.expectedAccountId,
    shopId: r.shopId,
    quoteId: r.quoteId,
    action: r.action,
  };
  if (v.status === "not_observed") return { ...result, status: "not_observed" };
  const workOrderId = v.workOrderId === null ? null : quoteId(v.workOrderId);
  if (v.status === "completed") {
    if (
      v.reason !== null ||
      (r.action === "convert"
        ? !workOrderId || v.quoteStatus !== "converted"
        : workOrderId !== null || v.quoteStatus !== "approved")
    )
      throw Error("Quote outcome unconfirmed.");
    return {
      ...result,
      status: "completed",
      reason: null,
      workOrderId,
      quoteStatus: text(v.quoteStatus),
    };
  }
  if (workOrderId !== null) throw Error("Quote outcome unconfirmed.");
  return {
    ...result,
    status: "rejected",
    workOrderId: null,
    reason: text(v.reason),
    quoteStatus: text(v.quoteStatus),
  };
}
export function makeQuoteRequest(
  view: QuoteView,
  action: QuoteAction,
  reason: string,
  operationId: string,
): QuoteRequest {
  return parseQuoteRequest({
    version: 1,
    expectedAccountId: view.accountId,
    shopId: view.shopId,
    quoteId: view.quoteId,
    operationId,
    action,
    expectedUpdatedAt: view.updatedAt,
    expectedFingerprint: view.fingerprint,
    expectedProfileId: view.profileId,
    expectedProfileUpdatedAt: view.profileUpdatedAt,
    reason,
  });
}
export const quoteStorageKey = (account: string, id: string) =>
  `365:quote-workflow:v1:${quoteId(account)}:${quoteId(id)}`;
export function saveQuoteRequest(
  storage: Pick<Storage, "setItem" | "getItem">,
  request: QuoteRequest,
): void {
  const r = parseQuoteRequest(request);
  const key = quoteStorageKey(r.expectedAccountId, r.quoteId);
  const raw = JSON.stringify(r);
  storage.setItem(key, raw);
  if (storage.getItem(key) !== raw)
    throw Error("Request could not be saved. Nothing was submitted.");
}
export function loadQuoteRequest(
  storage: Pick<Storage, "getItem">,
  account: string,
  id: string,
): QuoteRequest | null {
  const raw = storage.getItem(quoteStorageKey(account, id));
  if (raw === null) return null;
  if (raw.length > 12000) throw Error("Saved request requires review.");
  const r = parseQuoteRequest(JSON.parse(raw));
  if (r.expectedAccountId !== account || r.quoteId !== id)
    throw Error("Saved request belongs to a different context.");
  return r;
}
export function clearQuoteRequest(
  storage: Pick<Storage, "getItem" | "removeItem">,
  r: QuoteRequest,
): void {
  const key = quoteStorageKey(r.expectedAccountId, r.quoteId);
  const saved = loadQuoteRequest(storage, r.expectedAccountId, r.quoteId);
  if (saved && JSON.stringify(saved) !== JSON.stringify(r))
    throw Error("Saved request changed. Reload to recover it.");
  storage.removeItem(key);
  if (storage.getItem(key) !== null) throw Error("Saved receipt could not be cleared.");
}
export const quoteMoney = (value: string | null) =>
  value !== null && /^\d+(?:\.\d+)?$/.test(value) ? `₱${value}` : "Amount unconfirmed";
const quoteIssues: Record<string, string> = {
  stale_quote:
    "The quote or selected shop changed. Reload and review before starting a new request.",
  already_converted: "This quote already has a work order. Reload to open it.",
  wrong_status: "Approval must be recorded before conversion.",
  expired_quote: "This quote has expired. Revise or reissue it before approval or conversion.",
  fractional_part_quantity:
    "A part has a fractional quantity. Shop Manager parts require whole units; nothing was rounded.",
  inconsistent_totals:
    "The line totals or tax do not match the quote. Correct the quote before continuing.",
  empty_quote: "Add at least one quote item first.",
  too_many_items: "This workflow supports up to 500 quote items.",
  invalid_items: "One or more quote items need correction.",
};
export const quoteIssue = (value: string) =>
  quoteIssues[value] ?? "This quote needs review before continuing.";
