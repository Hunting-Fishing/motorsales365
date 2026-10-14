import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  addBusinessStaffByEmail,
  removeBusinessStaff,
  updateBusinessStaff,
} from "./business-staff.functions";

// Handler-contract tests only: no live Supabase, JWT, middleware execution or
// database authorization proof. The real caller's client remains in every write.
const mocks = vi.hoisted(() => ({
  authMiddleware: { name: "requireSupabaseAuth" },
  middlewares: [] as unknown[][],
  enforceLimit: vi.fn(),
  listUsers: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: unknown): unknown => data;
    const builder = {
      middleware: (middlewares: unknown[]) => {
        mocks.middlewares.push(middlewares);
        return builder;
      },
      inputValidator: (validator: (data: unknown) => unknown) => {
        validate = validator;
        return builder;
      },
      handler:
        (handler: (args: { data: unknown; context: unknown }) => unknown) =>
        (args: { data: unknown; context: unknown }) =>
          handler({ ...args, data: validate(args.data) }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: mocks.authMiddleware,
}));
vi.mock("@/lib/business-plan-enforcement.server", () => ({
  enforceLimit: mocks.enforceLimit,
  planLimitErrorPayload: () => ({ code: "plan_limit" }),
  PlanLimitError: class extends Error {},
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { auth: { admin: { listUsers: mocks.listUsers } } },
}));

type Result = { data: unknown; error: unknown };
type QueryBuilder = {
  select: Mock<(columns: string) => QueryBuilder>;
  eq: Mock<(column: string, value: unknown) => QueryBuilder>;
  update: Mock<(patch: unknown) => QueryBuilder>;
  delete: Mock<() => QueryBuilder>;
  upsert: Mock<(row: unknown, options: unknown) => QueryBuilder>;
  maybeSingle: Mock<() => Promise<Result>>;
  then: (
    resolve: (value: Result) => unknown,
    reject?: (error: unknown) => unknown,
  ) => Promise<unknown>;
};
const businessId = "business-a";
const staffId = "staff-a";
const actor = "manager-a";
const target = "employee-a";
const message = "Staff change could not be confirmed. Refresh the roster before trying again.";
const ok = (data: unknown): Result => ({ data, error: null });

function query(result: Result): QueryBuilder {
  const builder: QueryBuilder = {
    select: vi.fn((_columns: string) => builder),
    eq: vi.fn((_column: string, _value: unknown) => builder),
    update: vi.fn((_patch: unknown) => builder),
    delete: vi.fn(() => builder),
    upsert: vi.fn((_row: unknown, _options: unknown) => builder),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: Result) => unknown, reject?: (error: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}
function client(plans: { table: string; query: ReturnType<typeof query> }[], manager = ok(true)) {
  let next = 0;
  return {
    rpc: vi.fn(async () => manager),
    from: vi.fn((table: string) => {
      const plan = plans[next++];
      if (!plan || plan.table !== table) throw new Error("Unexpected query or retry");
      return plan.query;
    }),
  };
}
function call(fn: unknown, data: unknown, supabase: ReturnType<typeof client>, userId = actor) {
  return (
    fn as (args: {
      data: unknown;
      context: { supabase: ReturnType<typeof client>; userId: string };
    }) => Promise<unknown>
  )({ data, context: { supabase, userId } });
}
function updateCase(result: Result, manager = ok(true), userId = actor) {
  const lookup = query(ok({ user_id: target }));
  const mutation = query(result);
  const supabase = client(
    [
      { table: "business_staff", query: lookup },
      { table: "business_staff", query: mutation },
    ],
    manager,
  );
  return {
    supabase,
    mutation,
    lookup,
    run: (patch = { on_shift: true }) =>
      call(updateBusinessStaff, { businessId, staffId, ...patch }, supabase, userId),
  };
}
function removeCase(result: Result, manager = ok(true)) {
  const mutation = query(result);
  const supabase = client([{ table: "business_staff", query: mutation }], manager);
  return {
    supabase,
    mutation,
    run: () => call(removeBusinessStaff, { businessId, staffId }, supabase),
  };
}
function invitationCase(result: Result, manager = ok(true)) {
  const business = query(ok({ owner_id: "owner-a" }));
  const mutation = query(result);
  const supabase = client(
    [
      { table: "businesses", query: business },
      { table: "business_staff", query: mutation },
    ],
    manager,
  );
  return {
    supabase,
    mutation,
    business,
    run: () =>
      call(
        addBusinessStaffByEmail,
        { businessId, email: "EMPLOYEE@example.test", role: "driver" },
        supabase,
      ),
  };
}
const cases = [
  ["update", updateCase, "update", 2],
  ["remove", removeCase, "delete", 1],
  ["invitation upsert", invitationCase, "upsert", 2],
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enforceLimit.mockResolvedValue(undefined);
  mocks.listUsers.mockResolvedValue({
    data: { users: [{ id: target, email: "employee@example.test" }] },
    error: null,
  });
});

describe("business staff mutation confirmation", () => {
  it("retains the required authentication middleware registration", () => {
    expect(mocks.middlewares.length).toBeGreaterThanOrEqual(3);
    for (const middleware of mocks.middlewares) {
      expect(middleware).toEqual([mocks.authMiddleware]);
    }
  });

  it("confirms a driver's own shift using the original client without manager escalation", async () => {
    const flow = updateCase(ok([{ id: staffId }]), ok(false), target);
    await expect(flow.run()).resolves.toEqual({ ok: true });
    expect(flow.supabase.rpc).not.toHaveBeenCalled();
    expect(flow.lookup.select).toHaveBeenCalledWith("user_id");
    expect(flow.lookup.eq.mock.calls).toEqual([
      ["id", staffId],
      ["business_id", businessId],
    ]);
    expect(flow.mutation.update).toHaveBeenCalledExactlyOnceWith({ on_shift: true });
    expect(flow.mutation.eq.mock.calls).toEqual([
      ["id", staffId],
      ["business_id", businessId],
    ]);
    expect(flow.mutation.select).toHaveBeenCalledExactlyOnceWith("id");
    expect(mocks.listUsers).not.toHaveBeenCalled();
  });

  it("preserves a manager's role/title/active workflow and scoped returned id", async () => {
    const flow = updateCase(ok([{ id: staffId }]));
    await expect(
      call(
        updateBusinessStaff,
        { businessId, staffId, role: "mechanic", title: "Technician", active: true },
        flow.supabase,
      ),
    ).resolves.toEqual({ ok: true });
    expect(flow.supabase.rpc).toHaveBeenCalledExactlyOnceWith("has_business_role", {
      _user: actor,
      _business: businessId,
      _role: "manager",
    });
    expect(flow.mutation.update).toHaveBeenCalledExactlyOnceWith({
      role: "mechanic",
      title: "Technician",
      active: true,
    });
    expect(flow.mutation.eq.mock.calls).toEqual([
      ["id", staffId],
      ["business_id", businessId],
    ]);
    expect(flow.mutation.select).toHaveBeenCalledExactlyOnceWith("id");
  });

  it("does not treat self promotion plus shift as a self-service shift operation", async () => {
    const flow = updateCase(ok([{ id: staffId }]), ok(false), target);
    await expect(
      call(
        updateBusinessStaff,
        { businessId, staffId, role: "owner", on_shift: true },
        flow.supabase,
        target,
      ),
    ).rejects.toThrow("Forbidden");
    expect(flow.supabase.from).toHaveBeenCalledTimes(1);
    expect(flow.mutation.update).not.toHaveBeenCalled();
  });

  it("preserves authorized deletion with both business and staff filters", async () => {
    const flow = removeCase(ok([{ id: staffId }]));
    await expect(flow.run()).resolves.toEqual({ ok: true });
    expect(flow.supabase.rpc).toHaveBeenCalledExactlyOnceWith("has_business_role", {
      _user: actor,
      _business: businessId,
      _role: "manager",
    });
    expect(flow.mutation.delete).toHaveBeenCalledExactlyOnceWith();
    expect(flow.mutation.eq.mock.calls).toEqual([
      ["id", staffId],
      ["business_id", businessId],
    ]);
    expect(flow.mutation.select).toHaveBeenCalledExactlyOnceWith("id");
  });

  it("preserves manager invitation/upsert with the authenticated writer and bounded admin lookup", async () => {
    const flow = invitationCase(ok([{ id: staffId }]));
    await expect(flow.run()).resolves.toEqual({ ok: true });
    expect(flow.supabase.rpc).toHaveBeenCalledExactlyOnceWith("has_business_role", {
      _user: actor,
      _business: businessId,
      _role: "manager",
    });
    expect(mocks.enforceLimit).toHaveBeenCalledExactlyOnceWith(
      flow.supabase,
      businessId,
      "staff",
      actor,
    );
    expect(mocks.listUsers).toHaveBeenCalledExactlyOnceWith({ page: 1, perPage: 200 });
    expect(flow.mutation.upsert).toHaveBeenCalledExactlyOnceWith(
      {
        business_id: businessId,
        user_id: target,
        role: "driver",
        title: null,
        duties: [],
        active: true,
        invited_by: actor,
      },
      { onConflict: "business_id,user_id" },
    );
    expect(flow.mutation.select).toHaveBeenCalledExactlyOnceWith("id");
    expect(flow.supabase.from.mock.calls).toEqual([["businesses"], ["business_staff"]]);
  });

  for (const [name, factory, method, queryCount] of cases) {
    it.each([false, "true", 1, { allowed: true }, [], null])(
      `${name} requires an actual boolean manager authorization, not %j`,
      async (value) => {
        const flow = factory(ok([{ id: staffId }]), ok(value));
        await expect(flow.run()).rejects.toThrow("Forbidden");
        expect(flow.mutation[method]).not.toHaveBeenCalled();
        expect(flow.supabase.from).toHaveBeenCalledTimes(name === "update" ? 1 : 0);
        expect(mocks.listUsers).not.toHaveBeenCalled();
      },
    );

    for (const [label, data] of [
      ["zero affected rows", []],
      ["missing returned rows", null],
      ["multiple returned rows", [{ id: staffId }, { id: "unexpected" }]],
      ["invalid returned id", [{}]],
    ] as const) {
      it(`${name} rejects ${label} without false success or a retry`, async () => {
        const flow = factory(ok(data));
        await expect(flow.run()).rejects.toThrow(message);
        expect(flow.supabase.from).toHaveBeenCalledTimes(queryCount);
        expect(flow.mutation[method]).toHaveBeenCalledTimes(1);
        expect(flow.mutation.select).toHaveBeenCalledExactlyOnceWith("id");
      });
    }

    it(`${name} propagates the database error without retrying`, async () => {
      const error = { code: "42501", message: "Database denied this write" };
      const flow = factory({ data: [{ id: staffId }], error });
      await expect(flow.run()).rejects.toBe(error);
      expect(flow.supabase.from).toHaveBeenCalledTimes(queryCount);
      expect(flow.mutation[method]).toHaveBeenCalledTimes(1);
    });

    it(`${name} propagates manager lookup failure before mutation`, async () => {
      const error = { code: "08006", message: "Authorization lookup failed" };
      const flow = factory(ok([{ id: staffId }]), { data: false, error });
      await expect(flow.run()).rejects.toBe(error);
      expect(flow.mutation[method]).not.toHaveBeenCalled();
    });
  }

  for (const [name, factory] of [
    ["update", updateCase],
    ["remove", removeCase],
  ] as const) {
    it(`${name} rejects a returned id outside the requested staff scope`, async () => {
      const flow = factory(ok([{ id: "other-staff" }]));
      await expect(flow.run()).rejects.toThrow(message);
      expect(flow.supabase.from).toHaveBeenCalledTimes(name === "update" ? 2 : 1);
    });
  }

  it("propagates the scoped staff lookup error before update", async () => {
    const error = { code: "08006", message: "Staff lookup failed" };
    const lookup = query({ data: null, error });
    const supabase = client([{ table: "business_staff", query: lookup }]);
    await expect(
      call(updateBusinessStaff, { businessId, staffId, on_shift: true }, supabase),
    ).rejects.toBe(error);
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("rejects an unavailable staff row before mutation", async () => {
    const lookup = query(ok(null));
    const supabase = client([{ table: "business_staff", query: lookup }]);
    await expect(
      call(updateBusinessStaff, { businessId, staffId, on_shift: true }, supabase),
    ).rejects.toThrow("Not found");
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("propagates the invitation business lookup error before upsert", async () => {
    const error = { code: "08006", message: "Business lookup failed" };
    const business = query({ data: null, error });
    const supabase = client([{ table: "businesses", query: business }]);
    await expect(
      call(
        addBusinessStaffByEmail,
        { businessId, email: "employee@example.test", role: "driver" },
        supabase,
      ),
    ).rejects.toBe(error);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});
