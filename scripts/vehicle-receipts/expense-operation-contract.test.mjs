// Pure offline contract tests. No SDK/database/SQL/Auth/ledger/current truth is
// executed. A fabricated matching acknowledgment is deliberately accepted data.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  bindExpenseOperationRequest,
  EXPENSE_OPERATION_FAILURE,
  EXPENSE_OPERATION_LIMITATIONS,
  parseExpenseOperationAcknowledgment,
  parseExpenseOperationRequest,
} from "./expense-operation-contract.mjs";

const ids = Object.freeze({
  operation: "10000000-ABCD-4000-8000-000000000001",
  account: "20000000-ABCD-4000-8000-000000000001",
  shop: "30000000-ABCD-4000-8000-000000000001",
  vehicle: "40000000-ABCD-4000-8000-000000000001",
  receipt: "50000000-ABCD-4000-8000-000000000001",
  expense: "60000000-abcd-4000-8000-000000000001",
  journal: "70000000-abcd-4000-8000-000000000001",
  debitLine: "80000000-abcd-4000-8000-000000000001",
  creditLine: "80000000-abcd-4000-8000-000000000002",
  debitAccount: "90000000-abcd-4000-8000-000000000001",
  creditAccount: "90000000-abcd-4000-8000-000000000002",
  other: "a0000000-abcd-4000-8000-000000000001",
});
const request = (overrides = {}) => ({
  version: 1,
  kind: "create",
  operationId: ids.operation,
  expectedAccountId: ids.account,
  expectedShopId: ids.shop,
  expectedShopVehicleId: ids.vehicle,
  receiptId: ids.receipt,
  amount: "12.34",
  taxAmount: "0",
  currency: "PHP",
  expenseDate: "2026-10-01",
  vendor: "Synthetic vendor",
  paymentIntent: "cash",
  ...overrides,
});
const acknowledgment = (intent = request()) => {
  const ap = intent.paymentIntent === "accounts_payable";
  const description = intent.vendor === null ? "Vehicle parts receipt" : intent.vendor;
  return {
    requestBinding: bindExpenseOperationRequest(intent).binding,
    operationId: intent.operationId,
    accountId: intent.expectedAccountId,
    shopId: intent.expectedShopId,
    shopVehicleId: intent.expectedShopVehicleId,
    receiptId: intent.receiptId,
    expense: {
      id: ids.expense,
      shopId: intent.expectedShopId,
      shopVehicleId: intent.expectedShopVehicleId,
      receiptId: intent.receiptId,
      amount: intent.amount,
      taxAmount: "0.00",
      expenseDate: intent.expenseDate,
      createdBy: intent.expectedAccountId,
      description,
      status: ap ? "unpaid" : "recorded",
      paymentMethod: null,
    },
    journal: {
      id: ids.journal,
      shopId: intent.expectedShopId,
      entryDate: intent.expenseDate,
      reference: `EXP-${ids.expense.slice(0, 8)}`,
      memo: description,
      status: "posted",
      createdBy: null,
      sourceType: "expense",
      sourceId: ids.expense,
      postingState: "verified",
      lines: [
        {
          id: ids.debitLine,
          accountId: ids.debitAccount,
          accountShopId: intent.expectedShopId,
          accountCode: "6000",
          accountName: "Operating Expenses",
          accountType: "expense",
          debit: intent.amount,
          credit: "0",
          lineOrder: 0,
          description,
        },
        {
          id: ids.creditLine,
          accountId: ids.creditAccount,
          accountShopId: intent.expectedShopId,
          accountCode: ap ? "2000" : "1000",
          accountName: ap ? "Accounts Payable" : "Cash",
          accountType: ap ? "liability" : "asset",
          debit: "0.0",
          credit: intent.amount,
          lineOrder: 1,
          description: "Cash out",
        },
      ],
    },
  };
};
const plain = (value) => JSON.parse(JSON.stringify(value));
const reject = (run) =>
  assert.throws(run, (error) => {
    assert.equal(error.constructor, Error);
    assert.equal(error.message, EXPENSE_OPERATION_FAILURE);
    assert.equal(Object.hasOwn(error, "cause"), false);
    return true;
  });
const changed = (value, path, replacement) => {
  const copy = structuredClone(value);
  const keys = path.split(".");
  let current = copy;
  for (const key of keys.slice(0, -1)) current = current[key];
  current[keys.at(-1)] = replacement;
  return copy;
};

test("pure module imports no database/SDK/crypto/authority executor and records the preparatory boundaries", () => {
  const source = fs.readFileSync(
    new URL("./expense-operation-contract.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /\b(?:parseFloat|parseInt|Number|Math\.round|Date|fetch)\s*\(/);
  assert.ok(EXPENSE_OPERATION_LIMITATIONS.some((limit) => limit.includes("not adopted")));
  assert.ok(EXPENSE_OPERATION_LIMITATIONS.some((limit) => limit.includes("not independent SQL")));
  assert.ok(EXPENSE_OPERATION_LIMITATIONS.some((limit) => limit.includes("not human identity")));
});

test("request normalizes UUID case and exact cent text into a frozen owned scalar snapshot", () => {
  const input = request({ amount: "250", taxAmount: "0.0" });
  const result = parseExpenseOperationRequest(input);
  assert.deepEqual(plain(result), {
    ...input,
    operationId: ids.operation.toLowerCase(),
    expectedAccountId: ids.account.toLowerCase(),
    expectedShopId: ids.shop.toLowerCase(),
    expectedShopVehicleId: ids.vehicle.toLowerCase(),
    receiptId: ids.receipt.toLowerCase(),
    amount: "250.00",
    taxAmount: "0.00",
  });
  assert.equal(Object.getPrototypeOf(result), null);
  assert.equal(Object.isFrozen(result), true);
  input.vendor = "Later input change";
  assert.equal(result.vendor, "Synthetic vendor");
});

test("positive exact cents and native receipt max are supported without floating arithmetic", () => {
  for (const [input, expected] of [
    ["0.01", "0.01"],
    ["1", "1.00"],
    ["1.2", "1.20"],
    ["99999999", "99999999.00"],
    ["99999999.00", "99999999.00"],
  ]) {
    assert.equal(parseExpenseOperationRequest(request({ amount: input })).amount, expected);
  }
});

test("zero/signed/nonfinite/exponent/fractional-cent/overflow and unsupported amount wire cohorts fail generically", () => {
  for (const amount of [
    "0",
    "0.00",
    "-0",
    "-0.00",
    "+0",
    "-1",
    "+1",
    "NaN",
    "Infinity",
    "-Infinity",
    "1e2",
    "1E+2",
    "1.001",
    "1.000",
    "99999999.01",
    "999999999999.99",
    "1000000000000.00",
    "01.00",
    "1.",
    ".1",
    " 1",
    "1 ",
    "",
    "0x10",
    "1_000",
    1,
    0,
    NaN,
    Infinity,
    null,
    undefined,
    1n,
    true,
    {},
    [],
  ]) {
    reject(() => parseExpenseOperationRequest(request({ amount })));
  }
});

test("tax-zero and PHP are explicit unsupported-cohort boundaries; no currency conversion or tax inference", () => {
  for (const taxAmount of ["0.01", "1", "-0", "+0", "NaN", "0.000", 0, null])
    reject(() => parseExpenseOperationRequest(request({ taxAmount })));
  for (const currency of ["php", "USD", "JPY", "", null, true])
    reject(() => parseExpenseOperationRequest(request({ currency })));
});

test("finite canonical AD date uses real leap/calendar rules, no native infinity/BC/expanded or fallback", () => {
  for (const expenseDate of ["0001-01-01", "0099-12-31", "2000-02-29", "2024-02-29", "9999-12-31"])
    assert.equal(parseExpenseOperationRequest(request({ expenseDate })).expenseDate, expenseDate);
  for (const expenseDate of [
    "0000-01-01",
    "1900-02-29",
    "2023-02-29",
    "2026-04-31",
    "2026-00-01",
    "2026-13-01",
    "2026-01-00",
    "2026-01-32",
    "2026-1-01",
    "10000-01-01",
    "0001-01-01 BC",
    "infinity",
    "-infinity",
    "2026-10-01T00:00:00Z",
    "",
    null,
    undefined,
    0,
  ])
    reject(() => parseExpenseOperationRequest(request({ expenseDate })));
});

test("vendor null/empty/whitespace/Unicode are preserved exactly; native200 codepoints and encoding validated", () => {
  for (const vendor of [
    null,
    "",
    "   ",
    "line\nnext\r\n",
    "e\u0301",
    "é",
    "🧾".repeat(200),
    "x".repeat(200),
  ])
    assert.equal(parseExpenseOperationRequest(request({ vendor })).vendor, vendor);
  for (const vendor of [
    "x".repeat(201),
    "🧾".repeat(201),
    "x".repeat(4097),
    "x\0y",
    "\ud800",
    "\udc00",
    "a\ud800b",
    "🧾\udc00",
    0,
    true,
    undefined,
    {},
    [],
  ])
    reject(() => parseExpenseOperationRequest(request({ vendor })));
});

test("all scope/operation UUIDs are strict owned text with no trimming or mismatched alternate identity fields", () => {
  for (const key of [
    "operationId",
    "expectedAccountId",
    "expectedShopId",
    "expectedShopVehicleId",
    "receiptId",
  ]) {
    for (const value of [
      "",
      ` ${ids.receipt}`,
      `${ids.receipt} `,
      "not-a-uuid",
      null,
      undefined,
      1,
      {},
      [],
    ])
      reject(() => parseExpenseOperationRequest(request({ [key]: value })));
  }
  for (const [key, value] of [
    ["version", "1"],
    ["version", 2],
    ["kind", "update"],
    ["kind", "delete"],
    ["paymentIntent", "paid"],
    ["paymentIntent", "Cash"],
    ["paymentIntent", ""],
    ["paymentIntent", null],
  ])
    reject(() => parseExpenseOperationRequest(request({ [key]: value })));
});

test("request rejects missing/extra/symbol/hidden/accessor/custom-prototype and nonobject shapes without reading getters", () => {
  for (const key of Object.keys(request())) {
    const input = request();
    delete input[key];
    reject(() => parseExpenseOperationRequest(input));
  }
  for (const value of [
    null,
    undefined,
    [],
    "request",
    1,
    new Date(),
    Object.assign(Object.create({ inherited: true }), request()),
    { ...request(), extra: true },
    { ...request(), [Symbol("secret")]: "secret" },
  ])
    reject(() => parseExpenseOperationRequest(value));
  const hidden = request();
  Object.defineProperty(hidden, "vendor", { value: "private", enumerable: false });
  reject(() => parseExpenseOperationRequest(hidden));
  let reads = 0;
  const accessor = request();
  Object.defineProperty(accessor, "vendor", {
    get() {
      reads++;
      return "private";
    },
    enumerable: true,
  });
  reject(() => parseExpenseOperationRequest(accessor));
  assert.equal(reads, 0);
  const safe = Object.assign(Object.create(null), request());
  assert.equal(parseExpenseOperationRequest(safe).amount, "12.34");
  reject(() =>
    parseExpenseOperationRequest(
      new Proxy(request(), {
        getPrototypeOf() {
          throw new Error("sensitive trap cause");
        },
      }),
    ),
  );
});

test("canonical binding is stable across key order/UUID case/lossless decimal spelling and binds all normalized fields", () => {
  const first = bindExpenseOperationRequest(request({ amount: "250", taxAmount: "0" }));
  const reordered = Object.fromEntries(
    Object.entries(request({ amount: "250.00", taxAmount: "0.00" })).reverse(),
  );
  for (const key of [
    "operationId",
    "expectedAccountId",
    "expectedShopId",
    "expectedShopVehicleId",
    "receiptId",
  ])
    reordered[key] = reordered[key].toLowerCase();
  assert.equal(bindExpenseOperationRequest(reordered).binding, first.binding);
  assert.equal(first.canonicalPayload, JSON.stringify(first.payload));
  assert.equal(first.binding, JSON.stringify({ key: first.key, payload: first.payload }));
  assert.deepEqual(plain(first.key), {
    accountId: ids.account.toLowerCase(),
    operationId: ids.operation.toLowerCase(),
  });
  assert.ok(Object.isFrozen(first) && Object.isFrozen(first.key) && Object.isFrozen(first.payload));
  for (const overrides of [
    { operationId: ids.other },
    { expectedAccountId: ids.other },
    { expectedShopId: ids.other },
    { expectedShopVehicleId: ids.other },
    { receiptId: ids.other },
    { amount: "250.01" },
    { expenseDate: "2026-10-02" },
    { vendor: null },
    { vendor: "" },
    { vendor: " " },
    { paymentIntent: "accounts_payable" },
  ])
    assert.notEqual(
      bindExpenseOperationRequest(request({ amount: "250", ...overrides })).binding,
      first.binding,
    );
});

test("same operation identity with changed payload is distinguishable but NOT prevented/durably stored", () => {
  const first = bindExpenseOperationRequest(request());
  const second = bindExpenseOperationRequest(request({ amount: "12.35" }));
  assert.deepEqual(plain(first.key), plain(second.key));
  assert.notEqual(first.binding, second.binding);
  assert.equal(bindExpenseOperationRequest(request()).binding, first.binding);
  assert.notEqual(
    bindExpenseOperationRequest(request({ vendor: "é" })).binding,
    bindExpenseOperationRequest(request({ vendor: "e\u0301" })).binding,
  );
});

test("strict fabricated Cash acknowledgment reports exact scope/expense/source/two ordered native mappings, not independent truth", () => {
  const intent = request({ amount: "250" });
  const raw = acknowledgment(intent);
  const result = parseExpenseOperationAcknowledgment(raw, intent);
  assert.equal(result.operationId, ids.operation.toLowerCase());
  assert.equal(result.expense.amount, "250.00");
  assert.equal(result.expense.taxAmount, "0.00");
  assert.equal(result.expense.createdBy, ids.account.toLowerCase());
  assert.equal(result.journal.createdBy, null);
  assert.equal(result.journal.postingState, "verified");
  assert.deepEqual(
    result.journal.lines.map((line) => [line.accountCode, line.debit, line.credit]),
    [
      ["6000", "250.00", "0.00"],
      ["1000", "0.00", "250.00"],
    ],
  );
  for (const value of [result, result.expense, result.journal, ...result.journal.lines])
    assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(result.journal.lines), true);
  raw.expense.amount = "99.00";
  raw.journal.lines[0].accountCode = "wrong";
  raw.journal.lines.push({});
  assert.equal(result.expense.amount, "250.00");
  assert.equal(result.journal.lines.length, 2);
});

test("AP is explicitly modeled unpaid/APliability; it does not adopt a product financial decision", () => {
  const intent = request({ paymentIntent: "accounts_payable" });
  const result = parseExpenseOperationAcknowledgment(acknowledgment(intent), intent);
  assert.equal(result.expense.status, "unpaid");
  assert.equal(result.expense.paymentMethod, null);
  assert.deepEqual(
    [
      result.journal.lines[1].accountCode,
      result.journal.lines[1].accountName,
      result.journal.lines[1].accountType,
    ],
    ["2000", "Accounts Payable", "liability"],
  );
  reject(() => parseExpenseOperationAcknowledgment(acknowledgment(), intent));
});

test("null vendor fallback only; empty and whitespace descriptions/memos never replaced or trimmed", () => {
  for (const vendor of [null, "", "  ", "🧾"]) {
    const intent = request({ vendor });
    const raw = acknowledgment(intent);
    const result = parseExpenseOperationAcknowledgment(raw, intent);
    assert.equal(result.expense.description, vendor === null ? "Vehicle parts receipt" : vendor);
    assert.equal(result.journal.memo, result.expense.description);
    assert.equal(result.journal.lines[0].description, result.expense.description);
    reject(() =>
      parseExpenseOperationAcknowledgment(changed(raw, "expense.description", "altered"), intent),
    );
  }
});

test("null vendor versus literal fallback cannot reuse one acknowledgment despite identical stored descriptions", () => {
  const nullIntent = request({ vendor: null });
  const literalIntent = request({ vendor: "Vehicle parts receipt" });
  const nullAck = acknowledgment(nullIntent);
  const literalAck = acknowledgment(literalIntent);
  assert.equal(nullAck.expense.description, literalAck.expense.description);
  assert.equal(nullAck.journal.memo, literalAck.journal.memo);
  assert.deepEqual(nullAck.journal.lines, literalAck.journal.lines);
  assert.notEqual(nullAck.requestBinding, literalAck.requestBinding);
  assert.equal(
    parseExpenseOperationAcknowledgment(nullAck, nullIntent).requestBinding,
    nullAck.requestBinding,
  );
  reject(() => parseExpenseOperationAcknowledgment(nullAck, literalIntent));
  reject(() => parseExpenseOperationAcknowledgment(literalAck, nullIntent));
  // Merely changing the reported text can fabricate a matching DTO: validation
  // remains syntax/equality, NOT ledger integrity or proof SQL ever executed.
  nullAck.requestBinding = literalAck.requestBinding;
  assert.equal(
    parseExpenseOperationAcknowledgment(nullAck, literalIntent).requestBinding,
    literalAck.requestBinding,
  );
});

test("request binding is required exact full text, rejects tampering and accepts normalized UUID/decimal aliases", () => {
  const intent = request({ amount: "250", taxAmount: "0" });
  const raw = acknowledgment(intent);
  const aliases = { ...intent, amount: "250.00", taxAmount: "0.00" };
  for (const key of [
    "operationId",
    "expectedAccountId",
    "expectedShopId",
    "expectedShopVehicleId",
    "receiptId",
  ])
    aliases[key] = aliases[key].toLowerCase();
  assert.equal(
    parseExpenseOperationAcknowledgment(raw, aliases).requestBinding,
    bindExpenseOperationRequest(aliases).binding,
  );
  for (const requestBinding of [
    undefined,
    null,
    "",
    {},
    JSON.parse(raw.requestBinding),
    `${raw.requestBinding}\n`,
    raw.requestBinding.replace('"kind":"create"', '"kind":"update"'),
    bindExpenseOperationRequest({ ...intent, vendor: "different" }).binding,
  ]) {
    reject(() => parseExpenseOperationAcknowledgment({ ...raw, requestBinding }, intent));
  }
  const missing = { ...raw };
  delete missing.requestBinding;
  reject(() => parseExpenseOperationAcknowledgment(missing, intent));
});

test("ack binding and value checks share one descriptor snapshot of the expected request", () => {
  const original = request({ vendor: null });
  const raw = acknowledgment(original);
  const reads = new Map();
  const proxy = new Proxy(original, {
    getOwnPropertyDescriptor(target, key) {
      reads.set(key, (reads.get(key) ?? 0) + 1);
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
      if (key === "vendor" && reads.get(key) > 1)
        return { ...descriptor, value: "Vehicle parts receipt" };
      return descriptor;
    },
  });
  assert.equal(parseExpenseOperationAcknowledgment(raw, proxy).requestBinding, raw.requestBinding);
  assert.ok([...reads.values()].every((count) => count === 1));
  assert.equal(reads.size, Object.keys(original).length);
});

test("bare UUID/ok/void/truthy flags and incomplete/unknown envelopes never acknowledge posting", () => {
  for (const value of [
    ids.expense,
    null,
    undefined,
    true,
    { ok: true },
    { expenseId: ids.expense },
    { ...acknowledgment(), committed: true },
    [],
  ])
    reject(() => parseExpenseOperationAcknowledgment(value, request()));
  for (const key of Object.keys(acknowledgment())) {
    const raw = acknowledgment();
    delete raw[key];
    reject(() => parseExpenseOperationAcknowledgment(raw, request()));
  }
  for (const key of Object.keys(acknowledgment().expense)) {
    const raw = acknowledgment();
    delete raw.expense[key];
    reject(() => parseExpenseOperationAcknowledgment(raw, request()));
  }
  for (const key of Object.keys(acknowledgment().journal)) {
    const raw = acknowledgment();
    delete raw.journal[key];
    reject(() => parseExpenseOperationAcknowledgment(raw, request()));
  }
});

test("every scope/creator/source/date/amount/status/payment/posting mismatch fails with no sensitive cause", () => {
  const raw = acknowledgment();
  for (const [path, value] of [
    ["requestBinding", "changed full payload"],
    ["operationId", ids.other],
    ["accountId", ids.other],
    ["shopId", ids.other],
    ["shopVehicleId", ids.other],
    ["receiptId", ids.other],
    ["expense.id", "malformed"],
    ["expense.shopId", ids.other],
    ["expense.shopVehicleId", ids.other],
    ["expense.receiptId", ids.other],
    ["expense.createdBy", ids.other],
    ["expense.amount", "12.35"],
    ["expense.amount", "12.340"],
    ["expense.amount", "NaN"],
    ["expense.amount", "1000000000000.00"],
    ["expense.amount", null],
    ["expense.amount", 12.34],
    ["expense.taxAmount", "0.01"],
    ["expense.expenseDate", "2026-10-02"],
    ["expense.expenseDate", null],
    ["expense.description", "private provider cause"],
    ["expense.status", "paid"],
    ["expense.paymentMethod", "Cash"],
    ["journal.id", "malformed"],
    ["journal.shopId", ids.other],
    ["journal.entryDate", "2026-10-02"],
    ["journal.reference", "wrong"],
    ["journal.memo", "wrong"],
    ["journal.status", "draft"],
    ["journal.createdBy", ids.account],
    ["journal.sourceType", "receipt"],
    ["journal.sourceId", ids.other],
    ["journal.postingState", true],
    ["journal.postingState", "posted"],
    ["journal.postingState", "pending"],
  ])
    reject(() => parseExpenseOperationAcknowledgment(changed(raw, path, value), request()));
});

test("both ordered journal legs must match IDs/shop/code/type/name/exact debit/credit/description and distinct rows/accounts", () => {
  const raw = acknowledgment();
  for (const index of [0, 1]) {
    for (const [key, value] of [
      ["id", "bad"],
      ["accountId", "bad"],
      ["accountShopId", ids.other],
      ["accountCode", "9999"],
      ["accountName", "wrong"],
      ["accountType", "equity"],
      ["debit", "1.00"],
      ["credit", "1.00"],
      ["lineOrder", index === 0 ? 1 : 0],
      ["lineOrder", String(index)],
      ["description", "wrong"],
    ])
      reject(() =>
        parseExpenseOperationAcknowledgment(
          changed(raw, `journal.lines.${index}.${key}`, value),
          request(),
        ),
      );
    for (const key of Object.keys(raw.journal.lines[index])) {
      const value = acknowledgment();
      delete value.journal.lines[index][key];
      reject(() => parseExpenseOperationAcknowledgment(value, request()));
    }
  }
  reject(() =>
    parseExpenseOperationAcknowledgment(
      changed(raw, "journal.lines.1.id", ids.debitLine.toUpperCase()),
      request(),
    ),
  );
  reject(() =>
    parseExpenseOperationAcknowledgment(
      changed(raw, "journal.lines.1.accountId", ids.debitAccount.toUpperCase()),
      request(),
    ),
  );
  reject(() =>
    parseExpenseOperationAcknowledgment(
      changed(raw, "journal.lines", [...raw.journal.lines].reverse()),
      request(),
    ),
  );
});

test("ack descriptor/array admission rejects hidden extras/getters/sparse/prototype tricks before consuming values", () => {
  let reads = 0;
  const accessor = acknowledgment();
  Object.defineProperty(accessor.expense, "amount", {
    enumerable: true,
    get() {
      reads++;
      return "12.34";
    },
  });
  reject(() => parseExpenseOperationAcknowledgment(accessor, request()));
  assert.equal(reads, 0);
  for (const value of [
    [],
    [acknowledgment().journal.lines[0]],
    [...acknowledgment().journal.lines, {}],
    Array(2),
    Object.assign([...acknowledgment().journal.lines], { extra: true }),
  ])
    reject(() =>
      parseExpenseOperationAcknowledgment(
        changed(acknowledgment(), "journal.lines", value),
        request(),
      ),
    );
  const array = acknowledgment();
  Object.defineProperty(array.journal.lines, "0", {
    enumerable: true,
    get() {
      reads++;
      return {};
    },
  });
  reject(() => parseExpenseOperationAcknowledgment(array, request()));
  assert.equal(reads, 0);
  const prototype = acknowledgment();
  Object.setPrototypeOf(prototype.journal.lines, Object.create(Array.prototype));
  reject(() => parseExpenseOperationAcknowledgment(prototype, request()));
  const extra = acknowledgment();
  extra.journal.lines[0].unexpected = "private";
  reject(() => parseExpenseOperationAcknowledgment(extra, request()));
  const symbol = acknowledgment();
  symbol.journal[Symbol("secret")] = "private";
  reject(() => parseExpenseOperationAcknowledgment(symbol, request()));
  const hidden = acknowledgment();
  Object.defineProperty(hidden.journal, "status", { value: "posted", enumerable: false });
  reject(() => parseExpenseOperationAcknowledgment(hidden, request()));
});

test("ack revalidates expected request instead of trusting a mutable or pre-branded intent", () => {
  const input = request();
  const raw = acknowledgment(input);
  input.expectedShopId = ids.other;
  reject(() => parseExpenseOperationAcknowledgment(raw, input));
  reject(() => parseExpenseOperationAcknowledgment(raw, { ...request(), trusted: true }));
  reject(() => parseExpenseOperationAcknowledgment(raw, null));
});
