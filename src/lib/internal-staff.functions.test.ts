import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInternalStaff,
  deactivateInternalStaff,
  listInternalStaff,
  updateStaffManager,
} from "./internal-staff.functions";
import {
  managerChangeConfirmed,
  signInRestrictionConfirmed,
  STAFF_CHANGE_UNCONFIRMED,
  STAFF_CREATION_UNKNOWN,
  STAFF_DIRECTORY_UNAVAILABLE,
} from "./internal-staff-contract";

// Handler/returned-response contracts only. Middleware, HTTP/JWT, RLS, actual
// provider/Auth triggers, concurrent hierarchy, revocation and audit are NOT run.
const mocks = vi.hoisted(() => ({
  auth: { name: "required-auth" },
  registered: [] as unknown[][],
  from: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: unknown): unknown => data;
    const builder = {
      middleware: (m: unknown[]) => {
        mocks.registered.push(m);
        return builder;
      },
      inputValidator: (v: (data: unknown) => unknown) => {
        validate = v;
        return builder;
      },
      handler:
        (h: (args: { data: unknown; context: unknown }) => unknown) =>
        (args: { data: unknown; context: unknown }) =>
          h({ ...args, data: validate(args.data) }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: mocks.auth }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: mocks.from,
    auth: {
      admin: {
        createUser: mocks.createUser,
        updateUserById: mocks.updateUser,
        getUserById: mocks.getUser,
      },
    },
  },
}));
type Result = { data: unknown; error: unknown };
const ok = (data: unknown): Result => ({ data, error: null });
const id = (n: number) => "10000000-0000-4000-8000-" + String(n).padStart(12, "0");
const target = id(2),
  manager = id(3),
  actor = id(1),
  created = id(4);
const secret = "Private-provider-detail-not-for-response";
function query(result: Result) {
  const q = {
    select: vi.fn((_columns: string) => q),
    eq: vi.fn((_column: string, _value: unknown) => q),
    in: vi.fn((_column: string, _values: unknown[]) => q),
    update: vi.fn((_patch: unknown) => q),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return q;
}
function plans(...items: { table: string; result: Result; reject?: boolean }[]) {
  const qs = items.map((p) => {
    const q = query(p.result);
    if (p.reject) q.maybeSingle.mockRejectedValue(new Error(secret));
    return q;
  });
  let cursor = 0;
  mocks.from.mockImplementation((table: string) => {
    const index = cursor++;
    if (items[index]?.table !== table) throw new Error("Unexpected query/retry");
    return qs[index];
  });
  return qs;
}
function call(
  fn: unknown,
  data: unknown,
  role = ok({ role: "admin" }),
  claims: unknown = { email: "admin@365motorsales.com" },
) {
  const roleQuery = query(role),
    caller = { from: vi.fn(() => roleQuery) };
  const run = async () =>
    (fn as (a: { data: unknown; context: unknown }) => Promise<unknown>)({
      data,
      context: { supabase: caller, userId: actor, claims },
    });
  return { run, caller, roleQuery };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockImplementation(() => {
    throw new Error("Unplanned service query");
  });
  mocks.createUser.mockResolvedValue({
    data: { user: { id: created, email: "new@365motorsales.com" } },
    error: null,
  });
  mocks.updateUser.mockResolvedValue({
    data: { user: { id: target, banned_until: "2126-10-15T00:00:00Z" } },
    error: null,
  });
  mocks.getUser.mockImplementation(async (userId: string) => ({
    data: { user: { id: userId, email: "synthetic@365motorsales.com" } },
    error: null,
  }));
});

it("retains the required authentication middleware on all four handlers", () => {
  expect(mocks.registered).toHaveLength(4);
  for (const m of mocks.registered) expect(m).toEqual([mocks.auth]);
});
for (const [label, fn, input] of [
  ["manager", updateStaffManager, { userId: target, managerUserId: null }],
  [
    "create",
    createInternalStaff,
    {
      email: "new@365motorsales.com",
      fullName: "Synthetic",
      password: "Test-only-password!",
      managerUserId: manager,
    },
  ],
  ["sign-in", deactivateInternalStaff, { userId: target }],
] as const) {
  it.each([null, { role: "user" }, { role: "admin", error: true }])(
    "%s rejects unconfirmed admin role: " + label,
    async (row) => {
      const role =
        row && "error" in row ? { data: { role: "admin" }, error: { message: secret } } : ok(row);
      await expect(call(fn, input, role).run()).rejects.toThrow("Admin only");
      expect(mocks.from).not.toHaveBeenCalled();
      expect(mocks.createUser).not.toHaveBeenCalled();
      expect(mocks.updateUser).not.toHaveBeenCalled();
    },
  );
}
it.each([null, {}, { email: 42 }, { email: "admin@example.invalid" }])(
  "nonstaff/malformed claim rejects before service calls",
  async (claims) => {
    await expect(
      call(
        updateStaffManager,
        { userId: target, managerUserId: null },
        ok({ role: "admin" }),
        claims,
      ).run(),
    ).rejects.toThrow("Not permitted");
    expect(mocks.from).not.toHaveBeenCalled();
  },
);

describe("manager row acknowledgment", () => {
  it("requires exact returned identity/manager, selects receipt fields and returns only the acknowledgment", async () => {
    const qs = plans(
      { table: "profiles", result: ok({ id: manager, manager_user_id: null }) },
      { table: "profiles", result: ok({ id: target, manager_user_id: manager }) },
    );
    const c = call(updateStaffManager, { userId: target, managerUserId: manager });
    expect(await c.run()).toEqual({ ok: true, user_id: target, manager_user_id: manager });
    expect(qs[1].update).toHaveBeenCalledWith({ manager_user_id: manager });
    expect(qs[1].eq).toHaveBeenCalledWith("id", target);
    expect(qs[1].select).toHaveBeenCalledWith("id,manager_user_id");
    expect(c.caller.from).toHaveBeenCalledWith("user_roles");
  });
  it("supports explicit null manager without a hierarchy read", async () => {
    plans({ table: "profiles", result: ok({ id: target, manager_user_id: null }) });
    expect(
      await call(updateStaffManager, { userId: target.toUpperCase(), managerUserId: null }).run(),
    ).toEqual({ ok: true, user_id: target, manager_user_id: null });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it.each([
    null,
    [],
    {},
    { id: id(99), manager_user_id: null },
    { id: target, manager_user_id: manager },
    { id: target },
    { id: target, manager_user_id: null, extra: true },
  ])("zero/malformed/mismatched update is not success: %j", async (row) => {
    plans({ table: "profiles", result: ok(row) });
    await expect(
      call(updateStaffManager, { userId: target, managerUserId: null }).run(),
    ).rejects.toThrow(STAFF_CHANGE_UNCONFIRMED);
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it.each([
    null,
    {},
    [],
    { id: id(99), manager_user_id: null },
    { id: manager },
    { id: manager, manager_user_id: 7 },
  ])("unconfirmed hierarchy blocks BEFORE writing: %j", async (row) => {
    const [q] = plans({ table: "profiles", result: ok(row) });
    await expect(
      call(updateStaffManager, { userId: target, managerUserId: manager }).run(),
    ).rejects.toThrow(STAFF_CHANGE_UNCONFIRMED);
    expect(q.update).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("denies hierarchy errors even with data, and masks thrown provider details", async () => {
    plans({
      table: "profiles",
      result: { data: { id: manager, manager_user_id: null }, error: { message: secret } },
    });
    await expect(
      call(updateStaffManager, { userId: target, managerUserId: manager }).run(),
    ).rejects.toThrow(STAFF_CHANGE_UNCONFIRMED);
    plans({ table: "profiles", result: ok(null), reject: true });
    await expect(
      call(updateStaffManager, { userId: target, managerUserId: manager }).run(),
    ).rejects.toThrow(STAFF_CHANGE_UNCONFIRMED);
  });
  it("detects both a target cycle and an unrelated preexisting cycle without a write", async () => {
    plans({ table: "profiles", result: ok({ id: manager, manager_user_id: target }) });
    await expect(
      call(updateStaffManager, { userId: target, managerUserId: manager }).run(),
    ).rejects.toThrow(STAFF_CHANGE_UNCONFIRMED);
    plans(
      { table: "profiles", result: ok({ id: manager, manager_user_id: id(5) }) },
      { table: "profiles", result: ok({ id: id(5), manager_user_id: manager }) },
    );
    await expect(
      call(updateStaffManager, { userId: target, managerUserId: manager }).run(),
    ).rejects.toThrow(STAFF_CHANGE_UNCONFIRMED);
    expect(mocks.from).toHaveBeenCalledTimes(3);
  });
  for (const depth of [50, 51])
    it("bounds hierarchy at 50: chain length " + depth, async () => {
      const nodes = Array.from({ length: depth }, (_, i) => id(100 + i));
      plans(
        ...nodes.map((node, i) => ({
          table: "profiles",
          result: ok({ id: node, manager_user_id: nodes[i + 1] ?? null }),
        })),
        { table: "profiles", result: ok({ id: target, manager_user_id: nodes[0] }) },
      );
      const run = call(updateStaffManager, { userId: target, managerUserId: nodes[0] }).run();
      if (depth === 50) {
        await expect(run).resolves.toMatchObject({ ok: true });
        expect(mocks.from).toHaveBeenCalledTimes(51);
      } else {
        await expect(run).rejects.toThrow(STAFF_CHANGE_UNCONFIRMED);
        expect(mocks.from).toHaveBeenCalledTimes(50);
      }
    });
  it.each([
    { userId: target },
    { userId: "invalid", managerUserId: null },
    { userId: target, managerUserId: null, actor: actor },
  ])("invalid/extra input rejects before querying", async (input) => {
    const c = call(updateStaffManager, input);
    await expect(c.run()).rejects.toThrow();
    expect(c.caller.from).not.toHaveBeenCalled();
  });
});

describe("creation partial outcome", () => {
  const input = {
    email: "NEW@365motorsales.com",
    fullName: "Synthetic",
    password: "Test-only-password!",
    managerUserId: manager,
  };
  it("confirms exact profile row only; does not claim roles/org/audit provisioning", async () => {
    const [q] = plans({
      table: "profiles",
      result: ok({ id: created, manager_user_id: manager, full_name: "Synthetic" }),
    });
    expect(await call(createInternalStaff, input).run()).toEqual({
      user_id: created,
      email: "new@365motorsales.com",
      profileConfirmed: true,
    });
    expect(q.select).toHaveBeenCalledWith("id,manager_user_id,full_name");
    expect(mocks.createUser).toHaveBeenCalledTimes(1);
  });
  it.each([
    null,
    [],
    {},
    { id: id(99), manager_user_id: manager, full_name: "Synthetic" },
    { id: created, manager_user_id: null, full_name: "Synthetic" },
    { id: created, manager_user_id: manager, full_name: "Wrong" },
  ])("unconfirmed profile returns explicit partial state: %j", async (profile) => {
    plans({ table: "profiles", result: ok(profile) });
    expect(await call(createInternalStaff, input).run()).toEqual({
      user_id: created,
      email: "new@365motorsales.com",
      profileConfirmed: false,
    });
    expect(mocks.createUser).toHaveBeenCalledTimes(1);
  });
  it("profile failure after Auth commit stays partial without automatic retry or deletion", async () => {
    plans({ table: "profiles", result: ok(null), reject: true });
    expect(await call(createInternalStaff, input).run()).toMatchObject({ profileConfirmed: false });
    expect(mocks.createUser).toHaveBeenCalledTimes(1);
  });
  it.each([
    null,
    {},
    { id: created },
    { id: "bad", email: "new@365motorsales.com" },
    { id: created, email: "wrong@365motorsales.com" },
  ])("invalid Auth identity does not attempt a profile write: %j", async (user) => {
    mocks.createUser.mockResolvedValue({ data: { user }, error: null });
    await expect(call(createInternalStaff, input).run()).rejects.toThrow(STAFF_CREATION_UNKNOWN);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("Auth error/transport failure exposes only an unknown-outcome message", async () => {
    mocks.createUser.mockResolvedValue({
      data: { user: { id: created, email: "new@365motorsales.com" } },
      error: { message: secret },
    });
    await expect(call(createInternalStaff, input).run()).rejects.toThrow(STAFF_CREATION_UNKNOWN);
    mocks.createUser.mockRejectedValue(new Error(secret));
    await expect(call(createInternalStaff, input).run()).rejects.toThrow(STAFF_CREATION_UNKNOWN);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("sign-in restriction is not full offboarding", () => {
  it("requires matching provider identity and future restriction; returns explicit unverified sessions", async () => {
    expect(await call(deactivateInternalStaff, { userId: target }).run()).toEqual({
      ok: true,
      user_id: target,
      scope: "sign_in_restriction",
      existingSessions: "unverified",
    });
    expect(mocks.updateUser).toHaveBeenCalledWith(target, { ban_duration: "876000h" });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each([
    null,
    {},
    { id: id(99), banned_until: "2126-10-15T00:00:00Z" },
    { id: target },
    { id: target, banned_until: "invalid" },
    { id: target, banned_until: "2000-01-01T00:00:00Z" },
  ])("unconfirmed restriction denies success: %j", async (user) => {
    mocks.updateUser.mockResolvedValue({ data: { user }, error: null });
    await expect(call(deactivateInternalStaff, { userId: target }).run()).rejects.toThrow(
      STAFF_CHANGE_UNCONFIRMED,
    );
  });
  it("provider error with data and transport failure both deny without private details", async () => {
    mocks.updateUser.mockResolvedValue({
      data: { user: { id: target, banned_until: "2126-10-15T00:00:00Z" } },
      error: { message: secret },
    });
    await expect(call(deactivateInternalStaff, { userId: target }).run()).rejects.toThrow(
      STAFF_CHANGE_UNCONFIRMED,
    );
    mocks.updateUser.mockRejectedValue(new Error(secret));
    await expect(call(deactivateInternalStaff, { userId: target }).run()).rejects.toThrow(
      STAFF_CHANGE_UNCONFIRMED,
    );
  });
});

describe("directory completeness of selected responses", () => {
  const profile = {
    id: target,
    full_name: "Synthetic",
    avatar_url: null,
    manager_user_id: null,
    is_staff_account: true,
  };
  it("returns actual empty without inventing an error", async () => {
    plans({ table: "profiles", result: ok([]) });
    expect(await call(listInternalStaff, undefined).run()).toEqual([]);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("combines matching identities and role data", async () => {
    plans(
      { table: "profiles", result: ok([profile]) },
      { table: "user_roles", result: ok([{ user_id: target, role: "admin" }]) },
    );
    expect(await call(listInternalStaff, undefined).run()).toEqual([
      {
        user_id: target,
        full_name: "Synthetic",
        email: "synthetic@365motorsales.com",
        avatar_url: null,
        manager_user_id: null,
        is_admin: true,
      },
    ]);
  });
  it("role errors do not silently downgrade admins", async () => {
    plans(
      { table: "profiles", result: ok([profile]) },
      { table: "user_roles", result: { data: [], error: { message: secret } } },
    );
    await expect(call(listInternalStaff, undefined).run()).rejects.toThrow(
      STAFF_DIRECTORY_UNAVAILABLE,
    );
  });
  it.each([null, { id: id(99) }])(
    "missing/mismatched Auth response is not a partial staff list",
    async (user) => {
      plans({ table: "profiles", result: ok([profile]) }, { table: "user_roles", result: ok([]) });
      mocks.getUser.mockResolvedValue({ data: { user }, error: null });
      await expect(call(listInternalStaff, undefined).run()).rejects.toThrow(
        STAFF_DIRECTORY_UNAVAILABLE,
      );
    },
  );
  it("transport failure masks provider details", async () => {
    plans({ table: "profiles", result: ok([profile]) }, { table: "user_roles", result: ok([]) });
    mocks.getUser.mockRejectedValue(new Error(secret));
    await expect(call(listInternalStaff, undefined).run()).rejects.toThrow(
      STAFF_DIRECTORY_UNAVAILABLE,
    );
  });
});
it("client acknowledgments require exact target, manager and restriction scope", () => {
  expect(
    managerChangeConfirmed({ ok: true, user_id: target, manager_user_id: null }, target, null),
  ).toBe(true);
  expect(managerChangeConfirmed({ ok: true }, target, null)).toBe(false);
  expect(
    managerChangeConfirmed({ ok: true, user_id: id(99), manager_user_id: null }, target, null),
  ).toBe(false);
  expect(
    managerChangeConfirmed({ ok: true, user_id: target, manager_user_id: manager }, target, null),
  ).toBe(false);
  expect(
    signInRestrictionConfirmed(
      { ok: true, user_id: target, scope: "sign_in_restriction", existingSessions: "unverified" },
      target,
    ),
  ).toBe(true);
  expect(
    signInRestrictionConfirmed(
      { ok: true, user_id: target, scope: "sign_in_restriction", existingSessions: "revoked" },
      target,
    ),
  ).toBe(false);
});
