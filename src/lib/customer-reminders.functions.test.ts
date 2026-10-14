import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCustomerRemindersSnapshot } from "./customer-reminders.functions";
import type { CustomerReminder } from "./customer-reminders";

// Synthetic mocked lazy-RPC/handler contracts only. No real middleware, JWT,
// HTTP/PostgREST/RLS, live invoker API, session revocation or DB cancellation proof.
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
  supabaseAdmin: { from: mocks.privileged, rpc: mocks.privileged, schema: mocks.privileged },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.browser, rpc: mocks.browser, schema: mocks.browser },
}));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: { from: mocks.browser },
  supabase: { from: mocks.browser, rpc: mocks.browser },
}));

type Response = { data: unknown; error: unknown };
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const accountId = uuid(1);
const customerId = "00000000-0000-4000-8000-0000000000ab";
const shopId = "00000000-0000-4000-8000-0000000000cd";
const otherCustomer = uuid(3);
const otherShop = uuid(4);
const failure = "Could not load this customer's reminders snapshot. Refresh and try again.";
const invalid = "Invalid customer reminders snapshot request.";
const changed = "Account changed. Refresh before loading this customer's reminders.";
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
const envelope = (rows: unknown = []) => ({
  available: true,
  customer_id: customerId,
  shop_id: shopId,
  rows,
});
const request = () => ({ expectedAccountId: accountId, customerId });
let controller: AbortController;

function client({
  response = { data: envelope(), error: null },
  onRpc,
  onAbortSignal,
  onRetry,
  onResult,
}: {
  response?: Response | PromiseLike<Response>;
  onRpc?: () => void;
  onAbortSignal?: () => void;
  onRetry?: () => void;
  onResult?: () => void;
} = {}) {
  const operations: string[] = [];
  const dispatch = vi.fn(() => {
    operations.push("dispatch");
  });
  const builder = {
    abortSignal: vi.fn((_signal: AbortSignal) => {
      operations.push("abortSignal");
      onAbortSignal?.();
      return builder;
    }),
    retry: vi.fn((_enabled: boolean) => {
      operations.push("retry");
      onRetry?.();
      return builder;
    }),
    then: <TResult1 = Response, TResult2 = never>(
      resolve?: ((result: Response) => TResult1 | PromiseLike<TResult1>) | null,
      reject?: ((error: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => {
      dispatch();
      return Promise.resolve(response)
        .then((result) => {
          onResult?.();
          return result;
        })
        .then(resolve, reject);
    },
  };
  return {
    rpc: vi.fn((_name: string, _args: unknown) => {
      operations.push("rpc");
      onRpc?.();
      return builder;
    }),
    from: vi.fn(() => {
      throw new Error("Unexpected direct table read");
    }),
    schema: vi.fn(() => {
      throw new Error("Unexpected schema binding");
    }),
    builder,
    dispatch,
    operations,
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
async function expectFailure(promise: Promise<unknown>, message = failure) {
  const error: unknown = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe(message);
}
function assertNoFallback(caller: ReturnType<typeof client>) {
  expect(caller.from).not.toHaveBeenCalled();
  expect(caller.schema).not.toHaveBeenCalled();
  expect(mocks.privileged).not.toHaveBeenCalled();
  expect(mocks.browser).not.toHaveBeenCalled();
}
function assertRpc(caller: ReturnType<typeof client>) {
  expect(caller.rpc).toHaveBeenCalledExactlyOnceWith("crm_customer_reminders", {
    _customer_id: customerId,
  });
  expect(caller.builder.abortSignal).toHaveBeenCalledExactlyOnceWith(controller.signal);
  expect(caller.builder.retry).toHaveBeenCalledExactlyOnceWith(false);
  expect(caller.dispatch).toHaveBeenCalledTimes(1);
  expect(caller.operations).toEqual(["rpc", "abortSignal", "retry", "dispatch"]);
  assertNoFallback(caller);
}
beforeEach(() => {
  vi.clearAllMocks();
  controller = new AbortController();
  mocks.getRequest.mockReturnValue({ signal: controller.signal });
});

describe("caller-bound single-RPC customer reminder snapshot adapter", () => {
  it("registers POST and the existing authentication middleware", () => {
    expect(mocks.methods).toEqual([{ method: "POST" }]);
    expect(mocks.middlewares).toEqual([[mocks.middleware]]);
  });
  it("dispatches exactly one caller RPC with the fixed selector, request signal and SDK retries disabled", async () => {
    const caller = client({ response: { data: envelope([row()]), error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows: [row()],
      hasMore: false,
    });
    assertRpc(caller);
  });
  it("maps only the exact false/null/null/empty envelope to unavailable", async () => {
    const caller = client({
      response: {
        data: { available: false, customer_id: null, shop_id: null, rows: [] },
        error: null,
      },
    });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: false,
      rows: [],
      hasMore: false,
    });
    assertRpc(caller);
  });
  it("preserves visible-empty as available, not unavailable", async () => {
    const caller = client();
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows: [],
      hasMore: false,
    });
    assertRpc(caller);
  });
  it("takes the matching row shop from the same envelope, without guessing or a separate lookup", async () => {
    const rows = [{ ...row(), shop_id: otherShop }];
    const caller = client({
      response: { data: { ...envelope(rows), shop_id: otherShop }, error: null },
    });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows,
      hasMore: false,
    });
    assertRpc(caller);
  });
  it("rejects malformed or extra input, including actor/shop/RPC overrides, before handler request/client binding", async () => {
    for (const input of [
      undefined,
      null,
      {},
      { customerId },
      { expectedAccountId: accountId },
      { ...request(), expectedAccountId: "other-account" },
      { ...request(), customerId: "legacy-customer" },
      { ...request(), shopId },
      { ...request(), shop_id: shopId },
      { ...request(), rpc: "other_reader" },
      { ...request(), actor: accountId },
      { ...request(), limit: 10000 },
    ]) {
      const caller = client();
      await expectFailure(call(input, context(caller)), invalid);
      expect(caller.rpc).not.toHaveBeenCalled();
      assertNoFallback(caller);
    }
    expect(mocks.getRequest).not.toHaveBeenCalled();
  });
  it("rejects missing/wrong actors before getRequest or the context-client getter", async () => {
    for (const actor of [uuid(999), null, undefined, ""]) {
      const caller = client();
      const binding = vi.fn(() => caller);
      const callerContext =
        actor === undefined
          ? undefined
          : {
              userId: actor,
              get supabase() {
                return binding();
              },
            };
      await expectFailure(call(request(), callerContext), changed);
      expect(binding).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
      assertNoFallback(caller);
    }
    expect(mocks.getRequest).not.toHaveBeenCalled();
  });
  it("rejects a pre-aborted request before RPC construction, without exposing its reason", async () => {
    controller.abort(new Error("PRIVATE cancellation reason"));
    const caller = client();
    await expectFailure(call(request(), context(caller)));
    expect(caller.rpc).not.toHaveBeenCalled();
    expect(caller.dispatch).not.toHaveBeenCalled();
    assertNoFallback(caller);
  });

  const stages = ["request", "binding", "rpc", "abortSignal", "retry", "result"] as const;
  for (const boundary of ["actor", "cancellation"] as const) {
    it.each(stages)(
      `rechecks ${boundary} at %s before lazy dispatch or private return`,
      async (stage) => {
        const changeBoundary = () => {
          if (boundary === "actor") callerContext.userId = uuid(998);
          else controller.abort(new Error("PRIVATE boundary reason"));
        };
        const caller = client({
          response: { data: envelope([row()]), error: null },
          onRpc: () => {
            if (stage === "rpc") changeBoundary();
          },
          onAbortSignal: () => {
            if (stage === "abortSignal") changeBoundary();
          },
          onRetry: () => {
            if (stage === "retry") changeBoundary();
          },
          onResult: () => {
            if (stage === "result") changeBoundary();
          },
        });
        const callerContext = context(caller);
        if (stage === "request")
          mocks.getRequest.mockImplementationOnce(() => {
            changeBoundary();
            return { signal: controller.signal };
          });
        if (stage === "binding")
          Object.defineProperty(callerContext, "supabase", {
            get: () => {
              changeBoundary();
              return caller;
            },
          });
        await expectFailure(call(request(), callerContext));
        expect(caller.dispatch).toHaveBeenCalledTimes(stage === "result" ? 1 : 0);
        if (stage === "request" || stage === "binding") expect(caller.rpc).not.toHaveBeenCalled();
        else expect(caller.rpc).toHaveBeenCalledTimes(1);
        if (stage === "rpc") expect(caller.builder.abortSignal).not.toHaveBeenCalled();
        if (stage === "abortSignal") expect(caller.builder.retry).not.toHaveBeenCalled();
        assertNoFallback(caller);
      },
    );
  }
  it.each(["request", "binding", "rpc", "abortSignal", "retry"] as const)(
    "hides private construction errors at %s with no dispatch/fallback",
    async (stage) => {
      const reject = () => {
        throw new Error("PRIVATE construction diagnostic");
      };
      const caller = client({
        onRpc: stage === "rpc" ? reject : undefined,
        onAbortSignal: stage === "abortSignal" ? reject : undefined,
        onRetry: stage === "retry" ? reject : undefined,
      });
      const callerContext = context(caller);
      if (stage === "request") mocks.getRequest.mockImplementationOnce(reject);
      if (stage === "binding") Object.defineProperty(callerContext, "supabase", { get: reject });
      await expectFailure(call(request(), callerContext));
      expect(caller.dispatch).not.toHaveBeenCalled();
      expect(caller.rpc.mock.calls.length).toBeLessThanOrEqual(1);
      assertNoFallback(caller);
    },
  );
  it("does not recover missing caller clients through another reader", async () => {
    await expectFailure(call(request(), { userId: accountId }));
    expect(mocks.privileged).not.toHaveBeenCalled();
    expect(mocks.browser).not.toHaveBeenCalled();
  });
  it("hides RPC backend/transport errors without direct-table, alternate-RPC or privileged fallback", async () => {
    for (const response of [
      { data: envelope([row()]), error: { message: "PRIVATE backend error" } },
      Promise.reject(new Error("PRIVATE transport error")),
    ]) {
      const caller = client({ response });
      await expectFailure(call(request(), context(caller)));
      assertRpc(caller);
    }
  });
  it("rejects null/malformed/incomplete/extra or contradictory envelopes rather than forging an empty success", async () => {
    for (const payload of [
      null,
      undefined,
      [],
      {},
      { available: true },
      { ...envelope(), available: "true" },
      { ...envelope(), available: null },
      { ...envelope(), rows: null },
      { ...envelope(), rows: undefined },
      { ...envelope(), extra: "PRIVATE" },
      { ...envelope(), hasMore: false },
      { available: false, customer_id: null, shop_id: null },
      { available: false, customer_id: customerId, shop_id: null, rows: [] },
      { available: false, customer_id: null, shop_id: shopId, rows: [] },
      { available: false, customer_id: customerId, shop_id: shopId, rows: [] },
      { available: false, customer_id: null, shop_id: null, rows: [row()] },
    ]) {
      const caller = client({ response: { data: payload, error: null } });
      await expectFailure(call(request(), context(caller)));
      assertRpc(caller);
    }
  });
  it.each(["customer_id", "shop_id"] as const)(
    "requires present non-null UUID visible-envelope %s",
    async (field) => {
      const missing = { ...envelope() };
      delete (missing as Partial<typeof missing>)[field];
      for (const payload of [
        missing,
        { ...envelope(), [field]: null },
        { ...envelope(), [field]: "" },
        { ...envelope(), [field]: "legacy-id" },
      ]) {
        const caller = client({ response: { data: payload, error: null } });
        await expectFailure(call(request(), context(caller)));
        assertRpc(caller);
      }
    },
  );
  it("requires the requested customer even when a visible envelope has no rows", async () => {
    const caller = client({
      response: { data: { ...envelope(), customer_id: otherCustomer }, error: null },
    });
    await expectFailure(call(request(), context(caller)));
    assertRpc(caller);
  });
  it("validates then caps at100 in received order, with hasMore only for the101st row", async () => {
    for (const length of [0, 1, 99, 100, 101]) {
      const rows = rowsOf(length);
      const caller = client({ response: { data: envelope(rows), error: null } });
      await expect(call(request(), context(caller))).resolves.toEqual({
        available: true,
        rows: rows.slice(0, 100),
        hasMore: length === 101,
      });
      assertRpc(caller);
    }
  });
  it("rejects102 rows rather than trusting an overbound RPC response", async () => {
    const caller = client({ response: { data: envelope(rowsOf(102)), error: null } });
    await expectFailure(call(request(), context(caller)));
    assertRpc(caller);
  });
  it("rejects case-insensitive duplicate UUIDs, including a repeated101st identity", async () => {
    const id = "00000000-0000-4000-8000-0000000000ef";
    const sentinel = rowsOf(101);
    sentinel[100] = { ...sentinel[0] };
    for (const rows of [
      [row(), row()],
      [
        { ...row(), id },
        { ...row(), id: id.toUpperCase() },
      ],
      sentinel,
    ]) {
      const caller = client({ response: { data: envelope(rows), error: null } });
      await expectFailure(call(request(), context(caller)));
      assertRpc(caller);
    }
  });
  it.each([
    ["customer_id", otherCustomer],
    ["customer_id", null],
    ["shop_id", otherShop],
    ["shop_id", null],
  ] as const)(
    "rejects cross/null row %s=%s in a displayed row or sentinel",
    async (field, value) => {
      for (const length of [1, 101]) {
        const rows = rowsOf(length);
        const payload: unknown[] = [
          ...rows.slice(0, length - 1),
          { ...rows[length - 1], [field]: value },
        ];
        const caller = client({ response: { data: envelope(payload), error: null } });
        await expectFailure(call(request(), context(caller)));
        assertRpc(caller);
      }
    },
  );
  it("validates every sentinel field before trimming the overflow record", async () => {
    const incomplete = { ...row(999) };
    delete (incomplete as Partial<CustomerReminder>).notes;
    for (const sentinel of [
      incomplete,
      { ...row(999), due_date: "2026-02-29" },
      { ...row(999), completed_at: "2026-10-15" },
      { ...row(999), title: null },
      { ...row(999), attachment: "PRIVATE" },
    ]) {
      const caller = client({
        response: { data: envelope([...rowsOf(100), sentinel]), error: null },
      });
      await expectFailure(call(request(), context(caller)));
      assertRpc(caller);
    }
  });
  it.each([
    "id",
    "customer_id",
    "shop_id",
    "reminder_type",
    "title",
    "notes",
    "due_date",
    "status",
    "completed_at",
  ] as const)("requires complete row field %s", async (field) => {
    const incomplete = { ...row() };
    delete (incomplete as Partial<CustomerReminder>)[field];
    const caller = client({ response: { data: envelope([incomplete]), error: null } });
    await expectFailure(call(request(), context(caller)));
    assertRpc(caller);
  });
  it.each(["id", "customer_id", "reminder_type", "title", "due_date", "status"] as const)(
    "rejects null required row field %s",
    async (field) => {
      const caller = client({
        response: { data: envelope([{ ...row(), [field]: null }]), error: null },
      });
      await expectFailure(call(request(), context(caller)));
      assertRpc(caller);
    },
  );
  it("rejects malformed/extra row fields and wrong types without private diagnostics", async () => {
    for (const rows of [
      {},
      [null],
      [{ ...row(), created_by: "PRIVATE" }],
      [{ ...row(), id: "legacy-id" }],
      [{ ...row(), notes: 123 }],
      [{ ...row(), shop_id: "legacy-shop" }],
    ]) {
      const caller = client({ response: { data: envelope(rows), error: null } });
      await expectFailure(call(request(), context(caller)));
      assertRpc(caller);
    }
  });
  it("preserves arbitrary/empty native TEXT and nullable/long notes without enums, coercion, trimming or short caps", async () => {
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
    const caller = client({ response: { data: envelope(rows), error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows,
      hasMore: false,
    });
    assertRpc(caller);
  });
  it("accepts real calendar due dates and nullable valid offset completion timestamps", async () => {
    const rows = [
      { ...row(), due_date: "2028-02-29", completed_at: "2028-02-29T12:34:56Z" },
      { ...row(11), due_date: "0001-01-01", completed_at: "2026-10-15T21:31:01.123456+08:00" },
      { ...row(12), completed_at: null },
    ];
    const caller = client({ response: { data: envelope(rows), error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows,
      hasMore: false,
    });
    assertRpc(caller);
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
      const caller = client({
        response: { data: envelope([{ ...row(), ...patch }]), error: null },
      });
      await expectFailure(call(request(), context(caller)));
      assertRpc(caller);
    }
  });
  it("matches envelope/request/row UUIDs case-insensitively without rewriting returned values", async () => {
    const rows = [
      { ...row(), customer_id: customerId.toUpperCase(), shop_id: shopId.toUpperCase() },
    ];
    const caller = client({
      response: {
        data: {
          ...envelope(rows),
          customer_id: customerId.toUpperCase(),
          shop_id: shopId.toUpperCase(),
        },
        error: null,
      },
    });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows,
      hasMore: false,
    });
    assertRpc(caller);
  });
});
