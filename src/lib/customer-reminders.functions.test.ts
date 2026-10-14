import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCustomerRemindersSnapshot } from "./customer-reminders.functions";
import type { CustomerReminder } from "./customer-reminders";

// Synthetic mocked handler/builder tests only. No real middleware, JWT, HTTP,
// PostgREST, RLS, production rows, catalog parity, atomic visibility or DB cancellation.
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
const shopId = "00000000-0000-4000-8000-0000000000cd";
const otherCustomer = uuid(3);
const otherShop = uuid(4);
const failure = "Could not load this customer's reminders snapshot. Refresh and try again.";
const invalid = "Invalid customer reminders snapshot request.";
const changed = "Account changed. Refresh before loading this customer's reminders.";
const projection = "id,customer_id,shop_id,reminder_type,title,notes,due_date,status,completed_at";
const row = (n = 10): CustomerReminder => ({
  id: uuid(n),
  customer_id: customerId,
  shop_id: shopId,
  reminder_type: "follow_up",
  title: "Review service estimate",
  notes: null,
  due_date: "2026-10-22",
  status: "pending",
  completed_at: null,
});
const rowsOf = (length: number) => Array.from({ length }, (_, i) => row(i + 100));
const request = () => ({ expectedAccountId: accountId, customerId });
let controller: AbortController;

function client({
  primary = { data: { id: customerId, shop_id: shopId }, error: null },
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
      select: (value: string) => operation("select", value),
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
    getCustomerRemindersSnapshot as unknown as (args: {
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
    { table: "customers", method: "select", args: ["id,shop_id"] },
    { table: "customers", method: "eq", args: ["id", customerId] },
    { table: "customers", method: "abortSignal", args: [controller.signal] },
    { table: "customers", method: "maybeSingle", args: [] },
  ]);
  assertNoFallback(caller);
}
function assertList(caller: ReturnType<typeof client>, expectedShop = shopId) {
  assertCustomerGate(caller);
  expect(caller.from.mock.calls).toEqual([["customers"], ["customer_reminders"]]);
  expect(caller.dispatches).toEqual(["customers", "customer_reminders"]);
  expect(caller.operations.filter((o) => o.table === "customer_reminders")).toEqual([
    { table: "customer_reminders", method: "select", args: [projection] },
    { table: "customer_reminders", method: "eq", args: ["customer_id", customerId] },
    { table: "customer_reminders", method: "eq", args: ["shop_id", expectedShop] },
    {
      table: "customer_reminders",
      method: "order",
      args: ["due_date", { ascending: true, nullsFirst: false }],
    },
    { table: "customer_reminders", method: "order", args: ["id", { ascending: true }] },
    { table: "customer_reminders", method: "limit", args: [101] },
    { table: "customer_reminders", method: "abortSignal", args: [controller.signal] },
  ]);
}
beforeEach(() => {
  vi.clearAllMocks();
  controller = new AbortController();
  mocks.getRequest.mockReturnValue({ signal: controller.signal });
});

describe("authenticated customer reminders snapshot handler", () => {
  it("registers POST and the existing authentication middleware", () => {
    expect(mocks.methods).toEqual([{ method: "POST" }]);
    expect(mocks.middlewares).toEqual([[mocks.middleware]]);
  });
  it("uses the caller client, strict parent identity/shop projection, dual filters, stable ascending order,101 bound and signals", async () => {
    const caller = client({ list: { data: [row()], error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows: [row()],
      hasMore: false,
    });
    assertList(caller);
  });
  it("derives the shop exclusively from the visible parent rather than a guessed/client shop", async () => {
    const rows = [{ ...row(), shop_id: otherShop }];
    const caller = client({
      primary: { data: { id: customerId, shop_id: otherShop }, error: null },
      list: { data: rows, error: null },
    });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows,
      hasMore: false,
    });
    assertList(caller, otherShop);
  });
  it("returns unavailable only for a null invisible parent, with no child read", async () => {
    const caller = client({ primary: { data: null, error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: false,
      rows: [],
      hasMore: false,
    });
    assertCustomerGate(caller);
    expect(caller.dispatches).toEqual(["customers"]);
    expect(caller.from).toHaveBeenCalledExactlyOnceWith("customers");
  });
  it("distinguishes a visible empty list from unavailable", async () => {
    const caller = client();
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows: [],
      hasMore: false,
    });
    assertList(caller);
  });
  it("rejects malformed, missing and extra input including client-supplied shop selectors before handler request/schema access", async () => {
    for (const input of [
      undefined,
      null,
      {},
      { customerId },
      { expectedAccountId: accountId },
      { ...request(), customerId: "legacy-customer" },
      { ...request(), expectedAccountId: "other-account" },
      { ...request(), shopId },
      { ...request(), shop_id: shopId },
      { ...request(), kind: "reminders" },
      { ...request(), limit: 10000 },
    ]) {
      const caller = client();
      await expect(call(input, context(caller))).rejects.toThrow(invalid);
      expect(caller.schema).not.toHaveBeenCalled();
      expect(caller.from).not.toHaveBeenCalled();
      assertNoFallback(caller);
    }
    expect(mocks.getRequest).not.toHaveBeenCalled();
  });
  it("rejects absent or wrong middleware actors before handler request/schema access", async () => {
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
    controller.abort(new Error("PRIVATE cancellation reason"));
    const caller = client();
    await expect(call(request(), context(caller))).rejects.toThrow(failure);
    expect(caller.schema).not.toHaveBeenCalled();
    expect(caller.dispatches).toEqual([]);
    assertNoFallback(caller);
  });

  const stages = [
    "request",
    "schema",
    "primary-build",
    "primary-await",
    "list-build",
    "list-await",
  ] as const;
  for (const boundary of ["actor", "cancellation"] as const) {
    it.each(stages)(
      `rechecks ${boundary} at %s before downstream dispatch or private return`,
      async (stage) => {
        const changeBoundary = () => {
          if (boundary === "actor") callerContext.userId = uuid(998);
          else controller.abort(new Error("PRIVATE boundary reason"));
        };
        const caller = client({
          list: { data: [row()], error: null },
          onPrimary: () => {
            if (stage === "primary-await") changeBoundary();
          },
          onList: () => {
            if (stage === "list-await") changeBoundary();
          },
          onOperation: (table, method) => {
            if (stage === "primary-build" && table === "customers" && method === "maybeSingle")
              changeBoundary();
            if (
              stage === "list-build" &&
              table === "customer_reminders" &&
              method === "abortSignal"
            )
              changeBoundary();
          },
        });
        const callerContext = context(caller);
        if (stage === "request")
          mocks.getRequest.mockImplementationOnce(() => {
            changeBoundary();
            return { signal: controller.signal };
          });
        if (stage === "schema")
          caller.schema.mockImplementationOnce(() => {
            changeBoundary();
            return caller.native;
          });
        await expect(call(request(), callerContext)).rejects.toThrow(failure);
        const dispatched =
          stage === "list-await"
            ? ["customers", "customer_reminders"]
            : stage === "primary-await" || stage === "list-build"
              ? ["customers"]
              : [];
        expect(caller.dispatches).toEqual(dispatched);
        if (stage === "request") expect(caller.schema).not.toHaveBeenCalled();
        if (stage === "request" || stage === "schema") expect(caller.from).not.toHaveBeenCalled();
        if (stage === "primary-await")
          expect(caller.from).toHaveBeenCalledExactlyOnceWith("customers");
        assertNoFallback(caller);
      },
    );
  }

  it("requires complete strict parent UUID id/shop fields, rejecting null/missing/mismatched bindings rather than guessing or marking unavailable", async () => {
    for (const payload of [
      undefined,
      [],
      {},
      { id: customerId },
      { shop_id: shopId },
      { id: customerId, shop_id: null },
      { id: customerId, shop_id: "" },
      { id: customerId, shop_id: "legacy-shop" },
      { id: null, shop_id: shopId },
      { id: otherCustomer, shop_id: shopId },
      { id: customerId, shop_id: shopId, secret: "PRIVATE" },
    ]) {
      const caller = client({ primary: { data: payload, error: null } });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      expect(caller.dispatches).toEqual(["customers"]);
      expect(caller.from).toHaveBeenCalledTimes(1);
      assertNoFallback(caller);
    }
  });
  it("hides primary backend/transport errors without downstream reads or fallback", async () => {
    for (const primary of [
      { data: { id: customerId, shop_id: shopId }, error: { message: "PRIVATE primary error" } },
      Promise.reject(new Error("PRIVATE transport")),
    ]) {
      const caller = client({ primary });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      expect(caller.dispatches).toEqual(["customers"]);
      expect(caller.from).toHaveBeenCalledTimes(1);
      assertNoFallback(caller);
    }
  });
  it("returns at most100 in received order with hasMore only for the101st sentinel", async () => {
    for (const length of [0, 1, 99, 100, 101]) {
      const rows = rowsOf(length);
      const caller = client({ list: { data: rows, error: null } });
      await expect(call(request(), context(caller))).resolves.toEqual({
        available: true,
        rows: rows.slice(0, 100),
        hasMore: length === 101,
      });
      assertList(caller);
    }
  });
  it("rejects over101 rather than silently trimming an unbounded response", async () => {
    const caller = client({ list: { data: rowsOf(102), error: null } });
    await expect(call(request(), context(caller))).rejects.toThrow(failure);
    assertList(caller);
  });
  it("rejects duplicate UUIDs case-insensitively, including duplicate sentinel IDs", async () => {
    const id = "00000000-0000-4000-8000-0000000000ef";
    const duplicateSentinel = rowsOf(101);
    duplicateSentinel[100] = { ...duplicateSentinel[0] };
    for (const rows of [
      [row(), row()],
      [
        { ...row(), id },
        { ...row(), id: id.toUpperCase() },
      ],
      duplicateSentinel,
    ]) {
      const caller = client({ list: { data: rows, error: null } });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      assertList(caller);
    }
  });
  it.each([
    ["customer_id", otherCustomer],
    ["customer_id", null],
    ["shop_id", otherShop],
    ["shop_id", null],
  ] as const)(
    "rejects child %s=%s in either a displayed row or the101st sentinel",
    async (field, value) => {
      for (const length of [1, 101]) {
        const rows = rowsOf(length);
        const payload: unknown[] = [
          ...rows.slice(0, length - 1),
          { ...rows[length - 1], [field]: value },
        ];
        const caller = client({ list: { data: payload, error: null } });
        await expect(call(request(), context(caller))).rejects.toThrow(failure);
        assertList(caller);
      }
    },
  );
  it("rejects incomplete and malformed sentinel fields before removing the overflow row", async () => {
    const incomplete = { ...row(999) };
    delete (incomplete as { notes?: string | null }).notes;
    for (const sentinel of [
      incomplete,
      { ...row(999), due_date: "2026-02-29" },
      { ...row(999), completed_at: "2026-10-15" },
      { ...row(999), title: null },
      { ...row(999), attachment: "PRIVATE" },
    ]) {
      const caller = client({ list: { data: [...rowsOf(100), sentinel], error: null } });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      assertList(caller);
    }
  });
  it("rejects malformed, incomplete and extra-field payloads without fabricating an empty list", async () => {
    const incomplete = { ...row() };
    delete (incomplete as { completed_at?: string | null }).completed_at;
    for (const payload of [
      null,
      undefined,
      {},
      [incomplete],
      [{ ...row(), created_by: "PRIVATE" }],
      [{ ...row(), id: "legacy-reminder" }],
      [{ ...row(), notes: 123 }],
      [{ ...row(), shop_id: "legacy-shop" }],
    ]) {
      const caller = client({ list: { data: payload, error: null } });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      assertList(caller);
    }
  });
  it.each(["id", "customer_id", "reminder_type", "title", "due_date", "status"] as const)(
    "rejects null required field %s",
    async (field) => {
      const caller = client({ list: { data: [{ ...row(), [field]: null }], error: null } });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      assertList(caller);
    },
  );
  it("preserves arbitrary/empty native type/title/status, nullable fields and long text without invented enums/caps/trimming", async () => {
    const rows = [
      {
        ...row(),
        reminder_type: "legacy custom type",
        status: "custom legacy workflow",
        title: "  Existing title  ",
      },
      { ...row(11), reminder_type: "", status: "", title: "", notes: "", completed_at: null },
      {
        ...row(12),
        reminder_type: "Type ".repeat(4000),
        status: "State ".repeat(4000),
        title: " Title ".repeat(4000),
        notes: " Existing note \n".repeat(10000),
      },
    ];
    const caller = client({ list: { data: rows, error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows,
      hasMore: false,
    });
    assertList(caller);
  });
  it("accepts real calendar dates and nullable valid offset completion timestamps", async () => {
    const rows = [
      { ...row(), due_date: "2028-02-29", completed_at: "2028-02-29T12:34:56Z" },
      { ...row(11), due_date: "0001-01-01", completed_at: "2026-10-15T21:31:01.123456+08:00" },
      { ...row(12), completed_at: null },
    ];
    const caller = client({ list: { data: rows, error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows,
      hasMore: false,
    });
    assertList(caller);
  });
  it("rejects impossible/non-calendar due dates and date-only/local/invalid completion timestamps", async () => {
    for (const patch of [
      { due_date: "2026-02-29" },
      { due_date: "2026-04-31" },
      { due_date: "2026-10-15T00:00:00Z" },
      { due_date: "October 15" },
      { completed_at: "2026-10-15" },
      { completed_at: "2026-10-15T12:00:00" },
      { completed_at: "2026-02-30T12:00:00Z" },
      { completed_at: "2026-10-15T12:00:00+25:00" },
    ]) {
      const caller = client({ list: { data: [{ ...row(), ...patch }], error: null } });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      assertList(caller);
    }
  });
  it("compares UUID scope case-insensitively without changing the returned records or visible parent shop", async () => {
    const rows = [
      { ...row(), customer_id: customerId.toUpperCase(), shop_id: shopId.toUpperCase() },
    ];
    const caller = client({
      primary: {
        data: { id: customerId.toUpperCase(), shop_id: shopId.toUpperCase() },
        error: null,
      },
      list: { data: rows, error: null },
    });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows,
      hasMore: false,
    });
    assertList(caller, shopId.toUpperCase());
  });
  it("hides list backend/transport errors without automatic retry or a broader reader", async () => {
    for (const list of [
      { data: [row()], error: { message: "PRIVATE list error" } },
      Promise.reject(new Error("PRIVATE transport")),
    ]) {
      const caller = client({ list });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      assertList(caller);
    }
  });
});
