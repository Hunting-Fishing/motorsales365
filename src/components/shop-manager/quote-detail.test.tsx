// Actual route + real QueryClient lifetimes, with synthetic SDK responses only.
// This does not prove JWT/RLS, API cancellation, native writes or accounting.
// Conversion is temporarily interlocked pending an authorized atomic writer.
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "@/routes/_authenticated/workspace.quotes.$id";

type DbResult = { data: unknown; error: unknown; count?: unknown };
type DbResponse = DbResult | Promise<DbResult> | (() => DbResult | Promise<DbResult>);
type Read = {
  userId: string | null;
  table: string;
  target: string;
  projection: string;
  options?: { count?: string };
  filters: Record<string, unknown>;
  orders: { column: string; options: unknown }[];
  limit?: number;
  signal?: AbortSignal;
  retry?: boolean;
  maybeSingle: boolean;
};
const state = vi.hoisted(() => ({
  userId: "account-a" as string | null,
  loading: false,
  id: "",
  responses: {} as Record<string, DbResponse>,
  read: vi.fn(),
  write: vi.fn(),
  rpc: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null, loading: state.loading }),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock("sonner", () => ({
  toast: { success: state.success, error: state.error, warning: state.warning },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useParams: () => ({ id: state.id }),
  }),
  useNavigate: () => state.navigate,
  Link: ({
    to,
    params,
    children,
    ...props
  }: React.PropsWithChildren<{ to: string; params?: { id: string }; className?: string }>) => (
    <a {...props} href={to.replace("$id", params?.id ?? "")}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: {
    rpc: (...args: unknown[]) => state.rpc(...args),
    from: (table: string) => {
      const request: Read = {
        userId: state.userId,
        table,
        target: state.id,
        projection: "",
        filters: {},
        orders: [],
        maybeSingle: false,
      };
      const execute = () => {
        request.target = String(request.filters.quote_id ?? request.filters.id ?? request.target);
        state.read({ ...request, filters: { ...request.filters }, orders: [...request.orders] });
        const response = state.responses[`${request.userId}:${table}:${request.target}`] ?? {
          data: table === "quotes" ? null : [],
          error: null,
        };
        // The double deliberately ignores cancellation. Late results still
        // must not resurrect another account, route or primary-read witness.
        return Promise.resolve()
          .then(() => (typeof response === "function" ? response() : response))
          .then((value) => ({
            ...value,
            ...(Array.isArray(value.data) && !Object.hasOwn(value, "count")
              ? { count: value.data.length }
              : {}),
          }));
      };
      const mutation = (operation: string, args: unknown[]) => {
        state.write({ userId: request.userId, table, operation, args });
        throw new Error("Financial dispatch is outside this reader contract.");
      };
      const builder = {
        select: (projection: string, options?: { count?: string }) => {
          request.projection = projection;
          request.options = options;
          return builder;
        },
        eq: (column: string, value: unknown) => {
          request.filters[column] = value;
          return builder;
        },
        order: (column: string, options: unknown) => {
          request.orders.push({ column, options });
          return builder;
        },
        limit: (limit: number) => {
          request.limit = limit;
          return builder;
        },
        abortSignal: (signal: AbortSignal) => {
          request.signal = signal;
          return builder;
        },
        retry: (retry: boolean) => {
          request.retry = retry;
          return builder;
        },
        maybeSingle: () => {
          request.maybeSingle = true;
          return execute();
        },
        then: (resolve: (value: DbResult) => unknown, reject: (error: unknown) => unknown) =>
          execute().then(resolve, reject),
        insert: (...args: unknown[]) => mutation("insert", args),
        update: (...args: unknown[]) => mutation("update", args),
        delete: (...args: unknown[]) => mutation("delete", args),
        upsert: (...args: unknown[]) => mutation("upsert", args),
      };
      return builder;
    },
  },
}));

const Detail = Route.options.component as React.ComponentType;
const ErrorView = Route.options.errorComponent as React.ComponentType<{
  error: unknown;
  reset: () => void;
}>;
const QUOTE_FAILURE = "Could not load this quote. Please try again.";
const ITEMS_FAILURE = "Could not load quote items. Please try again.";
const QUOTE_FIELDS =
  "id,quote_number,customer_id,vehicle_id,status,subtotal,tax_rate,tax_amount,total_amount,expiry_date,notes,terms_conditions,created_at,converted_to_work_order_id";
const ITEM_FIELDS =
  "id,quote_id,name,description,category,quantity,unit_price,total_price,item_type,display_order";
const clients: QueryClient[] = [];
const ids = new Map<string, string>();
function idFor(label: string): string {
  let id = ids.get(label);
  if (!id) {
    id = `aaaaaaaa-aaaa-4aaa-8aaa-${String(ids.size + 1).padStart(12, "0")}`;
    ids.set(label, id);
  }
  return id;
}
function quote(label = "QUOTE-A", overrides: Record<string, unknown> = {}) {
  return {
    id: idFor(label),
    quote_number: label,
    customer_id: idFor(`${label}-customer`),
    vehicle_id: idFor(`${label}-vehicle`),
    status: "draft",
    subtotal: "1000.1250",
    tax_rate: "0.0750",
    tax_amount: "75.009375",
    total_amount: "1075.134375",
    expiry_date: "2026-10-30",
    notes: `${label} private notes`,
    terms_conditions: `${label} private terms`,
    created_at: "2026-10-15T23:59:59.123456+14:00",
    converted_to_work_order_id: null,
    ...overrides,
  };
}
function item(
  label = "LINE-A",
  quoteId = idFor("QUOTE-A"),
  overrides: Record<string, unknown> = {},
) {
  return {
    id: idFor(label),
    quote_id: quoteId,
    name: label,
    description: `${label} private description`,
    category: "Synthetic category",
    quantity: "1.2500",
    unit_price: "800.1000",
    total_price: "1000.1250",
    item_type: "service",
    display_order: 0,
    ...overrides,
  };
}
function result(data: unknown, count?: unknown): DbResult {
  return { data, error: null, ...(arguments.length > 1 ? { count } : {}) };
}
const responseKey = (table: string, userId = "account-a", id = idFor("QUOTE-A")) =>
  `${userId}:${table}:${id}`;
const detailKey = (userId = "account-a", id = idFor("QUOTE-A")) => [
  "shop-manager",
  userId,
  "quotes",
  "detail",
  id,
];
const itemsKey = (userId = "account-a", id = idFor("QUOTE-A")) => [
  "shop-manager",
  userId,
  "quotes",
  "items",
  id,
];
function populate(userId: string, label = "QUOTE-A") {
  state.responses[responseKey("quotes", userId, idFor(label))] = result(quote(label));
  state.responses[responseKey("quote_items", userId, idFor(label))] = result([
    item(`${userId}-${label}-LINE`, idFor(label)),
  ]);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function show(
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
) {
  clients.push(client);
  const view = () => (
    <QueryClientProvider client={client}>
      <Detail />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
async function ready(label = "QUOTE-A") {
  return screen.findByRole("heading", { level: 1, name: `Quote ${label}` });
}
async function itemsReady(label = "account-a-QUOTE-A-LINE") {
  return screen.findByText(label, { selector: "div.font-medium" });
}
function reads(table: string): Read[] {
  return state.read.mock.calls
    .map(([request]) => request as Read)
    .filter((read) => read.table === table);
}
async function quoteFailed() {
  expect(await screen.findByText(QUOTE_FAILURE)).toBeInTheDocument();
  expect(screen.queryByText("QUOTE-A private notes")).not.toBeInTheDocument();
  expect(reads("quote_items")).toHaveLength(0);
}
async function itemsFailed() {
  expect(await screen.findByText(ITEMS_FAILURE)).toBeInTheDocument();
  expect(screen.queryByText("account-a-QUOTE-A-LINE")).not.toBeInTheDocument();
  expect(screen.queryByText("No visible items in this returned snapshot.")).not.toBeInTheDocument();
  expect(await ready()).toBeInTheDocument();
}

beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "account-a";
  state.loading = false;
  state.id = idFor("QUOTE-A");
  state.responses = {};
  populate("account-a");
  populate("account-b", "QUOTE-B");
});
afterEach(() => {
  expect(state.write).not.toHaveBeenCalled();
  expect(state.rpc).not.toHaveBeenCalled();
  expect(state.navigate).not.toHaveBeenCalled();
  expect(state.success).not.toHaveBeenCalled();
  expect(state.error).not.toHaveBeenCalled();
  expect(state.warning).not.toHaveBeenCalled();
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
});

describe("Quote detail private reader and candidate-only conversion interlock", () => {
  it("uses complete fixed projections, bound IDs, exact count, deterministic order and explicit manual retries", async () => {
    const { client } = show();
    await ready();
    await itemsReady();
    expect(reads("quotes")).toHaveLength(1);
    expect(reads("quotes")[0]).toMatchObject({
      userId: "account-a",
      projection: QUOTE_FIELDS,
      filters: { id: idFor("QUOTE-A") },
      maybeSingle: true,
      retry: false,
      orders: [],
    });
    expect(reads("quote_items")).toHaveLength(1);
    expect(reads("quote_items")[0]).toMatchObject({
      userId: "account-a",
      projection: ITEM_FIELDS,
      filters: { quote_id: idFor("QUOTE-A") },
      options: { count: "exact" },
      limit: 101,
      retry: false,
      maybeSingle: false,
      orders: [
        { column: "display_order", options: { ascending: true, nullsFirst: false } },
        { column: "id", options: { ascending: true, nullsFirst: false } },
      ],
    });
    expect(reads("quotes")[0].signal).toBeInstanceOf(AbortSignal);
    expect(reads("quote_items")[0].signal).toBeInstanceOf(AbortSignal);
    const primary = client.getQueryCache().findAll({ queryKey: detailKey() });
    const child = client.getQueryCache().findAll({ queryKey: itemsKey() });
    expect(primary).toHaveLength(1);
    expect(child).toHaveLength(1);
    expect(primary[0].queryKey).toHaveLength(6);
    expect(child[0].queryKey).toHaveLength(7);
    expect(typeof primary[0].queryKey[5]).toBe("string");
    expect(child[0].queryKey[5]).toBe(primary[0].queryKey[5]);
    expect(typeof child[0].queryKey[6]).toBe("string");
    for (const query of [...primary, ...child]) {
      expect(query.options).toMatchObject({
        staleTime: 0,
        gcTime: 0,
        retry: false,
        refetchOnMount: "always",
        placeholderData: undefined,
      });
    }
    expect(primary[0].state.data).toMatchObject({ quote: quote(), version: 1 });
    expect(screen.getByRole("link", { name: "← Back to Quotes" })).toHaveAttribute(
      "href",
      "/workspace/quotes",
    );
    expect(screen.getByText("Showing 1 of 1 visible items in this snapshot.")).toBeInTheDocument();
    expect(
      screen.getByText("All counted visible items are shown for this snapshot."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Recorded estimates are not payments or a receivables balance/),
    ).toBeInTheDocument();
  });

  it.each(["signed-out", "auth-loading"])(
    "does not query or expose seeded private data while %s",
    (mode) => {
      if (mode === "signed-out") state.userId = null;
      else state.loading = true;
      const client = new QueryClient();
      client.setQueryData([...detailKey(), "old-lifetime"], {
        quote: quote("CACHED-SECRET"),
        version: 1,
      });
      client.setQueryData([...itemsKey(), "old-lifetime", "old-item"], {
        rows: [item("CACHED-ITEM")],
        count: 1,
        complete: true,
      });
      const { container } = show(client);
      expect(container).toBeEmptyDOMElement();
      expect(state.read).not.toHaveBeenCalled();
    },
  );

  it("hides private data immediately when auth returns to loading and waits for a new read lifetime", async () => {
    const { view, rerender } = show();
    await itemsReady();
    state.loading = true;
    rerender(view());
    expect(screen.queryByText("QUOTE-A private notes")).not.toBeInTheDocument();
    expect(screen.queryByText("account-a-QUOTE-A-LINE")).not.toBeInTheDocument();
    const pending = deferred<DbResult>();
    state.responses[responseKey("quotes")] = pending.promise;
    state.loading = false;
    rerender(view());
    await waitFor(() => expect(reads("quotes")).toHaveLength(2));
    expect(reads("quote_items")).toHaveLength(1);
    expect(screen.queryByText("QUOTE-A private notes")).not.toBeInTheDocument();
    await act(async () => pending.resolve(result(quote("QUOTE-A", { notes: "FRESH-AUTH-NOTES" }))));
    expect(await screen.findByText("FRESH-AUTH-NOTES")).toBeInTheDocument();
  });

  it.each(["not-a-uuid", "", "../../private", "aaaaaaaa-aaaa-4aaa-8aaa-000000000001?private=1"])(
    "rejects malformed route ID %j before making a read",
    async (id) => {
      state.id = id;
      show();
      expect(await screen.findByText(QUOTE_FAILURE)).toBeInTheDocument();
      expect(state.read).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("button", { name: "Convert to Work Order" }),
      ).not.toBeInTheDocument();
    },
  );

  it("ignores legacy and earlier-mount same-account caches until a matching fresh primary completes", async () => {
    const pending = deferred<DbResult>();
    state.responses[responseKey("quotes")] = pending.promise;
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    client.setQueryData(["shop-manager", "quote", state.id], quote("LEGACY-SECRET"));
    client.setQueryData(detailKey(), { quote: quote("PREFIX-SECRET"), version: 1 });
    client.setQueryData([...detailKey(), "previous-mount"], {
      quote: quote("CACHED-SECRET"),
      version: 1,
    });
    client.setQueryData([...itemsKey(), "previous-mount", "previous-child"], {
      rows: [item("CACHED-ITEM")],
      count: 1,
      complete: true,
    });
    show(client);
    await waitFor(() => expect(reads("quotes")).toHaveLength(1));
    expect(screen.getByText("Loading quote…")).toBeInTheDocument();
    expect(screen.queryByText(/SECRET|CACHED-ITEM/)).not.toBeInTheDocument();
    expect(reads("quote_items")).toHaveLength(0);
    await act(async () => pending.resolve(result(quote())));
    await itemsReady();
    expect(screen.queryByText(/SECRET|CACHED-ITEM/)).not.toBeInTheDocument();
  });

  it("does not start child reads when the visible primary is absent", async () => {
    state.responses[responseKey("quotes")] = result(null);
    show();
    expect(await screen.findByRole("heading", { name: "Quote not found." })).toBeInTheDocument();
    expect(reads("quote_items")).toHaveLength(0);
    expect(screen.queryByText("Recorded total")).not.toBeInTheDocument();
  });

  it.each(["sdk-error", "rejected-promise"])(
    "redacts %s and allows only a manual primary retry",
    async (mode) => {
      const secret = "private-db-token customer@example.invalid";
      const response =
        mode === "sdk-error"
          ? { data: quote(), error: { message: secret } }
          : () => Promise.reject(new Error(secret));
      state.responses[responseKey("quotes")] = response;
      const { container } = show();
      await quoteFailed();
      expect(container).not.toHaveTextContent(secret);
      expect(reads("quotes")).toHaveLength(1);
      state.responses[responseKey("quotes")] = result(quote());
      fireEvent.click(screen.getByRole("button", { name: "Retry quote" }));
      await itemsReady();
      expect(reads("quotes")).toHaveLength(2);
    },
  );

  it.each(QUOTE_FIELDS.split(","))(
    "requires projected primary field %s, including unknown-money fields",
    async (field) => {
      const data: Record<string, unknown> = quote();
      delete data[field];
      state.responses[responseKey("quotes")] = result(data);
      show();
      await quoteFailed();
    },
  );

  it.each([
    ["wrong ID", { id: idFor("OTHER-QUOTE") }],
    ["malformed ID", { id: "private" }],
    ["customer ID", { customer_id: "customer-not-uuid" }],
    ["vehicle ID", { vehicle_id: [] }],
    ["converted ID", { converted_to_work_order_id: "javascript:private" }],
    ["null status", { status: null }],
    ["numeric date", { expiry_date: 0 }],
    ["null timestamp", { created_at: null }],
    ["object notes", { notes: {} }],
    ["extra unknown field", { secret: "not-in-projection" }],
  ])("fails closed on malformed primary %s without querying children", async (_name, overrides) => {
    state.responses[responseKey("quotes")] = result(quote("QUOTE-A", overrides));
    show();
    await quoteFailed();
  });

  it("accepts case-equivalent native UUIDs without asserting business identity from nullable references", async () => {
    state.responses[responseKey("quotes")] = result(
      quote("QUOTE-A", { id: state.id.toUpperCase(), customer_id: null, vehicle_id: null }),
    );
    state.responses[responseKey("quote_items")] = result([
      item("CASE-LINE", state.id.toUpperCase()),
    ]);
    show();
    await ready();
    await itemsReady("CASE-LINE");
    expect(reads("quote_items")[0].filters).toEqual({ quote_id: state.id });
  });

  it("abandons stale account A responses across A→B→A instead of reusing an in-flight witness", async () => {
    const oldA = deferred<DbResult>();
    const nextA = deferred<DbResult>();
    state.responses[responseKey("quotes")] = oldA.promise;
    const { rerender, view, client } = show();
    await waitFor(() => expect(reads("quotes")).toHaveLength(1));
    const firstKey = client.getQueryCache().findAll({ queryKey: detailKey() })[0].queryKey;
    state.userId = "account-b";
    state.id = idFor("QUOTE-B");
    rerender(view());
    await itemsReady("account-b-QUOTE-B-LINE");
    expect(reads("quotes")[0].signal?.aborted).toBe(true);
    state.responses[responseKey("quotes")] = nextA.promise;
    state.userId = "account-a";
    state.id = idFor("QUOTE-A");
    rerender(view());
    await waitFor(() => expect(reads("quotes")).toHaveLength(3));
    const currentKey = client
      .getQueryCache()
      .findAll({ queryKey: detailKey() })
      .find((query) => query.getObserversCount() > 0)?.queryKey;
    expect(currentKey).toBeDefined();
    expect(currentKey?.slice(0, 5)).toEqual(detailKey());
    expect(currentKey?.[5]).not.toBe(firstKey[5]);
    await act(async () => oldA.resolve(result(quote("QUOTE-A", { notes: "STALE-A-SECRET" }))));
    expect(screen.queryByText("STALE-A-SECRET")).not.toBeInTheDocument();
    expect(screen.queryByText("QUOTE-B private notes")).not.toBeInTheDocument();
    expect(reads("quote_items").filter((read) => read.userId === "account-a")).toHaveLength(0);
    await act(async () => nextA.resolve(result(quote("QUOTE-A", { notes: "CURRENT-A-NOTES" }))));
    expect(await screen.findByText("CURRENT-A-NOTES")).toBeInTheDocument();
    await itemsReady();
  });

  it("ignores a late child completion after changing the quote route", async () => {
    const oldItems = deferred<DbResult>();
    state.responses[responseKey("quote_items")] = oldItems.promise;
    populate("account-a", "QUOTE-NEW");
    const { rerender, view } = show();
    await ready();
    await waitFor(() => expect(reads("quote_items")).toHaveLength(1));
    state.id = idFor("QUOTE-NEW");
    rerender(view());
    await itemsReady("account-a-QUOTE-NEW-LINE");
    expect(reads("quote_items")[0].signal?.aborted).toBe(true);
    await act(async () => oldItems.resolve(result([item("LATE-PRIVATE-LINE")])));
    expect(screen.queryByText("LATE-PRIVATE-LINE")).not.toBeInTheDocument();
    expect(screen.queryByText("QUOTE-A private notes")).not.toBeInTheDocument();
    expect(await ready("QUOTE-NEW")).toBeInTheDocument();
  });

  it("hides all private primary content during refresh and cannot revive a prior pending child", async () => {
    const oldItems = deferred<DbResult>();
    const newItems = deferred<DbResult>();
    const newPrimary = deferred<DbResult>();
    state.responses[responseKey("quote_items")] = oldItems.promise;
    const { client } = show();
    await ready();
    await waitFor(() => expect(reads("quote_items")).toHaveLength(1));
    const oldChildKey = client.getQueryCache().findAll({ queryKey: itemsKey() })[0].queryKey;
    state.responses[responseKey("quotes")] = newPrimary.promise;
    state.responses[responseKey("quote_items")] = newItems.promise;
    fireEvent.click(screen.getByRole("button", { name: "Refresh quote" }));
    await screen.findByText("Loading quote…");
    expect(screen.queryByText("QUOTE-A private notes")).not.toBeInTheDocument();
    expect(screen.queryByText("Recorded total")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Convert to Work Order" })).not.toBeInTheDocument();
    expect(reads("quote_items")[0].signal?.aborted).toBe(true);
    await act(async () => oldItems.resolve(result([item("OLD-WITNESS-ITEM")])));
    expect(screen.queryByText("OLD-WITNESS-ITEM")).not.toBeInTheDocument();
    await act(async () =>
      newPrimary.resolve(result(quote("QUOTE-A", { notes: "REFRESHED-NOTES" }))),
    );
    expect(await screen.findByText("REFRESHED-NOTES")).toBeInTheDocument();
    await waitFor(() => expect(reads("quote_items")).toHaveLength(2));
    const newChild = client
      .getQueryCache()
      .findAll({ queryKey: itemsKey() })
      .find((query) => query.getObserversCount() > 0);
    expect(newChild?.queryKey[5]).toBe(oldChildKey[5]);
    expect(newChild?.queryKey[6]).not.toBe(oldChildKey[6]);
    expect(screen.queryByText("OLD-WITNESS-ITEM")).not.toBeInTheDocument();
    await act(async () => newItems.resolve(result([item("NEW-WITNESS-ITEM")])));
    await itemsReady("NEW-WITNESS-ITEM");
  });

  it("creates a fresh child lifetime even when a primary refresh resolves immediately", async () => {
    const { client } = show();
    await itemsReady();
    const oldChildKey = client.getQueryCache().findAll({ queryKey: itemsKey() })[0].queryKey;
    state.responses[responseKey("quote_items")] = result([item("IMMEDIATE-REFRESH-ITEM")]);
    fireEvent.click(screen.getByRole("button", { name: "Refresh quote" }));
    await itemsReady("IMMEDIATE-REFRESH-ITEM");
    expect(reads("quotes")).toHaveLength(2);
    expect(reads("quote_items")).toHaveLength(2);
    const newChild = client
      .getQueryCache()
      .findAll({ queryKey: itemsKey() })
      .find((query) => query.getObserversCount() > 0);
    expect(newChild?.queryKey[6]).not.toBe(oldChildKey[6]);
    const primary = client.getQueryCache().findAll({ queryKey: detailKey() })[0];
    expect(primary.state.data).toMatchObject({ version: 2 });
  });

  it("does not display the previous successful quote when its primary refresh fails", async () => {
    show();
    await itemsReady();
    state.responses[responseKey("quotes")] = {
      data: null,
      error: { message: "RAW-PRIMARY-SECRET" },
    };
    fireEvent.click(screen.getByRole("button", { name: "Refresh quote" }));
    expect(await screen.findByText(QUOTE_FAILURE)).toBeInTheDocument();
    expect(screen.queryByText("QUOTE-A private notes")).not.toBeInTheDocument();
    expect(screen.queryByText("account-a-QUOTE-A-LINE")).not.toBeInTheDocument();
    expect(screen.queryByText("RAW-PRIMARY-SECRET")).not.toBeInTheDocument();
    expect(reads("quote_items")).toHaveLength(1);
  });

  it("keeps child loading independent of the fresh primary without a false empty table", async () => {
    const pending = deferred<DbResult>();
    state.responses[responseKey("quote_items")] = pending.promise;
    show();
    await ready();
    expect(screen.getByText("QUOTE-A private notes")).toBeInTheDocument();
    expect(screen.getByText("Loading quote items…")).toBeInTheDocument();
    expect(
      screen.queryByText("No visible items in this returned snapshot."),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert to Work Order" })).toBeDisabled();
    await act(async () => pending.resolve(result([item("AFTER-LOADING")])));
    await itemsReady("AFTER-LOADING");
  });

  it.each(["sdk-error", "rejected-promise"])(
    "redacts child %s and retries only items",
    async (mode) => {
      const secret = "RAW-ITEM-SECRET private@example.invalid";
      state.responses[responseKey("quote_items")] =
        mode === "sdk-error"
          ? { data: [], error: { message: secret }, count: 0 }
          : () => Promise.reject(new Error(secret));
      const { container } = show();
      await itemsFailed();
      expect(container).not.toHaveTextContent(secret);
      expect(reads("quote_items")).toHaveLength(1);
      state.responses[responseKey("quote_items")] = result([item("RETRIED-ITEM")]);
      fireEvent.click(screen.getByRole("button", { name: "Retry items" }));
      await itemsReady("RETRIED-ITEM");
      expect(reads("quotes")).toHaveLength(1);
      expect(reads("quote_items")).toHaveLength(2);
    },
  );

  it("hides cached items while refreshing and after a failed refresh, without hiding the primary", async () => {
    const pending = deferred<DbResult>();
    show();
    await itemsReady();
    state.responses[responseKey("quote_items")] = pending.promise;
    fireEvent.click(screen.getByRole("button", { name: "Refresh items" }));
    await screen.findByText("Loading quote items…");
    expect(screen.queryByText("account-a-QUOTE-A-LINE")).not.toBeInTheDocument();
    expect(screen.getByText("QUOTE-A private notes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh items" })).toBeDisabled();
    await act(async () => pending.resolve({ data: [], error: { message: "RAW-REFRESH-SECRET" } }));
    await itemsFailed();
    expect(screen.queryByText("RAW-REFRESH-SECRET")).not.toBeInTheDocument();
    expect(reads("quotes")).toHaveLength(1);
  });

  it.each(ITEM_FIELDS.split(","))("requires projected item field %s", async (field) => {
    const data: Record<string, unknown> = item();
    delete data[field];
    state.responses[responseKey("quote_items")] = result([data]);
    show();
    await itemsFailed();
  });

  it.each([
    ["wrong quote binding", { quote_id: idFor("OTHER-QUOTE") }],
    ["malformed ID", { id: "line-not-uuid" }],
    ["null name", { name: null }],
    ["null type", { item_type: null }],
    ["numeric category", { category: 3 }],
    ["object description", { description: {} }],
    ["fractional order", { display_order: 0.5 }],
    ["string order", { display_order: "0" }],
    ["out-of-int-range order", { display_order: 2147483648 }],
    ["extra field", { secret: "outside-projection" }],
  ])("fails closed on malformed item %s", async (_name, overrides) => {
    state.responses[responseKey("quote_items")] = result([
      item("MALFORMED-ITEM", state.id, overrides),
    ]);
    show();
    await itemsFailed();
    expect(screen.queryByText("MALFORMED-ITEM")).not.toBeInTheDocument();
  });

  it.each([null, -2147483648, 2147483647])(
    "accepts native nullable INT display order %j without inventing chronology",
    async (displayOrder) => {
      state.responses[responseKey("quote_items")] = result([
        item("ORDER-ITEM", state.id, { display_order: displayOrder }),
      ]);
      show();
      await itemsReady("ORDER-ITEM");
    },
  );

  it("rejects duplicate case-alias UUIDs in displayed items", async () => {
    const first = item("DUPLICATE-FIRST");
    const second = item("DUPLICATE-SECOND", state.id, { id: first.id.toUpperCase() });
    state.responses[responseKey("quote_items")] = result([first, second]);
    show();
    await itemsFailed();
    expect(screen.queryByText("DUPLICATE-FIRST")).not.toBeInTheDocument();
  });

  it.each(["binding", "duplicate", "missing-field"])(
    "validates the hidden 101st sentinel's %s before displaying any rows",
    async (mode) => {
      const rows: Record<string, unknown>[] = Array.from({ length: 101 }, (_, index) =>
        item(`SENTINEL-${index}`),
      );
      if (mode === "binding") rows[100].quote_id = idFor("OTHER-QUOTE");
      else if (mode === "duplicate") rows[100].id = String(rows[0].id).toUpperCase();
      else delete rows[100].total_price;
      state.responses[responseKey("quote_items")] = result(rows, 101);
      show();
      await itemsFailed();
      expect(screen.queryByText("SENTINEL-0")).not.toBeInTheDocument();
    },
  );

  it("caps display at 100 and qualifies a larger visible exact count without calling it complete", async () => {
    state.responses[responseKey("quote_items")] = result(
      Array.from({ length: 101 }, (_, index) => item(`CAPPED-${index}`)),
      500,
    );
    show();
    await itemsReady("CAPPED-0");
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(101);
    expect(screen.getByText("CAPPED-99")).toBeInTheDocument();
    expect(screen.queryByText("CAPPED-100")).not.toBeInTheDocument();
    expect(
      screen.getByText("Showing 100 of 500 visible items in this snapshot."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This item snapshot is incomplete or its completeness is unverified/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("All counted visible items are shown for this snapshot."),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Convert to Work Order" }));
  });

  it.each([
    ["undefined count", undefined],
    ["negative count", -1],
    ["fractional count", 1.5],
    ["string count", "1"],
    ["NaN count", Number.NaN],
    ["unsafe count", Number.MAX_SAFE_INTEGER + 1],
    ["count smaller than returned rows", 0],
  ])("rejects %s rather than acknowledging completeness", async (_name, count) => {
    state.responses[responseKey("quote_items")] = result([item()], count);
    show();
    await itemsFailed();
  });

  it.each(["null data", "object data", "too many rows", "sparse array"])(
    "rejects malformed item collection %s",
    async (mode) => {
      let data: unknown = null;
      if (mode === "object data") data = { 0: item(), length: 1 };
      if (mode === "too many rows")
        data = Array.from({ length: 102 }, (_, index) => item(`EXCESS-${index}`));
      if (mode === "sparse array") data = new Array(1);
      state.responses[responseKey("quote_items")] = result(
        data,
        Array.isArray(data) ? data.length : 0,
      );
      show();
      await itemsFailed();
    },
  );

  it.each([
    [
      null,
      "No item rows were returned. An empty item list is not confirmed because the visible count is unavailable.",
    ],
    [
      7,
      "No item rows were returned despite a positive visible count. This snapshot is incomplete.",
    ],
  ])("does not claim empty when zero returned rows have count %j", async (count, copy) => {
    state.responses[responseKey("quote_items")] = result([], count);
    show();
    expect(await screen.findByText(copy)).toBeInTheDocument();
    expect(
      screen.queryByText("No visible items in this returned snapshot."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/This item snapshot is incomplete or its completeness is unverified/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert to Work Order" })).toBeDisabled();
  });

  it("only acknowledges an empty visible snapshot with exact zero count", async () => {
    state.responses[responseKey("quote_items")] = result([], 0);
    show();
    expect(
      await screen.findByText("No visible items in this returned snapshot."),
    ).toBeInTheDocument();
    expect(screen.getByText("Showing 0 of 0 visible items in this snapshot.")).toBeInTheDocument();
    expect(
      screen.getByText("All counted visible items are shown for this snapshot."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert to Work Order" })).toBeDisabled();
  });

  it.each([null, 9])("shows rows without claiming completeness when count is %j", async (count) => {
    state.responses[responseKey("quote_items")] = result([item("PARTIAL-ITEM")], count);
    show();
    await itemsReady("PARTIAL-ITEM");
    expect(
      screen.getByText(/This item snapshot is incomplete or its completeness is unverified/),
    ).toBeInTheDocument();
    if (count === null)
      expect(
        screen.getByText("Showing 1 returned items. Total visible count unavailable."),
      ).toBeInTheDocument();
    else
      expect(
        screen.getByText("Showing 1 of 9 visible items in this snapshot."),
      ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert to Work Order" })).toBeDisabled();
  });

  it("preserves received decimal strings and scale instead of rounding financial estimates or quantities", async () => {
    state.responses[responseKey("quotes")] = result(
      quote("QUOTE-A", {
        subtotal: "9007199254740993.0001",
        tax_amount: "0.0001",
        total_amount: "9007199254740993.0002",
      }),
    );
    state.responses[responseKey("quote_items")] = result([
      item("PRECISE-ITEM", state.id, {
        quantity: "9007199254740993.1250",
        unit_price: "0.0001",
        total_price: "1.2300e3",
      }),
    ]);
    show();
    await itemsReady("PRECISE-ITEM");
    expect(screen.getByText("₱9,007,199,254,740,993.0001")).toBeInTheDocument();
    expect(screen.getByText("₱9,007,199,254,740,993.0002")).toBeInTheDocument();
    expect(screen.getAllByText("₱0.0001")).toHaveLength(2);
    expect(screen.getByText("9,007,199,254,740,993.1250")).toBeInTheDocument();
    expect(screen.getByText("₱1,230.0")).toBeInTheDocument();
    // These deliberately precise read doubles are not native scale/write proof.
  });

  it.each([null, "NaN", "Infinity", "not-money", {}, Number.POSITIVE_INFINITY])(
    "does not replace unusable amounts %j with zero",
    async (value) => {
      state.responses[responseKey("quotes")] = result(
        quote("QUOTE-A", { subtotal: value, tax_amount: value, total_amount: value }),
      );
      state.responses[responseKey("quote_items")] = result([
        item("UNAVAILABLE-ITEM", state.id, {
          quantity: value,
          unit_price: value,
          total_price: value,
        }),
      ]);
      show();
      await itemsReady("UNAVAILABLE-ITEM");
      expect(screen.getAllByText("Amount unavailable")).toHaveLength(5);
      expect(screen.getByText("Quantity unavailable")).toBeInTheDocument();
      expect(screen.queryByText("₱0")).not.toBeInTheDocument();
    },
  );

  it("limits decimal presentation work while preserving valid rows and visible counts", async () => {
    const oversized = "1".repeat(513);
    state.responses[responseKey("quotes")] = result(quote("QUOTE-A", { total_amount: oversized }));
    state.responses[responseKey("quote_items")] = result([
      item("BOUND-ITEM", state.id, { quantity: "1e9999", total_price: oversized }),
    ]);
    show();
    await itemsReady("BOUND-ITEM");
    expect(screen.getAllByText("Amount unavailable")).toHaveLength(2);
    expect(screen.getByText("Quantity unavailable")).toBeInTheDocument();
    expect(screen.queryByText(oversized)).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 1 visible items in this snapshot.")).toBeInTheDocument();
  });

  it.each([
    ["2026-10-15T23:59:59.123456+14:00", "2026-10-30"],
    ["infinity", "-infinity"],
    ["0044-03-15 12:00:00+00 BC", "0044-03-15 BC"],
  ])(
    "shows stored date/timestamp text without timezone or year policy conversion",
    async (created, expiry) => {
      state.responses[responseKey("quotes")] = result(
        quote("QUOTE-A", { created_at: created, expiry_date: expiry }),
      );
      const { container } = show();
      await ready();
      expect(screen.getByText(`Created (stored timestamp): ${created}`)).toBeInTheDocument();
      expect(screen.getByText(`Expires (stored date): ${expiry}`)).toBeInTheDocument();
      expect(container).not.toHaveTextContent("Invalid Date");
    },
  );

  it("does not default empty/null received labels to draft, zero or current date", async () => {
    state.responses[responseKey("quotes")] = result(
      quote("QUOTE-A", {
        quote_number: null,
        status: "",
        expiry_date: null,
        created_at: "",
        notes: null,
        terms_conditions: null,
      }),
    );
    show();
    expect(await screen.findByRole("heading", { name: `Quote ${state.id}` })).toBeInTheDocument();
    expect(screen.getByText("Status unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Created (stored timestamp): Timestamp unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByText("Expires (stored date): Date unavailable")).toBeInTheDocument();
    expect(screen.queryByText("draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
    expect(screen.queryByText("Terms")).not.toBeInTheDocument();
  });

  it.each(["draft", "approved", "converted", "future-status"])(
    "has no conversion dispatch even for a fresh complete %s quote",
    async (status) => {
      state.responses[responseKey("quotes")] = result(quote("QUOTE-A", { status }));
      show();
      await itemsReady();
      const button = screen.getByRole("button", { name: "Convert to Work Order" });
      expect(button).toBeDisabled();
      expect(
        screen.getByText("Conversion is unavailable pending the authorized atomic writer."),
      ).toBeInTheDocument();
      fireEvent.click(button);
      expect(state.write).not.toHaveBeenCalled();
      expect(state.rpc).not.toHaveBeenCalled();
    },
  );

  it("retains only fresh validated converted-work-order navigation", async () => {
    const workOrderId = idFor("CONVERTED-WORK-ORDER");
    state.responses[responseKey("quotes")] = result(
      quote("QUOTE-A", { converted_to_work_order_id: workOrderId }),
    );
    const pending = deferred<DbResult>();
    show();
    expect(await screen.findByRole("link", { name: "Open Work Order →" })).toHaveAttribute(
      "href",
      `/workspace/work-orders/${workOrderId}`,
    );
    expect(screen.queryByRole("button", { name: "Convert to Work Order" })).not.toBeInTheDocument();
    state.responses[responseKey("quotes")] = pending.promise;
    fireEvent.click(screen.getByRole("button", { name: "Refresh quote" }));
    await screen.findByText("Loading quote…");
    expect(screen.queryByRole("link", { name: "Open Work Order →" })).not.toBeInTheDocument();
    await act(async () =>
      pending.resolve(result(quote("QUOTE-A", { converted_to_work_order_id: null }))),
    );
    await ready();
    expect(screen.queryByRole("link", { name: "Open Work Order →" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert to Work Order" })).toBeDisabled();
  });

  it("redacts the actual route error boundary and exposes a manual reset only while authenticated", () => {
    const reset = vi.fn();
    const error = new Error("RAW-BOUNDARY-SECRET");
    const { container, rerender } = render(<ErrorView error={error} reset={reset} />);
    expect(screen.getByText(QUOTE_FAILURE)).toBeInTheDocument();
    expect(container).not.toHaveTextContent("RAW-BOUNDARY-SECRET");
    fireEvent.click(screen.getByRole("button", { name: "Retry quote" }));
    expect(reset).toHaveBeenCalledTimes(1);
    state.loading = true;
    rerender(<ErrorView error={error} reset={reset} />);
    expect(container).toBeEmptyDOMElement();
    state.loading = false;
    state.userId = null;
    rerender(<ErrorView error={error} reset={reset} />);
    expect(container).toBeEmptyDOMElement();
  });
});
