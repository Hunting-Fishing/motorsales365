// Actual server handlers + synthetic fluent caller SDK. No JWT/RLS/native shop,
// database cancellation, private storage, total or financial acceptance proof.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getShopExpenseScope, getShopExpenseReadPage } from "./shop-expenses-read.functions";
import {
  SHOP_EXPENSE_READ_FAILURE,
  shopExpenseReadProjections,
  type ShopExpenseKind,
} from "./shop-expenses-read-contract";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  writes: vi.fn(),
  privileged: vi.fn(),
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
        (fn: (options: { data: unknown; context: unknown }) => unknown) =>
        async (options: { data: unknown; context: unknown }) => {
          const data = validate(options.data);
          mocks.validated = data;
          return fn({ ...options, data });
        },
    };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocks.request }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: mocks.privileged, rpc: mocks.privileged },
}));
const uid = (n: number) => `00000000-aaaa-4000-8000-${String(n).padStart(12, "0")}`;
const account = uid(1),
  shop = uid(2),
  customer = uid(3),
  TOKEN = "fixture.access.token";
const input = (kind: ShopExpenseKind = "expenses", page = 0) => ({
  expectedAccountId: account,
  expectedShopId: shop,
  kind,
  page,
});
const row = (kind: ShopExpenseKind, changes: Record<string, unknown> = {}) =>
  kind === "expenses"
    ? {
        id: uid(9),
        shop_id: shop,
        amount: "-1.25",
        tax_amount: 0,
        expense_date: "2026-10-16",
        payment_method: null,
        reference_number: null,
        description: "Private expense",
        status: "recorded",
        category_id: null,
        receipt_url: null,
        vehicle_id: null,
        vehicle_receipt_id: null,
        ...changes,
      }
    : kind === "categories"
      ? { id: uid(9), shop_id: shop, name: "Category", is_active: true, ...changes }
      : {
          id: uid(9),
          customer_id: customer,
          owner_type: "customer",
          make: "Make",
          model: "Model",
          license_plate: null,
          customers: { id: customer, shop_id: shop },
          ...changes,
        };
type Stage = "scope" | ShopExpenseKind;
type Read = {
  stage: Stage;
  table?: string;
  rpc?: string;
  projection?: string;
  options?: unknown;
  filters: Record<string, unknown>;
  orders: unknown[];
  range?: number[];
  signal?: AbortSignal;
  retry?: boolean;
};
type Response = { data: unknown; error: unknown; count?: unknown };
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
let controller: AbortController;
const request = () => ({
  signal: controller.signal,
  headers: new Headers({ authorization: `Bearer ${TOKEN}` }),
});
function client(
  options: {
    responses?: Partial<Record<Stage, unknown | ((read: Read) => unknown)>>;
    onBuild?: (read: Read, method: string) => void;
    onResult?: (read: Read) => void;
    onSchema?: () => void;
  } = {},
) {
  const reads: Read[] = [];
  function builder(read: Read) {
    function op(method: string) {
      options.onBuild?.(read, method);
      return query;
    }
    const query = {
      select: (projection: string, queryOptions?: unknown) => {
        read.projection = projection;
        read.options = queryOptions;
        return op("select");
      },
      eq: (key: string, value: unknown) => {
        read.filters[key] = value;
        return op("eq");
      },
      order: (key: string, value: unknown) => {
        read.orders.push([key, value]);
        return op("order");
      },
      range: (from: number, to: number) => {
        read.range = [from, to];
        return op("range");
      },
      abortSignal: (signal: AbortSignal) => {
        read.signal = signal;
        return op("abortSignal");
      },
      retry: (enabled: boolean) => {
        read.retry = enabled;
        return op("retry");
      },
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => {
        const snapshot = { ...read, filters: { ...read.filters }, orders: [...read.orders] };
        reads.push(snapshot);
        const fallback: Response =
          read.stage === "scope"
            ? { data: shop, error: null }
            : { data: [row(read.stage)], error: null, count: 1 };
        const value = Object.hasOwn(options.responses ?? {}, read.stage)
          ? options.responses?.[read.stage]
          : fallback;
        return Promise.resolve()
          .then(() => (typeof value === "function" ? value(snapshot) : value))
          .then((response) => {
            options.onResult?.(snapshot);
            return response;
          })
          .then(resolve, reject);
      },
      insert: mocks.writes,
      update: mocks.writes,
      delete: mocks.writes,
    };
    return query;
  }
  const native = {
    from: vi.fn((table: string) =>
      builder({
        stage: table === "expense_categories" ? "categories" : (table as ShopExpenseKind),
        table,
        filters: {},
        orders: [],
      }),
    ),
    rpc: vi.fn((name: string) => builder({ stage: "scope", rpc: name, filters: {}, orders: [] })),
  };
  return {
    auth: {
      getUser: vi.fn(
        (_token: string): Promise<unknown> =>
          Promise.resolve({ data: { user: { id: account } }, error: null }),
      ),
    },
    schema: vi.fn((_name: string) => {
      options.onSchema?.();
      return native;
    }),
    native,
    reads,
  };
}
const context = (supabase: ReturnType<typeof client>) => ({
  userId: account,
  claims: { sub: account, role: "authenticated", is_anonymous: false },
  supabase,
});
const scope = (data: unknown, ctx: unknown) =>
  (
    getShopExpenseScope as unknown as (options: {
      data: unknown;
      context: unknown;
    }) => Promise<unknown>
  )({ data, context: ctx });
const page = (data: unknown, ctx: unknown) =>
  (
    getShopExpenseReadPage as unknown as (options: {
      data: unknown;
      context: unknown;
    }) => Promise<unknown>
  )({ data, context: ctx });
beforeEach(() => {
  vi.clearAllMocks();
  controller = new AbortController();
  mocks.request.mockReturnValue(request());
});
afterEach(() => {
  vi.useRealTimers();
  expect(mocks.writes).not.toHaveBeenCalled();
  expect(mocks.privileged).not.toHaveBeenCalled();
});
describe("observed native shop scope only", () => {
  it.each([shop, null])(
    "returns only stable nullable resolver observation %j without profile/shop/data prerequisites",
    async (shopId) => {
      const caller = client({ responses: { scope: { data: shopId, error: null } } });
      await expect(scope({ expectedAccountId: account }, context(caller))).resolves.toEqual({
        available: shopId !== null,
        shopId,
      });
      expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(TOKEN);
      expect(caller.schema).toHaveBeenCalledExactlyOnceWith("shop_manager");
      expect(caller.native.from).not.toHaveBeenCalled();
      expect(caller.native.rpc.mock.calls).toEqual([
        ["get_current_user_shop_id"],
        ["get_current_user_shop_id"],
      ]);
      for (const read of caller.reads)
        expect(read).toMatchObject({ signal: controller.signal, retry: false });
    },
  );
  it("denies observed scope rebound instead of adopting another shop", async () => {
    let count = 0;
    const caller = client({
      responses: { scope: () => ({ data: ++count === 1 ? shop : uid(99), error: null }) },
    });
    await expect(scope({ expectedAccountId: account }, context(caller))).rejects.toThrow(
      SHOP_EXPENSE_READ_FAILURE,
    );
    expect(caller.native.from).not.toHaveBeenCalled();
  });
  it.each([
    {},
    null,
    { expectedAccountId: "opaque" },
    { expectedAccountId: account, shopId: shop },
  ])("rejects unsupported scope input %j before request access", async (data) => {
    const caller = client();
    await expect(scope(data, context(caller))).rejects.toThrow("Invalid shop scope request.");
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
describe("independent fixed bounded shop read kinds", () => {
  it.each(["expenses", "categories", "vehicles"] as const)(
    "reads %s through the same caller with pre/post resolver binding and exact range",
    async (kind) => {
      const caller = client();
      await expect(page(input(kind), context(caller))).resolves.toMatchObject({
        kind,
        shopId: shop,
        page: 0,
        totalCount: 1,
        hasNext: false,
        rows: [row(kind)],
      });
      expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(TOKEN);
      expect(caller.schema).toHaveBeenCalledExactlyOnceWith("shop_manager");
      expect(caller.reads.map((read) => read.stage)).toEqual(["scope", kind, "scope"]);
      const list = caller.reads[1];
      expect(list).toMatchObject({
        projection: shopExpenseReadProjections[kind],
        options: { count: "exact" },
        range: [0, 99],
      });
      expect(list.filters).toEqual(
        kind === "vehicles"
          ? {}
          : { shop_id: shop, ...(kind === "categories" ? { is_active: true } : {}) },
      );
      expect(list.orders).toEqual(
        kind === "expenses"
          ? [
              ["expense_date", { ascending: false }],
              ["id", { ascending: false }],
            ]
          : [
              [kind === "categories" ? "name" : "make", { ascending: true }],
              ["id", { ascending: true }],
            ],
      );
      for (const read of caller.reads)
        expect(read).toMatchObject({ signal: controller.signal, retry: false });
      expect(caller.native.from).not.toHaveBeenCalledWith("shops");
    },
  );
  it.each(["expenses", "categories", "vehicles"] as const)(
    "returns %s page2 without inferring a monthly total or complete inventory",
    async (kind) => {
      const caller = client({
        responses: { [kind]: { data: [row(kind)], error: null, count: 101 } },
      });
      const result = await page(input(kind, 1), context(caller));
      expect(result).toMatchObject({ kind, page: 1, totalCount: 101, hasNext: false });
      expect(result).not.toHaveProperty("totalMTD");
      expect(caller.reads[1].range).toEqual([100, 199]);
    },
  );
  it.each([null, uid(99), "opaque", {}, []])(
    "refuses missing/malformed/wrong prior-shop observation %j before a list query",
    async (shopId) => {
      const caller = client({ responses: { scope: { data: shopId, error: null } } });
      await expect(page(input(), context(caller))).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
      expect(caller.native.from).not.toHaveBeenCalled();
    },
  );
  it("captures immutable account/priorShop/kind/page before request hooks can mutate validated data", async () => {
    const caller = client();
    mocks.request.mockImplementationOnce(() => {
      Object.assign(mocks.validated as object, {
        expectedAccountId: uid(99),
        expectedShopId: uid(98),
        kind: "vehicles",
        page: 1,
      });
      return request();
    });
    await expect(page(input(), context(caller))).resolves.toMatchObject({
      kind: "expenses",
      shopId: shop,
      page: 0,
    });
    expect(caller.reads[1].filters).toEqual({ shop_id: shop });
  });
  it("preserves early account denial before request or Auth capability", async () => {
    const caller = client(),
      ctx = { ...context(caller), userId: uid(99) };
    await expect(page(input(), ctx)).rejects.toThrow("Account changed.");
    await expect(scope({ expectedAccountId: account }, ctx)).rejects.toThrow("Account changed.");
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.auth.getUser).not.toHaveBeenCalled();
  });
  it.each([
    null,
    {},
    { ...input(), expectedShopId: "bad" },
    { ...input(), page: -1 },
    { ...input(), kind: "all" },
    { ...input(), limit: 500 },
  ])("rejects malformed page input %j before request access", async (data) => {
    const caller = client();
    await expect(page(data, context(caller))).rejects.toThrow("Invalid shop page request.");
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("preserves company with a verified visible customer but refuses unknown company/null/hidden binding without omission", async () => {
    const good = client({
      responses: {
        vehicles: { data: [row("vehicles", { owner_type: "company" })], count: 1, error: null },
      },
    });
    await expect(page(input("vehicles"), context(good))).resolves.toMatchObject({
      rows: [{ owner_type: "company" }],
    });
    const bad = client({
      responses: {
        vehicles: {
          data: [row("vehicles", { owner_type: "company", customer_id: null, customers: null })],
          count: 1,
          error: null,
        },
      },
    });
    await expect(page(input("vehicles"), context(bad))).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
    expect(bad.native.from).toHaveBeenCalledTimes(1);
    expect(bad.reads[1].filters).toEqual({});
  });
  for (const kind of ["expenses", "categories", "vehicles"] as const) {
    it.each([undefined, null, "1", -1, 0, 2, 101])(
      `denies unknown/contradictory ${kind} exact count%j`,
      async (count) => {
        const caller = client({ responses: { [kind]: { data: [row(kind)], count, error: null } } });
        await expect(page(input(kind), context(caller))).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
        expect(caller.reads.at(-1)?.stage).toBe(kind);
      },
    );
    it.each([undefined, false, "", { message: "PRIVATE SQL" }])(
      `requires explicit error:null at ${kind} with otherwise valid control`,
      async (error) => {
        const control = client();
        await expect(page(input(kind), context(control))).resolves.toMatchObject({ kind });
        const caller = client({ responses: { [kind]: { data: [row(kind)], count: 1, error } } });
        await expect(page(input(kind), context(caller))).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
      },
    );
  }
  it.each([undefined, false, "", { message: "PRIVATE scope" }])(
    "requires explicit resolver error:null %j with valid UUID",
    async (error) => {
      const caller = client({ responses: { scope: { data: shop, error } } });
      await expect(page(input(), context(caller))).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
      expect(caller.native.from).not.toHaveBeenCalled();
    },
  );
  it.each([null, uid(99)])(
    "withholds completed list if observed resolver changes afterward to %j",
    async (shopId) => {
      let reads = 0;
      const caller = client({
        responses: { scope: () => ({ data: ++reads === 1 ? shop : shopId, error: null }) },
      });
      await expect(page(input(), context(caller))).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
      expect(caller.reads.map((read) => read.stage)).toEqual(["scope", "expenses", "scope"]);
    },
  );
});
describe("request/caller/abort and parser checkpoints", () => {
  const losses = ["account", "client", "claims", "auth-method", "header", "abort"] as const;
  function lose(
    ctx: ReturnType<typeof context>,
    loss: (typeof losses)[number],
    req: ReturnType<typeof request>,
  ) {
    if (loss === "account") ctx.userId = uid(99);
    if (loss === "client") ctx.supabase = client();
    if (loss === "claims") ctx.claims.role = "service_role";
    if (loss === "auth-method") {
      const original = ctx.supabase.auth.getUser;
      ctx.supabase.auth.getUser = vi.fn((token: string) => original(token));
    }
    if (loss === "header") req.headers.set("authorization", "Bearer changed.access.token");
    if (loss === "abort") controller.abort(new Error("PRIVATE abort"));
  }
  it.each([
    undefined,
    "",
    "Bearer invalid",
    "bearer fixture.access.token",
    "Bearer fixture.access.token ",
  ])("refuses raw malformed bearer%j before schema access", async (authorization) => {
    const caller = client();
    mocks.request.mockReturnValue({
      signal: controller.signal,
      headers: { get: () => authorization ?? null },
    });
    await expect(page(input(), context(caller))).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
    expect(caller.schema).not.toHaveBeenCalled();
  });
  it.each([
    { sub: account, role: "service_role" },
    { sub: account, role: "authenticated", is_anonymous: true },
    { sub: uid(99), role: "authenticated" },
  ])("denies unsupported claims%j", async (claims) => {
    const caller = client();
    await expect(page(input(), { ...context(caller), claims })).rejects.toThrow(
      SHOP_EXPENSE_READ_FAILURE,
    );
    expect(caller.schema).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { data: { user: null }, error: null },
    { data: { user: { id: uid(99) } }, error: null },
    { data: { user: { id: account, is_anonymous: true } }, error: null },
    { data: { user: { id: account } }, error: false },
  ])("denies invalid current Auth%j", async (value) => {
    const caller = client();
    caller.auth.getUser.mockResolvedValue(value);
    await expect(page(input(), context(caller))).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
    expect(caller.schema).not.toHaveBeenCalled();
  });
  it.each(losses)("captures caller identity before getRequest can alter %s", async (loss) => {
    const caller = client(),
      ctx = context(caller),
      req = request();
    mocks.request.mockImplementationOnce(() => {
      lose(ctx, loss, req);
      if (loss === "header") req.headers.set("authorization", "Bearer malformed");
      return req;
    });
    await expect(page(input(), ctx)).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
    expect(caller.schema).not.toHaveBeenCalled();
  });
  it.each(losses)("denies %s change while getUser is pending", async (loss) => {
    const pending = deferred<unknown>(),
      caller = client(),
      ctx = context(caller),
      req = request();
    mocks.request.mockReturnValue(req);
    caller.auth.getUser.mockReturnValue(pending.promise);
    const result = page(input(), ctx);
    lose(ctx, loss, req);
    pending.resolve({ data: { user: { id: account } }, error: null });
    await expect(result).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
    expect(caller.schema).not.toHaveBeenCalled();
  });
  for (const stage of ["scope", "expenses"] as const)
    for (const point of ["build", "settlement"] as const)
      it.each(losses)(`denies %s loss at ${stage} ${point}`, async (loss) => {
        const req = request();
        const caller = client({
            onBuild: (read, method) => {
              if (point === "build" && read.stage === stage && method === "retry")
                lose(ctx, loss, req);
            },
            onResult: (read) => {
              if (point === "settlement" && read.stage === stage) lose(ctx, loss, req);
            },
          }),
          ctx = context(caller);
        mocks.request.mockReturnValue(req);
        await expect(page(input(), ctx)).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
        if (point === "build") expect(caller.reads.map((read) => read.stage)).not.toContain(stage);
        else expect(caller.reads.at(-1)?.stage).toBe(stage);
      });
  it.each(losses)("fences %s loss during schema binding before resolver dispatch", async (loss) => {
    const req = request();
    const caller = client({ onSchema: () => lose(ctx, loss, req) }),
      ctx = context(caller);
    mocks.request.mockReturnValue(req);
    await expect(page(input(), ctx)).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
    expect(caller.native.rpc).not.toHaveBeenCalled();
  });
  it("rechecks caller after DTO parser traps before postread scope or private return", async () => {
    let traps = 0;
    const raw = new Proxy(row("expenses"), {
      ownKeys(target) {
        traps++;
        ctx.claims.role = "service_role";
        return Reflect.ownKeys(target);
      },
    });
    const caller = client({ responses: { expenses: { data: [raw], count: 1, error: null } } }),
      ctx = context(caller);
    await expect(page(input(), ctx)).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
    expect(traps).toBeGreaterThan(0);
    expect(caller.reads.map((read) => read.stage)).toEqual(["scope", "expenses"]);
  });
  it.each(["resolve", "reject"] as const)(
    "observes late Auth%s after10s bound without native capability",
    async (settlement) => {
      vi.useFakeTimers();
      const pending = deferred<unknown>(),
        caller = client();
      caller.auth.getUser.mockReturnValue(pending.promise);
      const assertion = expect(page(input(), context(caller))).rejects.toThrow(
        SHOP_EXPENSE_READ_FAILURE,
      );
      await vi.advanceTimersByTimeAsync(10_000);
      await assertion;
      if (settlement === "resolve")
        pending.resolve({ data: { user: { id: account } }, error: null });
      else pending.reject(new Error("PRIVATE late"));
      await Promise.resolve();
      expect(caller.schema).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it.each(["resolve", "reject"] as const)(
    "withholds an ignored-abort late list%s without scope/fallback followup",
    async (settlement) => {
      const pending = deferred<unknown>(),
        caller = client({ responses: { expenses: pending.promise } });
      const result = page(input(), context(caller));
      await vi.waitFor(() => expect(caller.reads).toHaveLength(2));
      controller.abort();
      const assertion = expect(result).rejects.toThrow(SHOP_EXPENSE_READ_FAILURE);
      if (settlement === "resolve")
        pending.resolve({ data: [row("expenses")], count: 1, error: null });
      else pending.reject(new Error("PRIVATE late SDK"));
      await assertion;
      expect(caller.reads.map((read) => read.stage)).toEqual(["scope", "expenses"]);
      expect(caller.native.from).toHaveBeenCalledTimes(1);
    },
  );
});
