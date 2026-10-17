// Preparatory, UNCONNECTED CREATE-only protocol. No imports, SQL, executor,
// middleware, authority check, receipt ledger or production adoption lives here.
// All accepted values remain untrusted caller/reported data. Canonical binding
// is full deterministic text, NOT a cryptographic digest/capability/durable key.
export const EXPENSE_OPERATION_FAILURE = "Expense operation could not be confirmed.";
export const EXPENSE_OPERATION_VENDOR_CODE_UNITS = 4096;
export const EXPENSE_OPERATION_LIMITATIONS = Object.freeze([
  "Positive exact-cent PHP/finite AD date/tax-zero are an unsupported-cohort boundary for this initial model, not approved product/accounting policy.",
  "Cash recorded/1000 and AP unpaid/2000 are explicit modeled proposals, not adopted payment or reconciliation policy.",
  "Vendor4096 UTF16 code units is only a request resource budget; retained receipt vendor CHECK200 codepoints is separately enforced.",
  "Caller account/shop/vehicle/receipt and operation UUIDs are intent, not human identity, fresh session or trusted native authority.",
  "Binding is deterministic payload text only; it cannot enforce operation reuse, CREATE-only execution, idempotency, commit, uniqueness or recovery.",
  "Acknowledgment validates a reported verified-posting DTO only, not independent SQL/persisted truth, authority or financial acceptance.",
  "Retained journal creator is NULL; expense creator equality does not establish original-human journal attribution.",
  "Retained expense journal source key is not a durable payload-bound operation ledger; no connection or grant is supplied here.",
]);

const requestKeys = Object.freeze([
  "version",
  "kind",
  "operationId",
  "expectedAccountId",
  "expectedShopId",
  "expectedShopVehicleId",
  "receiptId",
  "amount",
  "taxAmount",
  "currency",
  "expenseDate",
  "vendor",
  "paymentIntent",
]);
const maximumCents = 99999999999999n; // NUMERIC(14,2), not receipt total eligibility.
const maximumReceiptCents = 9999999900n; // Retained receipt total CHECK<=99999999.
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = () => {
  throw new Error(EXPENSE_OPERATION_FAILURE);
};
const frozen = (fields) => Object.freeze(Object.assign(Object.create(null), fields));

// Descriptor-first snapshots never invoke property getters. Plain JSON objects
// and null-prototype own-data records only; prototypes/symbols/hidden/extra fields
// are rejected. Reflection on hostile Proxies cannot be made side-effect-free;
// thrown traps are masked and never expose their messages or supplied values.
function record(value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail();
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))
  )
    fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const names = Reflect.ownKeys(descriptors);
  if (
    names.length !== keys.length ||
    names.some((key) => typeof key !== "string" || !keys.includes(key))
  )
    fail();
  const copy = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) fail();
    copy[key] = descriptor.value;
  }
  return copy;
}

function uuid(value) {
  if (typeof value !== "string" || value.length !== 36 || !uuidPattern.test(value)) fail();
  return value.toLowerCase();
}
function money(value, positive = false) {
  // No numeric coercion/rounding, signs, exponents, whitespace, redundant integer
  // zeros or more than two wire fractional digits. BigInt is internal only.
  if (
    typeof value !== "string" ||
    value.length > 15 ||
    !/^(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?$/.test(value)
  )
    fail();
  const [integer, fraction = ""] = value.split(".");
  const decimals = fraction.padEnd(2, "0");
  const cents = BigInt(integer) * 100n + BigInt(decimals);
  if (cents > maximumCents || (positive && cents === 0n)) fail();
  return `${integer}.${decimals}`;
}
function date(value) {
  if (typeof value !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) fail();
  const digits = (text) =>
    [...text].reduce((sum, character) => sum * 10 + character.charCodeAt(0) - 48, 0);
  const year = digits(value.slice(0, 4));
  const month = digits(value.slice(5, 7));
  const day = digits(value.slice(8, 10));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) fail();
  return value; // No Date/dateparse/timezone/today/expiry policy.
}
function text(value, limit, codePointLimit = limit) {
  if (typeof value !== "string" || value.length > limit) fail();
  let codePoints = 0;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code === 0) fail();
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail();
    } else if (code >= 0xdc00 && code <= 0xdfff) fail();
    if (++codePoints > codePointLimit) fail();
  }
  return value;
}
const same = (actual, expected) => {
  if (actual !== expected) fail();
  return actual;
};

function request(value) {
  const raw = record(value, requestKeys);
  same(raw.version, 1);
  same(raw.kind, "create");
  const amount = money(raw.amount, true);
  if (BigInt(amount.replace(".", "")) > maximumReceiptCents) fail();
  const taxAmount = same(money(raw.taxAmount), "0.00");
  same(raw.currency, "PHP");
  if (raw.paymentIntent !== "cash" && raw.paymentIntent !== "accounts_payable") fail();
  return frozen({
    version: 1,
    kind: "create",
    operationId: uuid(raw.operationId),
    expectedAccountId: uuid(raw.expectedAccountId),
    expectedShopId: uuid(raw.expectedShopId),
    expectedShopVehicleId: uuid(raw.expectedShopVehicleId),
    receiptId: uuid(raw.receiptId),
    amount,
    taxAmount,
    currency: "PHP",
    expenseDate: date(raw.expenseDate),
    vendor: raw.vendor === null ? null : text(raw.vendor, EXPENSE_OPERATION_VENDOR_CODE_UNITS, 200),
    paymentIntent: raw.paymentIntent,
  });
}

export function parseExpenseOperationRequest(value) {
  try {
    return request(value);
  } catch {
    return fail();
  }
}

function bindingFor(payload) {
  const key = frozen({ accountId: payload.expectedAccountId, operationId: payload.operationId });
  // Fixed construction order, normalized UUIDs/cents, exact vendor Unicode and
  // nullable fields. Same key/different payload has different binding, but this
  // parser stores nothing and cannot prevent reuse or authorize any execution.
  const canonicalPayload = JSON.stringify(payload);
  const binding = JSON.stringify({ key, payload });
  return frozen({ key, payload, canonicalPayload, binding });
}

export function bindExpenseOperationRequest(value) {
  return bindingFor(parseExpenseOperationRequest(value));
}

function twoLines(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail();
  const length = Object.getOwnPropertyDescriptor(value, "length");
  if (!length || !Object.hasOwn(length, "value") || length.value !== 2) fail();
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 3 || keys.some((key) => !["0", "1", "length"].includes(key))) fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== 3 || descriptors.length?.value !== 2) fail();
  const output = [];
  for (const key of ["0", "1"]) {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) fail();
    output.push(descriptor.value);
  }
  return output;
}

function acknowledgment(value, intent) {
  const raw = record(value, [
    "requestBinding",
    "operationId",
    "accountId",
    "shopId",
    "shopVehicleId",
    "receiptId",
    "expense",
    "journal",
  ]);
  // Derive from this SAME detached normalized intent, never reread the original
  // request. Exact reported text distinguishes payloads whose coalesced stored
  // descriptions happen to match; it is still not a trusted/durable receipt.
  const requestBinding = same(raw.requestBinding, bindingFor(intent).binding);
  const operationId = same(uuid(raw.operationId), intent.operationId);
  const accountId = same(uuid(raw.accountId), intent.expectedAccountId);
  const shopId = same(uuid(raw.shopId), intent.expectedShopId);
  const shopVehicleId = same(uuid(raw.shopVehicleId), intent.expectedShopVehicleId);
  const receiptId = same(uuid(raw.receiptId), intent.receiptId);
  // Exactly COALESCE(vendor,'Vehicle parts receipt'): empty/whitespace remain.
  const description = intent.vendor === null ? "Vehicle parts receipt" : intent.vendor;
  const ap = intent.paymentIntent === "accounts_payable";
  const expenseRaw = record(raw.expense, [
    "id",
    "shopId",
    "shopVehicleId",
    "receiptId",
    "amount",
    "taxAmount",
    "expenseDate",
    "createdBy",
    "description",
    "status",
    "paymentMethod",
  ]);
  const expense = frozen({
    id: uuid(expenseRaw.id),
    shopId: same(uuid(expenseRaw.shopId), shopId),
    shopVehicleId: same(uuid(expenseRaw.shopVehicleId), shopVehicleId),
    receiptId: same(uuid(expenseRaw.receiptId), receiptId),
    amount: same(money(expenseRaw.amount, true), intent.amount),
    taxAmount: same(money(expenseRaw.taxAmount), intent.taxAmount),
    expenseDate: same(date(expenseRaw.expenseDate), intent.expenseDate),
    createdBy: same(uuid(expenseRaw.createdBy), accountId),
    description: same(
      text(expenseRaw.description, EXPENSE_OPERATION_VENDOR_CODE_UNITS),
      description,
    ),
    status: same(expenseRaw.status, ap ? "unpaid" : "recorded"),
    paymentMethod: same(expenseRaw.paymentMethod, null),
  });
  const journalRaw = record(raw.journal, [
    "id",
    "shopId",
    "entryDate",
    "reference",
    "memo",
    "status",
    "createdBy",
    "sourceType",
    "sourceId",
    "postingState",
    "lines",
  ]);
  const lines = twoLines(journalRaw.lines).map((value, index) => {
    const line = record(value, [
      "id",
      "accountId",
      "accountShopId",
      "accountCode",
      "accountName",
      "accountType",
      "debit",
      "credit",
      "lineOrder",
      "description",
    ]);
    return frozen({
      id: uuid(line.id),
      accountId: uuid(line.accountId),
      accountShopId: same(uuid(line.accountShopId), shopId),
      accountCode: same(line.accountCode, index === 0 ? "6000" : ap ? "2000" : "1000"),
      accountName: same(
        line.accountName,
        index === 0 ? "Operating Expenses" : ap ? "Accounts Payable" : "Cash",
      ),
      accountType: same(line.accountType, index === 0 ? "expense" : ap ? "liability" : "asset"),
      debit: same(money(line.debit), index === 0 ? intent.amount : "0.00"),
      credit: same(money(line.credit), index === 0 ? "0.00" : intent.amount),
      lineOrder: same(line.lineOrder, index),
      description: same(
        text(line.description, EXPENSE_OPERATION_VENDOR_CODE_UNITS),
        index === 0 ? description : "Cash out",
      ),
    });
  });
  if (lines[0].id === lines[1].id || lines[0].accountId === lines[1].accountId) fail();
  const journal = frozen({
    id: uuid(journalRaw.id),
    shopId: same(uuid(journalRaw.shopId), shopId),
    entryDate: same(date(journalRaw.entryDate), intent.expenseDate),
    reference: same(journalRaw.reference, `EXP-${expense.id.slice(0, 8)}`),
    memo: same(text(journalRaw.memo, EXPENSE_OPERATION_VENDOR_CODE_UNITS), description),
    status: same(journalRaw.status, "posted"),
    createdBy: same(journalRaw.createdBy, null),
    sourceType: same(journalRaw.sourceType, "expense"),
    sourceId: same(uuid(journalRaw.sourceId), expense.id),
    postingState: same(journalRaw.postingState, "verified"),
    lines: Object.freeze(lines),
  });
  return frozen({
    requestBinding,
    operationId,
    accountId,
    shopId,
    shopVehicleId,
    receiptId,
    expense,
    journal,
  });
}

export function parseExpenseOperationAcknowledgment(value, expectedRequest) {
  try {
    return acknowledgment(value, request(expectedRequest));
  } catch {
    return fail();
  }
}
