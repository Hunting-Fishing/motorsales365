// Actual server readers/caller guard/DTO contract with synthetic SDK responses.
// No live Auth/JWT/RLS/storage, native authority, DB cancellation or snapshot proof.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getVehicleReceipts,
  listVehicleShopLinks,
  getPrivateReceiptUrl,
  recordVehicleReceiptExpense,
  discardReceiptDraft,
  installReceiptItem,
  getVehicleReceiptItemPage,
} from "./vehicle-receipts.functions";
import { PRIVATE_RECEIPT_URL_FAILURE } from "./private-receipt-url.server";
import { RECEIPT_EXPENSE_FAILURE } from "./vehicle-receipt-expense-contract";
import { RECEIPT_DISCARD_UNAVAILABLE } from "./vehicle-receipts";
import { RECEIPT_INSTALLATION_FAILURE } from "./vehicle-receipt-installation-contract";
import {
  RECEIPT_LINES_FAILURE,
  RECEIPT_LINES_PARENT_PROJECTION,
  parseReceiptLinesPage,
} from "./vehicle-receipt-lines-contract";
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
// Synthetic verified claims, not a signed credential or live session fixture.
const issuedAt = Math.floor(Date.now() / 1_000) - 60;
const commandClaims = () => ({
  sub: account,
  role: "authenticated",
  is_anonymous: false,
  iss: "https://wjxaajgvddtrxxtocxen.supabase.co/auth/v1",
  aud: "authenticated",
  session_id: uid(98),
  iat: issuedAt,
  exp: issuedAt + 86_400,
  aal: "aal1",
});
const receiptFailure = "Could not load this vehicle's receipts. Refresh and try again.";
const linkFailure = "Could not load this vehicle's shop connections. Refresh and try again.";
const privatePath = `${uid(99)}/${receiptId}/original.pdf`;
const signedReceiptUrl = (path = privatePath) =>
  `https://wjxaajgvddtrxxtocxen.supabase.co/storage/v1/object/sign/vehicle-receipts/${path}?token=fixture.storage.token`;
const privateRequest = () => ({ expectedAccountId: account, id: receiptId });
const expenseId = uid(90);
const expenseRequest = () => ({
  expectedAccountId: account,
  id: receiptId,
  expectedShopVehicleId: shopVehicle,
});
const expenseAcknowledgment = () => ({ receiptId, shopVehicleId: shopVehicle, expenseId });
const installationIntent = (shop = false) => ({
  expectedAccountId: account,
  receiptId,
  itemId,
  expectedVehicleId: shop ? null : vehicle,
  expectedShopVehicleId: shop ? shopVehicle : null,
  installedOn: "2026-10-15",
  odometerKm: 12345,
});
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
type Stage =
  | "access"
  | "activeLink"
  | "headers"
  | "items"
  | "attachments"
  | "links"
  | "private"
  | "expense"
  | "expenseTarget"
  | "installationItem"
  | "installationTarget"
  | "installation"
  | "lineParent"
  | "lineItems";
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
    signingResponse?: unknown;
    onStorageBuild?: () => void;
    onSigningStart?: () => void;
    onSigningResult?: () => void;
  } = {},
) {
  const reads: Read[] = [];
  const defaults = (read: Read): Response => ({
    data:
      read.stage === "lineParent"
        ? { id: receiptId, vehicle_id: vehicle, shop_vehicle_id: null, share_with_shop: true }
        : read.stage === "lineItems"
          ? [item()]
          : read.stage === "access"
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
                    : read.stage === "private"
                      ? { id: receiptId, file_path: privatePath }
                      : read.stage === "expenseTarget"
                        ? { id: receiptId, shop_vehicle_id: shopVehicle }
                        : read.stage === "expense"
                          ? expenseId
                          : read.stage === "installationItem"
                            ? { id: itemId, receipt_id: receiptId }
                            : read.stage === "installationTarget"
                              ? { id: receiptId, vehicle_id: vehicle, shop_vehicle_id: shopVehicle }
                              : read.stage === "installation"
                                ? null
                                : [link()],
    error: null,
    ...(["headers", "items", "links", "lineItems"].includes(read.stage) ? { count: 1 } : {}),
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
        if (projection === "id,file_path") read.stage = "private";
        if (projection === "id,shop_vehicle_id") read.stage = "expenseTarget";
        if (projection === "id,receipt_id") read.stage = "installationItem";
        if (projection === "id,vehicle_id,shop_vehicle_id") read.stage = "installationTarget";
        if (projection === RECEIPT_LINES_PARENT_PROJECTION) read.stage = "lineParent";
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
        if (read.stage === "items") read.stage = "lineItems";
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
      single: () => {
        read.single = true;
        return op("single");
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
  const createSignedUrl = vi.fn((_path: string, _expiresIn: number): Promise<unknown> => {
    options.onSigningStart?.();
    const result = Object.hasOwn(options, "signingResponse")
      ? options.signingResponse
      : { data: { signedUrl: signedReceiptUrl() }, error: null };
    return Promise.resolve(result).then((value) => {
      options.onSigningResult?.();
      return value;
    });
  });
  return {
    auth: {
      getClaims: vi.fn(
        (_token: string): Promise<unknown> =>
          Promise.resolve({ data: { claims: commandClaims() }, error: null }),
      ),
      getUser: vi.fn(
        (_token: string): Promise<unknown> =>
          Promise.resolve({ data: { user: { id: account, is_anonymous: false } }, error: null }),
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
        stage:
          name === "vehicle_receipt_workspace_access"
            ? "access"
            : name === "record_vehicle_receipt_expense"
              ? "expense"
              : name === "install_vehicle_receipt_item"
                ? "installation"
                : "attachments",
        args,
        filters: {},
        orders: [],
      }),
    ),
    storage: {
      from: vi.fn((_bucket: string) => {
        options.onStorageBuild?.();
        return { createSignedUrl };
      }),
    },
    createSignedUrl,
    reads,
  };
}
const context = (supabase: ReturnType<typeof client>) => ({
  userId: account,
  claims: commandClaims(),
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
async function privateUrl(data: unknown, ctx: unknown) {
  return (
    getPrivateReceiptUrl as unknown as (args: {
      data: unknown;
      context: unknown;
    }) => Promise<unknown>
  )({ data, context: ctx });
}
async function receiptExpense(data: unknown, ctx: unknown) {
  return (
    recordVehicleReceiptExpense as unknown as (args: {
      data: unknown;
      context: unknown;
    }) => Promise<unknown>
  )({ data, context: ctx });
}
async function discardDraft(data: unknown, ctx: unknown) {
  return (
    discardReceiptDraft as unknown as (args: {
      data: unknown;
      context: unknown;
    }) => Promise<unknown>
  )({ data, context: ctx });
}
async function recordInstallation(data: unknown, ctx: unknown) {
  return (
    installReceiptItem as unknown as (args: { data: unknown; context: unknown }) => Promise<unknown>
  )({ data, context: ctx });
}
async function receiptLines(data: unknown, ctx: unknown) {
  return (
    getVehicleReceiptItemPage as unknown as (args: {
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

describe("private receipt URL server boundary", () => {
  // The synthetic Storage method deliberately ignores cancellation. The actual
  // SDK has no per-call signal option here; late results must be discarded.
  afterEach(() => {
    expect(mocks.writes).not.toHaveBeenCalled();
    expect(mocks.privileged).not.toHaveBeenCalled();
  });

  it("verifies one explicit caller and signs only the matched DB path with the fixed private bucket and TTL", async () => {
    const caller = client();
    await expect(privateUrl(privateRequest(), context(caller))).resolves.toBe(signedReceiptUrl());
    expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(caller.from).toHaveBeenCalledExactlyOnceWith("vehicle_receipts");
    expect(caller.reads).toEqual([
      expect.objectContaining({
        stage: "private",
        projection: "id,file_path",
        filters: { id: receiptId },
        signal: controller.signal,
        retry: false,
        single: true,
      }),
    ]);
    expect(caller.reads[0]).not.toHaveProperty("range");
    expect(caller.storage.from).toHaveBeenCalledExactlyOnceWith("vehicle-receipts");
    expect(caller.createSignedUrl).toHaveBeenCalledExactlyOnceWith(privatePath, 300);
    expect(caller.rpc).not.toHaveBeenCalled();
    expect(privatePath.startsWith(account)).toBe(false);
  });

  it("uses a safe retained DB key without assuming the generated three-segment shape", async () => {
    const path = "retained/shop-evidence/copy-1.pdf";
    const caller = client({
      responses: { private: { data: { id: receiptId, file_path: path }, error: null } },
      signingResponse: { data: { signedUrl: signedReceiptUrl(path) }, error: null },
    });
    await expect(privateUrl(privateRequest(), context(caller))).resolves.toBe(
      signedReceiptUrl(path),
    );
    expect(caller.createSignedUrl).toHaveBeenCalledExactlyOnceWith(path, 300);
  });

  it.each([
    null,
    {},
    { id: receiptId },
    { expectedAccountId: account },
    { expectedAccountId: "bad", id: receiptId },
    { expectedAccountId: account, id: "bad" },
    { ...privateRequest(), path: privatePath },
    { ...privateRequest(), expectedAccountId: null },
  ])("rejects malformed private input before request/Auth/native access: %j", async (input) => {
    const caller = client();
    await expect(privateUrl(input, context(caller))).rejects.toThrow(
      "Invalid private receipt request.",
    );
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.from).not.toHaveBeenCalled();
    expect(caller.storage.from).not.toHaveBeenCalled();
  });

  it("does not invoke an input account accessor", async () => {
    const get = vi.fn(() => account);
    const input = { id: receiptId };
    Object.defineProperty(input, "expectedAccountId", { enumerable: true, get });
    const caller = client();
    await expect(privateUrl(input, context(caller))).rejects.toThrow(
      "Invalid private receipt request.",
    );
    expect(get).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("preserves early account-changed denial before any request or Auth call", async () => {
    const caller = client();
    await expect(
      privateUrl({ ...privateRequest(), expectedAccountId: uid(7) }, context(caller)),
    ).rejects.toThrow("Account changed. Refresh before opening this receipt.");
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.storage.from).not.toHaveBeenCalled();
  });

  it("captures primitive account and receipt intent before request hooks can mutate validated input", async () => {
    const caller = client();
    mocks.request.mockImplementationOnce(() => {
      Object.assign(mocks.validated as object, { expectedAccountId: uid(7), id: uid(8) });
      return currentRequest();
    });
    await expect(privateUrl(privateRequest(), context(caller))).resolves.toBe(signedReceiptUrl());
    expect(caller.reads[0].filters).toEqual({ id: receiptId });
    expect(caller.createSignedUrl).toHaveBeenCalledExactlyOnceWith(privatePath, 300);
  });

  it.each([null, "Basic PRIVATE", "Bearer opaque", "Bearer fixture.access.token,second"])(
    "refuses malformed Bearer before explicit Auth/native/signing: %j",
    async (authorization) => {
      const caller = client();
      mocks.request.mockReturnValue({
        signal: controller.signal,
        headers: { get: () => authorization },
      });
      await expect(privateUrl(privateRequest(), context(caller))).rejects.toThrow(
        PRIVATE_RECEIPT_URL_FAILURE,
      );
      expect(caller.auth.getUser).not.toHaveBeenCalled();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.storage.from).not.toHaveBeenCalled();
    },
  );

  it.each([
    null,
    { sub: account, role: "service_role" },
    { sub: uid(9), role: "authenticated" },
    { sub: account, role: "authenticated", is_anonymous: true },
  ])("refuses incompatible middleware claims before getRequest: %j", async (claims) => {
    const caller = client();
    await expect(privateUrl(privateRequest(), { ...context(caller), claims })).rejects.toThrow(
      PRIVATE_RECEIPT_URL_FAILURE,
    );
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.from).not.toHaveBeenCalled();
    expect(caller.storage.from).not.toHaveBeenCalled();
  });

  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: uid(9) } }, error: null },
    { data: { user: { id: account, is_anonymous: true } }, error: null },
    { data: { user: { id: account } }, error: { message: "PRIVATE Auth" } },
  ])("refuses unconfirmed current Auth without native/signing access: %j", async (response) => {
    const caller = client();
    caller.auth.getUser.mockResolvedValue(response);
    await expect(privateUrl(privateRequest(), context(caller))).rejects.toThrow(
      PRIVATE_RECEIPT_URL_FAILURE,
    );
    expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(caller.from).not.toHaveBeenCalled();
    expect(caller.storage.from).not.toHaveBeenCalled();
  });

  const losses = ["account", "client", "claims", "auth-method", "header", "abort"] as const;
  function loseCaller(
    ctx: ReturnType<typeof context>,
    loss: (typeof losses)[number],
    request: ReturnType<typeof currentRequest>,
  ) {
    if (loss === "account") ctx.userId = uid(9);
    if (loss === "client") ctx.supabase = client();
    if (loss === "claims") ctx.claims.role = "service_role";
    if (loss === "auth-method")
      ctx.supabase.auth.getUser = vi.fn(() =>
        Promise.resolve({ data: { user: { id: account } }, error: null }),
      );
    if (loss === "header") request.headers.set("authorization", "Bearer changed.access.token");
    if (loss === "abort") controller.abort(new Error("PRIVATE aborted"));
  }

  it.each(["account", "client", "claims", "auth-method"] as const)(
    "captures caller before getRequest can replace %s",
    async (loss) => {
      const caller = client(),
        ctx = context(caller),
        request = currentRequest();
      mocks.request.mockImplementationOnce(() => {
        loseCaller(ctx, loss, request);
        return request;
      });
      await expect(privateUrl(privateRequest(), ctx)).rejects.toThrow(PRIVATE_RECEIPT_URL_FAILURE);
      expect(caller.auth.getUser).not.toHaveBeenCalled();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.storage.from).not.toHaveBeenCalled();
    },
  );

  it.each(losses)(
    "refuses %s loss during pending Auth and ignores its late current-user result",
    async (loss) => {
      const pending = deferred<unknown>(),
        caller = client(),
        ctx = context(caller),
        request = currentRequest();
      mocks.request.mockReturnValue(request);
      caller.auth.getUser.mockReturnValue(pending.promise);
      const result = privateUrl(privateRequest(), ctx);
      loseCaller(ctx, loss, request);
      pending.resolve({ data: { user: { id: account } }, error: null });
      await expect(result).rejects.toThrow(PRIVATE_RECEIPT_URL_FAILURE);
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.storage.from).not.toHaveBeenCalled();
    },
  );

  for (const point of [
    "query-build",
    "row-settlement",
    "storage-build",
    "signing-settlement",
  ] as const) {
    it.each(losses)(
      `refuses %s loss at ${point} without returning bearer evidence`,
      async (loss) => {
        const request = currentRequest();
        const caller = client({
            onBuild: (read, method) => {
              if (point === "query-build" && read.stage === "private" && method === "single")
                loseCaller(ctx, loss, request);
            },
            onResult: (read) => {
              if (point === "row-settlement" && read.stage === "private")
                loseCaller(ctx, loss, request);
            },
            onStorageBuild: () => {
              if (point === "storage-build") loseCaller(ctx, loss, request);
            },
            onSigningResult: () => {
              if (point === "signing-settlement") loseCaller(ctx, loss, request);
            },
          }),
          ctx = context(caller);
        mocks.request.mockReturnValue(request);
        await expect(privateUrl(privateRequest(), ctx)).rejects.toThrow(
          PRIVATE_RECEIPT_URL_FAILURE,
        );
        if (point === "query-build") expect(caller.reads).toEqual([]);
        if (point === "query-build" || point === "row-settlement")
          expect(caller.storage.from).not.toHaveBeenCalled();
        if (point !== "signing-settlement") expect(caller.createSignedUrl).not.toHaveBeenCalled();
        else expect(caller.createSignedUrl).toHaveBeenCalledTimes(1);
      },
    );
  }

  it.each([
    null,
    {},
    { id: uid(9), file_path: privatePath },
    { id: receiptId, file_path: null },
    { id: receiptId, file_path: "" },
    { id: receiptId, file_path: "../private.pdf" },
    { id: receiptId, file_path: "/private.pdf" },
    { id: receiptId, file_path: "retained//private.pdf" },
    { id: receiptId, file_path: "retained/%2e%2e/private.pdf" },
    { id: receiptId, file_path: "retained/private.pdf?other" },
    { id: receiptId, file_path: "retained/private.pdf#fragment" },
    { id: receiptId, file_path: "retained\\private.pdf" },
  ])("refuses missing/mismatched/unsupported path rows before signing: %j", async (row) => {
    const caller = client({ responses: { private: { data: row, error: null } } });
    await expect(privateUrl(privateRequest(), context(caller))).rejects.toThrow(
      PRIVATE_RECEIPT_URL_FAILURE,
    );
    expect(caller.storage.from).not.toHaveBeenCalled();
  });

  for (const phase of ["row", "signing"] as const) {
    it.each([undefined, false, "", { message: "PRIVATE provider cause" }])(
      `requires explicit error:null at ${phase} with otherwise-valid evidence: %j`,
      async (error) => {
        const caller = client(
          phase === "row"
            ? { responses: { private: { data: { id: receiptId, file_path: privatePath }, error } } }
            : { signingResponse: { data: { signedUrl: signedReceiptUrl() }, error } },
        );
        const result = await privateUrl(privateRequest(), context(caller)).catch(
          (value: unknown) => value,
        );
        expect((result as Error).message).toBe(PRIVATE_RECEIPT_URL_FAILURE);
        expect(result).not.toHaveProperty("cause");
        expect(String(result)).not.toContain("PRIVATE");
        expect(String(result)).not.toContain(privatePath);
        if (phase === "row") expect(caller.storage.from).not.toHaveBeenCalled();
      },
    );
  }

  it.each([
    "row-data",
    "row-error",
    "row-id",
    "row-path",
    "sign-data",
    "sign-error",
    "sign-url",
  ] as const)("refuses %s accessors without invoking them", async (field) => {
    const row = { id: receiptId, file_path: privatePath },
      data = { signedUrl: signedReceiptUrl() };
    const response: Response = { data: row, error: null },
      signed: Response = { data, error: null };
    const target =
      field === "row-id" || field === "row-path"
        ? row
        : field === "sign-url"
          ? data
          : field.startsWith("row-")
            ? response
            : signed;
    const key = field.endsWith("-data")
      ? "data"
      : field.endsWith("-error")
        ? "error"
        : field === "row-id"
          ? "id"
          : field === "row-path"
            ? "file_path"
            : "signedUrl";
    const get = vi.fn(() =>
      key === "data"
        ? row
        : key === "error"
          ? null
          : key === "id"
            ? receiptId
            : key === "file_path"
              ? privatePath
              : signedReceiptUrl(),
    );
    Object.defineProperty(target, key, { enumerable: true, get });
    const caller = client({ responses: { private: response }, signingResponse: signed });
    await expect(privateUrl(privateRequest(), context(caller))).rejects.toThrow(
      PRIVATE_RECEIPT_URL_FAILURE,
    );
    expect(get).not.toHaveBeenCalled();
    if (field.startsWith("row-")) expect(caller.storage.from).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    null,
    "javascript:PRIVATE",
    signedReceiptUrl().replace("https:", "http:"),
    signedReceiptUrl().replace("wjxaajgvddtrxxtocxen", "otherproject"),
    signedReceiptUrl().replace("supabase.co/", "supabase.co.example.invalid/"),
    signedReceiptUrl().replace("supabase.co/", "supabase.co:443/"),
    signedReceiptUrl().replace("https://", "https://user:password@"),
    signedReceiptUrl().replace("/vehicle-receipts/", "/other-bucket/"),
    signedReceiptUrl().replace(privatePath, "retained/other.pdf"),
    `${signedReceiptUrl()}#fragment`,
    `${signedReceiptUrl()}&token=second`,
    `${signedReceiptUrl()}&download=other`,
    signedReceiptUrl().replace("fixture.storage.token", ""),
  ])("refuses malformed/cross-project/misbound signed URL acknowledgment: %j", async (url) => {
    const caller = client({ signingResponse: { data: { signedUrl: url }, error: null } });
    await expect(privateUrl(privateRequest(), context(caller))).rejects.toThrow(
      PRIVATE_RECEIPT_URL_FAILURE,
    );
    expect(caller.createSignedUrl).toHaveBeenCalledExactlyOnceWith(privatePath, 300);
  });

  it("keeps the matched DB path snapshot when later SDK setup mutates the original row", async () => {
    const row = { id: receiptId, file_path: privatePath };
    const caller = client({
      responses: { private: { data: row, error: null } },
      onStorageBuild: () => {
        row.file_path = "retained/changed.pdf";
      },
    });
    await expect(privateUrl(privateRequest(), context(caller))).resolves.toBe(signedReceiptUrl());
    expect(caller.createSignedUrl).toHaveBeenCalledExactlyOnceWith(privatePath, 300);
  });

  it("checks caller after row parser traps before starting Storage", async () => {
    const trap = vi.fn();
    const row = new Proxy(
      { id: receiptId, file_path: privatePath },
      {
        ownKeys: (target) => {
          trap();
          ctx.claims.role = "service_role";
          return Reflect.ownKeys(target);
        },
      },
    );
    const caller = client({ responses: { private: { data: row, error: null } } }),
      ctx = context(caller);
    await expect(privateUrl(privateRequest(), ctx)).rejects.toThrow(PRIVATE_RECEIPT_URL_FAILURE);
    expect(trap).toHaveBeenCalledTimes(1);
    expect(caller.storage.from).not.toHaveBeenCalled();
  });

  it("checks caller after URL parser traps before returning the bearer URL", async () => {
    const trap = vi.fn();
    const data = new Proxy(
      { signedUrl: signedReceiptUrl() },
      {
        ownKeys: (target) => {
          trap();
          ctx.claims.role = "service_role";
          return Reflect.ownKeys(target);
        },
      },
    );
    const signed = { data, error: null };
    const caller = client({ signingResponse: signed }),
      ctx = context(caller);
    await expect(privateUrl(privateRequest(), ctx)).rejects.toThrow(PRIVATE_RECEIPT_URL_FAILURE);
    expect(trap).toHaveBeenCalledTimes(1);
    expect(caller.createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it.each(["resolve", "reject"] as const)(
    "observes an ignored late Auth %s after its wait timeout without reaching Storage",
    async (settlement) => {
      vi.useFakeTimers();
      const pending = deferred<unknown>(),
        caller = client();
      caller.auth.getUser.mockReturnValue(pending.promise);
      const result = privateUrl(privateRequest(), context(caller));
      const assertion = expect(result).rejects.toThrow(PRIVATE_RECEIPT_URL_FAILURE);
      await vi.advanceTimersByTimeAsync(10_000);
      await assertion;
      if (settlement === "resolve")
        pending.resolve({ data: { user: { id: account } }, error: null });
      else pending.reject(new Error("PRIVATE late Auth"));
      await Promise.resolve();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.storage.from).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("does not sign after an aborted row query eventually returns a valid ignored result", async () => {
    const pending = deferred<Response>(),
      caller = client({ responses: { private: pending.promise } });
    const result = privateUrl(privateRequest(), context(caller));
    await vi.waitFor(() => expect(caller.reads).toHaveLength(1));
    controller.abort();
    pending.resolve({ data: { id: receiptId, file_path: privatePath }, error: null });
    await expect(result).rejects.toThrow(PRIVATE_RECEIPT_URL_FAILURE);
    expect(caller.storage.from).not.toHaveBeenCalled();
  });

  for (const interruption of ["abort", "timeout"] as const) {
    it.each(["resolve", "reject"] as const)(
      `observes late Storage %s after ${interruption} without leaking bearer evidence`,
      async (settlement) => {
        vi.useFakeTimers();
        const pending = deferred<unknown>(),
          caller = client({ signingResponse: pending.promise });
        const result = privateUrl(privateRequest(), context(caller));
        const assertion = expect(result).rejects.toThrow(PRIVATE_RECEIPT_URL_FAILURE);
        await vi.waitFor(() => expect(caller.createSignedUrl).toHaveBeenCalledTimes(1));
        if (interruption === "abort") controller.abort(new Error("PRIVATE abort"));
        else await vi.advanceTimersByTimeAsync(10_000);
        await assertion;
        if (settlement === "resolve")
          pending.resolve({ data: { signedUrl: signedReceiptUrl() }, error: null });
        else pending.reject(new Error(`PRIVATE late ${signedReceiptUrl()}`));
        await Promise.resolve();
        expect(caller.createSignedUrl).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
      },
    );
  }

  it.each(["query", "bucket", "signing"] as const)(
    "redacts synchronous %s failure without provider fallback",
    async (phase) => {
      const caller = client({
        onBuild: () => {
          if (phase === "query") throw new Error(`PRIVATE ${privatePath}`);
        },
        onStorageBuild: () => {
          if (phase === "bucket") throw new Error(`PRIVATE ${privatePath}`);
        },
        onSigningStart: () => {
          if (phase === "signing") throw new Error(`PRIVATE ${signedReceiptUrl()}`);
        },
      });
      const result = await privateUrl(privateRequest(), context(caller)).catch(
        (value: unknown) => value,
      );
      expect((result as Error).message).toBe(PRIVATE_RECEIPT_URL_FAILURE);
      expect(result).not.toHaveProperty("cause");
      expect(String(result)).not.toContain("PRIVATE");
      expect(String(result)).not.toContain(privatePath);
    },
  );
});

describe("receipt expense caller and transport boundary", () => {
  // Synthetic middleware/SDK only. The existing native RPC remains unchanged;
  // its UUID cannot prove persisted financial fields or native-shop authority.
  afterEach(() => {
    expect(mocks.writes).not.toHaveBeenCalled();
    expect(mocks.privileged).not.toHaveBeenCalled();
  });

  it("preflights the exact receipt/shop intent then makes one signal-bound no-retry RPC and returns only a bound acknowledgment", async () => {
    const caller = client();
    await expect(receiptExpense(expenseRequest(), context(caller))).resolves.toEqual(
      expenseAcknowledgment(),
    );
    expect(caller.auth.getClaims).toHaveBeenCalledExactlyOnceWith(token);
    expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(caller.auth.getClaims.mock.invocationCallOrder[0]).toBeLessThan(
      caller.auth.getUser.mock.invocationCallOrder[0],
    );
    expect(caller.from).toHaveBeenCalledExactlyOnceWith("vehicle_receipts");
    expect(caller.rpc).toHaveBeenCalledExactlyOnceWith("record_vehicle_receipt_expense", {
      _id: receiptId,
    });
    expect(caller.reads).toEqual([
      expect.objectContaining({
        stage: "expenseTarget",
        projection: "id,shop_vehicle_id",
        filters: { id: receiptId },
        signal: controller.signal,
        retry: false,
        single: true,
      }),
      expect.objectContaining({
        stage: "expense",
        args: { _id: receiptId },
        signal: controller.signal,
        retry: false,
      }),
    ]);
    expect(caller.storage.from).not.toHaveBeenCalled();
  });

  it("accepts SDK metadata and a valid null-prototype RPC envelope without exposing metadata", async () => {
    const response = Object.assign(Object.create(null), {
      data: expenseId,
      error: null,
      status: 200,
      count: null,
    });
    const caller = client({ responses: { expense: response } });
    const result = await receiptExpense(expenseRequest(), context(caller));
    expect(result).toEqual(expenseAcknowledgment());
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ["session_id", uid(97)],
    ["iss", "https://another-project.example/auth/v1"],
    ["aud", "service_role"],
    ["iat", issuedAt - 1],
    ["exp", issuedAt + 86_399],
    ["aal", "aal2"],
    ["nbf", issuedAt],
    ["is_anonymous", true],
  ] as const)(
    "denies same-account request credentials with different verified %s before target/native dispatch",
    async (field, value) => {
      const caller = client();
      caller.auth.getClaims.mockResolvedValue({
        data: { claims: { ...commandClaims(), [field]: value } },
        error: null,
      });
      await expect(receiptExpense(expenseRequest(), context(caller))).rejects.toThrow(
        RECEIPT_EXPENSE_FAILURE,
      );
      expect(caller.auth.getClaims).toHaveBeenCalledExactlyOnceWith(token);
      expect(caller.auth.getUser).not.toHaveBeenCalled();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
    },
  );

  it("does not adopt a different session for the same account from getRequest", async () => {
    const caller = client();
    caller.auth.getClaims.mockImplementation((credential: string) =>
      Promise.resolve({
        data: {
          claims: {
            ...commandClaims(),
            session_id: credential === token ? uid(98) : uid(97),
          },
        },
        error: null,
      }),
    );
    mocks.request.mockImplementationOnce(() => ({
      ...currentRequest(),
      headers: new Headers({ authorization: "Bearer changed.access.token" }),
    }));
    await expect(receiptExpense(expenseRequest(), context(caller))).rejects.toThrow(
      RECEIPT_EXPENSE_FAILURE,
    );
    expect(caller.auth.getClaims).toHaveBeenCalledExactlyOnceWith("changed.access.token");
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.from).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });

  it.each(["session_id", "iss", "aud", "iat", "exp", "aal", "nbf"] as const)(
    "captures middleware %s before getRequest rather than adopting hook changes",
    async (field) => {
      const caller = client(),
        ctx = context(caller);
      mocks.request.mockImplementationOnce(() => {
        Object.assign(ctx.claims, { [field]: field === "session_id" ? uid(97) : "PRIVATE" });
        return currentRequest();
      });
      await expect(receiptExpense(expenseRequest(), ctx)).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
      expect(caller.auth.getClaims).not.toHaveBeenCalled();
      expect(caller.auth.getUser).not.toHaveBeenCalled();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
    },
  );

  for (const phase of ["expenseTarget", "expense"] as const) {
    it.each(["session_id", "iss", "aud", "iat", "exp", "aal", "nbf", "getClaims"] as const)(
      `denies %s mutation at ${phase} result without returning a financial acknowledgment`,
      async (field) => {
        const caller = client({
            onResult: (read) => {
              if (read.stage !== phase) return;
              if (field === "getClaims") {
                caller.auth.getClaims = vi.fn(() =>
                  Promise.resolve({ data: { claims: commandClaims() }, error: null }),
                );
              } else {
                Object.assign(ctx.claims, {
                  [field]: field === "session_id" ? uid(97) : "PRIVATE",
                });
              }
            },
          }),
          ctx = context(caller);
        await expect(receiptExpense(expenseRequest(), ctx)).rejects.toThrow(
          RECEIPT_EXPENSE_FAILURE,
        );
        expect(caller.auth.getClaims).toHaveBeenCalledTimes(field === "getClaims" ? 0 : 1);
        if (phase === "expenseTarget") expect(caller.rpc).not.toHaveBeenCalled();
        else expect(caller.rpc).toHaveBeenCalledTimes(1);
        // A rejected post-dispatch acknowledgment is unknown, not proof of rollback.
      },
    );

    it(`rejects expiry during ${phase} wait without refreshing credentials or claiming rollback`, async () => {
      vi.useFakeTimers();
      const pending = deferred<Response>(),
        caller = client({ responses: { [phase]: pending.promise } }),
        ctx = context(caller);
      ctx.claims.exp = Math.floor(Date.now() / 1_000) + 2;
      caller.auth.getClaims.mockResolvedValue({ data: { claims: { ...ctx.claims } }, error: null });
      const result = receiptExpense(expenseRequest(), ctx);
      const assertion = expect(result).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
      await vi.waitFor(() => expect(caller.reads.map((read) => read.stage)).toContain(phase));
      await vi.advanceTimersByTimeAsync(2_000);
      pending.resolve({
        data:
          phase === "expenseTarget" ? { id: receiptId, shop_vehicle_id: shopVehicle } : expenseId,
        error: null,
      });
      await assertion;
      expect(caller.auth.getClaims).toHaveBeenCalledTimes(1);
      expect(caller.auth.getUser).toHaveBeenCalledTimes(1);
      if (phase === "expenseTarget") expect(caller.rpc).not.toHaveBeenCalled();
      else expect(caller.rpc).toHaveBeenCalledTimes(1);
    });
  }

  it.each(["resolve", "reject"] as const)(
    "bounds both Auth operations to one ten-second wait and observes late getUser %s",
    async (settlement) => {
      vi.useFakeTimers();
      const claims = deferred<unknown>(),
        user = deferred<unknown>(),
        caller = client();
      caller.auth.getClaims.mockReturnValue(claims.promise);
      caller.auth.getUser.mockReturnValue(user.promise);
      const result = receiptExpense(expenseRequest(), context(caller));
      const assertion = expect(result).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
      await vi.advanceTimersByTimeAsync(6_000);
      expect(caller.auth.getUser).not.toHaveBeenCalled();
      claims.resolve({ data: { claims: commandClaims() }, error: null });
      await vi.advanceTimersByTimeAsync(0);
      expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
      await vi.advanceTimersByTimeAsync(4_000);
      await assertion;
      if (settlement === "resolve")
        user.resolve({ data: { user: { id: account, is_anonymous: false } }, error: null });
      else user.reject(new Error("PRIVATE late current-record response"));
      await Promise.resolve();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([
    null,
    {},
    { id: receiptId },
    { expectedAccountId: account, id: receiptId },
    { ...expenseRequest(), expectedAccountId: "PRIVATE" },
    { ...expenseRequest(), id: "PRIVATE" },
    { ...expenseRequest(), expectedShopVehicleId: "PRIVATE" },
    { ...expenseRequest(), extra: "PRIVATE" },
  ])("rejects malformed expense input before request/Auth/dispatch: %j", async (input) => {
    const caller = client();
    await expect(receiptExpense(input, context(caller))).rejects.toThrow(
      "Invalid receipt expense request.",
    );
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.from).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });

  it.each(["expectedAccountId", "id", "expectedShopVehicleId"] as const)(
    "does not invoke expense input %s accessors",
    async (key) => {
      const input = expenseRequest(),
        get = vi.fn(() => input[key]),
        caller = client();
      Object.defineProperty(input, key, { enumerable: true, get });
      await expect(receiptExpense(input, context(caller))).rejects.toThrow(
        "Invalid receipt expense request.",
      );
      expect(get).not.toHaveBeenCalled();
      expect(mocks.request).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
    },
  );

  it("preserves early account-changed denial before request access", async () => {
    const caller = client();
    await expect(
      receiptExpense({ ...expenseRequest(), expectedAccountId: uid(7) }, context(caller)),
    ).rejects.toThrow("Account changed. Refresh before recording a receipt expense.");
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });

  it("captures all three primitive intent fields before getRequest hooks can mutate validated input", async () => {
    const caller = client();
    mocks.request.mockImplementationOnce(() => {
      Object.assign(mocks.validated as object, {
        expectedAccountId: uid(7),
        id: uid(8),
        expectedShopVehicleId: uid(9),
      });
      return currentRequest();
    });
    await expect(receiptExpense(expenseRequest(), context(caller))).resolves.toEqual(
      expenseAcknowledgment(),
    );
    expect(caller.reads[0].filters).toEqual({ id: receiptId });
    expect(caller.rpc).toHaveBeenCalledExactlyOnceWith("record_vehicle_receipt_expense", {
      _id: receiptId,
    });
  });

  it.each([null, "Basic PRIVATE", "Bearer opaque", "Bearer fixture.access.token,second"])(
    "refuses malformed expense Bearer before native calls: %j",
    async (authorization) => {
      const caller = client();
      mocks.request.mockReturnValue({
        signal: controller.signal,
        headers: { get: () => authorization },
      });
      await expect(receiptExpense(expenseRequest(), context(caller))).rejects.toThrow(
        RECEIPT_EXPENSE_FAILURE,
      );
      expect(caller.auth.getUser).not.toHaveBeenCalled();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
    },
  );

  it.each([
    null,
    { sub: account, role: "service_role" },
    { sub: uid(9), role: "authenticated" },
    { sub: account, role: "authenticated", is_anonymous: true },
  ])("refuses incompatible expense middleware claims before request access: %j", async (claims) => {
    const caller = client();
    await expect(receiptExpense(expenseRequest(), { ...context(caller), claims })).rejects.toThrow(
      RECEIPT_EXPENSE_FAILURE,
    );
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });

  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: uid(9) } }, error: null },
    { data: { user: { id: account, is_anonymous: true } }, error: null },
    { data: { user: { id: account } }, error: null },
    { data: { user: { id: account } }, error: { message: "PRIVATE Auth" } },
  ])("refuses unconfirmed expense current Auth: %j", async (response) => {
    const caller = client();
    caller.auth.getUser.mockResolvedValue(response);
    await expect(receiptExpense(expenseRequest(), context(caller))).rejects.toThrow(
      RECEIPT_EXPENSE_FAILURE,
    );
    expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(caller.from).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });

  const losses = ["account", "client", "claims", "auth-method", "header", "abort"] as const;
  function loseCaller(
    ctx: ReturnType<typeof context>,
    loss: (typeof losses)[number],
    request: ReturnType<typeof currentRequest>,
  ) {
    if (loss === "account") ctx.userId = uid(9);
    if (loss === "client") ctx.supabase = client();
    if (loss === "claims") ctx.claims.role = "service_role";
    if (loss === "auth-method")
      ctx.supabase.auth.getUser = vi.fn(() =>
        Promise.resolve({ data: { user: { id: account } }, error: null }),
      );
    if (loss === "header") request.headers.set("authorization", "Bearer changed.access.token");
    if (loss === "abort") controller.abort(new Error("PRIVATE aborted"));
  }

  it.each(["account", "client", "claims", "auth-method"] as const)(
    "captures expense caller before request hooks can replace %s",
    async (loss) => {
      const caller = client(),
        ctx = context(caller),
        request = currentRequest();
      mocks.request.mockImplementationOnce(() => {
        loseCaller(ctx, loss, request);
        return request;
      });
      await expect(receiptExpense(expenseRequest(), ctx)).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
      expect(caller.auth.getUser).not.toHaveBeenCalled();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
    },
  );

  it.each(losses)(
    "refuses %s change during pending expense Auth before target/RPC dispatch",
    async (loss) => {
      const pending = deferred<unknown>(),
        caller = client(),
        ctx = context(caller),
        request = currentRequest();
      mocks.request.mockReturnValue(request);
      caller.auth.getUser.mockReturnValue(pending.promise);
      const result = receiptExpense(expenseRequest(), ctx);
      await vi.waitFor(() => expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token));
      loseCaller(ctx, loss, request);
      pending.resolve({ data: { user: { id: account } }, error: null });
      await expect(result).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
    },
  );

  for (const point of ["target-build", "target-result", "rpc-build", "rpc-result"] as const) {
    it.each(losses)(
      `refuses %s change at expense ${point} without returning an acknowledgment`,
      async (loss) => {
        const request = currentRequest();
        const caller = client({
            onBuild: (read, method) => {
              if (point === "target-build" && read.stage === "expenseTarget" && method === "single")
                loseCaller(ctx, loss, request);
              if (point === "rpc-build" && read.stage === "expense" && method === "retry")
                loseCaller(ctx, loss, request);
            },
            onResult: (read) => {
              if (point === "target-result" && read.stage === "expenseTarget")
                loseCaller(ctx, loss, request);
              if (point === "rpc-result" && read.stage === "expense")
                loseCaller(ctx, loss, request);
            },
          }),
          ctx = context(caller);
        mocks.request.mockReturnValue(request);
        await expect(receiptExpense(expenseRequest(), ctx)).rejects.toThrow(
          RECEIPT_EXPENSE_FAILURE,
        );
        if (point === "target-build") expect(caller.reads).toEqual([]);
        if (point.startsWith("target")) expect(caller.rpc).not.toHaveBeenCalled();
        if (point !== "rpc-result")
          expect(caller.reads.map((read) => read.stage)).not.toContain("expense");
        else expect(caller.reads.map((read) => read.stage)).toEqual(["expenseTarget", "expense"]);
      },
    );
  }

  it.each([
    null,
    {},
    { id: receiptId, shop_vehicle_id: null },
    { id: uid(8), shop_vehicle_id: shopVehicle },
    { id: receiptId, shop_vehicle_id: uid(8) },
    { id: receiptId, shop_vehicle_id: shopVehicle, extra: true },
  ])("denies missing/wrong selected shop target before accounting RPC: %j", async (data) => {
    const caller = client({ responses: { expenseTarget: { data, error: null } } });
    await expect(receiptExpense(expenseRequest(), context(caller))).rejects.toThrow(
      RECEIPT_EXPENSE_FAILURE,
    );
    expect(caller.rpc).not.toHaveBeenCalled();
  });

  for (const phase of ["expenseTarget", "expense"] as const) {
    it.each([undefined, false, "", { message: "PRIVATE provider cause" }])(
      `requires explicit expense ${phase} error:null with otherwise-valid data: %j`,
      async (error) => {
        const control = client();
        await expect(receiptExpense(expenseRequest(), context(control))).resolves.toEqual(
          expenseAcknowledgment(),
        );
        const data =
          phase === "expenseTarget" ? { id: receiptId, shop_vehicle_id: shopVehicle } : expenseId;
        const caller = client({ responses: { [phase]: { data, error } } });
        const result = await receiptExpense(expenseRequest(), context(caller)).catch(
          (value: unknown) => value,
        );
        expect((result as Error).message).toBe(RECEIPT_EXPENSE_FAILURE);
        expect(result).not.toHaveProperty("cause");
        expect(String(result)).not.toContain("PRIVATE");
        if (phase === "expenseTarget") expect(caller.rpc).not.toHaveBeenCalled();
      },
    );
  }

  it.each([null, undefined, true, 1, [], {}, { id: expenseId }, "PRIVATE invalid UUID"])(
    "never accepts invalid expense RPC UUID data: %j",
    async (data) => {
      const caller = client({ responses: { expense: { data, error: null } } });
      await expect(receiptExpense(expenseRequest(), context(caller))).rejects.toThrow(
        RECEIPT_EXPENSE_FAILURE,
      );
      expect(caller.reads.map((read) => read.stage)).toEqual(["expenseTarget", "expense"]);
    },
  );

  it.each([
    "target-data",
    "target-error",
    "target-id",
    "target-shop",
    "rpc-data",
    "rpc-error",
  ] as const)("does not invoke expense %s accessor evidence", async (field) => {
    const row = { id: receiptId, shop_vehicle_id: shopVehicle };
    const target: Response = { data: row, error: null },
      rpc: Response = { data: expenseId, error: null };
    const object =
      field === "target-id" || field === "target-shop"
        ? row
        : field.startsWith("target")
          ? target
          : rpc;
    const key = field.endsWith("data")
      ? "data"
      : field.endsWith("error")
        ? "error"
        : field === "target-id"
          ? "id"
          : "shop_vehicle_id";
    const get = vi.fn(() => "PRIVATE");
    Object.defineProperty(object, key, { enumerable: true, get });
    const caller = client({ responses: { expenseTarget: target, expense: rpc } });
    await expect(receiptExpense(expenseRequest(), context(caller))).rejects.toThrow(
      RECEIPT_EXPENSE_FAILURE,
    );
    expect(get).not.toHaveBeenCalled();
    if (field.startsWith("target")) expect(caller.rpc).not.toHaveBeenCalled();
  });

  it("checks caller after target parsing traps before starting the accounting RPC", async () => {
    const trap = vi.fn();
    const data = new Proxy(
      { id: receiptId, shop_vehicle_id: shopVehicle },
      {
        ownKeys: (target) => {
          trap();
          ctx.claims.role = "service_role";
          return Reflect.ownKeys(target);
        },
      },
    );
    const caller = client({ responses: { expenseTarget: { data, error: null } } }),
      ctx = context(caller);
    await expect(receiptExpense(expenseRequest(), ctx)).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
    expect(trap).toHaveBeenCalledExactlyOnceWith();
    expect(caller.rpc).not.toHaveBeenCalled();
  });

  it("checks caller after RPC parsing traps before returning expense identity", async () => {
    const trap = vi.fn();
    const response = new Proxy(
      { data: expenseId, error: null },
      {
        getOwnPropertyDescriptor: (target, key) => {
          if (key === "data") {
            trap();
            ctx.claims.role = "service_role";
          }
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
      },
    );
    const caller = client({ responses: { expense: response } }),
      ctx = context(caller);
    await expect(receiptExpense(expenseRequest(), ctx)).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
    expect(trap).toHaveBeenCalledExactlyOnceWith();
    expect(caller.reads).toHaveLength(2);
  });

  it.each(["resolve", "reject"] as const)(
    "observes late expense Auth %s after the ten-second wait without accounting dispatch",
    async (settlement) => {
      vi.useFakeTimers();
      const pending = deferred<unknown>(),
        caller = client();
      caller.auth.getUser.mockReturnValue(pending.promise);
      const result = receiptExpense(expenseRequest(), context(caller));
      const assertion = expect(result).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
      await vi.advanceTimersByTimeAsync(10_000);
      await assertion;
      if (settlement === "resolve")
        pending.resolve({ data: { user: { id: account } }, error: null });
      else pending.reject(new Error("PRIVATE late Auth"));
      await Promise.resolve();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each(["expenseTarget", "expense"] as const)(
    "denies an ignored late %s result after request abort without claiming rollback",
    async (phase) => {
      const pending = deferred<Response>(),
        caller = client({ responses: { [phase]: pending.promise } });
      const result = receiptExpense(expenseRequest(), context(caller));
      await vi.waitFor(() => expect(caller.reads.map((read) => read.stage)).toContain(phase));
      controller.abort();
      pending.resolve({
        data:
          phase === "expenseTarget" ? { id: receiptId, shop_vehicle_id: shopVehicle } : expenseId,
        error: null,
      });
      await expect(result).rejects.toThrow(RECEIPT_EXPENSE_FAILURE);
      if (phase === "expenseTarget") expect(caller.rpc).not.toHaveBeenCalled();
      else expect(caller.rpc).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["expenseTarget", "expense"] as const)(
    "redacts %s provider rejection without another dispatch",
    async (phase) => {
      const caller = client({
        responses: { [phase]: () => Promise.reject(new Error("PRIVATE provider cause")) },
      });
      const result = await receiptExpense(expenseRequest(), context(caller)).catch(
        (value: unknown) => value,
      );
      expect((result as Error).message).toBe(RECEIPT_EXPENSE_FAILURE);
      expect(result).not.toHaveProperty("cause");
      expect(String(result)).not.toContain("PRIVATE");
      if (phase === "expenseTarget") expect(caller.rpc).not.toHaveBeenCalled();
      else expect(caller.rpc).toHaveBeenCalledTimes(1);
    },
  );
});

describe("temporary draft discard source interlock", () => {
  // Actual handler with middleware mocked for direct-call denial coverage.
  // These tests do not prove a live ACL restriction or a recoverable deletion.
  afterEach(() => {
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.privileged).not.toHaveBeenCalled();
    expect(mocks.writes).not.toHaveBeenCalled();
  });

  function expectNoClientAccess(caller: ReturnType<typeof client>) {
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.from).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
    expect(caller.storage.from).not.toHaveBeenCalled();
    expect(caller.createSignedUrl).not.toHaveBeenCalled();
    expect(caller.reads).toEqual([]);
  }

  it("pins the shared temporary-unavailable copy without claiming a completed deletion", () => {
    expect(RECEIPT_DISCARD_UNAVAILABLE).toBe(
      "Draft removal is temporarily unavailable until recovery is verified. Keep this draft and its original file.",
    );
  });

  it.each(["authenticated", "service-role", "client-only", "raw"] as const)(
    "refuses a valid UUID through the actual handler for %s context without any operation",
    async (kind) => {
      const caller = client();
      const ctx =
        kind === "authenticated"
          ? context(caller)
          : kind === "service-role"
            ? { userId: account, claims: { sub: account, role: "service_role" }, supabase: caller }
            : kind === "client-only"
              ? { supabase: caller }
              : caller;
      const result = await discardDraft({ id: receiptId }, ctx).catch((value: unknown) => value);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe(RECEIPT_DISCARD_UNAVAILABLE);
      expect(result).not.toHaveProperty("cause");
      expectNoClientAccess(caller);
    },
  );

  it.each([undefined, null, 17, "PRIVATE context", {}])(
    "refuses raw unsupported context without inspecting it: %j",
    async (ctx) => {
      await expect(discardDraft({ id: receiptId }, ctx)).rejects.toThrow(
        RECEIPT_DISCARD_UNAVAILABLE,
      );
    },
  );

  it.each(["supabase", "userId", "claims", "auth", "storage", "client", "from", "rpc"] as const)(
    "does not access side-effect context getter %s",
    async (field) => {
      const get = vi.fn(() => {
        throw new Error("PRIVATE context/client getter");
      });
      const ctx = {};
      Object.defineProperty(ctx, field, { enumerable: true, get });
      await expect(discardDraft({ id: receiptId }, ctx)).rejects.toThrow(
        RECEIPT_DISCARD_UNAVAILABLE,
      );
      expect(get).not.toHaveBeenCalled();
    },
  );

  it("never reflects on an opaque context Proxy", async () => {
    const trap = vi.fn(() => {
      throw new Error("PRIVATE context reflection");
    });
    const ctx = new Proxy(
      {},
      { get: trap, getPrototypeOf: trap, getOwnPropertyDescriptor: trap, ownKeys: trap },
    );
    await expect(discardDraft({ id: receiptId }, ctx)).rejects.toThrow(RECEIPT_DISCARD_UNAVAILABLE);
    expect(trap).not.toHaveBeenCalled();
  });

  it.each(["manual", "attached"] as const)(
    "does not exempt a %s draft based on a client file hint or read preflight",
    async (kind) => {
      const caller = client({
        responses: {
          private: {
            data: { id: receiptId, file_path: kind === "manual" ? null : privatePath },
            error: null,
          },
        },
      });
      await expect(
        discardDraft(
          { id: receiptId, file_path: kind === "manual" ? null : privatePath },
          context(caller),
        ),
      ).rejects.toThrow(RECEIPT_DISCARD_UNAVAILABLE);
      expectNoClientAccess(caller);
    },
  );

  it.each([null, {}, { id: null }, { id: "not-a-uuid" }])(
    "retains UUID request validation without invoking any native operation: %j",
    async (input) => {
      const caller = client();
      await expect(discardDraft(input, context(caller))).rejects.toThrow();
      expectNoClientAccess(caller);
    },
  );
});

describe("installation caller, selected target and void transport boundary", () => {
  // Actual handler with synthetic SDK responses; no SQL authority, durable
  // operation receipt, persisted installation/history or cancellation proof.
  afterEach(() => {
    expect(mocks.writes).not.toHaveBeenCalled();
    expect(mocks.privileged).not.toHaveBeenCalled();
  });
  const phases = ["installationItem", "installationTarget", "installation"] as const;
  const valid = (phase: (typeof phases)[number]): Response => ({
    data:
      phase === "installationItem"
        ? { id: itemId, receipt_id: receiptId }
        : phase === "installationTarget"
          ? { id: receiptId, vehicle_id: vehicle, shop_vehicle_id: shopVehicle }
          : null,
    error: null,
  });

  it.each([false, true])(
    "preflights exact item/receipt/selected target shop=%s then acknowledges only one legacy void RPC",
    async (shop) => {
      const caller = client(),
        request = installationIntent(shop);
      await expect(recordInstallation(request, context(caller))).resolves.toEqual(request);
      expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
      expect(caller.from.mock.calls).toEqual([["vehicle_receipt_items"], ["vehicle_receipts"]]);
      expect(caller.rpc).toHaveBeenCalledExactlyOnceWith("install_vehicle_receipt_item", {
        _item_id: itemId,
        _installed_on: request.installedOn,
        _odometer_km: request.odometerKm,
      });
      expect(caller.reads).toEqual([
        expect.objectContaining({
          stage: "installationItem",
          projection: "id,receipt_id",
          filters: { id: itemId },
          signal: controller.signal,
          retry: false,
          single: true,
        }),
        expect.objectContaining({
          stage: "installationTarget",
          projection: "id,vehicle_id,shop_vehicle_id",
          filters: { id: receiptId },
          signal: controller.signal,
          retry: false,
          single: true,
        }),
        expect.objectContaining({ stage: "installation", signal: controller.signal, retry: false }),
      ]);
      expect(caller.storage.from).not.toHaveBeenCalled();
    },
  );
  it.each([
    null,
    {},
    { ...installationIntent(), expectedAccountId: "PRIVATE" },
    { ...installationIntent(), receiptId: "PRIVATE" },
    { ...installationIntent(), itemId: "PRIVATE" },
    { ...installationIntent(), expectedVehicleId: null },
    { ...installationIntent(), expectedShopVehicleId: shopVehicle },
    { ...installationIntent(), installedOn: "2026-02-30" },
    { ...installationIntent(), odometerKm: 1.5 },
    { ...installationIntent(), extra: true },
  ])(
    "rejects malformed installation intent before request/Auth/native dispatch: %j",
    async (input) => {
      const caller = client();
      await expect(recordInstallation(input, context(caller))).rejects.toThrow(
        "Invalid receipt installation request.",
      );
      expect(mocks.request).not.toHaveBeenCalled();
      expect(caller.auth.getUser).not.toHaveBeenCalled();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
    },
  );
  it("preserves early installation account denial", async () => {
    const caller = client();
    await expect(
      recordInstallation({ ...installationIntent(), expectedAccountId: uid(9) }, context(caller)),
    ).rejects.toThrow("Account changed. Refresh before recording an installation.");
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });
  it("captures all seven primitive fields before request hooks mutate the validated object", async () => {
    const caller = client();
    mocks.request.mockImplementationOnce(() => {
      Object.assign(mocks.validated as object, {
        expectedAccountId: uid(9),
        receiptId: uid(10),
        itemId: uid(11),
        expectedVehicleId: null,
        expectedShopVehicleId: uid(12),
        installedOn: "2026-10-16",
        odometerKm: 22,
      });
      return currentRequest();
    });
    await expect(recordInstallation(installationIntent(), context(caller))).resolves.toEqual(
      installationIntent(),
    );
    expect(caller.rpc).toHaveBeenCalledExactlyOnceWith("install_vehicle_receipt_item", {
      _item_id: itemId,
      _installed_on: "2026-10-15",
      _odometer_km: 12345,
    });
  });
  it.each([null, "Basic PRIVATE", "Bearer opaque", "Bearer fixture.access.token,second"])(
    "refuses malformed installation Bearer: %j",
    async (authorization) => {
      const caller = client();
      mocks.request.mockReturnValue({
        signal: controller.signal,
        headers: { get: () => authorization },
      });
      await expect(recordInstallation(installationIntent(), context(caller))).rejects.toThrow(
        RECEIPT_INSTALLATION_FAILURE,
      );
      expect(caller.auth.getUser).not.toHaveBeenCalled();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
    },
  );
  it.each([
    null,
    { sub: account, role: "service_role" },
    { sub: account, role: "authenticated", is_anonymous: true },
  ])("refuses incompatible installation claims before request access: %j", async (claims) => {
    const caller = client();
    await expect(
      recordInstallation(installationIntent(), { ...context(caller), claims }),
    ).rejects.toThrow(RECEIPT_INSTALLATION_FAILURE);
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });
  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: uid(9) } }, error: null },
    { data: { user: { id: account, is_anonymous: true } }, error: null },
    { data: { user: { id: account } }, error: { message: "PRIVATE Auth" } },
  ])("refuses unconfirmed current installation Auth: %j", async (response) => {
    const caller = client();
    caller.auth.getUser.mockResolvedValue(response);
    await expect(recordInstallation(installationIntent(), context(caller))).rejects.toThrow(
      RECEIPT_INSTALLATION_FAILURE,
    );
    expect(caller.from).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });
  const losses = ["account", "client", "claims", "auth-method", "header", "abort"] as const;
  function loseCaller(
    ctx: ReturnType<typeof context>,
    loss: (typeof losses)[number],
    request: ReturnType<typeof currentRequest>,
  ) {
    if (loss === "account") ctx.userId = uid(9);
    if (loss === "client") ctx.supabase = client();
    if (loss === "claims") ctx.claims.role = "service_role";
    if (loss === "auth-method")
      ctx.supabase.auth.getUser = vi.fn(() =>
        Promise.resolve({ data: { user: { id: account } }, error: null }),
      );
    if (loss === "header") request.headers.set("authorization", "Bearer changed.access.token");
    if (loss === "abort") controller.abort(new Error("PRIVATE abort"));
  }
  it.each(["account", "client", "claims", "auth-method"] as const)(
    "captures installation caller before request replacement of %s",
    async (loss) => {
      const caller = client(),
        ctx = context(caller),
        request = currentRequest();
      mocks.request.mockImplementationOnce(() => {
        loseCaller(ctx, loss, request);
        return request;
      });
      await expect(recordInstallation(installationIntent(), ctx)).rejects.toThrow(
        RECEIPT_INSTALLATION_FAILURE,
      );
      expect(caller.auth.getUser).not.toHaveBeenCalled();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
    },
  );
  it.each(losses)("denies %s loss while explicit installation Auth is pending", async (loss) => {
    const pending = deferred<unknown>(),
      caller = client(),
      ctx = context(caller),
      request = currentRequest();
    mocks.request.mockReturnValue(request);
    caller.auth.getUser.mockReturnValue(pending.promise);
    const result = recordInstallation(installationIntent(), ctx);
    loseCaller(ctx, loss, request);
    pending.resolve({ data: { user: { id: account } }, error: null });
    await expect(result).rejects.toThrow(RECEIPT_INSTALLATION_FAILURE);
    expect(caller.from).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });
  for (const phase of phases) {
    for (const point of ["build", "result"] as const) {
      it.each(losses)(
        `denies %s loss at ${phase} ${point} without a captured-intent acknowledgment`,
        async (loss) => {
          const request = currentRequest();
          const caller = client({
              onBuild: (read, method) => {
                if (
                  point === "build" &&
                  read.stage === phase &&
                  method === (phase === "installation" ? "retry" : "single")
                )
                  loseCaller(ctx, loss, request);
              },
              onResult: (read) => {
                if (point === "result" && read.stage === phase) loseCaller(ctx, loss, request);
              },
            }),
            ctx = context(caller);
          mocks.request.mockReturnValue(request);
          await expect(recordInstallation(installationIntent(), ctx)).rejects.toThrow(
            RECEIPT_INSTALLATION_FAILURE,
          );
          if (point === "build")
            expect(caller.reads.map((read) => read.stage)).not.toContain(phase);
          if (phase !== "installation") expect(caller.rpc).not.toHaveBeenCalled();
          else expect(caller.rpc).toHaveBeenCalledTimes(1);
        },
      );
    }
    it.each([undefined, false, "", { message: "PRIVATE provider cause" }])(
      `requires explicit ${phase} error:null with valid control/data: %j`,
      async (error) => {
        const control = client();
        await expect(recordInstallation(installationIntent(), context(control))).resolves.toEqual(
          installationIntent(),
        );
        const caller = client({ responses: { [phase]: { ...valid(phase), error } } });
        const result = await recordInstallation(installationIntent(), context(caller)).catch(
          (value: unknown) => value,
        );
        expect((result as Error).message).toBe(RECEIPT_INSTALLATION_FAILURE);
        expect(result).not.toHaveProperty("cause");
        expect(String(result)).not.toContain("PRIVATE");
        if (phase !== "installation") expect(caller.rpc).not.toHaveBeenCalled();
      },
    );
    it.each(["data", "error"] as const)(`never invokes ${phase} SDK %s accessors`, async (key) => {
      const response = valid(phase),
        get = vi.fn(() => "PRIVATE");
      Object.defineProperty(response, key, { enumerable: true, get });
      const caller = client({ responses: { [phase]: response } });
      await expect(recordInstallation(installationIntent(), context(caller))).rejects.toThrow(
        RECEIPT_INSTALLATION_FAILURE,
      );
      expect(get).not.toHaveBeenCalled();
      if (phase !== "installation") expect(caller.rpc).not.toHaveBeenCalled();
    });
    it(`rechecks caller after ${phase} parsing reflection`, async () => {
      const trap = vi.fn();
      const body = valid(phase);
      const reflection =
        phase === "installation"
          ? new Proxy(body, {
              getOwnPropertyDescriptor: (target, key) => {
                if (key === "data") {
                  trap();
                  ctx.claims.role = "service_role";
                }
                return Reflect.getOwnPropertyDescriptor(target, key);
              },
            })
          : {
              ...body,
              data: new Proxy(body.data as object, {
                ownKeys: (target) => {
                  trap();
                  ctx.claims.role = "service_role";
                  return Reflect.ownKeys(target);
                },
              }),
            };
      const caller = client({ responses: { [phase]: reflection } }),
        ctx = context(caller);
      await expect(recordInstallation(installationIntent(), ctx)).rejects.toThrow(
        RECEIPT_INSTALLATION_FAILURE,
      );
      expect(trap).toHaveBeenCalledExactlyOnceWith();
      if (phase !== "installation") expect(caller.rpc).not.toHaveBeenCalled();
    });
    it(`denies an ignored late ${phase} result after request abort without another dispatch`, async () => {
      const pending = deferred<Response>(),
        caller = client({ responses: { [phase]: pending.promise } });
      const result = recordInstallation(installationIntent(), context(caller));
      await vi.waitFor(() => expect(caller.reads.map((read) => read.stage)).toContain(phase));
      controller.abort();
      pending.resolve(valid(phase));
      await expect(result).rejects.toThrow(RECEIPT_INSTALLATION_FAILURE);
      if (phase !== "installation") expect(caller.rpc).not.toHaveBeenCalled();
      else expect(caller.rpc).toHaveBeenCalledTimes(1);
    });
  }
  it.each([null, {}, { id: uid(9), receipt_id: receiptId }, { id: itemId, receipt_id: uid(9) }])(
    "rejects missing/misbound item before receipt or installation dispatch: %j",
    async (data) => {
      const caller = client({ responses: { installationItem: { data, error: null } } });
      await expect(recordInstallation(installationIntent(), context(caller))).rejects.toThrow(
        RECEIPT_INSTALLATION_FAILURE,
      );
      expect(caller.from).toHaveBeenCalledTimes(1);
      expect(caller.rpc).not.toHaveBeenCalled();
    },
  );
  it.each([false, true])(
    "refuses an unrelated selected target shop=%s even with readable linked-vehicle evidence",
    async (shop) => {
      const data = {
        id: receiptId,
        vehicle_id: shop ? vehicle : uid(9),
        shop_vehicle_id: shop ? uid(9) : shopVehicle,
      };
      const caller = client({ responses: { installationTarget: { data, error: null } } });
      await expect(recordInstallation(installationIntent(shop), context(caller))).rejects.toThrow(
        RECEIPT_INSTALLATION_FAILURE,
      );
      expect(caller.rpc).not.toHaveBeenCalled();
    },
  );
  it.each([undefined, false, true, 0, [], {}, itemId])(
    "rejects non-null legacy void RPC data instead of installation success: %j",
    async (data) => {
      const caller = client({ responses: { installation: { data, error: null } } });
      await expect(recordInstallation(installationIntent(), context(caller))).rejects.toThrow(
        RECEIPT_INSTALLATION_FAILURE,
      );
      expect(caller.rpc).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["resolve", "reject"] as const)(
    "ignores late installation Auth %s after its bounded wait",
    async (settlement) => {
      vi.useFakeTimers();
      const pending = deferred<unknown>(),
        caller = client();
      caller.auth.getUser.mockReturnValue(pending.promise);
      const result = recordInstallation(installationIntent(), context(caller));
      const assertion = expect(result).rejects.toThrow(RECEIPT_INSTALLATION_FAILURE);
      await vi.advanceTimersByTimeAsync(10000);
      await assertion;
      if (settlement === "resolve")
        pending.resolve({ data: { user: { id: account } }, error: null });
      else pending.reject(new Error("PRIVATE late Auth"));
      await Promise.resolve();
      expect(caller.from).not.toHaveBeenCalled();
      expect(caller.rpc).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});

describe("display-only receipt line page caller and scope boundaries", () => {
  const input = (page = 0, shop = false) => ({
    expectedAccountId: account,
    receiptId,
    ...(shop ? { shopVehicleId: shopVehicle } : { vehicleId: vehicle }),
    page,
  });
  const visibleParent = (changes: Record<string, unknown> = {}) => ({
    id: receiptId,
    vehicle_id: vehicle,
    shop_vehicle_id: null,
    share_with_shop: true,
    ...changes,
  });
  const stages = ["access", "activeLink", "lineParent", "lineItems"] as const;
  const losses = ["account", "client", "claims", "auth-method", "header", "abort"] as const;
  function lose(
    ctx: ReturnType<typeof context>,
    loss: (typeof losses)[number],
    request: ReturnType<typeof currentRequest>,
  ) {
    if (loss === "account") ctx.userId = uid(99);
    if (loss === "client") ctx.supabase = client();
    if (loss === "claims") ctx.claims.role = "service_role";
    if (loss === "auth-method") {
      const original = ctx.supabase.auth.getUser;
      ctx.supabase.auth.getUser = vi.fn((value: string) => original(value));
    }
    if (loss === "header") request.headers.set("authorization", "Bearer changed.access.token");
    if (loss === "abort") controller.abort(new Error("PRIVATE abort"));
  }
  afterEach(() => {
    expect(mocks.writes).not.toHaveBeenCalled();
    expect(mocks.privileged).not.toHaveBeenCalled();
  });
  it("uses one same-client Auth lookup, exact fixed projections/windows and pre/post visible parent checks", async () => {
    const caller = client(),
      request = input();
    const result = await receiptLines(request, context(caller));
    expect(parseReceiptLinesPage(result, request)).toMatchObject({
      receiptId,
      page: 0,
      totalCount: 1,
      hasNext: false,
      vehicleId: vehicle,
      shopVehicleId: null,
    });
    expect(result).not.toHaveProperty("items_complete");
    expect(result).not.toHaveProperty("edit_eligible");
    expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(caller.reads.map((read) => read.stage)).toEqual([
      "access",
      "lineParent",
      "lineItems",
      "access",
      "lineParent",
    ]);
    for (const read of caller.reads)
      expect(read).toMatchObject({ signal: controller.signal, retry: false });
    for (const read of caller.reads.filter((read) => read.stage === "lineParent"))
      expect(read).toMatchObject({
        projection: RECEIPT_LINES_PARENT_PROJECTION,
        filters: { id: receiptId },
        single: true,
      });
    expect(caller.reads.find((read) => read.stage === "lineItems")).toMatchObject({
      projection: itemProjection,
      options: { count: "exact" },
      filters: { receipt_id: receiptId },
      range: [0, 99],
      orders: [
        ["sort_order", { ascending: true }],
        ["id", { ascending: true }],
      ],
    });
    expect(caller.storage.from).not.toHaveBeenCalled();
  });
  it("reaches line101 without changing parent writer flags or fetching unbounded children", async () => {
    const caller = client({
      responses: { lineItems: { data: [{ ...item(), sort_order: 100 }], count: 101, error: null } },
    });
    await expect(receiptLines(input(1), context(caller))).resolves.toMatchObject({
      page: 1,
      totalCount: 101,
      hasNext: false,
      items: [{ sort_order: 100 }],
    });
    expect(caller.reads.find((read) => read.stage === "lineItems")?.range).toEqual([100, 199]);
  });
  it.each(["direct", "linked", "dual"] as const)(
    "preserves selected shop %s read semantics without granting writes",
    async (kind) => {
      const caller = client({
        responses: {
          lineParent: {
            data: visibleParent({
              shop_vehicle_id: kind === "linked" ? uid(99) : shopVehicle,
              vehicle_id: kind === "direct" ? null : vehicle,
              share_with_shop: kind === "linked",
            }),
            error: null,
          },
        },
      });
      await expect(receiptLines(input(0, true), context(caller))).resolves.toMatchObject({
        shopVehicleId: shopVehicle,
        vehicleId: null,
      });
      expect(caller.reads.filter((read) => read.stage === "activeLink")).toHaveLength(2);
      expect(caller.reads.filter((read) => read.stage === "lineItems")).toHaveLength(1);
    },
  );
  it("denies an unshared linked receipt before item dispatch", async () => {
    const caller = client({
      responses: { lineParent: { data: visibleParent({ share_with_shop: false }), error: null } },
    });
    await expect(receiptLines(input(0, true), context(caller))).rejects.toThrow(
      RECEIPT_LINES_FAILURE,
    );
    expect(caller.reads.map((read) => read.stage)).toEqual(["access", "activeLink", "lineParent"]);
  });
  it.each([
    null,
    {},
    { ...input(), vehicleId: undefined },
    { ...input(), shopVehicleId: shopVehicle },
    { ...input(), limit: 1000 },
    { ...input(), expectedAccountId: "bad" },
    { ...input(), receiptId: "bad" },
    { ...input(), page: 0.5 },
  ])("rejects invalid request before request/client access %j", async (raw) => {
    const caller = client();
    await expect(receiptLines(raw, context(caller))).rejects.toThrow(
      "Invalid receipt line request.",
    );
    expect(mocks.request).not.toHaveBeenCalled();
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });
  it("preserves early account denial and captures all validated primitive intent before request hooks", async () => {
    const denied = client();
    await expect(receiptLines(input(), { ...context(denied), userId: uid(99) })).rejects.toThrow(
      "Account changed.",
    );
    expect(mocks.request).not.toHaveBeenCalled();
    const caller = client();
    mocks.request.mockImplementationOnce(() => {
      Object.assign(mocks.validated as object, {
        expectedAccountId: uid(90),
        receiptId: uid(91),
        vehicleId: uid(92),
        shopVehicleId: shopVehicle,
        page: 1,
      });
      return currentRequest();
    });
    await expect(receiptLines(input(), context(caller))).resolves.toMatchObject({
      receiptId,
      page: 0,
      vehicleId: vehicle,
    });
    expect(caller.reads.find((read) => read.stage === "lineItems")).toMatchObject({
      filters: { receipt_id: receiptId },
      range: [0, 99],
    });
  });
  it.each([
    undefined,
    "",
    "Bearer invalid",
    "bearer fixture.access.token",
    "Bearer fixture.access.token ",
  ])("denies malformed bearer %j before native capability", async (header) => {
    const caller = client();
    mocks.request.mockReturnValue({
      signal: controller.signal,
      // Real Headers normalizes surrounding whitespace. Present the intended
      // malformed raw getter value instead of accidentally testing a valid token.
      headers: { get: (name: string) => (name === "authorization" ? (header ?? null) : null) },
    });
    await expect(receiptLines(input(), context(caller))).rejects.toThrow(RECEIPT_LINES_FAILURE);
    expect(caller.auth.getUser).not.toHaveBeenCalled();
    expect(caller.rpc).not.toHaveBeenCalled();
  });
  it.each([
    { sub: account, role: "service_role" },
    { sub: account, role: "authenticated", is_anonymous: true },
    { sub: uid(99), role: "authenticated" },
  ])("denies unsupported claims %j", async (claims) => {
    const caller = client();
    await expect(receiptLines(input(), { ...context(caller), claims })).rejects.toThrow(
      RECEIPT_LINES_FAILURE,
    );
    expect(caller.rpc).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { data: { user: null }, error: null },
    { data: { user: { id: uid(99) } }, error: null },
    { data: { user: { id: account, is_anonymous: true } }, error: null },
    { data: { user: { id: account } }, error: false },
    { data: { user: { id: account } }, error: { message: "PRIVATE Auth" } },
  ])("denies unavailable/noncurrent Auth %j", async (value) => {
    const caller = client();
    caller.auth.getUser.mockResolvedValue(value);
    await expect(receiptLines(input(), context(caller))).rejects.toThrow(RECEIPT_LINES_FAILURE);
    expect(caller.rpc).not.toHaveBeenCalled();
  });
  it.each(losses)(
    "denies unsupported caller or first-observed header at getRequest: %s",
    async (loss) => {
      const caller = client(),
        ctx = context(caller),
        request = currentRequest();
      mocks.request.mockImplementationOnce(() => {
        lose(ctx, loss, request);
        // The header is captured only after getRequest returns. A different valid
        // first-observed token is not an observed header replacement.
        if (loss === "header") request.headers.set("authorization", "Bearer malformed");
        return request;
      });
      await expect(receiptLines(input(), ctx)).rejects.toThrow(RECEIPT_LINES_FAILURE);
      expect(caller.rpc).not.toHaveBeenCalled();
      expect(caller.from).not.toHaveBeenCalled();
    },
  );
  it("verifies the valid first-observed token returned by getRequest, not a token captured beforehand", async () => {
    const caller = client();
    mocks.request.mockImplementationOnce(() => ({
      signal: controller.signal,
      headers: new Headers({ authorization: "Bearer changed.access.token" }),
    }));
    await expect(receiptLines(input(), context(caller))).resolves.toMatchObject({ receiptId });
    expect(caller.auth.getUser).toHaveBeenCalledExactlyOnceWith("changed.access.token");
    expect(caller.reads.filter((read) => read.stage === "lineItems")).toHaveLength(1);
  });
  it.each(losses)("denies %s loss during pending Auth", async (loss) => {
    const pending = deferred<unknown>(),
      caller = client(),
      ctx = context(caller),
      request = currentRequest();
    mocks.request.mockReturnValue(request);
    caller.auth.getUser.mockReturnValue(pending.promise);
    const result = receiptLines(input(), ctx);
    lose(ctx, loss, request);
    pending.resolve({ data: { user: { id: account } }, error: null });
    await expect(result).rejects.toThrow(RECEIPT_LINES_FAILURE);
    expect(caller.rpc).not.toHaveBeenCalled();
  });
  for (const stage of stages)
    it.each(losses)(`fences %s loss after awaited ${stage}`, async (loss) => {
      const request = currentRequest();
      const caller = client({
          onResult: (read) => {
            if (read.stage === stage) lose(ctx, loss, request);
          },
        }),
        ctx = context(caller);
      mocks.request.mockReturnValue(request);
      await expect(receiptLines(input(0, true), ctx)).rejects.toThrow(RECEIPT_LINES_FAILURE);
      expect(caller.reads.at(-1)?.stage).toBe(stage);
    });
  for (const stage of stages)
    it.each(losses)(
      `fences %s loss during ${stage} query construction before dispatch`,
      async (loss) => {
        const request = currentRequest();
        const last =
          stage === "lineParent" ? "single" : stage === "activeLink" ? "maybeSingle" : "retry";
        const caller = client({
            onBuild: (read, method) => {
              if (read.stage === stage && method === last) lose(ctx, loss, request);
            },
          }),
          ctx = context(caller);
        mocks.request.mockReturnValue(request);
        await expect(receiptLines(input(0, true), ctx)).rejects.toThrow(RECEIPT_LINES_FAILURE);
        expect(caller.reads.map((read) => read.stage)).not.toContain(stage);
      },
    );
  for (const stage of stages)
    it.each([undefined, false, "", { message: "PRIVATE read" }])(
      `requires explicit error:null at ${stage} with otherwise valid data`,
      async (error) => {
        const good =
          stage === "access"
            ? { data: { can_write: false, can_record_expense: false }, error: null }
            : stage === "activeLink"
              ? {
                  data: { shop_vehicle_id: shopVehicle, vehicle_id: vehicle, active: true },
                  error: null,
                }
              : stage === "lineParent"
                ? { data: visibleParent(), error: null }
                : { data: [item()], count: 1, error: null };
        const control = client({ responses: { [stage]: good } });
        await expect(receiptLines(input(0, true), context(control))).resolves.toMatchObject({
          receiptId,
        });
        const caller = client({ responses: { [stage]: { ...good, error } } });
        await expect(receiptLines(input(0, true), context(caller))).rejects.toThrow(
          RECEIPT_LINES_FAILURE,
        );
        expect(caller.reads.at(-1)?.stage).toBe(stage);
      },
    );
  it.each([null, undefined, "1", -1, 0.5, 0, 2, 101])(
    "denies unknown/contradictory item count %j",
    async (count) => {
      const caller = client({ responses: { lineItems: { data: [item()], count, error: null } } });
      await expect(receiptLines(input(), context(caller))).rejects.toThrow(RECEIPT_LINES_FAILURE);
      expect(caller.reads.at(-1)?.stage).toBe("lineItems");
    },
  );
  it.each([
    "revoked-link",
    "rebound-link",
    "unshared",
    "retargeted",
    "lost-parent",
    "denied-workspace",
  ] as const)("denies observed post-page %s before return", async (kind) => {
    let accesses = 0,
      links = 0,
      parents = 0;
    const caller = client({
      responses: {
        access: () => ({
          data: { can_write: true, can_record_expense: false },
          error: ++accesses === 2 && kind === "denied-workspace" ? { message: "PRIVATE" } : null,
        }),
        activeLink: () => ({
          data:
            ++links === 2 && kind === "revoked-link"
              ? null
              : {
                  shop_vehicle_id: shopVehicle,
                  vehicle_id: links === 2 && kind === "rebound-link" ? uid(99) : vehicle,
                  active: true,
                },
          error: null,
        }),
        lineParent: () => ({
          data:
            ++parents === 2 && kind === "lost-parent"
              ? null
              : visibleParent({
                  share_with_shop: !(parents === 2 && kind === "unshared"),
                  vehicle_id: parents === 2 && kind === "retargeted" ? uid(99) : vehicle,
                }),
          error: null,
        }),
      },
    });
    await expect(receiptLines(input(0, true), context(caller))).rejects.toThrow(
      RECEIPT_LINES_FAILURE,
    );
    expect(caller.reads.filter((read) => read.stage === "lineItems")).toHaveLength(1);
  });
  it.each(["lineParent", "lineItems"] as const)(
    "checks caller again after %s parser traps",
    async (stage) => {
      let parsed = 0;
      const row = stage === "lineParent" ? visibleParent() : item();
      const trapped = new Proxy(row, {
        ownKeys(target) {
          parsed++;
          ctx.claims.role = "service_role";
          return Reflect.ownKeys(target);
        },
      });
      const caller = client({
          responses: {
            [stage]: { data: stage === "lineItems" ? [trapped] : trapped, count: 1, error: null },
          },
        }),
        ctx = context(caller);
      await expect(receiptLines(input(), ctx)).rejects.toThrow(RECEIPT_LINES_FAILURE);
      expect(parsed).toBeGreaterThan(0);
      expect(caller.reads.at(-1)?.stage).toBe(stage);
    },
  );
  it.each(["resolve", "reject"] as const)(
    "observes late Auth %s after the10s wait without native dispatch",
    async (settlement) => {
      vi.useFakeTimers();
      const pending = deferred<unknown>(),
        caller = client();
      caller.auth.getUser.mockReturnValue(pending.promise);
      const assertion = expect(receiptLines(input(), context(caller))).rejects.toThrow(
        RECEIPT_LINES_FAILURE,
      );
      await vi.advanceTimersByTimeAsync(10_000);
      await assertion;
      if (settlement === "resolve")
        pending.resolve({ data: { user: { id: account } }, error: null });
      else pending.reject(new Error("PRIVATE late Auth"));
      await Promise.resolve();
      expect(caller.rpc).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});
