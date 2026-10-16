// Actual assignment handler and unchanged caller guard; all SDK/Auth/audit
// responses are synthetic. No real JWT, org authority, transaction or race proof.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assignLead } from "./leads.functions";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  audit: vi.fn(),
  afterAudit: vi.fn(),
  validated: null as unknown,
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (value: unknown) => value;
    const builder = {
      middleware: () => builder,
      inputValidator: (fn: typeof validate) => {
        validate = fn;
        return builder;
      },
      handler:
        (fn: (args: { data: unknown; context: unknown }) => unknown) =>
        (args: { data: unknown; context: unknown }) => {
          const data = validate(args.data);
          mocks.validated = data;
          return fn({ ...args, data });
        },
    };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocks.request }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/route-audit.server", () => ({
  withRouteAudit: async (args: { check?: () => unknown; run: () => unknown }) => {
    mocks.audit(args);
    await args.check?.();
    const result = await args.run();
    mocks.afterAudit();
    return result;
  },
}));
type Response = { data: unknown; error: unknown };
type Stage = "primary" | "actor" | "manager" | "assignee" | "update";
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const account = uid(1),
  org = uid(2),
  lead = uid(3),
  member = uid(4);
const token = "fixture.access.token";
const failure = "Could not assign this lead. Refresh and try again.";
const uncertain =
  "Assignment outcome could not be confirmed. Review this lead before assigning again.";
const input = () => ({
  id: lead,
  userId: member as string | null,
  expectedAccountId: account,
  expectedOrgId: org,
});
const receipt = (assigned_to: string | null = member) => ({
  id: lead,
  organization_id: org,
  assigned_to,
});
let controller: AbortController;
const currentRequest = () => ({
  signal: controller.signal,
  headers: new Headers({ authorization: `Bearer ${token}` }),
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function client(
  options: {
    responses?: Partial<Record<Stage, Response | Promise<Response>>>;
    onResult?: (stage: Stage) => void;
    onBuild?: (stage: Stage, method: string) => void;
  } = {},
) {
  const operations: { stage: Stage; method: string; args: unknown[] }[] = [];
  const dispatches: Stage[] = [];
  const build = (initial: Stage) => {
    let stage = initial;
    const op = (method: string, ...args: unknown[]) => {
      operations.push({ stage, method, args });
      options.onBuild?.(stage, method);
      return builder;
    };
    const builder = {
      select: (projection: string) => op("select", projection),
      eq: (column: string, value: unknown) => op("eq", column, value),
      update: (patch: unknown) => {
        stage = "update";
        return op("update", patch);
      },
      abortSignal: (signal: AbortSignal) => op("abortSignal", signal),
      retry: (value: boolean) => op("retry", value),
      maybeSingle: () => op("maybeSingle"),
      then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) => {
        dispatches.push(stage);
        const response = options.responses?.[stage] ?? {
          data:
            stage === "primary"
              ? { id: lead, organization_id: org }
              : stage === "update"
                ? receipt()
                : true,
          error: null,
        };
        return Promise.resolve(response)
          .then((value) => {
            options.onResult?.(stage);
            return value;
          })
          .then(resolve, reject);
      },
    };
    return builder;
  };
  return {
    auth: {
      getUser: vi.fn(
        (_token: string): Promise<unknown> =>
          Promise.resolve({ data: { user: { id: account } }, error: null }),
      ),
    },
    from: vi.fn((table: string) => {
      expect(table).toBe("leads");
      return build("primary");
    }),
    rpc: vi.fn((name: string, args: { _user_id: string; _org_id: string }) => {
      expect(args._org_id).toBe(org);
      return build(
        name === "can_manage_org" ? "manager" : args._user_id === account ? "actor" : "assignee",
      );
    }),
    operations,
    dispatches,
  };
}
const context = (supabase: ReturnType<typeof client>) => ({
  supabase,
  userId: account,
  claims: { sub: account, role: "authenticated", is_anonymous: false },
});
const call = async (data: unknown, ctx: unknown) =>
  (assignLead as unknown as (args: { data: unknown; context: unknown }) => Promise<unknown>)({
    data,
    context: ctx,
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.afterAudit.mockReset();
  controller = new AbortController();
  mocks.request.mockReturnValue(currentRequest());
});
afterEach(() => vi.useRealTimers());
describe("lead assignment caller/organization/receipt contract", () => {
  it("uses one explicit-token Auth check and strict member/manager/selected-member checks, filters and receipt", async () => {
    const caller = client();
    await expect(call(input(), context(caller))).resolves.toEqual({
      ok: true,
      assignment: receipt(),
    });
    expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(caller.dispatches).toEqual(["primary", "actor", "manager", "assignee", "update"]);
    expect(caller.rpc.mock.calls).toEqual([
      ["is_org_member", { _user_id: account, _org_id: org }],
      ["can_manage_org", { _user_id: account, _org_id: org }],
      ["is_org_member", { _user_id: member, _org_id: org }],
    ]);
    expect(caller.operations.filter((operation) => operation.stage === "update")).toEqual([
      { stage: "update", method: "update", args: [{ assigned_to: member }] },
      { stage: "update", method: "eq", args: ["id", lead] },
      { stage: "update", method: "eq", args: ["organization_id", org] },
      { stage: "update", method: "select", args: ["id,organization_id,assigned_to"] },
      { stage: "update", method: "abortSignal", args: [controller.signal] },
      { stage: "update", method: "retry", args: [false] },
      { stage: "update", method: "maybeSingle", args: [] },
    ]);
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "org_manager",
        label: "leads.assignLead",
        check: expect.any(Function),
      }),
    );
  });
  it("allows null unassignment without checking a nonexistent target member", async () => {
    const caller = client({ responses: { update: { data: receipt(null), error: null } } });
    await expect(call({ ...input(), userId: null }, context(caller))).resolves.toEqual({
      ok: true,
      assignment: receipt(null),
    });
    expect(caller.dispatches).toEqual(["primary", "actor", "manager", "update"]);
  });
  it.each([
    undefined,
    null,
    {},
    { ...input(), expectedAccountId: undefined },
    { ...input(), expectedOrgId: undefined },
    { ...input(), userId: "" },
    { ...input(), extra: "PRIVATE" },
  ])("rejects invalid prior intent before request/native access: %j", async (data) => {
    const caller = client();
    await expect(call(data, context(caller))).rejects.toThrow("Invalid lead assignment request.");
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.from).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });
  it("retains early account-change error before request access", async () => {
    const caller = client();
    await expect(call(input(), { ...context(caller), userId: uid(8) })).rejects.toThrow(
      "Account changed. Refresh before assigning this lead.",
    );
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.auth.getUser).not.toHaveBeenCalled();
  });
  it("snapshots all four primitive intent fields before getRequest can mutate validated data", async () => {
    const caller = client();
    mocks.request.mockImplementationOnce(() => {
      Object.assign(mocks.validated as object, {
        id: uid(9),
        userId: uid(10),
        expectedAccountId: uid(11),
        expectedOrgId: uid(12),
      });
      return currentRequest();
    });
    await expect(call(input(), context(caller))).resolves.toEqual({
      ok: true,
      assignment: receipt(),
    });
    expect(caller.operations).toContainEqual({
      stage: "primary",
      method: "eq",
      args: ["id", lead],
    });
    expect(caller.operations).toContainEqual({
      stage: "update",
      method: "update",
      args: [{ assigned_to: member }],
    });
  });
  it.each([
    null,
    {},
    [],
    { id: uid(9), organization_id: org },
    { id: lead, organization_id: uid(8) },
    { id: lead, organization_id: org, secret: "PRIVATE" },
  ])("rejects missing or mismatched actual lead org before membership/write: %j", async (data) => {
    const caller = client({ responses: { primary: { data, error: null } } });
    await expect(call(input(), context(caller))).rejects.toThrow(failure);
    expect(caller.dispatches).toEqual(["primary"]);
    expect(caller.rpc).not.toHaveBeenCalled();
  });
  for (const stage of ["actor", "manager", "assignee"] as const) {
    it.each([false, null, 1, "true", {}, []])(
      `requires actual boolean true for ${stage}, not truthiness: %j`,
      async (data) => {
        const caller = client({ responses: { [stage]: { data, error: null } } });
        await expect(call(input(), context(caller))).rejects.toThrow(failure);
        expect(caller.dispatches).not.toContain("update");
      },
    );
  }
  it.each([
    null,
    {},
    [],
    { ...receipt(), id: uid(8) },
    { ...receipt(), organization_id: uid(8) },
    { ...receipt(), assigned_to: uid(8) },
    { ...receipt(), assigned_to: null },
    { ...receipt(), extra: "PRIVATE" },
  ])("holds zero/malformed/mismatched returned updates as uncertain: %j", async (data) => {
    const caller = client({ responses: { update: { data, error: null } } });
    await expect(call(input(), context(caller))).rejects.toThrow(uncertain);
    expect(caller.dispatches.filter((stage) => stage === "update")).toHaveLength(1);
  });
  it.each(["primary", "actor", "manager", "assignee", "update"] as const)(
    "redacts returned backend error at %s",
    async (stage) => {
      const caller = client({
        responses: { [stage]: { data: true, error: { message: "PRIVATE database cause" } } },
      });
      const error = await call(input(), context(caller)).catch((value: unknown) => value);
      expect((error as Error).message).toBe(stage === "update" ? uncertain : failure);
      expect(error).not.toHaveProperty("cause");
      expect(String(error)).not.toContain("PRIVATE");
    },
  );
  for (const stage of ["primary", "actor", "manager", "assignee", "update"] as const) {
    it.each([undefined, false, ""])(
      `requires explicit SDK error:null at ${stage}, not a falsy error: %j`,
      async (error) => {
        const data =
          stage === "primary"
            ? { id: lead, organization_id: org }
            : stage === "update"
              ? receipt()
              : true;
        const caller = client({ responses: { [stage]: { data, error } } });
        await expect(call(input(), context(caller))).rejects.toThrow(
          stage === "update" ? uncertain : failure,
        );
        if (stage !== "update") expect(caller.dispatches).not.toContain("update");
      },
    );
  }
  it("does not read getter or inherited acknowledgment fields", async () => {
    const getter = vi.fn(() => lead);
    const row = { organization_id: org, assigned_to: member };
    Object.defineProperty(row, "id", { get: getter, enumerable: true });
    const caller = client({ responses: { update: { data: row, error: null } } });
    await expect(call(input(), context(caller))).rejects.toThrow(uncertain);
    expect(getter).not.toHaveBeenCalled();
    const inherited = client({
      responses: { update: { data: Object.create(receipt()), error: null } },
    });
    await expect(call(input(), context(inherited))).rejects.toThrow(uncertain);
  });
  for (const field of ["actor", "client", "claims", "authMethod", "header"] as const) {
    it.each([
      "request",
      "auth",
      "primary",
      "actor",
      "manager",
      "assignee",
      "update",
      "audit",
    ] as const)(`fences ${field} loss at %s`, async (stage) => {
      const authPending = deferred<unknown>();
      const liveRequest = currentRequest();
      const caller = client({
        onResult: (value) => {
          if (value === stage) lose();
        },
      });
      const ctx = context(caller);
      const originalGetUser = caller.auth.getUser;
      function lose() {
        if (field === "actor") ctx.userId = uid(9);
        if (field === "client") ctx.supabase = client();
        if (field === "claims") ctx.claims = { ...ctx.claims };
        if (field === "authMethod")
          caller.auth.getUser = vi.fn((value: string) => originalGetUser(value));
        if (field === "header") liveRequest.headers.set("authorization", "Basic PRIVATE");
      }
      mocks.request.mockImplementationOnce(() => {
        if (stage === "request") lose();
        return liveRequest;
      });
      if (stage === "auth") caller.auth.getUser.mockReturnValue(authPending.promise);
      if (stage === "audit") mocks.afterAudit.mockImplementationOnce(lose);
      const result = call(input(), ctx);
      if (stage === "auth") {
        lose();
        authPending.resolve({ data: { user: { id: account } }, error: null });
      }
      await expect(result).rejects.toThrow(
        stage === "update" || stage === "audit" ? uncertain : failure,
      );
      if (stage !== "update" && stage !== "audit")
        expect(caller.dispatches).not.toContain("update");
    });
  }
  it.each(["abort", "timeout"] as const)(
    "bounds pending Auth by %s and ignores both late settlements",
    async (stop) => {
      vi.useFakeTimers();
      for (const settlement of ["resolve", "reject"] as const) {
        controller = new AbortController();
        mocks.request.mockReturnValue(currentRequest());
        const pending = deferred<unknown>();
        const caller = client();
        caller.auth.getUser.mockReturnValue(pending.promise);
        const result = call(input(), context(caller));
        const assertion = expect(result).rejects.toThrow(failure);
        if (stop === "abort") controller.abort();
        else await vi.advanceTimersByTimeAsync(10_000);
        await assertion;
        if (settlement === "resolve")
          pending.resolve({ data: { user: { id: account } }, error: null });
        else pending.reject(new Error("PRIVATE late Auth"));
        await Promise.resolve();
        expect(caller.from).not.toHaveBeenCalled();
        expect(caller.rpc).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
      }
    },
  );
});
