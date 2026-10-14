import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCustomerDetailSnapshot } from "./customer-detail.functions";
import type { CustomerDetail, CustomerDetailKind } from "./customer-detail";

// Mocked handler/builder contracts only. No actual authentication middleware,
// HTTP cancellation, PostgreSQL query, live RLS or production parity is proved.
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
const customerId = uuid(2);
const otherCustomer = uuid(3);
const failure = "Could not load this customer snapshot. Refresh and try again.";
const invalid = "Invalid customer snapshot request.";
const changed = "Account changed. Refresh before loading this customer.";
const projections = {
  customer:
    "id,first_name,last_name,email,phone,address,city,state,postal_code,country,company,notes,is_fleet,fleet_company,business_type,business_email,business_phone,communication_preference,referral_source,created_at",
  vehicles: "id,customer_id,make,model,year,vin,license_plate,color,last_service_date",
  work_orders:
    "id,customer_id,work_order_number,status,description,total_cost,created_at,vehicle_id",
} as const;
const customer = (): CustomerDetail => ({
  id: customerId,
  first_name: "Customer",
  last_name: null,
  email: null,
  phone: null,
  address: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  company: null,
  notes: null,
  is_fleet: null,
  fleet_company: null,
  business_type: null,
  business_email: null,
  business_phone: null,
  communication_preference: null,
  referral_source: null,
  created_at: "2026-10-15T20:37:54+08:00",
});
const vehicle = (n = 10) => ({
  id: uuid(n),
  customer_id: customerId,
  make: "Toyota",
  model: "Vios",
  year: 2020,
  vin: null,
  license_plate: null,
  color: null,
  last_service_date: null,
});
const workOrder = (n = 10) => ({
  id: uuid(n),
  customer_id: customerId,
  work_order_number: null,
  status: "open",
  description: null,
  total_cost: null,
  created_at: "2026-10-15T20:37:54Z",
  vehicle_id: null,
});
const request = (kind: CustomerDetailKind = "customer") => ({
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
}: {
  primary?: Result | PromiseLike<Result>;
  list?: Result | PromiseLike<Result>;
  onPrimary?: () => void;
  onList?: () => void;
} = {}) {
  const operations: Operation[] = [];
  const dispatches: string[] = [];
  const from = vi.fn((table: string) => {
    const operation = (method: string, ...args: unknown[]) => {
      operations.push({ table, method, args });
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
    getCustomerDetailSnapshot as unknown as (args: {
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
function assertCustomerGate(caller: ReturnType<typeof client>, projection = "id") {
  expect(caller.schema).toHaveBeenCalledExactlyOnceWith("shop_manager");
  expect(caller.operations.filter((o) => o.table === "customers")).toEqual([
    { table: "customers", method: "select", args: [projection] },
    { table: "customers", method: "eq", args: ["id", customerId] },
    { table: "customers", method: "abortSignal", args: [controller.signal] },
    { table: "customers", method: "maybeSingle", args: [] },
  ]);
  assertNoFallback(caller);
}
function assertList(caller: ReturnType<typeof client>, kind: "vehicles" | "work_orders") {
  assertCustomerGate(caller);
  expect(caller.dispatches).toEqual(["customers", kind]);
  expect(caller.operations.filter((o) => o.table === kind)).toEqual([
    { table: kind, method: "select", args: [projections[kind]] },
    { table: kind, method: "eq", args: ["customer_id", customerId] },
    { table: kind, method: "order", args: ["created_at", { ascending: false, nullsFirst: false }] },
    { table: kind, method: "order", args: ["id", { ascending: false }] },
    { table: kind, method: "limit", args: [101] },
    { table: kind, method: "abortSignal", args: [controller.signal] },
  ]);
}
beforeEach(() => {
  vi.clearAllMocks();
  controller = new AbortController();
  mocks.getRequest.mockReturnValue({ signal: controller.signal });
});

describe("authenticated native customer detail snapshot handler", () => {
  it("registers POST and the existing authentication middleware", () => {
    expect(mocks.methods).toEqual([{ method: "POST" }]);
    expect(mocks.middlewares).toEqual([[mocks.middleware]]);
  });
  it("uses the complete fixed customer projection on only the current context schema/client", async () => {
    const row = customer();
    row.notes = "Legitimate long existing note ".repeat(800);
    const caller = client({ primary: { data: row, error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      kind: "customer",
      customer: row,
    });
    assertCustomerGate(caller, projections.customer);
    expect(caller.dispatches).toEqual(["customers"]);
  });
  it("returns a missing primary as null without downstream reads", async () => {
    const caller = client({ primary: { data: null, error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      kind: "customer",
      customer: null,
    });
    assertCustomerGate(caller, projections.customer);
    expect(caller.from).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed input before request/client/schema access", async () => {
    for (const input of [
      undefined,
      null,
      {},
      { ...request(), expectedAccountId: "not-uuid" },
      { ...request(), customerId: "not-uuid" },
      { ...request(), kind: "arbitrary" },
      { ...request(), table: "private_table" },
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
  it("rejects wrong or absent middleware actors before getRequest or schema binding", async () => {
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
  it("fails a pre-aborted request before schema/table access without exposing its private reason", async () => {
    controller.abort(new Error("PRIVATE cancellation reason"));
    const caller = client();
    await expect(call(request(), context(caller))).rejects.toThrow(failure);
    expect(mocks.getRequest).toHaveBeenCalledTimes(1);
    expect(caller.schema).not.toHaveBeenCalled();
    expect(caller.dispatches).toEqual([]);
    assertNoFallback(caller);
  });
  it("rechecks the actor after getRequest and after schema binding before dispatch", async () => {
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
  it("rejects malformed, incomplete, extra-field and mismatched customer records with generic diagnostics", async () => {
    const incomplete = { ...customer() };
    delete (incomplete as Partial<ReturnType<typeof customer>>).email;
    for (const payload of [
      undefined,
      [],
      incomplete,
      { ...customer(), id: otherCustomer },
      { ...customer(), internal_secret: "PRIVATE" },
      { ...customer(), created_at: null },
      { ...customer(), created_at: "2026-10-15" },
      { ...customer(), is_fleet: "false" },
    ]) {
      const caller = client({ primary: { data: payload, error: null } });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      expect(caller.dispatches).toEqual(["customers"]);
      assertNoFallback(caller);
    }
  });
  it("rejects raw primary errors and rejected requests without retries or fallbacks", async () => {
    for (const primary of [
      { data: customer(), error: { message: "PRIVATE diagnostic" } },
      Promise.reject(new Error("PRIVATE transport")),
    ]) {
      const caller = client({ primary });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      expect(caller.dispatches).toEqual(["customers"]);
      assertNoFallback(caller);
    }
  });

  for (const kind of ["vehicles", "work_orders"] as const) {
    const row = () => (kind === "vehicles" ? vehicle() : workOrder());
    it(`${kind}: gates by visible customer then uses exact fixed projection, selectors, bounds, stable ordering and signals`, async () => {
      const caller = client({ list: { data: [row()], error: null } });
      await expect(call(request(kind), context(caller))).resolves.toEqual({
        kind,
        available: true,
        rows: [row()],
        hasMore: false,
      });
      assertList(caller, kind);
    });
    it(`${kind}: distinguishes visible-empty from unavailable and never dispatches after a missing primary`, async () => {
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
      expect(missing.dispatches).toEqual(["customers"]);
      expect(missing.from).toHaveBeenCalledExactlyOnceWith("customers");
      assertCustomerGate(missing);
    });
    it(`${kind}: rejects erroneous, malformed or mismatched visible-customer identities before list dispatch`, async () => {
      for (const primary of [
        { data: { id: customerId }, error: { message: "PRIVATE" } },
        { data: { id: otherCustomer }, error: null },
        { data: { id: customerId, extra: "PRIVATE" }, error: null },
        { data: undefined, error: null },
        { data: {}, error: null },
      ]) {
        const caller = client({ primary });
        await expect(call(request(kind), context(caller))).rejects.toThrow(failure);
        expect(caller.dispatches).toEqual(["customers"]);
        expect(caller.from).toHaveBeenCalledTimes(1);
        assertNoFallback(caller);
      }
    });
    it(`${kind}: returns at most 100 records with a 101st sentinel and honest hasMore`, async () => {
      for (const length of [0, 1, 100, 101]) {
        const rows = Array.from({ length }, (_, i) =>
          kind === "vehicles" ? vehicle(i + 100) : workOrder(i + 100),
        );
        const caller = client({ list: { data: rows, error: null } });
        await expect(call(request(kind), context(caller))).resolves.toEqual({
          kind,
          available: true,
          rows: rows.slice(0, 100),
          hasMore: length === 101,
        });
        assertList(caller, kind);
      }
    });
    it(`${kind}: rejects >101 records, duplicate IDs including the sentinel, wrong customers and null customer bindings`, async () => {
      const tooMany = Array.from({ length: 102 }, (_, i) => ({ ...row(), id: uuid(i + 100) }));
      const duplicateSentinel = tooMany.slice(0, 101);
      duplicateSentinel[100] = { ...duplicateSentinel[0] };
      for (const rows of [
        tooMany,
        duplicateSentinel,
        [row(), row()],
        [{ ...row(), customer_id: otherCustomer }],
        [{ ...row(), customer_id: null }],
      ]) {
        const caller = client({ list: { data: rows, error: null } });
        await expect(call(request(kind), context(caller))).rejects.toThrow(failure);
        assertList(caller, kind);
      }
    });
    it(`${kind}: rejects incomplete, extra-field and invalid typed rows instead of guessing an empty list`, async () => {
      const incomplete = { ...row() };
      delete (incomplete as { id?: string }).id;
      const badTyped =
        kind === "vehicles"
          ? { ...vehicle(), year: 2020.5 }
          : { ...workOrder(), total_cost: "1.25" };
      const badDate =
        kind === "vehicles"
          ? { ...vehicle(), last_service_date: "2026-10-15" }
          : { ...workOrder(), created_at: "2026-10-15" };
      for (const payload of [
        null,
        undefined,
        {},
        [incomplete],
        [{ ...row(), attachments: "PRIVATE" }],
        [badTyped],
        [badDate],
      ]) {
        const caller = client({ list: { data: payload, error: null } });
        await expect(call(request(kind), context(caller))).rejects.toThrow(failure);
        assertList(caller, kind);
      }
    });
    it(`${kind}: rejects list backend/transport errors without retries or alternate readers`, async () => {
      for (const list of [
        { data: [row()], error: { message: "PRIVATE backend" } },
        Promise.reject(new Error("PRIVATE transport")),
      ]) {
        const caller = client({ list });
        await expect(call(request(kind), context(caller))).rejects.toThrow(failure);
        assertList(caller, kind);
      }
    });
    it(`${kind}: rechecks actor after primary await and suppresses downstream dispatch on context loss`, async () => {
      const caller = client({
        onPrimary: () => {
          callerContext.userId = uuid(995);
        },
      });
      const callerContext = context(caller);
      await expect(call(request(kind), callerContext)).rejects.toThrow(failure);
      expect(caller.dispatches).toEqual(["customers"]);
      expect(caller.from).toHaveBeenCalledTimes(1);
      assertNoFallback(caller);
    });
    it(`${kind}: request cancellation after primary await prevents list dispatch`, async () => {
      const caller = client({ onPrimary: () => controller.abort(new Error("PRIVATE stop")) });
      await expect(call(request(kind), context(caller))).rejects.toThrow(failure);
      expect(caller.dispatches).toEqual(["customers"]);
      expect(caller.from).toHaveBeenCalledTimes(1);
      assertNoFallback(caller);
    });
    it(`${kind}: checks cancellation and actor again after the awaited list before returning private rows`, async () => {
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
          changedContext.userId = uuid(996);
        },
      });
      const changedContext = context(changedCaller);
      await expect(call(request(kind), changedContext)).rejects.toThrow(failure);
      assertList(changedCaller, kind);
    });
  }
});
