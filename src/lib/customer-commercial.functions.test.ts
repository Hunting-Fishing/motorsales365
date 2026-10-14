import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCustomerCommercialSnapshot } from "./customer-commercial.functions";
import type {
  CustomerCommercialInvoice,
  CustomerCommercialKind,
  CustomerCommercialQuote,
} from "./customer-commercial";

// Mocked handler/builder contracts only: no actual authentication middleware,
// JWT, HTTP, PostgREST, RLS, live rows, catalog parity or DB cancellation proof.
const mocks = vi.hoisted(() => ({
  middleware: { name: "requireSupabaseAuth" },
  methods: [] as unknown[],
  middlewares: [] as unknown[][],
  getRequest: vi.fn(),
  privileged: vi.fn(),
  browser: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: (options: unknown) => {
    mocks.methods.push(options);
    let validate = (input: unknown): unknown => input;
    const builder = {
      middleware: (value: unknown[]) => {
        mocks.middlewares.push(value);
        return builder;
      },
      inputValidator: (fn: (input: unknown) => unknown) => {
        validate = fn;
        return builder;
      },
      handler:
        (fn: (args: { data: unknown; context: unknown }) => unknown) =>
        (args: { data: unknown; context: unknown }) =>
          fn({ ...args, data: validate(args.data) }),
    };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocks.getRequest }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: mocks.middleware,
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: mocks.privileged, rpc: mocks.privileged },
}));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: { from: mocks.browser },
  supabase: { from: mocks.browser },
}));

type Result = { data: unknown; error: unknown };
type Operation = { table: string; method: string; args: unknown[] };
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const accountId = uuid(1);
const customerId = "00000000-0000-4000-8000-0000000000ab";
const otherCustomer = uuid(3);
const failure = "Could not load this customer's commercial snapshot. Refresh and try again.";
const invalid = "Invalid customer commercial snapshot request.";
const changed = "Account changed. Refresh before loading this customer's commercial history.";
const projections = {
  invoices: "id,customer_id,date,due_date,status,total,created_at",
  quotes: "id,customer_id,quote_number,created_at,expiry_date,status,total_amount",
} as const;
const invoice = (n = 10): CustomerCommercialInvoice => ({
  id: `Legacy invoice #${n}`,
  customer_id: customerId,
  date: "Issued whenever recorded",
  due_date: "Payment terms: on collection",
  status: "draft",
  total: null,
  created_at: null,
});
const quote = (n = 10): CustomerCommercialQuote => ({
  id: uuid(n),
  customer_id: customerId,
  quote_number: null,
  created_at: "2026-10-15T21:00:13.169187+00:00",
  expiry_date: null,
  status: "draft",
  total_amount: null,
});
const request = (kind: CustomerCommercialKind = "invoices") => ({
  expectedAccountId: accountId,
  customerId,
  kind,
});
let controller: AbortController;

function client({
  primary = { data: { id: customerId }, error: null },
  list = { data: [], error: null },
  onPrimary,
  onList,
  onOperation,
}: {
  primary?: Result | PromiseLike<Result>;
  list?: Result | PromiseLike<Result>;
  onPrimary?: () => void;
  onList?: () => void;
  onOperation?: (table: string, method: string) => void;
} = {}) {
  const operations: Operation[] = [];
  const dispatches: string[] = [];
  const from = vi.fn((table: string) => {
    const operation = (method: string, ...args: unknown[]) => {
      operations.push({ table, method, args });
      onOperation?.(table, method);
      return builder;
    };
    const builder = {
      select: (projection: string) => operation("select", projection),
      eq: (column: string, value: string) => operation("eq", column, value),
      order: (column: string, options: unknown) => operation("order", column, options),
      limit: (count: number) => operation("limit", count),
      abortSignal: (signal: AbortSignal) => operation("abortSignal", signal),
      maybeSingle: () => operation("maybeSingle"),
      then: <TResult1 = Result, TResult2 = never>(
        resolve?: ((result: Result) => TResult1 | PromiseLike<TResult1>) | null,
        reject?: ((error: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => {
        dispatches.push(table);
        return Promise.resolve(table === "customers" ? primary : list)
          .then((result) => {
            if (table === "customers") onPrimary?.();
            else onList?.();
            return result;
          })
          .then(resolve, reject);
      },
    };
    return builder;
  });
  const native = { from };
  return {
    schema: vi.fn((_name: string) => native),
    from,
    native,
    operations,
    dispatches,
    rpc: vi.fn(() => {
      throw new Error("Unexpected RPC fallback");
    }),
  };
}
function context(supabase: ReturnType<typeof client>, userId: unknown = accountId) {
  return { supabase, userId };
}
async function call(input: unknown, callerContext: unknown) {
  return (
    getCustomerCommercialSnapshot as unknown as (args: {
      data: unknown;
      context: unknown;
    }) => Promise<unknown>
  )({ data: input, context: callerContext });
}
function assertNoFallback(caller: ReturnType<typeof client>) {
  expect(caller.rpc).not.toHaveBeenCalled();
  expect(mocks.privileged).not.toHaveBeenCalled();
  expect(mocks.browser).not.toHaveBeenCalled();
}
function assertCustomerGate(caller: ReturnType<typeof client>) {
  expect(caller.schema).toHaveBeenCalledExactlyOnceWith("shop_manager");
  expect(caller.operations.filter((o) => o.table === "customers")).toEqual([
    { table: "customers", method: "select", args: ["id"] },
    { table: "customers", method: "eq", args: ["id", customerId] },
    { table: "customers", method: "abortSignal", args: [controller.signal] },
    { table: "customers", method: "maybeSingle", args: [] },
  ]);
  assertNoFallback(caller);
}
function assertList(caller: ReturnType<typeof client>, kind: CustomerCommercialKind) {
  assertCustomerGate(caller);
  expect(caller.dispatches).toEqual(["customers", kind]);
  expect(caller.operations.filter((o) => o.table === kind)).toEqual([
    { table: kind, method: "select", args: [projections[kind]] },
    { table: kind, method: "eq", args: ["customer_id", customerId] },
    { table: kind, method: "order", args: ["created_at", { ascending: false, nullsFirst: false }] },
    { table: kind, method: "order", args: ["id", { ascending: false }] },
    { table: kind, method: "limit", args: [26] },
    { table: kind, method: "abortSignal", args: [controller.signal] },
  ]);
}
beforeEach(() => {
  vi.clearAllMocks();
  controller = new AbortController();
  mocks.getRequest.mockReturnValue({ signal: controller.signal });
});

describe("authenticated customer commercial snapshot handler", () => {
  it("registers POST and the existing authentication middleware", () => {
    expect(mocks.methods).toEqual([{ method: "POST" }]);
    expect(mocks.middlewares).toEqual([[mocks.middleware]]);
  });
  it("rejects malformed or extra input before handler request/schema access", async () => {
    for (const input of [
      undefined,
      null,
      {},
      { ...request(), expectedAccountId: "not-uuid" },
      { ...request(), customerId: "legacy-customer" },
      { ...request(), kind: "payments" },
      { ...request(), limit: 10000 },
      { ...request(), table: "customer_communications" },
    ]) {
      const caller = client();
      await expect(call(input, context(caller))).rejects.toThrow(invalid);
      expect(caller.schema).not.toHaveBeenCalled();
      expect(caller.dispatches).toEqual([]);
      assertNoFallback(caller);
    }
    expect(mocks.getRequest).not.toHaveBeenCalled();
  });
  it("rejects wrong or absent actors before handler getRequest or schema access", async () => {
    for (const actor of [uuid(999), null, undefined, ""]) {
      const caller = client();
      const callerContext = actor === undefined ? undefined : context(caller, actor);
      await expect(call(request(), callerContext)).rejects.toThrow(changed);
      expect(caller.schema).not.toHaveBeenCalled();
      expect(caller.from).not.toHaveBeenCalled();
      assertNoFallback(caller);
    }
    expect(mocks.getRequest).not.toHaveBeenCalled();
  });
  it("rejects a pre-aborted request before schema dispatch without exposing its reason", async () => {
    controller.abort(new Error("PRIVATE reason"));
    const caller = client();
    await expect(call(request(), context(caller))).rejects.toThrow(failure);
    expect(caller.schema).not.toHaveBeenCalled();
    expect(caller.dispatches).toEqual([]);
    assertNoFallback(caller);
  });
  it("rechecks the actor after getRequest and after schema binding", async () => {
    const first = client();
    const firstContext = context(first);
    mocks.getRequest.mockImplementationOnce(() => {
      firstContext.userId = uuid(998);
      return { signal: controller.signal };
    });
    await expect(call(request(), firstContext)).rejects.toThrow(failure);
    expect(first.schema).not.toHaveBeenCalled();
    const second = client();
    const secondContext = context(second);
    second.schema.mockImplementationOnce(() => {
      secondContext.userId = uuid(997);
      return second.native;
    });
    await expect(call(request(), secondContext)).rejects.toThrow(failure);
    expect(second.from).not.toHaveBeenCalled();
    expect(second.dispatches).toEqual([]);
  });

  for (const kind of ["invoices", "quotes"] as const) {
    const row = () => (kind === "invoices" ? invoice() : quote());
    const rowsOf = (length: number) =>
      Array.from({ length }, (_, i) => (kind === "invoices" ? invoice(i + 100) : quote(i + 100)));
    it(`${kind}: uses the caller context, customer gate, fixed projection, stable order, bound and request signal`, async () => {
      const caller = client({ list: { data: [row()], error: null } });
      await expect(call(request(kind), context(caller))).resolves.toEqual({
        kind,
        available: true,
        rows: [row()],
        hasMore: false,
      });
      assertList(caller, kind);
      expect(caller.from.mock.calls).toEqual([["customers"], [kind]]);
    });
    it(`${kind}: distinguishes visible-empty from unavailable without a child dispatch`, async () => {
      const visible = client();
      await expect(call(request(kind), context(visible))).resolves.toEqual({
        kind,
        available: true,
        rows: [],
        hasMore: false,
      });
      assertList(visible, kind);
      const missing = client({ primary: { data: null, error: null } });
      await expect(call(request(kind), context(missing))).resolves.toEqual({
        kind,
        available: false,
        rows: [],
        hasMore: false,
      });
      assertCustomerGate(missing);
      expect(missing.dispatches).toEqual(["customers"]);
      expect(missing.from).toHaveBeenCalledExactlyOnceWith("customers");
    });
    it(`${kind}: rejects bad, mismatched, erroneous and rejected primary identities before downstream reads`, async () => {
      for (const primary of [
        { data: {}, error: null },
        { data: undefined, error: null },
        { data: { id: otherCustomer }, error: null },
        { data: { id: customerId, secret: "PRIVATE" }, error: null },
        { data: { id: customerId }, error: { message: "PRIVATE backend" } },
        Promise.reject(new Error("PRIVATE transport")),
      ]) {
        const caller = client({ primary });
        await expect(call(request(kind), context(caller))).rejects.toThrow(failure);
        expect(caller.dispatches).toEqual(["customers"]);
        expect(caller.from).toHaveBeenCalledTimes(1);
        assertNoFallback(caller);
      }
    });
    it(`${kind}: preserves order, caps display at25 and derives hasMore only from the26th row`, async () => {
      for (const length of [0, 1, 25, 26]) {
        const rows = rowsOf(length);
        const caller = client({ list: { data: rows, error: null } });
        await expect(call(request(kind), context(caller))).resolves.toEqual({
          kind,
          available: true,
          rows: rows.slice(0, 25),
          hasMore: length === 26,
        });
        assertList(caller, kind);
      }
    });
    it(`${kind}: rejects overbound, duplicate, wrong-customer and null-customer records, including the sentinel`, async () => {
      const duplicateSentinel = rowsOf(26);
      duplicateSentinel[25] = { ...duplicateSentinel[0] };
      const wrongSentinel = rowsOf(26);
      wrongSentinel[25] = { ...wrongSentinel[25], customer_id: otherCustomer };
      for (const rows of [
        rowsOf(27),
        duplicateSentinel,
        wrongSentinel,
        [row(), row()],
        [{ ...row(), customer_id: otherCustomer }],
        [{ ...row(), customer_id: null }],
      ]) {
        const caller = client({ list: { data: rows, error: null } });
        await expect(call(request(kind), context(caller))).rejects.toThrow(failure);
        assertList(caller, kind);
      }
    });
    it(`${kind}: rejects missing, extra, invalid numeric and malformed typed payloads instead of inventing an empty history`, async () => {
      const incomplete = { ...row() };
      delete (incomplete as { status?: string }).status;
      const amountKey = kind === "invoices" ? "total" : "total_amount";
      for (const payload of [
        null,
        undefined,
        {},
        [incomplete],
        [{ ...row(), attachments: "PRIVATE" }],
        [{ ...row(), id: null }],
        [{ ...row(), status: null }],
        [{ ...row(), [amountKey]: "1.25" }],
        [{ ...row(), [amountKey]: Infinity }],
        [{ ...row(), [amountKey]: NaN }],
        [{ ...row(), created_at: "2026-10-15" }],
      ]) {
        const caller = client({ list: { data: payload, error: null } });
        await expect(call(request(kind), context(caller))).rejects.toThrow(failure);
        assertList(caller, kind);
      }
    });
    it(`${kind}: validates every sentinel field before trimming it from the displayed summary`, async () => {
      const rows = rowsOf(26);
      const malformed = { ...rows[25] };
      delete (malformed as { status?: string }).status;
      rows[25] = malformed;
      const caller = client({ list: { data: rows, error: null } });
      await expect(call(request(kind), context(caller))).rejects.toThrow(failure);
      assertList(caller, kind);
    });
    it(`${kind}: compares customer UUID bindings case-insensitively without changing returned values`, async () => {
      const rows = [{ ...row(), customer_id: customerId.toUpperCase() }];
      const caller = client({
        primary: { data: { id: customerId.toUpperCase() }, error: null },
        list: { data: rows, error: null },
      });
      await expect(call(request(kind), context(caller))).resolves.toEqual({
        kind,
        available: true,
        rows,
        hasMore: false,
      });
      assertList(caller, kind);
    });
    it(`${kind}: hides list backend and transport diagnostics with no retry or broader fallback`, async () => {
      for (const list of [
        { data: [row()], error: { message: "PRIVATE backend" } },
        Promise.reject(new Error("PRIVATE transport")),
      ]) {
        const caller = client({ list });
        await expect(call(request(kind), context(caller))).rejects.toThrow(failure);
        assertList(caller, kind);
      }
    });
    it(`${kind}: rechecks actor after primary await before child construction/dispatch`, async () => {
      const caller = client({
        onPrimary: () => {
          callerContext.userId = uuid(996);
        },
      });
      const callerContext = context(caller);
      await expect(call(request(kind), callerContext)).rejects.toThrow(failure);
      expect(caller.dispatches).toEqual(["customers"]);
      expect(caller.from).toHaveBeenCalledTimes(1);
      assertNoFallback(caller);
    });
    it(`${kind}: rejects cancellation after primary await before child construction/dispatch`, async () => {
      const caller = client({ onPrimary: () => controller.abort(new Error("PRIVATE stop")) });
      await expect(call(request(kind), context(caller))).rejects.toThrow(failure);
      expect(caller.dispatches).toEqual(["customers"]);
      expect(caller.from).toHaveBeenCalledTimes(1);
      assertNoFallback(caller);
    });
    it(`${kind}: rechecks actor immediately before primary and list lazy dispatch`, async () => {
      const primary = client({
        onOperation: (table, method) => {
          if (table === "customers" && method === "maybeSingle") primaryContext.userId = uuid(995);
        },
      });
      const primaryContext = context(primary);
      await expect(call(request(kind), primaryContext)).rejects.toThrow(failure);
      expect(primary.dispatches).toEqual([]);
      const list = client({
        onOperation: (table, method) => {
          if (table === kind && method === "abortSignal") listContext.userId = uuid(994);
        },
      });
      const listContext = context(list);
      await expect(call(request(kind), listContext)).rejects.toThrow(failure);
      expect(list.dispatches).toEqual(["customers"]);
      assertNoFallback(primary);
      assertNoFallback(list);
    });
    it(`${kind}: checks actor and cancellation after the list await before returning rows`, async () => {
      const stopped = client({
        list: { data: [row()], error: null },
        onList: () => controller.abort(),
      });
      await expect(call(request(kind), context(stopped))).rejects.toThrow(failure);
      assertList(stopped, kind);
      controller = new AbortController();
      mocks.getRequest.mockReturnValue({ signal: controller.signal });
      const changedCaller = client({
        list: { data: [row()], error: null },
        onList: () => {
          changedContext.userId = uuid(993);
        },
      });
      const changedContext = context(changedCaller);
      await expect(call(request(kind), changedContext)).rejects.toThrow(failure);
      assertList(changedCaller, kind);
    });
  }

  it("invoices: preserves opaque TEXT IDs, legacy date text, case-distinct IDs, empty strings and finite amounts verbatim", async () => {
    const rows = [
      {
        ...invoice(),
        id: "INV A/ß ",
        date: " 15 Oct, handwritten ",
        due_date: "On pickup",
        status: "Legacy state",
        total: 1.23456789,
      },
      {
        ...invoice(),
        id: "inv a/ß ",
        date: "",
        due_date: "",
        created_at: "2026-10-15T21:00:13-05:00",
      },
      { ...invoice(), id: "", date: "Not an ISO date", total: 1e-25 },
      { ...invoice(), id: "long ".repeat(4000) },
    ];
    const caller = client({ list: { data: rows, error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      kind: "invoices",
      available: true,
      rows,
      hasMore: false,
    });
    assertList(caller, "invoices");
  });
  it("invoices: requires TEXT date/due_date/status and nullable valid offset timestamps without coercion", async () => {
    for (const row of [
      { ...invoice(), date: null },
      { ...invoice(), due_date: 123 },
      { ...invoice(), created_at: "2026-02-30T12:00:00Z" },
      { ...invoice(), created_at: "2026-10-15T12:00:00" },
      { ...invoice(), created_at: "2026-10-15T12:00:00+25:00" },
    ]) {
      const caller = client({ list: { data: [row], error: null } });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
    }
  });
  it("quotes: rejects duplicate UUID identities case-insensitively", async () => {
    const id = "00000000-0000-4000-8000-0000000000cd";
    const caller = client({
      list: {
        data: [
          { ...quote(), id },
          { ...quote(), id: id.toUpperCase() },
        ],
        error: null,
      },
    });
    await expect(call(request("quotes"), context(caller))).rejects.toThrow(failure);
    assertList(caller, "quotes");
  });
  it("quotes: preserves valid leap/calendar dates, nullable fields and offset timestamps", async () => {
    const rows = [
      { ...quote(), expiry_date: "2028-02-29", total_amount: 20.5 },
      { ...quote(11), expiry_date: "0001-01-01", created_at: "2026-10-15T21:00:13+08:00" },
      { ...quote(12), quote_number: "", expiry_date: null, total_amount: null },
    ];
    const caller = client({ list: { data: rows, error: null } });
    await expect(call(request("quotes"), context(caller))).resolves.toEqual({
      kind: "quotes",
      available: true,
      rows,
      hasMore: false,
    });
    assertList(caller, "quotes");
  });
  it("quotes: rejects invalid UUIDs, null created timestamps and impossible/non-date expiries including a sentinel", async () => {
    for (const patch of [
      { id: "legacy-quote" },
      { created_at: null },
      { created_at: "2026-02-30T12:00:00Z" },
      { expiry_date: "2026-02-29" },
      { expiry_date: "2026-04-31" },
      { expiry_date: "2026-13-01" },
      { expiry_date: "2026-10-15T00:00:00Z" },
      { expiry_date: "October 15" },
    ]) {
      const rows = Array.from({ length: 26 }, (_, i) => quote(i + 100));
      const payload: unknown[] = [...rows.slice(0, 25), { ...rows[25], ...patch }];
      const caller = client({ list: { data: payload, error: null } });
      await expect(call(request("quotes"), context(caller))).rejects.toThrow(failure);
      assertList(caller, "quotes");
    }
  });
});
