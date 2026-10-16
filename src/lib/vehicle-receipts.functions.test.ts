// Actual server readers/caller guard/DTO contract with synthetic SDK responses.
// No live Auth/JWT/RLS/storage, native authority, DB cancellation or snapshot proof.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getVehicleReceipts, listVehicleShopLinks } from "./vehicle-receipts.functions";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  privileged: vi.fn(),
  writes: vi.fn(),
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
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: mocks.privileged, from: mocks.privileged, storage: mocks.privileged },
}));
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const account = uid(1),
  vehicle = uid(2),
  shopVehicle = uid(3),
  receiptId = uid(4),
  itemId = uid(5);
const token = "fixture.access.token";
const receiptFailure = "Could not load this vehicle's receipts. Refresh and try again.";
const linkFailure = "Could not load this vehicle's shop connections. Refresh and try again.";
const receiptProjection =
  "id,vehicle_id,shop_vehicle_id,created_by,file_path,file_name,media_type,vendor,purchased_on,currency,total,status,share_with_shop,created_at";
const itemProjection =
  "id,receipt_id,description,category,brand,part_number,quantity,total,confidence,reviewed,installed_on,odometer_km,public_summary_allowed,sort_order,installed_by,installation_origin";
const activeProjection = "shop_vehicle_id,vehicle_id,active";
const linkProjection = "shop_vehicle_id,vehicle_id,shop_name,active";
const ownerRequest = () => ({ expectedAccountId: account, vehicleId: vehicle });
const shopRequest = () => ({ expectedAccountId: account, shopVehicleId: shopVehicle });
const header = (id = receiptId) => ({
  id,
  vehicle_id: vehicle,
  shop_vehicle_id: null as string | null,
  created_by: account,
  file_path: null as string | null,
  file_name: null as string | null,
  media_type: null as string | null,
  vendor: "Private supplier",
  purchased_on: "2026-10-15",
  currency: "PHP",
  total: 100,
  status: "draft",
  share_with_shop: false,
  created_at: "2026-10-15T10:00:00Z",
});
const item = (parent = receiptId, id = itemId) => ({
  id,
  receipt_id: parent,
  description: "Oil filter",
  category: "fluids",
  brand: null,
  part_number: null,
  quantity: 1,
  total: 100,
  confidence: 1,
  reviewed: true,
  installed_on: null,
  odometer_km: null,
  public_summary_allowed: false,
  sort_order: 0,
  installed_by: null,
  installation_origin: null,
});
const link = (id = shopVehicle) => ({
  shop_vehicle_id: id,
  vehicle_id: vehicle,
  shop_name: "Linked shop",
  active: true,
});
type Response = { data: unknown; error: unknown; count?: unknown };
type Stage = "access" | "activeLink" | "headers" | "items" | "attachments" | "links";
type Read = {
  stage: Stage;
  table?: string;
  args?: Record<string, unknown>;
  projection?: string;
  options?: unknown;
  filters: Record<string, unknown>;
  orders: unknown[];
  range?: number[];
  limit?: number;
  signal?: AbortSignal;
  retry?: boolean;
  single?: boolean;
};
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
    responses?: Partial<
      Record<Stage, Response | Promise<Response> | ((read: Read) => Response | Promise<Response>)>
    >;
    onResult?: (read: Read) => void;
    onBuild?: (read: Read, method: string) => void;
  } = {},
) {
  const reads: Read[] = [];
  const defaults = (read: Read): Response => ({
    data:
      read.stage === "access"
        ? { can_write: true, can_record_expense: false }
        : read.stage === "activeLink"
          ? { shop_vehicle_id: shopVehicle, vehicle_id: vehicle, active: true }
          : read.stage === "headers"
            ? [header()]
            : read.stage === "items"
              ? [
                  item(
                    String(read.filters.receipt_id),
                    uid(100 + Number(String(read.filters.receipt_id).slice(-3))),
                  ),
                ]
              : read.stage === "attachments"
                ? Object.fromEntries((read.args?._ids as string[]).map((id) => [id, false]))
                : [link()],
    error: null,
    ...(["headers", "items", "links"].includes(read.stage) ? { count: 1 } : {}),
  });
  function builder(read: Read) {
    function op(method: string) {
      options.onBuild?.(read, method);
      return query;
    }
    const query = {
      select: (projection: string, queryOptions?: unknown) => {
        read.projection = projection;
        read.options = queryOptions;
        if (projection === activeProjection) read.stage = "activeLink";
        return op("select");
      },
      eq: (column: string, value: unknown) => {
        read.filters[column] = value;
        return op("eq");
      },
      or: (value: string) => {
        read.filters.or = value;
        return op("or");
      },
      order: (column: string, queryOptions: unknown) => {
        read.orders.push([column, queryOptions]);
        return op("order");
      },
      range: (from: number, to: number) => {
        read.range = [from, to];
        return op("range");
      },
      limit: (limit: number) => {
        read.limit = limit;
        return op("limit");
      },
      abortSignal: (signal: AbortSignal) => {
        read.signal = signal;
        return op("abortSignal");
      },
      retry: (retry: boolean) => {
        read.retry = retry;
        return op("retry");
      },
      maybeSingle: () => {
        read.single = true;
        return op("maybeSingle");
      },
      then: (resolve: (response: Response) => unknown, reject: (reason: unknown) => unknown) => {
        const dispatched = { ...read, filters: { ...read.filters }, orders: [...read.orders] };
        reads.push(dispatched);
        const response = options.responses?.[read.stage] ?? defaults(read);
        return Promise.resolve()
          .then(() => (typeof response === "function" ? response(dispatched) : response))
          .then((value) => {
            options.onResult?.(dispatched);
            return value;
          })
          .then(resolve, reject);
      },
      insert: mocks.writes,
      update: mocks.writes,
      delete: mocks.writes,
    };
    return query;
  }
  return {
    auth: {
      getUser: vi.fn(
        (_token: string): Promise<unknown> =>
          Promise.resolve({ data: { user: { id: account } }, error: null }),
      ),
    },
    from: vi.fn((table: string) =>
      builder({
        table,
        stage:
          table === "vehicle_receipts"
            ? "headers"
            : table === "vehicle_receipt_items"
              ? "items"
              : "links",
        filters: {},
        orders: [],
      }),
    ),
    rpc: vi.fn((name: string, args: Record<string, unknown>) =>
      builder({
        stage: name === "vehicle_receipt_workspace_access" ? "access" : "attachments",
        args,
        filters: {},
        orders: [],
      }),
    ),
    reads,
  };
}
const context = (supabase: ReturnType<typeof client>) => ({
  userId: account,
  claims: { sub: account, role: "authenticated", is_anonymous: false },
  supabase,
});
async function receipts(data: unknown, ctx: unknown) {
  return (
    getVehicleReceipts as unknown as (args: { data: unknown; context: unknown }) => Promise<unknown>
  )({ data, context: ctx });
}
async function links(data: unknown, ctx: unknown) {
  return (
    listVehicleShopLinks as unknown as (args: {
      data: unknown;
      context: unknown;
    }) => Promise<unknown>
  )({ data, context: ctx });
}
beforeEach(() => {
  vi.clearAllMocks();
  controller = new AbortController();
  mocks.request.mockReturnValue(currentRequest());
});
afterEach(() => vi.useRealTimers());
describe("receipt and shop-link server read boundaries", () => {
  it("reads an owner page through one explicit-token verification, exact projections/counts/ranges/signals and private metadata stripping", async () => {
    const caller = client();
    const result = await receipts(ownerRequest(), context(caller));
    expect(result).toMatchObject({
      receipts: [
        {
          id: receiptId,
          items_complete: true,
          item_count: 1,
          edit_eligible: true,
          attachment_uploaded: false,
          can_write: true,
        },
      ],
      linkedVehicleId: null,
      page: 0,
      totalCount: 1,
      hasNext: false,
    });
    expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(caller.reads.map((read) => read.stage)).toEqual([
      "access",
      "headers",
      "items",
      "attachments",
    ]);
    expect(caller.reads.find((read) => read.stage === "headers")).toMatchObject({
      projection: receiptProjection,
      options: { count: "exact" },
      filters: { vehicle_id: vehicle },
      range: [0, 24],
      orders: [
        ["created_at", { ascending: false }],
        ["id", { ascending: false }],
      ],
    });
    expect(caller.reads.find((read) => read.stage === "items")).toMatchObject({
      projection: itemProjection,
      options: { count: "exact" },
      filters: { receipt_id: receiptId },
      limit: 100,
      orders: [
        ["sort_order", { ascending: true }],
        ["id", { ascending: true }],
      ],
    });
    for (const read of caller.reads) {
      expect(read.signal).toBe(controller.signal);
      expect(read.retry).toBe(false);
    }
    expect(JSON.stringify(result)).not.toContain("installed_by");
    expect(JSON.stringify(result)).not.toContain("installation_origin");
    expect(mocks.writes).not.toHaveBeenCalled();
    expect(mocks.privileged).not.toHaveBeenCalled();
  });
  it("preserves direct shop and linked owner/other-shop rows without exclusive-target assumptions", async () => {
    const rows = [
      { ...header(), vehicle_id: null, shop_vehicle_id: shopVehicle },
      { ...header(uid(10)), shop_vehicle_id: null, share_with_shop: true },
      { ...header(uid(11)), shop_vehicle_id: uid(12) },
    ];
    const caller = client({ responses: { headers: { data: rows, error: null, count: 3 } } });
    const result = await receipts(shopRequest(), context(caller));
    expect(result).toMatchObject({
      linkedVehicleId: vehicle,
      receipts: [{ can_write: true }, { can_write: false }, { can_write: false }],
    });
    expect(caller.reads.find((read) => read.stage === "activeLink")).toMatchObject({
      projection: activeProjection,
      filters: { shop_vehicle_id: shopVehicle, active: true },
      single: true,
    });
    expect(caller.reads.find((read) => read.stage === "headers")?.filters.or).toBe(
      `shop_vehicle_id.eq.${shopVehicle},vehicle_id.eq.${vehicle}`,
    );
  });
  it("preserves owner-visible dual-bound shop receipts", async () => {
    const caller = client({
      responses: {
        headers: { data: [{ ...header(), shop_vehicle_id: shopVehicle }], error: null, count: 1 },
      },
    });
    await expect(receipts(ownerRequest(), context(caller))).resolves.toMatchObject({
      receipts: [{ vehicle_id: vehicle, shop_vehicle_id: shopVehicle, can_write: true }],
    });
  });
  it("uses only direct shop receipts when no active link is visible", async () => {
    const caller = client({
      responses: {
        activeLink: { data: null, error: null },
        headers: {
          data: [{ ...header(), vehicle_id: null, shop_vehicle_id: shopVehicle }],
          error: null,
          count: 1,
        },
      },
    });
    await expect(receipts(shopRequest(), context(caller))).resolves.toMatchObject({
      linkedVehicleId: null,
    });
    expect(caller.reads.find((read) => read.stage === "headers")?.filters.or).toBe(
      `shop_vehicle_id.eq.${shopVehicle}`,
    );
  });
  it("returns visible empty receipt page without item or attachment RPC dispatch", async () => {
    const caller = client({ responses: { headers: { data: [], error: null, count: 0 } } });
    await expect(receipts(ownerRequest(), context(caller))).resolves.toMatchObject({
      receipts: [],
      totalCount: 0,
      hasNext: false,
    });
    expect(caller.reads.map((read) => read.stage)).toEqual(["access", "headers"]);
  });
  it("reads deterministic nonzero receipt and link pages with exact page counts", async () => {
    const caller = client({
      responses: {
        headers: { data: [header()], error: null, count: 26 },
        links: { data: [link()], error: null, count: 101 },
      },
    });
    await expect(receipts({ ...ownerRequest(), page: 1 }, context(caller))).resolves.toMatchObject({
      page: 1,
      totalCount: 26,
      hasNext: false,
    });
    await expect(links({ ...ownerRequest(), page: 1 }, context(caller))).resolves.toMatchObject({
      links: [link()],
      page: 1,
      totalCount: 101,
      hasNext: false,
    });
    expect(caller.reads.find((read) => read.stage === "headers")?.range).toEqual([25, 49]);
    expect(caller.reads.find((read) => read.stage === "links")).toMatchObject({
      projection: linkProjection,
      options: { count: "exact" },
      range: [100, 199],
      filters: { vehicle_id: vehicle },
      orders: [["shop_vehicle_id", { ascending: true }]],
    });
  });
  it.each([
    undefined,
    null,
    {},
    { vehicleId: vehicle },
    { ...ownerRequest(), shopVehicleId: shopVehicle },
    { ...ownerRequest(), extra: "PRIVATE" },
    { ...ownerRequest(), page: -1 },
    { ...ownerRequest(), page: 0.5 },
  ])("rejects invalid receipt request before request/native access: %j", async (input) => {
    const caller = client();
    await expect(receipts(input, context(caller))).rejects.toThrow(
      "Invalid receipt snapshot request.",
    );
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.from).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });
  it("retains both early account mismatch errors without request access", async () => {
    const caller = client(),
      ctx = { ...context(caller), userId: uid(9) };
    await expect(receipts(ownerRequest(), ctx)).rejects.toThrow("Account changed.");
    await expect(links(ownerRequest(), ctx)).rejects.toThrow("Account changed.");
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("snapshots target/page/account before getRequest can alter validated intent", async () => {
    const caller = client();
    mocks.request.mockImplementationOnce(() => {
      Object.assign(mocks.validated as object, {
        expectedAccountId: uid(9),
        vehicleId: uid(10),
        shopVehicleId: shopVehicle,
        page: 1,
      });
      return currentRequest();
    });
    await expect(receipts(ownerRequest(), context(caller))).resolves.toMatchObject({
      page: 0,
      linkedVehicleId: null,
    });
    expect(caller.reads.find((read) => read.stage === "headers")).toMatchObject({
      range: [0, 24],
      filters: { vehicle_id: vehicle },
    });
  });
  it.each([
    null,
    {},
    { can_write: 1, can_record_expense: false },
    { can_write: true, can_record_expense: "false" },
    { can_write: true, can_record_expense: false, extra: true },
  ])("requires exact workspace boolean access shape: %j", async (data) => {
    const caller = client({ responses: { access: { data, error: null } } });
    await expect(receipts(ownerRequest(), context(caller))).rejects.toThrow(receiptFailure);
    expect(caller.reads.map((read) => read.stage)).toEqual(["access"]);
  });
  it.each([
    { shop_vehicle_id: uid(9), vehicle_id: vehicle, active: true },
    { shop_vehicle_id: shopVehicle, vehicle_id: vehicle, active: false },
    { vehicle_id: vehicle },
    [],
  ])("rejects malformed active-link binding before receipt query: %j", async (data) => {
    const caller = client({ responses: { activeLink: { data, error: null } } });
    await expect(receipts(shopRequest(), context(caller))).rejects.toThrow(receiptFailure);
    expect(caller.reads.map((read) => read.stage)).toEqual(["access", "activeLink"]);
  });
  it.each([null, undefined, -1, 1.5, 0, 2, 26])(
    "denies unknown or contradictory header count instead of false completeness: %j",
    async (count) => {
      const caller = client({ responses: { headers: { data: [header()], error: null, count } } });
      await expect(receipts(ownerRequest(), context(caller))).rejects.toThrow(receiptFailure);
      expect(caller.reads.map((read) => read.stage)).toEqual(["access", "headers"]);
    },
  );
  it.each(["short", "empty"])(
    "rejects %s nonzero-page headers when exact count promises more rows",
    async (kind) => {
      const caller = client({
        responses: {
          headers: { data: kind === "short" ? [header()] : [], error: null, count: 50 },
        },
      });
      await expect(receipts({ ...ownerRequest(), page: 1 }, context(caller))).rejects.toThrow(
        receiptFailure,
      );
      expect(caller.reads).toHaveLength(2);
    },
  );
  it.each([
    null,
    {},
    [{ ...header(), vehicle_id: uid(9) }],
    [header(), header()],
    [{ ...header(), extra: "PRIVATE" }],
  ])("rejects malformed/misbound/duplicate receipt rows: %j", async (data) => {
    const caller = client({
      responses: { headers: { data, error: null, count: Array.isArray(data) ? data.length : 0 } },
    });
    await expect(receipts(ownerRequest(), context(caller))).rejects.toThrow(receiptFailure);
    expect(caller.reads).toHaveLength(2);
  });
  it("retains a counted 100-item window but refuses complete/editable claims for a 101-item receipt", async () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({
      ...item(receiptId, uid(1000 + index)),
      sort_order: index,
    }));
    const caller = client({ responses: { items: { data: rows, error: null, count: 101 } } });
    await expect(receipts(ownerRequest(), context(caller))).resolves.toMatchObject({
      receipts: [
        { item_count: 101, items_complete: false, edit_eligible: false, items: expect.any(Array) },
      ],
    });
  });
  it.each([null, undefined, 0, 2])("rejects contradictory item count: %j", async (count) => {
    const caller = client({ responses: { items: { data: [item()], error: null, count } } });
    await expect(receipts(ownerRequest(), context(caller))).rejects.toThrow(receiptFailure);
    expect(caller.reads.map((read) => read.stage)).not.toContain("attachments");
  });
  it("denies wrong-parent items and global duplicate child UUIDs", async () => {
    const wrong = client({ responses: { items: { data: [item(uid(9))], error: null, count: 1 } } });
    await expect(receipts(ownerRequest(), context(wrong))).rejects.toThrow(receiptFailure);
    const duplicate = client({
      responses: {
        headers: { data: [header(), header(uid(10))], error: null, count: 2 },
        items: (read) => ({ data: [item(String(read.filters.receipt_id))], error: null, count: 1 }),
      },
    });
    await expect(receipts(ownerRequest(), context(duplicate))).rejects.toThrow(receiptFailure);
    expect(duplicate.reads.map((read) => read.stage)).not.toContain("attachments");
  });
  it.each([{}, { [receiptId]: "false" }, { [receiptId]: false, [uid(9)]: true }, null])(
    "refuses withheld/revoked/malformed attachment maps instead of false upload status: %j",
    async (data) => {
      const caller = client({ responses: { attachments: { data, error: null } } });
      await expect(receipts(ownerRequest(), context(caller))).rejects.toThrow(receiptFailure);
    },
  );
  for (const stage of ["access", "activeLink", "headers", "items", "attachments"] as const) {
    it.each([undefined, false, "", { message: "PRIVATE cause" }])(
      `requires explicit error:null at ${stage}, redacting other responses: %j`,
      async (error) => {
        const validResponses: Record<typeof stage, Response> = {
          access: { data: { can_write: true, can_record_expense: false }, error: null },
          activeLink: {
            data: { shop_vehicle_id: shopVehicle, vehicle_id: vehicle, active: true },
            error: null,
          },
          headers: { data: [header()], error: null, count: 1 },
          items: { data: [item()], error: null, count: 1 },
          attachments: { data: { [receiptId]: false }, error: null },
        };
        const validResponse = validResponses[stage];
        const control = client({ responses: { [stage]: validResponse } });
        await expect(receipts(shopRequest(), context(control))).resolves.toMatchObject({
          receipts: [{ id: receiptId }],
        });
        const caller = client({ responses: { [stage]: { ...validResponse, error } } });
        const result = await receipts(shopRequest(), context(caller)).catch(
          (value: unknown) => value,
        );
        expect((result as Error).message).toBe(receiptFailure);
        expect(result).not.toHaveProperty("cause");
        expect(String(result)).not.toContain("PRIVATE");
      },
    );
  }
  it.each([1, 3])(
    "uses at most four child flights and stops unstarted admissions after worker %i fails",
    async (failedIndex) => {
      const pending = Array.from({ length: 4 }, () => deferred<Response>());
      const rows = Array.from({ length: 8 }, (_, index) => header(uid(20 + index)));
      const caller = client({
        responses: {
          headers: { data: rows, error: null, count: rows.length },
          items: (read) => pending[Number(String(read.filters.receipt_id).slice(-2)) - 20].promise,
        },
      });
      const result = receipts(ownerRequest(), context(caller));
      const assertion = expect(result).rejects.toThrow(receiptFailure);
      await vi.waitFor(() =>
        expect(caller.reads.filter((read) => read.stage === "items")).toHaveLength(4),
      );
      pending[failedIndex].resolve({
        data: [],
        error: { message: "PRIVATE worker failure" },
        count: 0,
      });
      await assertion;
      for (const index of [0, 1, 2, 3].filter((index) => index !== failedIndex))
        pending[index].resolve({ data: [], error: null, count: 0 });
      for (let index = 0; index < 10; index++) await Promise.resolve();
      expect(caller.reads.filter((read) => read.stage === "items")).toHaveLength(4);
      expect(caller.reads.map((read) => read.stage)).not.toContain("attachments");
    },
  );
  for (const field of ["actor", "client", "claims", "authMethod", "abort"] as const) {
    it.each(["access", "activeLink", "headers", "items", "attachments"] as const)(
      `fences ${field} loss after awaited %s before downstream/private return`,
      async (stage) => {
        const caller = client({
          onResult: (read) => {
            if (read.stage === stage) lose();
          },
        });
        const ctx = context(caller);
        const original = caller.auth.getUser;
        function lose() {
          if (field === "actor") ctx.userId = uid(9);
          if (field === "client") ctx.supabase = client();
          if (field === "claims") ctx.claims = { ...ctx.claims };
          if (field === "authMethod")
            caller.auth.getUser = vi.fn((value: string) => original(value));
          if (field === "abort") controller.abort(new Error("PRIVATE reason"));
        }
        await expect(receipts(shopRequest(), ctx)).rejects.toThrow(receiptFailure);
        expect(caller.reads.at(-1)?.stage).toBe(stage);
      },
    );
  }
  it.each(["actor", "client", "claims", "authMethod"])(
    "captures %s before getRequest and refuses replacement",
    async (field) => {
      const caller = client(),
        ctx = context(caller);
      const original = caller.auth.getUser;
      mocks.request.mockImplementationOnce(() => {
        if (field === "actor") ctx.userId = uid(9);
        if (field === "client") ctx.supabase = client();
        if (field === "claims") ctx.claims = { ...ctx.claims };
        if (field === "authMethod") caller.auth.getUser = vi.fn((value: string) => original(value));
        return currentRequest();
      });
      await expect(receipts(ownerRequest(), ctx)).rejects.toThrow(receiptFailure);
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
    },
  );
  it.each(["abort", "timeout"])(
    "bounds Auth by %s and ignores late success/rejection without native dispatch",
    async (stop) => {
      vi.useFakeTimers();
      for (const settlement of ["resolve", "reject"]) {
        controller = new AbortController();
        mocks.request.mockReturnValue(currentRequest());
        const pending = deferred<unknown>(),
          caller = client();
        caller.auth.getUser.mockReturnValue(pending.promise);
        const result = receipts(ownerRequest(), context(caller));
        const assertion = expect(result).rejects.toThrow(receiptFailure);
        if (stop === "abort") controller.abort();
        else await vi.advanceTimersByTimeAsync(10_000);
        await assertion;
        if (settlement === "resolve")
          pending.resolve({ data: { user: { id: account } }, error: null });
        else pending.reject(new Error("PRIVATE late"));
        await Promise.resolve();
        expect(caller.from).not.toHaveBeenCalled();
        expect(caller.rpc).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
      }
    },
  );
  it.each([null, undefined, 0, 2])(
    "rejects unknown/contradictory link counts: %j",
    async (count) => {
      const caller = client({ responses: { links: { data: [link()], error: null, count } } });
      await expect(links(ownerRequest(), context(caller))).rejects.toThrow(linkFailure);
    },
  );
  it("rejects wrong-vehicle and duplicate shop-link IDs", async () => {
    for (const rows of [[{ ...link(), vehicle_id: uid(9) }], [link(), link()]]) {
      const caller = client({
        responses: { links: { data: rows, error: null, count: rows.length } },
      });
      await expect(links(ownerRequest(), context(caller))).rejects.toThrow(linkFailure);
    }
  });
  it("checks current caller and abort after awaited link read before private return", async () => {
    const caller = client({ onResult: () => controller.abort(new Error("PRIVATE")) });
    await expect(links(ownerRequest(), context(caller))).rejects.toThrow(linkFailure);
    expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
  });
  it("preserves native unsupported entry dates/text for reading while refusing editing", async () => {
    const caller = client({
      responses: {
        headers: {
          data: [{ ...header(), vendor: "  Existing supplier  ", purchased_on: "infinity" }],
          error: null,
          count: 1,
        },
      },
    });
    await expect(receipts(ownerRequest(), context(caller))).resolves.toMatchObject({
      receipts: [
        { vendor: "  Existing supplier  ", purchased_on: "infinity", edit_eligible: false },
      ],
    });
  });
  it("allows a compatible zero-item draft without claiming purchases exist", async () => {
    const caller = client({ responses: { items: { data: [], error: null, count: 0 } } });
    await expect(receipts(ownerRequest(), context(caller))).resolves.toMatchObject({
      receipts: [{ items: [], item_count: 0, items_complete: true, edit_eligible: true }],
    });
  });
  it("detaches parsed headers/items before later SDK responses mutate their original objects", async () => {
    const rawHeader = header(),
      rawItem = item();
    const caller = client({
      responses: {
        headers: { data: [rawHeader], error: null, count: 1 },
        items: { data: [rawItem], error: null, count: 1 },
      },
      onResult: (read) => {
        if (read.stage === "items") rawHeader.vendor = "Changed after header validation";
        if (read.stage === "attachments") rawItem.description = "Changed after child validation";
      },
    });
    await expect(receipts(ownerRequest(), context(caller))).resolves.toMatchObject({
      receipts: [{ vendor: "Private supplier", items: [{ description: "Oil filter" }] }],
    });
  });
  for (const reader of ["receipts", "links"] as const) {
    const invoke = reader === "receipts" ? receipts : links;
    const failure = reader === "receipts" ? receiptFailure : linkFailure;
    it.each([null, "Basic PRIVATE", "Bearer opaque", "Bearer fixture.access.token,second"])(
      `${reader} refuses malformed Bearer before Auth/native: %j`,
      async (authorization) => {
        const caller = client();
        mocks.request.mockReturnValue({
          signal: controller.signal,
          headers: { get: () => authorization },
        });
        await expect(invoke(ownerRequest(), context(caller))).rejects.toThrow(failure);
        expect(caller.auth.getUser).not.toHaveBeenCalled();
        expect(caller.from).not.toHaveBeenCalled();
        expect(caller.rpc).not.toHaveBeenCalled();
      },
    );
    it.each([
      null,
      { sub: account, role: "service_role" },
      { sub: account, role: "authenticated", is_anonymous: true },
    ])(`${reader} refuses unsupported verified claims: %j`, async (claims) => {
      const caller = client();
      await expect(invoke(ownerRequest(), { ...context(caller), claims })).rejects.toThrow(failure);
      expect(mocks.request).not.toHaveBeenCalled();
      expect(caller.auth.getUser).not.toHaveBeenCalled();
      expect(caller.reads).toEqual([]);
    });
    it.each([
      { data: { user: null }, error: null },
      { data: { user: { id: uid(9) } }, error: null },
      { data: { user: { id: account, is_anonymous: true } }, error: null },
      { data: { user: { id: account } }, error: { message: "PRIVATE Auth" } },
    ])(`${reader} refuses unconfirmed current Auth: %j`, async (response) => {
      const caller = client();
      caller.auth.getUser.mockResolvedValue(response);
      await expect(invoke(ownerRequest(), context(caller))).rejects.toThrow(failure);
      expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
      expect(caller.reads).toEqual([]);
    });
    it("rejects caller replacement during pending Auth before any native read", async () => {
      const pending = deferred<unknown>(),
        caller = client(),
        ctx = context(caller);
      caller.auth.getUser.mockReturnValue(pending.promise);
      const result = invoke(ownerRequest(), ctx);
      ctx.supabase = client();
      pending.resolve({ data: { user: { id: account } }, error: null });
      await expect(result).rejects.toThrow(failure);
      expect(caller.reads).toEqual([]);
      expect(ctx.supabase.reads).toEqual([]);
    });
    it.each(["error", "data", "count"])(
      `${reader} never invokes accessor SDK %s evidence`,
      async (field) => {
        const get = vi.fn(() => (field === "error" ? null : field === "count" ? 1 : [header()]));
        const response = {
          data: reader === "receipts" ? [header()] : [link()],
          error: null,
          count: 1,
        };
        Object.defineProperty(response, field, { enumerable: true, get });
        const caller = client({
          responses: { [reader === "receipts" ? "headers" : "links"]: response },
        });
        await expect(invoke(ownerRequest(), context(caller))).rejects.toThrow(failure);
        expect(get).not.toHaveBeenCalled();
      },
    );
  }
  it.each(["access", "activeLink", "headers", "items", "attachments", "links"] as const)(
    "checks caller again immediately before lazy %s dispatch",
    async (stage) => {
      const caller = client({
          onBuild: (read, method) => {
            if (read.stage === stage && method === "retry") ctx.claims.role = "service_role";
          },
        }),
        ctx = context(caller);
      await expect(
        stage === "links" ? links(ownerRequest(), ctx) : receipts(shopRequest(), ctx),
      ).rejects.toThrow(stage === "links" ? linkFailure : receiptFailure);
      expect(caller.reads.map((read) => read.stage)).not.toContain(stage);
    },
  );
  it("rejects nonzero-page short link windows and non-null falsy SDK errors", async () => {
    const short = client({ responses: { links: { data: [link()], error: null, count: 200 } } });
    await expect(links({ ...ownerRequest(), page: 1 }, context(short))).rejects.toThrow(
      linkFailure,
    );
    const falsy = client({ responses: { links: { data: [link()], error: false, count: 1 } } });
    await expect(links(ownerRequest(), context(falsy))).rejects.toThrow(linkFailure);
  });
  it("rejects malformed link input and snapshots a valid link target/page before request access", async () => {
    const caller = client();
    await expect(
      links({ ...ownerRequest(), shopVehicleId: shopVehicle }, context(caller)),
    ).rejects.toThrow("Invalid shop-link snapshot request.");
    expect(mocks.request).not.toHaveBeenCalled();
    mocks.request.mockImplementationOnce(() => {
      Object.assign(mocks.validated as object, { vehicleId: uid(9), page: 1 });
      return currentRequest();
    });
    await expect(links(ownerRequest(), context(caller))).resolves.toMatchObject({ page: 0 });
    expect(caller.reads[0]).toMatchObject({ filters: { vehicle_id: vehicle }, range: [0, 99] });
  });
});
