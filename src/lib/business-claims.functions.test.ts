import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { reviewBusinessClaim } from "./business-claims.functions";

// Characterization of the unchanged validator and handler only. Middleware,
// authentication, Supabase/PostgREST, SQL, commit/rollback and human attribution
// are not executed here. Ignored errors and permissive truthiness are observed
// gaps, not an authorization policy or ownership/atomic-audit confirmation.
const mocks = vi.hoisted(() => ({
  authMiddleware: { name: "requireSupabaseAuth" },
  registrations: new Map<unknown, { method: string; middleware: unknown[] }>(),
  validated: [] as unknown[],
  adminRpc: vi.fn(),
  adminFrom: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: ({ method }: { method: string }) => {
    let validate = (data: unknown): unknown => data;
    let middleware: unknown[] = [];
    const builder = {
      middleware: (value: unknown[]) => {
        middleware = value;
        return builder;
      },
      inputValidator: (validator: (data: unknown) => unknown) => {
        validate = validator;
        return builder;
      },
      handler: (handler: (args: { data: unknown; context: unknown }) => unknown) => {
        const run = (args: { data: unknown; context: unknown }) => {
          const data = validate(args.data);
          mocks.validated.push(data);
          return handler({ ...args, data });
        };
        mocks.registrations.set(run, { method, middleware });
        return run;
      },
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: mocks.authMiddleware,
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: mocks.adminRpc, from: mocks.adminFrom },
}));

type Result = { data: unknown; error: unknown; count?: number | null };
type Response = Result | (() => Promise<Result>);
type QueryBuilder = {
  select: Mock<(columns: string, options?: unknown) => QueryBuilder>;
  update: Mock<(patch: unknown) => QueryBuilder>;
  eq: Mock<(column: string, value: unknown) => QueryBuilder>;
  single: Mock<() => Promise<Result>>;
  then: (
    resolve: (value: Result) => unknown,
    reject?: (error: unknown) => unknown,
  ) => Promise<unknown>;
};
type Plan = { table: string; label: string; response: Response };

const claimId = "10000000-0000-4000-8000-000000000001";
const businessId = "20000000-0000-4000-8000-000000000001";
const actorId = "30000000-0000-4000-8000-000000000001";
const otherId = "30000000-0000-4000-8000-000000000002";
const serviceSubjectId = "30000000-0000-4000-8000-000000000003";
const sourceSha = "cc0960e0d7eb1ee065d405f112a9d3a2e7f5d03a57ee80e9908f0901735b52d6";
const ok = (data?: unknown, count?: number | null): Result => ({
  data,
  error: null,
  ...(count === undefined ? {} : { count }),
});
const fail = (message: string, data?: unknown, count?: number | null): Result => ({
  ...ok(data, count),
  error: { message },
});
const rejected =
  (error: Error): Response =>
  () =>
    Promise.reject(error);
const settle = (response: Response) =>
  typeof response === "function" ? response() : Promise.resolve(response);

function query(label: string, response: Response, events: string[]): QueryBuilder {
  const finish = async (terminal: string) => {
    events.push(`${label}:${terminal}`);
    const result = await settle(response);
    events.push(`${label}:resolved`);
    return result;
  };
  const builder: QueryBuilder = {
    select: vi.fn((_columns: string, _options?: unknown) => {
      events.push(`${label}:select`);
      return builder;
    }),
    update: vi.fn((_patch: unknown) => {
      events.push(`${label}:update`);
      return builder;
    }),
    eq: vi.fn((_column: string, _value: unknown) => {
      events.push(`${label}:eq`);
      return builder;
    }),
    single: vi.fn(() => finish("single")),
    then: (resolve, reject) => finish("await").then(resolve, reject),
  };
  return builder;
}

function setup({
  plans = [],
  moderation = ok(true),
  approval = ok(),
}: {
  plans?: Plan[];
  moderation?: Response;
  approval?: Response;
} = {}) {
  const events: string[] = [];
  const queries = plans.map((plan) => query(plan.label, plan.response, events));
  let index = 0;
  mocks.validated.length = 0;
  mocks.adminRpc.mockReset().mockImplementation(async () => {
    events.push("approve:dispatch");
    const result = await settle(approval);
    events.push("approve:resolved");
    return result;
  });
  mocks.adminFrom.mockReset().mockImplementation((table: string) => {
    const plan = plans[index];
    const result = queries[index++];
    if (!plan || plan.table !== table || !result) {
      throw new Error("Unexpected privileged query or retry");
    }
    events.push(`${plan.label}:from`);
    return result;
  });
  const supabase = {
    rpc: vi.fn(async () => {
      events.push("moderation:dispatch");
      const result = await settle(moderation);
      events.push("moderation:resolved");
      return result;
    }),
    from: vi.fn(() => {
      throw new Error("Unexpected request-client table access");
    }),
  };
  const run = async (
    data: unknown = { id: claimId, decision: "approve" },
    userId: unknown = actorId,
  ) =>
    (
      reviewBusinessClaim as unknown as (args: {
        data: unknown;
        context: { supabase: typeof supabase; userId: unknown };
      }) => Promise<unknown>
    )({ data, context: { supabase, userId } });
  return { run, queries, supabase, events };
}

const stamp = (response: Response = ok()): Plan => ({
  table: "business_claim_requests",
  label: "stamp",
  response,
});
function rejectionPlans({
  lookup = ok({ business_id: businessId }),
  update = ok(),
  count = ok(null, 0),
  reset = ok(),
  includeCount = true,
  includeReset = true,
}: {
  lookup?: Response;
  update?: Response;
  count?: Response;
  reset?: Response;
  includeCount?: boolean;
  includeReset?: boolean;
} = {}): Plan[] {
  return [
    { table: "business_claim_requests", label: "lookup", response: lookup },
    { table: "business_claim_requests", label: "reject", response: update },
    ...(includeCount
      ? [{ table: "business_claim_requests", label: "count", response: count }]
      : []),
    ...(includeCount && includeReset
      ? [{ table: "businesses", label: "reset", response: reset }]
      : []),
  ];
}
const rejectInput = { id: claimId, decision: "reject" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.validated.length = 0;
});

describe("unchanged business-claim review handler characterization", () => {
  it("pins the unchanged source and retains POST plus authentication middleware registration", () => {
    const source = readFileSync(resolve("src/lib/business-claims.functions.ts"), "utf8").replaceAll(
      "\r\n",
      "\n",
    );
    expect(createHash("sha256").update(source).digest("hex")).toBe(sourceSha);
    expect(mocks.registrations.get(reviewBusinessClaim)).toEqual({
      method: "POST",
      middleware: [mocks.authMiddleware],
    });
  });

  it("runs the actual UUID/decision/notes validator before any client dispatch", async () => {
    for (const input of [
      null,
      {},
      { id: "not-a-uuid", decision: "approve" },
      { id: claimId, decision: "transfer" },
      { id: claimId, decision: "approve", notes: "x".repeat(2001) },
      { id: claimId, decision: "approve", notes: null },
      { id: claimId, decision: "approve", notes: 1 },
    ]) {
      const flow = setup();
      await expect(flow.run(input)).rejects.toThrow();
      expect(flow.supabase.rpc).not.toHaveBeenCalled();
      expect(mocks.adminRpc).not.toHaveBeenCalled();
      expect(mocks.adminFrom).not.toHaveBeenCalled();
    }
  });

  it("strips injected actor/owner/status fields and stamps only the contextual subject and parsed notes", async () => {
    const notes = "  Recorded reviewer note, not an attribution attestation.  ";
    const flow = setup({ plans: [stamp()] });
    await expect(
      flow.run({
        id: claimId,
        decision: "approve",
        notes,
        userId: otherId,
        reviewer_user_id: otherId,
        actor_user_id: otherId,
        expectedAccountId: otherId,
        previousOwnerId: otherId,
        businessId,
        status: "pending",
        auto: true,
      }),
    ).resolves.toEqual({ ok: true });
    expect(mocks.validated).toEqual([{ id: claimId, decision: "approve", notes }]);
    expect(flow.supabase.rpc).toHaveBeenCalledExactlyOnceWith("can_moderate", {
      _user_id: actorId,
    });
    expect(mocks.adminRpc).toHaveBeenCalledExactlyOnceWith("approve_business_claim", {
      _claim_id: claimId,
      _auto: false,
    });
    expect(flow.queries[0].update).toHaveBeenCalledExactlyOnceWith({
      reviewer_user_id: actorId,
      reviewer_notes: notes,
    });
  });

  it("orders caller moderation, privileged approval, then the separate id-only reviewer stamp", async () => {
    const flow = setup({ plans: [stamp()] });
    await expect(flow.run()).resolves.toEqual({ ok: true });
    expect(flow.events).toEqual([
      "moderation:dispatch",
      "moderation:resolved",
      "approve:dispatch",
      "approve:resolved",
      "stamp:from",
      "stamp:update",
      "stamp:eq",
      "stamp:await",
      "stamp:resolved",
    ]);
    expect(flow.supabase.from).not.toHaveBeenCalled();
    expect(mocks.adminFrom).toHaveBeenCalledExactlyOnceWith("business_claim_requests");
    expect(flow.queries[0].update).toHaveBeenCalledExactlyOnceWith({
      reviewer_user_id: actorId,
      reviewer_notes: null,
    });
    expect(flow.queries[0].eq.mock.calls).toEqual([["id", claimId]]);
    expect(flow.queries[0].select).not.toHaveBeenCalled();
    expect(flow.queries[0].single).not.toHaveBeenCalled();
  });

  it("denies falsy moderation data, including an error response, before any privileged operation", async () => {
    for (const value of [false, null, undefined, 0, ""]) {
      const flow = setup({ moderation: fail("moderation lookup diagnostic", value) });
      await expect(flow.run()).rejects.toThrow("Forbidden");
      expect(flow.supabase.rpc).toHaveBeenCalledExactlyOnceWith("can_moderate", {
        _user_id: actorId,
      });
      expect(mocks.adminRpc).not.toHaveBeenCalled();
      expect(mocks.adminFrom).not.toHaveBeenCalled();
    }
  });

  it("observes truthy nonboolean moderation data and returned errors being accepted rather than strict true", async () => {
    for (const value of [true, "false", 1, {}, []]) {
      const flow = setup({
        moderation: fail("ignored moderation error", value),
        plans: [stamp()],
      });
      await expect(flow.run()).resolves.toEqual({ ok: true });
      expect(mocks.adminRpc).toHaveBeenCalledTimes(1);
      expect(flow.queries[0].update).toHaveBeenCalledTimes(1);
    }
  });

  it("propagates a rejected moderation promise without a privileged fallback or retry", async () => {
    const failure = new Error("private moderation transport diagnostic");
    const flow = setup({ moderation: rejected(failure) });
    await expect(flow.run()).rejects.toBe(failure);
    expect(flow.supabase.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.adminRpc).not.toHaveBeenCalled();
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it("propagates returned/rejected approval errors and does not issue its later stamp or retry", async () => {
    const failure = new Error("private approval diagnostic");
    for (const approval of [fail(failure.message), rejected(failure)]) {
      const flow = setup({ approval });
      await expect(flow.run()).rejects.toThrow(failure.message);
      expect(mocks.adminRpc).toHaveBeenCalledExactlyOnceWith("approve_business_claim", {
        _claim_id: claimId,
        _auto: false,
      });
      expect(mocks.adminFrom).not.toHaveBeenCalled();
    }
  });

  it("ignores approval result data and reads no missing/rejected/pending/prior-owner precondition locally", async () => {
    // No SQL claim/business state is simulated. The observation is dispatch and
    // lack of reads, not that a real missing/already-decided claim is approved.
    for (const rpcData of [null, undefined, [], { unexpected: "not a row confirmation" }]) {
      const flow = setup({ approval: ok(rpcData), plans: [stamp()] });
      await expect(flow.run()).resolves.toEqual({ ok: true });
      expect(mocks.adminRpc).toHaveBeenCalledExactlyOnceWith("approve_business_claim", {
        _claim_id: claimId,
        _auto: false,
      });
      expect(mocks.adminFrom.mock.calls).toEqual([["business_claim_requests"]]);
      expect(flow.supabase.from).not.toHaveBeenCalled();
      expect(flow.queries[0].select).not.toHaveBeenCalled();
      expect(flow.queries[0].eq.mock.calls).toEqual([["id", claimId]]);
    }
  });

  it("acknowledges approval despite a returned reviewer-stamp error or zero rows", async () => {
    for (const result of [fail("reviewer stamp denied"), ok([], 0), ok(null, 0)]) {
      const flow = setup({ plans: [stamp(result)] });
      await expect(flow.run()).resolves.toEqual({ ok: true });
      expect(mocks.adminRpc).toHaveBeenCalledTimes(1);
      expect(flow.queries[0].update).toHaveBeenCalledTimes(1);
      expect(flow.queries[0].select).not.toHaveBeenCalled();
    }
  });

  it("rejects a thrown stamp after the earlier approval response without any modeled rollback", async () => {
    const failure = new Error("stamp transport failed after approval response");
    const flow = setup({ plans: [stamp(rejected(failure))] });
    await expect(flow.run()).rejects.toBe(failure);
    expect(flow.events.indexOf("approve:resolved")).toBeLessThan(
      flow.events.indexOf("stamp:await"),
    );
    expect(mocks.adminRpc).toHaveBeenCalledTimes(1);
    expect(mocks.adminFrom).toHaveBeenCalledTimes(1);
    // These are independently observed mocked requests, not proof of either
    // request's real database commit, rollback or durable audit outcome.
  });

  it("waits for approval before dispatching the stamp and waits for the stamp before acknowledging", async () => {
    let approve!: (result: Result) => void;
    let stampResult!: (result: Result) => void;
    const approval = new Promise<Result>((resolve) => {
      approve = resolve;
    });
    const stamping = new Promise<Result>((resolve) => {
      stampResult = resolve;
    });
    const flow = setup({ approval: () => approval, plans: [stamp(() => stamping)] });
    let finished = false;
    const result = flow.run().then((value) => {
      finished = true;
      return value;
    });
    await vi.waitFor(() => expect(mocks.adminRpc).toHaveBeenCalledTimes(1));
    expect(mocks.adminFrom).not.toHaveBeenCalled();
    expect(finished).toBe(false);
    approve(ok());
    await vi.waitFor(() => expect(flow.events).toContain("stamp:await"));
    expect(finished).toBe(false);
    stampResult(ok());
    await expect(result).resolves.toEqual({ ok: true });
    expect(finished).toBe(true);
  });

  it("reissues both approval requests and stamps for a repeated input without a local idempotence key", async () => {
    const flow = setup({ plans: [stamp(), stamp()] });
    await expect(flow.run()).resolves.toEqual({ ok: true });
    await expect(flow.run()).resolves.toEqual({ ok: true });
    expect(flow.supabase.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.adminRpc.mock.calls).toEqual([
      ["approve_business_claim", { _claim_id: claimId, _auto: false }],
      ["approve_business_claim", { _claim_id: claimId, _auto: false }],
    ]);
    expect(mocks.adminFrom).toHaveBeenCalledTimes(2);
  });

  it("uses the mocked middleware subject without independently proving an original human or forwarding it to approval", async () => {
    // An arbitrary synthetic admin/service subject here is NOT a real service
    // session or an authentication-bypass test. The middleware is not executed.
    for (const subject of [actorId, serviceSubjectId, null, undefined]) {
      const flow = setup({ plans: [stamp()] });
      // Default parameters would replace undefined, so supply it in context
      // directly to characterize that missing middleware-context value too.
      const result =
        subject === undefined
          ? (
              reviewBusinessClaim as unknown as (args: {
                data: unknown;
                context: unknown;
              }) => Promise<unknown>
            )({
              data: { id: claimId, decision: "approve" },
              context: { supabase: flow.supabase, userId: undefined },
            })
          : flow.run({ id: claimId, decision: "approve" }, subject);
      await expect(result).resolves.toEqual({ ok: true });
      expect(flow.supabase.rpc).toHaveBeenCalledExactlyOnceWith("can_moderate", {
        _user_id: subject,
      });
      expect(flow.queries[0].update).toHaveBeenCalledExactlyOnceWith({
        reviewer_user_id: subject,
        reviewer_notes: null,
      });
      expect(mocks.adminRpc.mock.calls).toEqual([
        ["approve_business_claim", { _claim_id: claimId, _auto: false }],
      ]);
    }
  });

  it("orders rejection lookup, unconditional id-only update, pending count and conditional business reset", async () => {
    const flow = setup({ plans: rejectionPlans() });
    const before = Date.now();
    await expect(flow.run({ ...rejectInput, notes: "" })).resolves.toEqual({ ok: true });
    const after = Date.now();
    const [lookup, update, count, reset] = flow.queries;
    expect(mocks.adminRpc).not.toHaveBeenCalled();
    expect(lookup.select).toHaveBeenCalledExactlyOnceWith("business_id");
    expect(lookup.eq.mock.calls).toEqual([["id", claimId]]);
    expect(lookup.single).toHaveBeenCalledTimes(1);
    const patch = update.update.mock.calls[0][0];
    expect(patch).toEqual({
      status: "rejected",
      reviewer_user_id: actorId,
      reviewer_notes: "",
      decided_at: expect.any(String),
    });
    const decidedAt = (patch as { decided_at: string }).decided_at;
    expect(new Date(decidedAt).toISOString()).toBe(decidedAt);
    expect(Date.parse(decidedAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(decidedAt)).toBeLessThanOrEqual(after);
    expect(update.eq.mock.calls).toEqual([["id", claimId]]);
    expect(update.select).not.toHaveBeenCalled();
    expect(count.select).toHaveBeenCalledExactlyOnceWith("id", { count: "exact", head: true });
    expect(count.eq.mock.calls).toEqual([
      ["business_id", businessId],
      ["status", "pending"],
    ]);
    expect(reset.update).toHaveBeenCalledExactlyOnceWith({ claim_state: "unclaimed" });
    expect(reset.eq.mock.calls).toEqual([
      ["id", businessId],
      ["claim_state", "claim_pending"],
    ]);
    expect(flow.events.filter((event) => event.endsWith(":resolved"))).toEqual([
      "moderation:resolved",
      "lookup:resolved",
      "reject:resolved",
      "count:resolved",
      "reset:resolved",
    ]);
    expect(flow.supabase.from).not.toHaveBeenCalled();
  });

  it("still issues rejection after missing/error lookup data and skips count/reset only when business_id is absent", async () => {
    for (const lookup of [ok(null), fail("lookup failed"), ok({}), ok({ business_id: null })]) {
      const flow = setup({ plans: rejectionPlans({ lookup, includeCount: false }) });
      await expect(flow.run(rejectInput)).resolves.toEqual({ ok: true });
      expect(mocks.adminFrom.mock.calls).toEqual([
        ["business_claim_requests"],
        ["business_claim_requests"],
      ]);
      expect(flow.queries[1].update).toHaveBeenCalledWith({
        status: "rejected",
        reviewer_user_id: actorId,
        reviewer_notes: null,
        decided_at: expect.any(String),
      });
      expect(flow.queries[1].eq.mock.calls).toEqual([["id", claimId]]);
    }
    const flow = setup({
      plans: rejectionPlans({
        lookup: fail("lookup error with data", { business_id: businessId }),
      }),
    });
    await expect(flow.run(rejectInput)).resolves.toEqual({ ok: true });
    expect(mocks.adminFrom).toHaveBeenCalledTimes(4);
  });

  it("ignores rejection update errors/zero rows and continues the pending-count/reset requests", async () => {
    for (const update of [fail("rejection update denied"), ok([], 0), ok(null, 0)]) {
      const flow = setup({ plans: rejectionPlans({ update }) });
      await expect(flow.run(rejectInput)).resolves.toEqual({ ok: true });
      expect(mocks.adminFrom).toHaveBeenCalledTimes(4);
      expect(flow.events.indexOf("reject:resolved")).toBeLessThan(
        flow.events.indexOf("count:from"),
      );
      expect(flow.queries[1].eq.mock.calls).toEqual([["id", claimId]]);
      expect(flow.queries[3].update).toHaveBeenCalledExactlyOnceWith({ claim_state: "unclaimed" });
    }
  });

  it("treats null/missing/error counts as no pending claims while any positive count skips reset even with an error", async () => {
    for (const count of [
      ok(),
      ok(null, null),
      ok(null, 0),
      fail("count failed"),
      fail("count failed", null, null),
    ]) {
      const flow = setup({ plans: rejectionPlans({ count }) });
      await expect(flow.run(rejectInput)).resolves.toEqual({ ok: true });
      expect(mocks.adminFrom).toHaveBeenCalledTimes(4);
      expect(flow.queries[3].update).toHaveBeenCalledTimes(1);
    }
    for (const count of [ok(null, 1), fail("ignored count error", null, 2)]) {
      const flow = setup({ plans: rejectionPlans({ count, includeReset: false }) });
      await expect(flow.run(rejectInput)).resolves.toEqual({ ok: true });
      expect(mocks.adminFrom).toHaveBeenCalledTimes(3);
      expect(flow.events).not.toContain("reset:from");
    }
  });

  it("acknowledges a returned reset error or zero rows without checking owner, affected rows or durable status", async () => {
    for (const reset of [fail("reset denied"), ok([], 0), ok(null, 0)]) {
      const flow = setup({ plans: rejectionPlans({ reset }) });
      await expect(flow.run(rejectInput)).resolves.toEqual({ ok: true });
      const businessReset = flow.queries[3];
      expect(businessReset.update).toHaveBeenCalledExactlyOnceWith({ claim_state: "unclaimed" });
      expect(businessReset.eq.mock.calls).toEqual([
        ["id", businessId],
        ["claim_state", "claim_pending"],
      ]);
      expect(businessReset.select).not.toHaveBeenCalled();
      expect(mocks.adminRpc).not.toHaveBeenCalled();
    }
  });

  it("propagates rejected lookup/update/count/reset promises without retry or claiming earlier request rollback", async () => {
    for (const stage of ["lookup", "update", "count", "reset"] as const) {
      const failure = new Error(`private ${stage} transport diagnostic`);
      const plans = rejectionPlans({ [stage]: rejected(failure) });
      const flow = setup({ plans });
      await expect(flow.run(rejectInput)).rejects.toBe(failure);
      const count = ["lookup", "update", "count", "reset"].indexOf(stage) + 1;
      expect(mocks.adminFrom).toHaveBeenCalledTimes(count);
      expect(flow.supabase.rpc).toHaveBeenCalledTimes(1);
      expect(mocks.adminRpc).not.toHaveBeenCalled();
      expect(flow.events.filter((event) => event.endsWith(":resolved"))).toHaveLength(count);
      // Earlier mock responses remain observed. This fixture has no database
      // transaction, so it cannot assert rollback or commit of those requests.
    }
  });
});
