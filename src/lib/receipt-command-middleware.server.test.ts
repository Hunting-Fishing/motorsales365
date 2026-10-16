import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safeObjectMerge } from "@tanstack/start-client-core";
import { receiptCommandMiddleware } from "./receipt-command-middleware.server";
import { recordVehicleReceiptExpense, getVehicleReceipts } from "./vehicle-receipts.functions";
import { RECEIPT_EXPENSE_FAILURE } from "./vehicle-receipt-expense-contract";

// Actual core ingress, owned middleware and actual handler/validator; SDK and
// framework invocation are mocked. Merge uses the installed TanStack helper.
// No signed JWT/network/Auth session/native shop or financial authorization,
// database commit/rollback/cancellation or real HTTP serialization is proved.
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  createClient: vi.fn(),
  generatedAuth: { name: "requireSupabaseAuth" },
  registered: new Map<unknown, { method: string; middleware: unknown[] }>(),
}));
vi.mock("@tanstack/react-start", async () => {
  const actual = await import("@tanstack/start-client-core");
  return {
    createMiddleware: actual.createMiddleware,
    createServerFn: ({ method }: { method: string }) => {
      let validate = (data: unknown): unknown => data;
      let middleware: unknown[] = [];
      const builder = {
        middleware: (value: unknown[]) => {
          middleware = value;
          return builder;
        },
        inputValidator: (value: (data: unknown) => unknown) => {
          validate = value;
          return builder;
        },
        handler: (handler: (args: { data: unknown; context: unknown }) => unknown) => {
          const run = async (args: { data: unknown; context: unknown }) =>
            handler({ ...args, data: validate(args.data) });
          mocks.registered.set(run, { method, middleware });
          return run;
        },
      };
      return builder;
    },
  };
});
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocks.request }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mocks.createClient(...args),
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: mocks.generatedAuth,
}));

const account = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherAccount = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const receiptId = "11111111-1111-4111-8111-111111111111";
const shopVehicleId = "22222222-2222-4222-8222-222222222222";
const expenseId = "33333333-3333-4333-8333-333333333333";
const sessionId = "44444444-4444-4444-8444-444444444444";
const token = "fixture.access.token";
const issuer = "https://wjxaajgvddtrxxtocxen.supabase.co/auth/v1";
const input = () => ({
  expectedAccountId: account,
  id: receiptId,
  expectedShopVehicleId: shopVehicleId,
});
const acknowledgment = () => ({ receiptId, shopVehicleId, expenseId });
type Context = Record<string, unknown> & { claims: Record<string, unknown> };
type Response = { data: unknown; error: unknown };
type Stage = "target" | "expense";
type Read = {
  stage: Stage;
  projection?: string;
  filters: [string, unknown][];
  signal?: AbortSignal;
  retry?: boolean;
  single?: boolean;
  args?: unknown;
};
let issuedAt: number;
let controller: AbortController;
let request: Request;
const claims = () => ({
  sub: account,
  role: "authenticated",
  is_anonymous: false,
  iss: issuer,
  aud: "authenticated",
  session_id: sessionId,
  iat: issuedAt,
  exp: issuedAt + 3600,
  aal: "aal1",
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
function sdk(
  options: {
    responses?: Partial<Record<Stage, Response | Promise<Response>>>;
    onBuild?: (read: Read, operation: string) => void;
    onResult?: (read: Read) => void;
  } = {},
) {
  const reads: Read[] = [];
  function builder(read: Read) {
    const step = (name: string) => {
      options.onBuild?.(read, name);
      return query;
    };
    const query = {
      select: (value: string) => {
        read.projection = value;
        return step("select");
      },
      eq: (key: string, value: unknown) => {
        read.filters.push([key, value]);
        return step("eq");
      },
      abortSignal: (signal: AbortSignal) => {
        read.signal = signal;
        return step("abortSignal");
      },
      retry: (retry: boolean) => {
        read.retry = retry;
        return step("retry");
      },
      single: () => {
        read.single = true;
        return step("single");
      },
      then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) => {
        reads.push({ ...read, filters: [...read.filters] });
        return Promise.resolve(
          options.responses?.[read.stage] ?? {
            data:
              read.stage === "target"
                ? { id: receiptId, shop_vehicle_id: shopVehicleId }
                : expenseId,
            error: null,
          },
        )
          .then((value) => {
            options.onResult?.(read);
            return value;
          })
          .then(resolve, reject);
      },
    };
    return query;
  }
  const authSpies = {
    getClaims: vi.fn(async (_token: string) => ({ data: { claims: claims() }, error: null })),
    getUser: vi.fn(async (_token: string) => ({
      data: { user: { id: account, is_anonymous: false } },
      error: null,
    })),
  };
  const client = {
    auth: {
      ...authSpies,
      url: "https://wjxaajgvddtrxxtocxen.supabase.co/auth/v1",
      headers: {} as Record<string, string>,
      fetch: globalThis.fetch,
    },
    // The actual core installs private wrappers; retain original SDK spies for
    // observations instead of pretending its wrappers are Vitest mock methods.
    authSpies,
    from: vi.fn((table: string) => {
      expect(table).toBe("vehicle_receipts");
      return builder({ stage: "target", filters: [] });
    }),
    rpc: vi.fn((name: string, args: unknown) => {
      expect(name).toBe("record_vehicle_receipt_expense");
      return builder({ stage: "expense", args, filters: [] });
    }),
    storage: {
      from: vi.fn(() => {
        throw new Error("No Storage in expense ingress");
      }),
    },
    fetch: globalThis.fetch,
    rest: {
      url: "https://wjxaajgvddtrxxtocxen.supabase.co/rest/v1",
      schemaName: "public",
      headers: new Headers(),
      fetch: globalThis.fetch,
      from: (_table: string): unknown => undefined,
      rpc: (_name: string, _args: unknown): unknown => undefined,
    },
    reads,
  };
  mocks.createClient.mockImplementation(
    (
      _origin: string,
      key: string,
      options: {
        global: { headers: Record<string, string>; fetch: typeof fetch };
      },
    ) => {
      const credentials = { ...options.global.headers, apikey: key };
      client.auth.headers = credentials;
      client.auth.fetch = options.global.fetch;
      client.fetch = options.global.fetch;
      client.rest.headers = new Headers(credentials);
      client.rest.fetch = options.global.fetch;
      client.rest.from = client.from;
      client.rest.rpc = client.rpc;
      return client;
    },
  );
  return client;
}
function handler(context: unknown, data: unknown = input()) {
  return (
    recordVehicleReceiptExpense as unknown as (args: {
      data: unknown;
      context: unknown;
    }) => Promise<unknown>
  )({ context, data });
}
function serve(next: (args: { context: Context }) => Promise<unknown>) {
  return (
    receiptCommandMiddleware as unknown as {
      options: { server: (args: { next: typeof next }) => Promise<unknown> };
    }
  ).options.server({ next });
}
async function mint() {
  let context!: Context;
  const next = vi.fn(async (args: { context: Context }) => {
    context = args.context;
    return { context };
  });
  await serve(next);
  return { context, next };
}
function merged(context: Context): Context {
  return safeObjectMerge<Record<string, unknown>>(
    { priorMiddleware: "unrelated" },
    context,
  ) as Context;
}
async function connected(change?: (context: Context) => void, data: unknown = input()) {
  return serve(async ({ context }) => {
    const current = merged(context);
    change?.(current);
    return handler(current, data);
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://wjxaajgvddtrxxtocxen.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_fixture_key_1234567890");
  issuedAt = Math.floor(Date.now() / 1000) - 60;
  controller = new AbortController();
  request = new Request("https://app.example.test/receipt-expense", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    signal: controller.signal,
  });
  mocks.request.mockReturnValue(request);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("actual receipt command middleware to expense handler", () => {
  it("registers the owned middleware only for expense while the ordinary reader retains generated auth", () => {
    expect(mocks.registered.get(recordVehicleReceiptExpense)).toEqual({
      method: "POST",
      middleware: [receiptCommandMiddleware],
    });
    expect(mocks.registered.get(getVehicleReceipts)?.middleware).toEqual([mocks.generatedAuth]);
  });

  it("captures getRequest once in the real adapter and forwards a frozen core context/capability", async () => {
    const client = sdk();
    const result = await mint();
    expect(mocks.request).toHaveBeenCalledExactlyOnceWith();
    expect(result.next).toHaveBeenCalledExactlyOnceWith({ context: result.context });
    expect(Object.isFrozen(result.context)).toBe(true);
    expect(Object.isFrozen(result.context.receiptCommand)).toBe(true);
    expect(result.context.supabase).toBe(client);
    expect(result.context.userId).toBe(account);
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("accepts the real same-request cap through installed TanStack shallow merge without another handler Auth lookup", async () => {
    const client = sdk();
    await expect(
      connected((context) => {
        expect(Object.getPrototypeOf(context)).toBe(null);
      }),
    ).resolves.toEqual(acknowledgment());
    expect(client.authSpies.getClaims.mock.calls).toEqual([[token], [token]]);
    expect(client.authSpies.getUser.mock.calls).toEqual([[token]]);
    expect(client.authSpies.getClaims.mock.invocationCallOrder[1]).toBeLessThan(
      client.authSpies.getUser.mock.invocationCallOrder[0],
    );
    expect(client.from).toHaveBeenCalledExactlyOnceWith("vehicle_receipts");
    expect(client.rpc).toHaveBeenCalledExactlyOnceWith("record_vehicle_receipt_expense", {
      _id: receiptId,
    });
    expect(client.reads).toEqual([
      {
        stage: "target",
        filters: [["id", receiptId]],
        projection: "id,shop_vehicle_id",
        signal: request.signal,
        retry: false,
        single: true,
      },
      {
        stage: "expense",
        filters: [],
        args: { _id: receiptId },
        signal: request.signal,
        retry: false,
      },
    ]);
    expect(client.storage.from).not.toHaveBeenCalled();
    // These are explicit SDK mock calls, not total Auth network requests.
  });

  it.each(["absent", "fabricated", "copied"] as const)(
    "refuses a %s capability before any selected-row/native dispatch",
    async (kind) => {
      const client = sdk();
      const { context } = await mint();
      const value = merged(context);
      if (kind === "absent") Reflect.deleteProperty(value, "receiptCommand");
      else
        value.receiptCommand =
          kind === "copied" ? { ...(context.receiptCommand as object) } : Object.freeze({});
      await expect(handler(value)).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
      expect(client.from).not.toHaveBeenCalled();
      expect(client.rpc).not.toHaveBeenCalled();
    },
  );

  it("refuses an otherwise identical new Request rather than adopting a cross-request capability", async () => {
    const client = sdk();
    const { context } = await mint();
    mocks.request.mockReturnValue(
      new Request(request.url, { method: "POST", headers: request.headers }),
    );
    await expect(handler(merged(context))).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it.each(["client", "claims", "getUser", "getClaims"] as const)(
    "refuses %s member replacement between middleware and handler",
    async (kind) => {
      const client = sdk();
      const { context } = await mint();
      const value = merged(context);
      if (kind === "client") value.supabase = sdk();
      if (kind === "claims") value.claims = { ...context.claims };
      if (kind === "getUser") client.auth.getUser = vi.fn(client.auth.getUser);
      if (kind === "getClaims") client.auth.getClaims = vi.fn(client.auth.getClaims);
      await expect(handler(value)).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
      expect(client.from).not.toHaveBeenCalled();
      expect(client.rpc).not.toHaveBeenCalled();
    },
  );

  it.each([
    "auth-header",
    "rest-header",
    "rest-fetch",
    "rest-schema",
    "rest-url",
    "client-fetch",
  ] as const)("refuses captured SDK %s drift between real middleware and handler", async (kind) => {
    const client = sdk();
    const { context } = await mint();
    if (kind === "auth-header") client.auth.headers.Authorization = "Bearer changed.access.token";
    if (kind === "rest-header")
      client.rest.headers.set("authorization", "Bearer changed.access.token");
    if (kind === "rest-fetch") client.rest.fetch = vi.fn(globalThis.fetch);
    if (kind === "rest-schema") client.rest.schemaName = "shop_manager";
    if (kind === "rest-url") client.rest.url = "https://another-project.example/rest/v1";
    if (kind === "client-fetch") client.fetch = vi.fn(globalThis.fetch);
    await expect(handler(merged(context))).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("preserves account-changed denial and never dispatches a different expected account", async () => {
    const client = sdk();
    const { context } = await mint();
    await expect(
      handler(merged(context), { ...input(), expectedAccountId: otherAccount }),
    ).rejects.toThrow("Account changed. Refresh before recording a receipt expense.");
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("binds one receipt id through the actual handler and refuses rebinding or revival without another native dispatch", async () => {
    const client = sdk();
    const { context } = await mint();
    await expect(handler(merged(context))).resolves.toEqual(acknowledgment());
    await expect(handler(merged(context), { ...input(), id: otherAccount })).rejects.toThrow(
      RECEIPT_EXPENSE_FAILURE,
    );
    await expect(handler(merged(context))).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
    expect(client.from).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.authSpies.getClaims).toHaveBeenCalledTimes(2);
    expect(client.authSpies.getUser).toHaveBeenCalledTimes(1);
    // Rebinding denial is not a durable or cross-request idempotency contract.
  });

  it("refuses credential drift and cannot revive a cap after an observed header A -> B -> A", async () => {
    const client = sdk();
    const { context } = await mint();
    request.headers.set("authorization", "Bearer changed.access.token");
    await expect(handler(merged(context))).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
    request.headers.set("authorization", `Bearer ${token}`);
    await expect(handler(merged(context))).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("refuses an aborted original request even after successful ingress verification", async () => {
    const client = sdk();
    const { context } = await mint();
    controller.abort();
    await expect(handler(merged(context))).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("does not dispatch target/native work when the actual core Auth verifier rejects", async () => {
    const client = sdk();
    client.authSpies.getUser.mockRejectedValue(new Error("PRIVATE current-user diagnostic"));
    const result = await connected().catch((error: unknown) => error);
    expect(result).toBeInstanceOf(Error);
    expect(String(result)).not.toContain("PRIVATE");
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("keeps the actual validator and refuses malformed intent after middleware but before target dispatch", async () => {
    const client = sdk();
    await expect(connected(undefined, { ...input(), extra: true })).rejects.toThrow(
      "Invalid receipt expense request.",
    );
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it.each(["target", "expense"] as const)(
    "refuses late %s credential loss without financial acknowledgment or retry",
    async (stage) => {
      const pending = deferred<Response>();
      const client = sdk({ responses: { [stage]: pending.promise } });
      const result = connected();
      const denied = expect(result).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
      await vi.waitFor(() => expect(client.reads.map((read) => read.stage)).toContain(stage));
      request.headers.set("authorization", "Bearer changed.access.token");
      pending.resolve({
        data: stage === "target" ? { id: receiptId, shop_vehicle_id: shopVehicleId } : expenseId,
        error: null,
      });
      await denied;
      expect(client.rpc).toHaveBeenCalledTimes(stage === "expense" ? 1 : 0);
      // A denied acknowledgment after native dispatch is unknown, not rollback.
    },
  );

  it.each(["target", "expense"] as const)(
    "sanitizes %s provider rejection after real ingress with no fallback client",
    async (stage) => {
      const pending = deferred<Response>();
      const client = sdk({ responses: { [stage]: pending.promise } });
      const result = connected();
      const denied = expect(result).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
      await vi.waitFor(() => expect(client.reads.map((read) => read.stage)).toContain(stage));
      pending.reject(new Error("PRIVATE SDK provider diagnostic"));
      await denied;
      expect(mocks.createClient).toHaveBeenCalledTimes(1);
      expect(client.rpc).toHaveBeenCalledTimes(stage === "expense" ? 1 : 0);
    },
  );

  it("retains selected shop target validation despite a valid ingress capability", async () => {
    const client = sdk({
      responses: {
        target: { data: { id: receiptId, shop_vehicle_id: otherAccount }, error: null },
      },
    });
    await expect(connected()).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
