import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCustomerCommunicationsSnapshot } from "./customer-communications.functions";
import type { CustomerCommunication } from "./customer-communications";
import { NATIVE_CALLER_AUTH_WAIT_MS } from "./native-request-caller.server";

// Actual handler/caller guard with synthetic Auth/builder payloads only. Real
// middleware/JWT, live Auth/HTTP/PostgREST/RLS, session revocation, native-shop
// authority, original-human identity and database cancellation are not tested.
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
const failure = "Could not load this customer's communications snapshot. Refresh and try again.";
const invalid = "Invalid customer communications snapshot request.";
const changed = "Account changed. Refresh before loading this customer's communications.";
const token = "fixture.access.token";
const projection = "id,customer_id,type,direction,subject,content,date,staff_member_name,status";
const row = (n = 10): CustomerCommunication => ({
  id: uuid(n),
  customer_id: customerId,
  type: "phone",
  direction: "outgoing",
  subject: null,
  content: "Customer requested a service estimate.",
  date: "2026-10-15T21:14:13.123456+00:00",
  staff_member_name: "Recorded staff display name",
  status: "completed",
});
const rowsOf = (length: number) => Array.from({ length }, (_, i) => row(i + 100));
const request = () => ({ expectedAccountId: accountId, customerId });
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
    auth: {
      getUser: vi.fn(
        (_token: string): Promise<unknown> =>
          Promise.resolve({
            data: { user: { id: accountId, role: "authenticated", is_anonymous: false } },
            error: null,
          }),
      ),
    },
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
  return {
    supabase,
    userId,
    claims: { sub: accountId, role: "authenticated", is_anonymous: false },
  };
}
function currentRequest() {
  return { signal: controller.signal, headers: new Headers({ authorization: `Bearer ${token}` }) };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}
async function call(input: unknown, callerContext: unknown) {
  return (
    getCustomerCommunicationsSnapshot as unknown as (args: {
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
  expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
  expect(caller.schema).toHaveBeenCalledExactlyOnceWith("shop_manager");
  expect(caller.operations.filter((o) => o.table === "customers")).toEqual([
    { table: "customers", method: "select", args: ["id"] },
    { table: "customers", method: "eq", args: ["id", customerId] },
    { table: "customers", method: "abortSignal", args: [controller.signal] },
    { table: "customers", method: "maybeSingle", args: [] },
  ]);
  assertNoFallback(caller);
}
function assertList(caller: ReturnType<typeof client>) {
  assertCustomerGate(caller);
  expect(caller.from.mock.calls).toEqual([["customers"], ["customer_communications"]]);
  expect(caller.dispatches).toEqual(["customers", "customer_communications"]);
  expect(caller.operations.filter((o) => o.table === "customer_communications")).toEqual([
    { table: "customer_communications", method: "select", args: [projection] },
    { table: "customer_communications", method: "eq", args: ["customer_id", customerId] },
    {
      table: "customer_communications",
      method: "order",
      args: ["date", { ascending: false, nullsFirst: false }],
    },
    { table: "customer_communications", method: "order", args: ["id", { ascending: false }] },
    { table: "customer_communications", method: "limit", args: [201] },
    { table: "customer_communications", method: "abortSignal", args: [controller.signal] },
  ]);
}
beforeEach(() => {
  vi.clearAllMocks();
  controller = new AbortController();
  mocks.getRequest.mockReturnValue(currentRequest());
});
afterEach(() => vi.useRealTimers());

describe("authenticated customer communications snapshot handler", () => {
  it("registers POST and the existing authentication middleware", () => {
    expect(mocks.methods).toEqual([{ method: "POST" }]);
    expect(mocks.middlewares).toEqual([[mocks.middleware]]);
  });
  it("uses only the caller client, fixed summary projection, parent gate, deterministic order,201 bound and signal", async () => {
    const caller = client({ list: { data: [row()], error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows: [row()],
      hasMore: false,
    });
    assertList(caller);
  });
  it("returns unavailable for a missing parent without constructing or dispatching a log read", async () => {
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
  it("distinguishes a visible empty log from unavailable", async () => {
    const caller = client();
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows: [],
      hasMore: false,
    });
    assertList(caller);
  });
  it("rejects malformed, missing, non-UUID and extra input before handler getRequest/schema access", async () => {
    for (const input of [
      undefined,
      null,
      {},
      { customerId },
      { expectedAccountId: accountId },
      { ...request(), customerId: "legacy-customer" },
      { ...request(), expectedAccountId: "other-account" },
      { ...request(), kind: "communications" },
      { ...request(), table: "customer_notes" },
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
  it("rejects absent and wrong actors before handler request or schema access", async () => {
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
  it("waits for exactly one explicit-token current-user lookup before any native binding", async () => {
    const pending = deferred<unknown>();
    const caller = client({ list: { data: [row()], error: null } });
    caller.auth.getUser.mockReturnValue(pending.promise);
    const result = call(request(), context(caller));
    expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(caller.schema).not.toHaveBeenCalled();
    expect(caller.dispatches).toEqual([]);
    pending.resolve({ data: { user: { id: accountId } }, error: null });
    await expect(result).resolves.toEqual({ available: true, rows: [row()], hasMore: false });
    assertList(caller);
  });
  it.each([
    undefined,
    null,
    {},
    { sub: "not-uuid", role: "authenticated" },
    { sub: otherCustomer, role: "authenticated" },
    { sub: accountId, role: "service_role" },
    { sub: accountId, role: "anon" },
    { sub: accountId, role: "authenticated", is_anonymous: true },
    { sub: accountId, role: "authenticated", is_anonymous: "false" },
  ])(
    "rejects unsupported verified claims before request/Auth/native access: %j",
    async (claims) => {
      const caller = client();
      await expect(call(request(), { ...context(caller), claims })).rejects.toThrow(failure);
      expect(mocks.getRequest).not.toHaveBeenCalled();
      expect(caller.auth.getUser).not.toHaveBeenCalled();
      expect(caller.schema).not.toHaveBeenCalled();
      expect(caller.dispatches).toEqual([]);
      assertNoFallback(caller);
    },
  );
  it.each([
    null,
    "",
    "Basic PRIVATE",
    "Bearer opaque",
    "Bearer fixture.access.token,second",
    "bearer fixture.access.token",
    "Bearer fixture.access.token PRIVATE",
  ])("rejects malformed Bearer input before Auth/native access: %j", async (authorization) => {
    mocks.getRequest.mockReturnValue({
      signal: controller.signal,
      headers: { get: () => authorization },
    });
    const caller = client();
    await expect(call(request(), context(caller))).rejects.toThrow(failure);
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.schema).not.toHaveBeenCalled();
    expect(caller.dispatches).toEqual([]);
    assertNoFallback(caller);
  });
  it.each([
    undefined,
    null,
    {},
    { data: null, error: null },
    { data: { user: null }, error: null },
    { data: { user: { id: "not-uuid" } }, error: null },
    { data: { user: { id: otherCustomer } }, error: null },
    { data: { user: { id: accountId, is_anonymous: true } }, error: null },
    { data: { user: { id: accountId, is_anonymous: "false" } }, error: null },
    { data: { user: { id: accountId, role: "anon" } }, error: null },
    { data: { user: { id: accountId, role: "service_role" } }, error: null },
    { data: { user: { id: accountId } }, error: { message: `PRIVATE ${token}` } },
  ])(
    "rejects an unconfirmed current Auth response without native dispatch: %j",
    async (response) => {
      const caller = client();
      caller.auth.getUser.mockResolvedValue(response);
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
      expect(caller.schema).not.toHaveBeenCalled();
      expect(caller.dispatches).toEqual([]);
      assertNoFallback(caller);
    },
  );
  it("masks rejected Auth errors without a private token, cause or alternate reader", async () => {
    const caller = client();
    caller.auth.getUser.mockRejectedValue(new Error(`PRIVATE Auth transport ${token}`));
    const error = await call(request(), context(caller)).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(failure);
    expect(Object.prototype.hasOwnProperty.call(error, "cause")).toBe(false);
    expect(String(error)).not.toContain(token);
    expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(caller.schema).not.toHaveBeenCalled();
    expect(caller.dispatches).toEqual([]);
    assertNoFallback(caller);
  });

  for (const field of [
    "claims",
    "client",
    "authObject",
    "authMethod",
    "subject",
    "role",
    "anonymous",
  ] as const) {
    it.each([
      "request",
      "schema",
      "primary-build",
      "primary-await",
      "list-build",
      "list-await",
    ] as const)(
      `rejects captured ${field} loss at %s before downstream dispatch or return`,
      async (stage) => {
        const replacement = client();
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
              table === "customer_communications" &&
              method === "abortSignal"
            )
              changeBoundary();
          },
        });
        const callerContext = context(caller);
        const originalGetUser = caller.auth.getUser;
        function changeBoundary() {
          if (field === "claims") callerContext.claims = { ...callerContext.claims };
          if (field === "client") callerContext.supabase = replacement;
          if (field === "authObject") caller.auth = { ...caller.auth };
          if (field === "authMethod") {
            caller.auth.getUser = vi.fn((suppliedToken: string) => originalGetUser(suppliedToken));
            expect(caller.auth.getUser).not.toBe(originalGetUser);
          }
          if (field === "subject") callerContext.claims.sub = otherCustomer;
          if (field === "role") callerContext.claims.role = "service_role";
          if (field === "anonymous") callerContext.claims.is_anonymous = true;
        }
        if (stage === "request") {
          mocks.getRequest.mockImplementationOnce(() => {
            changeBoundary();
            return currentRequest();
          });
        }
        if (stage === "schema") {
          caller.schema.mockImplementationOnce(() => {
            changeBoundary();
            return caller.native;
          });
        }
        await expect(call(request(), callerContext)).rejects.toThrow(failure);
        expect(originalGetUser).toHaveBeenCalledTimes(stage === "request" ? 0 : 1);
        if (stage !== "request") expect(originalGetUser).toHaveBeenCalledWith(token);
        expect(caller.dispatches).toEqual(
          stage === "list-await"
            ? ["customers", "customer_communications"]
            : stage === "primary-await" || stage === "list-build"
              ? ["customers"]
              : [],
        );
        if (stage === "request") expect(caller.schema).not.toHaveBeenCalled();
        if (stage === "request" || stage === "schema") expect(caller.from).not.toHaveBeenCalled();
        if (stage === "primary-await")
          expect(caller.from).toHaveBeenCalledExactlyOnceWith("customers");
        expect(replacement.auth.getUser).not.toHaveBeenCalled();
        expect(replacement.schema).not.toHaveBeenCalled();
        expect(replacement.dispatches).toEqual([]);
        assertNoFallback(caller);
        assertNoFallback(replacement);
      },
    );
  }

  it.each([
    "actor",
    "subject",
    "role",
    "anonymous",
    "claims",
    "client",
    "authObject",
    "authMethod",
    "authorization",
    "headers",
    "headerMethod",
    "signal",
  ] as const)("does not bind native schema after %s changes during Auth wait", async (field) => {
    const pending = deferred<unknown>();
    const caller = client();
    const replacement = client();
    const callerContext = context(caller);
    const liveRequest = currentRequest();
    mocks.getRequest.mockReturnValue(liveRequest);
    caller.auth.getUser.mockReturnValue(pending.promise);
    const originalGetUser = caller.auth.getUser;
    const result = call(request(), callerContext);
    expect(originalGetUser).toHaveBeenCalledExactlyOnceWith(token);
    if (field === "actor") callerContext.userId = otherCustomer;
    if (field === "subject") callerContext.claims.sub = otherCustomer;
    if (field === "role") callerContext.claims.role = "service_role";
    if (field === "anonymous") callerContext.claims.is_anonymous = true;
    if (field === "claims") callerContext.claims = { ...callerContext.claims };
    if (field === "client") callerContext.supabase = replacement;
    if (field === "authObject") caller.auth = { ...caller.auth };
    if (field === "authMethod") {
      caller.auth.getUser = vi.fn((suppliedToken: string) => originalGetUser(suppliedToken));
      expect(caller.auth.getUser).not.toBe(originalGetUser);
    }
    if (field === "authorization")
      liveRequest.headers.set("authorization", "Bearer another.access.token");
    if (field === "headers") liveRequest.headers = new Headers(liveRequest.headers);
    if (field === "headerMethod") {
      const originalGet = liveRequest.headers.get;
      liveRequest.headers.get = vi.fn((name: string) =>
        originalGet.call(liveRequest.headers, name),
      );
    }
    if (field === "signal") liveRequest.signal = new AbortController().signal;
    pending.resolve({ data: { user: { id: accountId } }, error: null });
    await expect(result).rejects.toThrow(failure);
    expect(caller.schema).not.toHaveBeenCalled();
    expect(caller.dispatches).toEqual([]);
    expect(replacement.auth.getUser).not.toHaveBeenCalled();
    expect(replacement.schema).not.toHaveBeenCalled();
    expect(replacement.dispatches).toEqual([]);
    assertNoFallback(caller);
    assertNoFallback(replacement);
  });

  for (const stop of ["abort", "timeout"] as const) {
    it.each(["resolve", "reject"] as const)(
      `${stop} bounds Auth wait and ignores late %s without native reads`,
      async (settlement) => {
        vi.useFakeTimers();
        const pending = deferred<unknown>();
        const caller = client();
        const removeAbortListener = vi.spyOn(controller.signal, "removeEventListener");
        caller.auth.getUser.mockReturnValue(pending.promise);
        const result = call(request(), context(caller));
        const assertion = expect(result).rejects.toThrow(failure);
        if (stop === "abort") controller.abort(new Error("PRIVATE cancellation reason"));
        else {
          let settled = false;
          void result.then(
            () => {
              settled = true;
            },
            () => {
              settled = true;
            },
          );
          await vi.advanceTimersByTimeAsync(9_999);
          expect(settled).toBe(false);
          expect(NATIVE_CALLER_AUTH_WAIT_MS).toBe(10_000);
          await vi.advanceTimersByTimeAsync(1);
        }
        await assertion;
        if (settlement === "resolve")
          pending.resolve({ data: { user: { id: accountId } }, error: null });
        else pending.reject(new Error(`PRIVATE late Auth ${token}`));
        await Promise.resolve();
        expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
        expect(caller.schema).not.toHaveBeenCalled();
        expect(caller.dispatches).toEqual([]);
        expect(vi.getTimerCount()).toBe(0);
        expect(removeAbortListener).toHaveBeenCalledWith("abort", expect.any(Function));
        removeAbortListener.mockRestore();
        assertNoFallback(caller);
      },
    );
  }
  it("rejects a pre-aborted request before schema dispatch without exposing its reason", async () => {
    controller.abort(new Error("PRIVATE cancellation reason"));
    const caller = client();
    await expect(call(request(), context(caller))).rejects.toThrow(failure);
    expect(caller.schema).not.toHaveBeenCalled();
    expect(caller.auth.getUser).not.toHaveBeenCalled();
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
              table === "customer_communications" &&
              method === "abortSignal"
            )
              changeBoundary();
          },
        });
        const callerContext = context(caller);
        if (stage === "request") {
          mocks.getRequest.mockImplementationOnce(() => {
            changeBoundary();
            return currentRequest();
          });
        }
        if (stage === "schema") {
          caller.schema.mockImplementationOnce(() => {
            changeBoundary();
            return caller.native;
          });
        }
        await expect(call(request(), callerContext)).rejects.toThrow(failure);
        const dispatched =
          stage === "list-await"
            ? ["customers", "customer_communications"]
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

  it("rejects malformed or mismatched customer identities before a downstream read", async () => {
    for (const payload of [
      undefined,
      [],
      {},
      { id: otherCustomer },
      { id: customerId, private: "PRIVATE" },
    ]) {
      const caller = client({ primary: { data: payload, error: null } });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      expect(caller.dispatches).toEqual(["customers"]);
      expect(caller.from).toHaveBeenCalledTimes(1);
      assertNoFallback(caller);
    }
  });
  it("hides primary backend and transport errors without fallback or child reads", async () => {
    for (const primary of [
      { data: { id: customerId }, error: { message: "PRIVATE primary error" } },
      Promise.reject(new Error("PRIVATE transport error")),
    ]) {
      const caller = client({ primary });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      expect(caller.dispatches).toEqual(["customers"]);
      expect(caller.from).toHaveBeenCalledTimes(1);
      assertNoFallback(caller);
    }
  });
  it("returns at most200 in received order with hasMore only for the201st sentinel", async () => {
    for (const length of [0, 1, 199, 200, 201]) {
      const rows = rowsOf(length);
      const caller = client({ list: { data: rows, error: null } });
      await expect(call(request(), context(caller))).resolves.toEqual({
        available: true,
        rows: rows.slice(0, 200),
        hasMore: length === 201,
      });
      assertList(caller);
    }
  });
  it("rejects over201 records rather than trusting or silently trimming an overbound response", async () => {
    const caller = client({ list: { data: rowsOf(202), error: null } });
    await expect(call(request(), context(caller))).rejects.toThrow(failure);
    assertList(caller);
  });
  it("rejects duplicate UUIDs case-insensitively, including a repeated sentinel identity", async () => {
    const id = "00000000-0000-4000-8000-0000000000cd";
    const duplicateSentinel = rowsOf(201);
    duplicateSentinel[200] = { ...duplicateSentinel[0] };
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
  it("rejects wrong or missing customer bindings, including a wrong-customer sentinel", async () => {
    const wrongSentinel = rowsOf(201);
    wrongSentinel[200] = { ...wrongSentinel[200], customer_id: otherCustomer };
    for (const payload of [
      [{ ...row(), customer_id: otherCustomer }],
      [{ ...row(), customer_id: null }],
      wrongSentinel,
    ]) {
      const caller = client({ list: { data: payload, error: null } });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      assertList(caller);
    }
  });
  it("validates complete sentinel fields and scope before discarding it from display", async () => {
    for (const patch of [
      { status: "logged" },
      { content: null },
      { date: "2026-10-15" },
      { attachment_url: "PRIVATE" },
    ]) {
      const rows = rowsOf(201);
      const payload = [...rows.slice(0, 200), { ...rows[200], ...patch }];
      const caller = client({ list: { data: payload, error: null } });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      assertList(caller);
    }
  });
  it("rejects malformed, incomplete and extra-field lists rather than guessing an empty log", async () => {
    const incomplete = { ...row() };
    delete (incomplete as { subject?: string | null }).subject;
    for (const payload of [
      null,
      undefined,
      {},
      [incomplete],
      [{ ...row(), staff_member_id: "PRIVATE" }],
      [{ ...row(), id: "legacy-id" }],
    ]) {
      const caller = client({ list: { data: payload, error: null } });
      await expect(call(request(), context(caller))).rejects.toThrow(failure);
      assertList(caller);
    }
  });
  it("accepts the exact verified type/direction/status vocabularies without translating records", async () => {
    const rows: CustomerCommunication[] = [];
    for (const type of ["email", "phone", "text", "in-person"] as const) {
      for (const direction of ["incoming", "outgoing"] as const) {
        for (const status of ["completed", "pending", "failed"] as const) {
          rows.push({ ...row(rows.length + 100), type, direction, status });
        }
      }
    }
    const caller = client({ list: { data: rows, error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows,
      hasMore: false,
    });
    assertList(caller);
  });
  it.each([
    ["type", "call"],
    ["type", "sms"],
    ["type", "note"],
    ["direction", "inbound"],
    ["direction", "outbound"],
    ["direction", "internal"],
    ["status", "logged"],
  ] as const)("rejects incompatible %s vocabulary %s", async (field, value) => {
    const caller = client({ list: { data: [{ ...row(), [field]: value }], error: null } });
    await expect(call(request(), context(caller))).rejects.toThrow(failure);
    assertList(caller);
  });
  it.each([
    "id",
    "customer_id",
    "type",
    "direction",
    "content",
    "date",
    "staff_member_name",
    "status",
  ] as const)("rejects null required field %s", async (field) => {
    const caller = client({ list: { data: [{ ...row(), [field]: null }], error: null } });
    await expect(call(request(), context(caller))).rejects.toThrow(failure);
    assertList(caller);
  });
  it("preserves nullable subjects, empty native text, and long existing subject/content/staff names without caps or trimming", async () => {
    const rows = [
      { ...row(), subject: null, content: "", staff_member_name: "" },
      {
        ...row(11),
        subject: " Subject ".repeat(4000),
        content: " Existing log text \n".repeat(8000),
        staff_member_name: " Display name ".repeat(2000),
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
  it("accepts valid offset timestamps and rejects date-only, local, impossible and malformed dates", async () => {
    const valid = [
      { ...row(), date: "2028-02-29T12:34:56Z" },
      { ...row(11), date: "2026-10-15T21:14:13-05:00" },
    ];
    const caller = client({ list: { data: valid, error: null } });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows: valid,
      hasMore: false,
    });
    for (const date of [
      "2026-10-15",
      "2026-10-15T12:00:00",
      "2026-02-30T12:00:00Z",
      "2026-10-15T12:00:00+25:00",
      "handwritten",
    ]) {
      const invalidCaller = client({ list: { data: [{ ...row(), date }], error: null } });
      await expect(call(request(), context(invalidCaller))).rejects.toThrow(failure);
      assertList(invalidCaller);
    }
  });
  it("validates customer UUIDs case-insensitively without rewriting returned values", async () => {
    const rows = [{ ...row(), customer_id: customerId.toUpperCase() }];
    const caller = client({
      primary: { data: { id: customerId.toUpperCase() }, error: null },
      list: { data: rows, error: null },
    });
    await expect(call(request(), context(caller))).resolves.toEqual({
      available: true,
      rows,
      hasMore: false,
    });
    assertList(caller);
  });
  it("hides list backend and transport errors without automatic retry or a broader reader", async () => {
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
