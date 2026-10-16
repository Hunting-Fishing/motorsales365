// Actual route + real QueryClient, synthetic fluent SDK only. No JWT/RLS,
// native authority, database transaction, email, stock or live API acceptance.
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "@/routes/_authenticated/workspace.quotes.new";

type Result = { data: unknown; error: unknown; count?: unknown };
type Request = {
  account: string | null;
  table: string;
  operation: "read" | "insert";
  payload?: Record<string, unknown> | Record<string, unknown>[];
  fields: string;
  filters: Record<string, string>;
  orders: { column: string; options: unknown }[];
  count?: string;
  limit?: number;
  signal?: AbortSignal;
  retry?: boolean;
  single?: boolean;
};
type Response = Result | Promise<Result> | ((request: Request) => Result | Promise<Result>);
const state = vi.hoisted(() => ({
  account: "account-a" as string | null,
  loading: false,
  maskCustomerRead: false,
  responses: {} as Record<string, Response>,
  read: vi.fn(),
  write: vi.fn(),
  rpc: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: Parameters<typeof actual.useQuery>[0]) => {
      const result = actual.useQuery(options);
      // Only the Suspense regression enables this render-local result mask.
      // QueryClient/observers remain real; this is not a network/cache race proof.
      return state.maskCustomerRead && options.queryKey[4] === "customers"
        ? { ...result, isFetching: true }
        : result;
    },
  };
});
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.account ? { id: state.account } : null, loading: state.loading }),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock("sonner", () => ({ toast: { success: state.success, error: state.error } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ options }),
  useNavigate: () => state.navigate,
  Link: ({
    to,
    params,
    children,
    ...props
  }: React.PropsWithChildren<{ to: string; params?: { id: string } }>) => (
    <a {...props} href={to.replace("$id", params?.id ?? "")}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: {
    rpc: (...args: unknown[]) => state.rpc(...args),
    from: (table: string) => {
      const request: Request = {
        account: state.account,
        table,
        operation: "read",
        fields: "",
        filters: {},
        orders: [],
      };
      const execute = () => {
        const snapshot = {
          ...request,
          filters: { ...request.filters },
          orders: [...request.orders],
        };
        if (request.operation === "insert")
          return Promise.resolve().then(() => state.write(snapshot));
        state.read(snapshot);
        const target = request.filters.id
          ? `id:${request.filters.id}`
          : (request.filters.customer_id ?? "list");
        const response = state.responses[`${request.account}:${table}:${target}`] ?? {
          data: null,
          error: null,
        };
        // Deliberately ignores abort; stale callbacks must still be inert.
        return Promise.resolve().then(() =>
          typeof response === "function" ? response(snapshot) : response,
        );
      };
      const builder = {
        select: (fields: string, options?: { count?: string }) => {
          request.fields = fields;
          request.count = options?.count;
          return builder;
        },
        eq: (column: string, value: string) => {
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
          request.single = true;
          return builder;
        },
        insert: (payload: Request["payload"]) => {
          request.operation = "insert";
          request.payload = payload;
          return builder;
        },
        then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
          execute().then(resolve, reject),
      };
      return builder;
    },
  },
}));
const Page = Route.options.component as React.ComponentType;
const ErrorView = Route.options.errorComponent as React.ComponentType<{
  error: unknown;
  reset: () => void;
}>;
const CUSTOMER_FIELDS = "id,shop_id,first_name,last_name";
const VEHICLE_FIELDS = "id,customer_id,year,make,model";
const HEADER_FIELDS =
  "id,quote_number,customer_id,vehicle_id,status,subtotal,tax_rate,tax_amount,total_amount,expiry_date,notes,terms_conditions";
const ITEM_FIELDS =
  "id,quote_id,name,description,category,quantity,unit_price,total_price,item_type,display_order";
const UNKNOWN =
  "Save status unknown. Check quotes before trying again. This draft is locked to prevent duplicate saves.";
const VERIFY = "Could not verify this customer and vehicle. Refresh options before trying again.";
const LOAD = "Could not load quote options. Please try again.";
const id = (n: number) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
const customer = (n = 1, overrides: Record<string, unknown> = {}) => ({
  id: id(n),
  shop_id: id(900),
  first_name: `Customer${n}`,
  last_name: "Synthetic",
  ...overrides,
});
const vehicle = (n = 101, customerId = id(1), overrides: Record<string, unknown> = {}) => ({
  id: id(n),
  customer_id: customerId,
  year: 2025,
  make: `Make${n}`,
  model: "Synthetic",
  ...overrides,
});
const ok = (data: unknown, count?: unknown): Result => ({
  data,
  error: null,
  ...(count === undefined ? {} : { count }),
});
const clients: QueryClient[] = [];
function populate(account = "account-a") {
  state.responses[`${account}:customers:list`] = ok([customer(1), customer(2)], 2);
  for (const n of [1, 2]) {
    state.responses[`${account}:customers:id:${id(n)}`] = ok(customer(n));
    state.responses[`${account}:vehicles:${id(n)}`] = ok([vehicle(100 + n, id(n))], 1);
    state.responses[`${account}:vehicles:id:${id(100 + n)}`] = ok(vehicle(100 + n, id(n)));
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function mount(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  clients.push(client);
  const view = render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  return {
    ...view,
    client,
    refresh: () =>
      view.rerender(
        <QueryClientProvider client={client}>
          <Page />
        </QueryClientProvider>,
      ),
  };
}
async function selectCustomer(n = 1) {
  await screen.findByRole("option", { name: `Customer${n} Synthetic` });
  fireEvent.change(screen.getByLabelText("Customer *"), { target: { value: id(n) } });
  await waitFor(() => expect(screen.getByLabelText("Vehicle (optional)")).not.toBeDisabled());
}
async function fill(selectVehicle = false) {
  await selectCustomer();
  if (selectVehicle)
    fireEvent.change(screen.getByLabelText("Vehicle (optional)"), { target: { value: id(101) } });
  fireEvent.change(screen.getByLabelText("Name 1"), { target: { value: "Synthetic service" } });
  fireEvent.change(screen.getByLabelText("Unit price 1 (₱)"), { target: { value: "100" } });
}
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Create quote" }));
function writes(table: string): Request[] {
  return state.write.mock.calls
    .map(([request]) => request as Request)
    .filter((request) => request.table === table);
}
async function settledUnknown() {
  await screen.findByText(UNKNOWN);
  await waitFor(() => expect(screen.getByRole("button", { name: "Create quote" })).toBeDisabled());
  expect(state.success).not.toHaveBeenCalled();
  expect(state.navigate).not.toHaveBeenCalled();
}
beforeEach(() => {
  state.account = "account-a";
  state.loading = false;
  state.maskCustomerRead = false;
  state.responses = {};
  for (const mock of [
    state.read,
    state.write,
    state.rpc,
    state.success,
    state.error,
    state.navigate,
  ])
    mock.mockReset();
  state.write.mockImplementation((request: Request) =>
    ok(
      request.table === "quotes"
        ? { ...request.payload, quote_number: "Q-SYNTHETIC-001" }
        : request.payload,
    ),
  );
  populate();
  populate("account-b");
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});

describe("quote create caller readiness (synthetic SDK, not financial acceptance)", () => {
  it("makes no private requests or renders drafts while signed out/loading, including seeded legacy cache", () => {
    const client = new QueryClient();
    client.setQueryData(["shop-manager", "quotes", "new", "customers"], [customer(700)]);
    state.account = null;
    const view = mount(client);
    expect(screen.getByText("Sign in to create a quote.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name 1")).not.toBeInTheDocument();
    expect(state.read).not.toHaveBeenCalled();
    state.account = "account-a";
    state.loading = true;
    view.refresh();
    expect(screen.getByText("Checking account…")).toBeInTheDocument();
    expect(state.read).not.toHaveBeenCalled();
  });
  it("uses bounded fixed-projection scoped reads, deterministic order, abort and disabled SDK retry", async () => {
    const { client } = mount();
    await fill(true);
    const requests = state.read.mock.calls.map(([r]) => r as Request);
    expect(requests[0]).toMatchObject({
      table: "customers",
      fields: CUSTOMER_FIELDS,
      count: "exact",
      limit: 101,
      retry: false,
      orders: [
        { column: "last_name", options: { ascending: true, nullsFirst: false } },
        { column: "id", options: { ascending: true, nullsFirst: false } },
      ],
    });
    expect(requests[1]).toMatchObject({
      table: "vehicles",
      fields: VEHICLE_FIELDS,
      filters: { customer_id: id(1) },
      limit: 101,
      retry: false,
    });
    expect(requests.every((request) => request.signal instanceof AbortSignal)).toBe(true);
    const keys = client
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys.every((key) => key[1] === "account-a" && key[5] !== undefined)).toBe(true);
    expect(screen.queryByRole("option", { name: "Other" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Service" })).toBeInTheDocument();
  });
  it("revalidates selected customer/shop and vehicle/customer before exact two-write confirmation", async () => {
    mount();
    await fill(true);
    fireEvent.change(screen.getByLabelText("Type 1"), { target: { value: "service" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "  Synthetic note  " } });
    submit();
    await waitFor(() => expect(state.navigate).toHaveBeenCalledTimes(1));
    const reads = state.read.mock.calls.map(([r]) => r as Request);
    expect(reads.slice(-2)).toMatchObject([
      { table: "customers", fields: CUSTOMER_FIELDS, filters: { id: id(1) }, single: true },
      {
        table: "vehicles",
        fields: VEHICLE_FIELDS,
        filters: { id: id(101), customer_id: id(1) },
        single: true,
      },
    ]);
    const header = writes("quotes")[0];
    expect(header).toMatchObject({ fields: HEADER_FIELDS, retry: false, single: true });
    expect(header.payload).toMatchObject({
      customer_id: id(1),
      vehicle_id: id(101),
      subtotal: "100.00",
      tax_rate: "0.1200",
      tax_amount: "12.00",
      total_amount: "112.00",
      notes: "Synthetic note",
      status: "draft",
    });
    expect(header.payload).not.toHaveProperty("shop_id");
    expect(header.payload).not.toHaveProperty("quote_number");
    expect(state.rpc).not.toHaveBeenCalled();
    const items = writes("quote_items")[0];
    expect(items).toMatchObject({ fields: ITEM_FIELDS, retry: false });
    expect(items.payload).toMatchObject([
      {
        quote_id: (header.payload as Record<string, unknown>).id,
        item_type: "service",
        quantity: "1.00",
        unit_price: "100.00",
        total_price: "100.00",
      },
    ]);
    expect(state.success).toHaveBeenCalledWith("Quote and line items confirmed");
    expect(screen.getByRole("button", { name: "Create quote" })).toBeDisabled();
  });
  it("allows explicit optional vehicle and exact fractional quantity without floating rounding", async () => {
    mount();
    await fill();
    fireEvent.change(screen.getByLabelText("Tax rate (%)"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Quantity 1"), { target: { value: "1.25" } });
    fireEvent.change(screen.getByLabelText("Unit price 1 (₱)"), { target: { value: "0.80" } });
    fireEvent.change(screen.getByLabelText("Expiry date"), { target: { value: "" } });
    submit();
    await waitFor(() => expect(state.success).toHaveBeenCalled());
    expect(writes("quotes")[0].payload).toMatchObject({
      vehicle_id: null,
      expiry_date: null,
      subtotal: "1.00",
      tax_rate: "0.0000",
      total_amount: "1.00",
    });
    expect(
      state.read.mock.calls
        .map(([r]) => r as Request)
        .filter((r) => r.table === "vehicles" && r.single),
    ).toHaveLength(0);
  });
  it.each(["null", "missing", "shop changed", "wrong id", "extra", "error"])(
    "stops before writes on fresh customer %s",
    async (kind) => {
      mount();
      await fill();
      let response = ok(customer());
      if (kind === "null") response = ok(null);
      if (kind === "missing") {
        const row = customer();
        delete (row as Partial<typeof row>).shop_id;
        response = ok(row);
      }
      if (kind === "shop changed") response = ok(customer(1, { shop_id: id(901) }));
      if (kind === "wrong id") response = ok(customer(2));
      if (kind === "extra") response = ok(customer(1, { private: "not projected" }));
      if (kind === "error") response = { data: null, error: { message: "SECRET customer" } };
      state.responses[`account-a:customers:id:${id(1)}`] = response;
      submit();
      await screen.findByText(VERIFY);
      expect(state.write).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Name 1")).toHaveValue("Synthetic service");
      expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create quote" })).not.toBeDisabled();
    },
  );
  it.each([null, id(2)])("stops before writes when fresh vehicle owner is %s", async (owner) => {
    mount();
    await fill(true);
    state.responses[`account-a:vehicles:id:${id(101)}`] = ok(
      vehicle(101, id(1), { customer_id: owner }),
    );
    submit();
    await screen.findByText(VERIFY);
    expect(state.write).not.toHaveBeenCalled();
  });
  it("allows manual retry of a read-only preflight failure without discarding the draft", async () => {
    mount();
    await fill();
    state.responses[`account-a:customers:id:${id(1)}`] = ok(null);
    submit();
    await screen.findByText(VERIFY);
    state.responses[`account-a:customers:id:${id(1)}`] = ok(customer());
    submit();
    await waitFor(() => expect(state.success).toHaveBeenCalledTimes(1));
    expect(writes("quotes")).toHaveLength(1);
  });
  it.each([
    "error",
    "reject",
    "null",
    "array",
    "wrong id",
    "missing",
    "extra",
    "wrong amount",
    "wrong customer",
    "number missing",
  ])("locks uncertain header %s and never dispatches items", async (kind) => {
    state.write.mockImplementation((request: Request) => {
      if (kind === "error") return { data: null, error: { message: "SECRET header" } };
      if (kind === "reject") return Promise.reject(new Error("SECRET rejection"));
      if (kind === "null") return ok(null);
      const value = { ...request.payload, quote_number: "Q-1" } as Record<string, unknown>;
      if (kind === "array") return ok([value]);
      if (kind === "wrong id") value.id = id(999);
      if (kind === "missing") delete value.notes;
      if (kind === "extra") value.private = "SECRET extra";
      if (kind === "wrong amount") value.total_amount = "112.01";
      if (kind === "wrong customer") value.customer_id = id(2);
      if (kind === "number missing") value.quote_number = " ";
      return ok(value);
    });
    mount();
    await fill();
    submit();
    await settledUnknown();
    submit();
    expect(writes("quotes")).toHaveLength(1);
    expect(writes("quote_items")).toHaveLength(0);
    expect(screen.getByLabelText("Name 1")).toHaveValue("Synthetic service");
    expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument();
  });
  it.each([
    "error",
    "reject",
    "null",
    "empty",
    "extra row",
    "wrong quote",
    "wrong id",
    "missing",
    "wrong amount",
    "duplicate",
  ])("locks partial/unknown item %s, without success or replay", async (kind) => {
    state.write.mockImplementation((request: Request) => {
      if (request.table === "quotes") return ok({ ...request.payload, quote_number: "Q-1" });
      if (kind === "error") return { data: null, error: { message: "SECRET items" } };
      if (kind === "reject") return Promise.reject(new Error("SECRET rejection"));
      if (kind === "null") return ok(null);
      if (kind === "empty") return ok([]);
      const rows = (request.payload as Record<string, unknown>[]).map((r) => ({ ...r }));
      if (kind === "extra row") rows.push({ ...rows[0], id: id(999) });
      if (kind === "wrong quote") rows[0].quote_id = id(999);
      if (kind === "wrong id") rows[0].id = id(999);
      if (kind === "missing") delete rows[0].description;
      if (kind === "wrong amount") rows[0].total_price = null;
      if (kind === "duplicate") rows[1] = { ...rows[0] };
      return ok(rows);
    });
    mount();
    await fill();
    if (kind === "duplicate") {
      fireEvent.click(screen.getByRole("button", { name: "Add line" }));
      fireEvent.change(screen.getByLabelText("Name 2"), { target: { value: "Second" } });
    }
    submit();
    await settledUnknown();
    submit();
    expect(writes("quotes")).toHaveLength(1);
    expect(writes("quote_items")).toHaveLength(1);
    expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument();
  });
  it("accepts numeric/decimal returned equivalence, reordered items and case-normalized UUIDs only", async () => {
    state.write.mockImplementation((request: Request) => {
      if (request.table === "quotes")
        return ok({
          ...request.payload,
          id: (request.payload as Record<string, string>).id.toUpperCase(),
          quote_number: "Q-1",
          subtotal: 100,
          tax_rate: 0.12,
          tax_amount: "12.0000",
          total_amount: 112,
        });
      return ok(
        (request.payload as Record<string, unknown>[])
          .map((row) => ({
            ...row,
            id: String(row.id).toUpperCase(),
            quote_id: String(row.quote_id).toUpperCase(),
          }))
          .reverse(),
      );
    });
    mount();
    await fill();
    fireEvent.click(screen.getByRole("button", { name: "Add line" }));
    fireEvent.change(screen.getByLabelText("Name 2"), { target: { value: "Second" } });
    submit();
    await waitFor(() => expect(state.success).toHaveBeenCalledTimes(1));
  });
  it.each([
    ["Name 1", " "],
    ["Quantity 1", ""],
    ["Quantity 1", "0"],
    ["Quantity 1", "-1"],
    ["Quantity 1", "1.001"],
    ["Unit price 1 (₱)", ""],
    ["Unit price 1 (₱)", "-1"],
    ["Unit price 1 (₱)", "100000000"],
    ["Unit price 1 (₱)", "1.001"],
    ["Tax rate (%)", ""],
    ["Tax rate (%)", "-1"],
    ["Tax rate (%)", "1000"],
    ["Tax rate (%)", "1.001"],
    ["Expiry date", "2026-02-30"],
    ["Expiry date", "0000-01-01"],
  ])("rejects unsupported %s=%s before dispatch", async (label, value) => {
    mount();
    await fill();
    // Native date controls sanitize impossible dates to the allowed empty
    // optional value. Exercise the route's own malformed-value boundary with
    // a text-capable host control, not a claim about real date-picker input.
    if (label === "Expiry date") (screen.getByLabelText(label) as HTMLInputElement).type = "text";
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    submit();
    await screen.findByText(/Check every line/);
    expect(state.write).not.toHaveBeenCalled();
    expect(state.read.mock.calls.map(([r]) => r as Request).filter((r) => r.single)).toHaveLength(
      0,
    );
  });
  it("rejects sub-cent line/tax products and overflowing totals rather than silently rounding", async () => {
    mount();
    await fill();
    fireEvent.change(screen.getByLabelText("Quantity 1"), { target: { value: "1.25" } });
    fireEvent.change(screen.getByLabelText("Unit price 1 (₱)"), { target: { value: "2.50" } });
    submit();
    await screen.findByText(/extra precision is not rounded/);
    expect(state.write).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Quantity 1"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Unit price 1 (₱)"), { target: { value: "0.01" } });
    submit();
    expect(state.write).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Unit price 1 (₱)"), {
      target: { value: "99999999.99" },
    });
    submit();
    expect(state.write).not.toHaveBeenCalled();
  });
  it.each(["Name 1", "Description 1", "Notes", "Terms & conditions", "Name 2", "Description 2"])(
    "rejects NUL in %s before preflight or any header/items dispatch",
    async (label) => {
      mount();
      await fill();
      if (label.endsWith("2")) {
        fireEvent.click(screen.getByRole("button", { name: "Add line" }));
        fireEvent.change(screen.getByLabelText("Name 2"), { target: { value: "Second line" } });
      }
      fireEvent.change(screen.getByLabelText(label), { target: { value: "Synthetic\0text" } });
      expect(screen.getByLabelText(label)).toHaveValue("Synthetic\0text");
      submit();
      await screen.findByText(/Check the text fields/);
      expect(state.write).not.toHaveBeenCalled();
      expect(state.read.mock.calls.map(([r]) => r as Request).filter((r) => r.single)).toHaveLength(
        0,
      );
      expect(state.navigate).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["Name 1", 200],
    ["Description 1", 4000],
    ["Notes", 4000],
    ["Terms & conditions", 4000],
  ])(
    "rejects %s beyond interim caller limit %s without truncation or dispatch",
    async (label, limit) => {
      mount();
      await fill();
      const value = "x".repeat(Number(limit) + 1);
      // Synthetic event bypasses the native maxLength typing limit so the
      // caller's independent preflight bound, not browser truncation, is tested.
      fireEvent.change(screen.getByLabelText(String(label)), { target: { value } });
      expect(screen.getByLabelText(String(label))).toHaveValue(value);
      submit();
      await screen.findByText(/Check the text fields/);
      expect(state.write).not.toHaveBeenCalled();
      expect(state.read.mock.calls.map(([r]) => r as Request).filter((r) => r.single)).toHaveLength(
        0,
      );
    },
  );
  it.each(["\ud800", "\udfff"])(
    "rejects unpaired UTF-16 surrogate before preflight/write (%j)",
    async (invalid) => {
      mount();
      await fill();
      fireEvent.change(screen.getByLabelText("Description 1"), {
        target: { value: `Synthetic${invalid}text` },
      });
      submit();
      await screen.findByText(/Check the text fields/);
      expect(state.write).not.toHaveBeenCalled();
      expect(state.read.mock.calls.map(([r]) => r as Request).filter((r) => r.single)).toHaveLength(
        0,
      );
    },
  );
  it("accepts exact text boundaries and paired Unicode, with accessible limits", async () => {
    mount();
    await fill();
    const name = "🚗".repeat(100); // 200 UTF-16 units, as native maxLength.
    const description = "d".repeat(4000);
    const notes = "n".repeat(3998) + "\r\n";
    const terms = "t".repeat(4000);
    for (const [label, value, limit] of [
      ["Name 1", name, 200],
      ["Description 1", description, 4000],
      ["Notes", notes, 4000],
      ["Terms & conditions", terms, 4000],
    ] as const) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveAttribute("maxlength", String(limit));
      expect(field).toHaveAccessibleDescription(/up to/);
      fireEvent.change(field, { target: { value } });
    }
    submit();
    await waitFor(() => expect(state.success).toHaveBeenCalledTimes(1));
    expect(writes("quotes")[0].payload).toMatchObject({
      notes: notes.trim(),
      terms_conditions: terms,
    });
    expect(writes("quote_items")[0].payload).toMatchObject([{ name, description }]);
  });
  it("blocks double submit synchronously and aborts stale header after account A→B→A without items/navigation", async () => {
    const pending = deferred<Result>();
    state.write.mockImplementation(() => pending.promise);
    const view = mount();
    await fill();
    submit();
    submit();
    await waitFor(() => expect(writes("quotes")).toHaveLength(1));
    const header = writes("quotes")[0];
    state.account = "account-b";
    view.refresh();
    await screen.findByRole("option", { name: "Customer1 Synthetic" });
    expect(screen.getByLabelText("Name 1")).toHaveValue("");
    state.account = "account-a";
    view.refresh();
    await screen.findByRole("option", { name: "Customer1 Synthetic" });
    await act(async () => pending.resolve(ok({ ...header.payload, quote_number: "Q-1" })));
    expect(header.signal?.aborted).toBe(true);
    expect(writes("quote_items")).toHaveLength(0);
    expect(state.navigate).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
    expect(screen.queryByText(UNKNOWN)).not.toBeInTheDocument();
  });
  it.each(["resolve", "reject"])("suppresses late item %s after unmount/signout", async (kind) => {
    const pending = deferred<Result>();
    state.write.mockImplementation((request: Request) =>
      request.table === "quotes"
        ? ok({ ...request.payload, quote_number: "Q-1" })
        : pending.promise,
    );
    const view = mount();
    await fill();
    submit();
    await waitFor(() => expect(writes("quote_items")).toHaveLength(1));
    const items = writes("quote_items")[0];
    state.account = null;
    view.refresh();
    await act(async () =>
      kind === "resolve"
        ? pending.resolve(ok(items.payload))
        : pending.reject(new Error("SECRET late")),
    );
    expect(items.signal?.aborted).toBe(true);
    expect(state.success).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
    expect(screen.getByText("Sign in to create a quote.")).toBeInTheDocument();
  });
  it("stops an issued attempt permanently after observed option refresh and preserves uncertainty lock", async () => {
    const pending = deferred<Result>();
    state.write.mockImplementation(() => pending.promise);
    const view = mount();
    await fill();
    submit();
    await waitFor(() => expect(writes("quotes")).toHaveLength(1));
    const header = writes("quotes")[0];
    const refresh = deferred<Result>();
    state.responses["account-a:customers:list"] = refresh.promise;
    act(() => {
      void view.client.invalidateQueries({
        queryKey: ["shop-manager", "account-a", "quotes", "new", "customers"],
      });
    });
    await screen.findByText("Loading customers…");
    await screen.findByText(UNKNOWN);
    await act(async () => refresh.resolve(ok([customer(1), customer(2)], 2)));
    await screen.findByRole("option", { name: "Customer1 Synthetic" });
    await act(async () => pending.resolve(ok({ ...header.payload, quote_number: "Q-1" })));
    expect(writes("quote_items")).toHaveLength(0);
    expect(state.success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Create quote" })).toBeDisabled();
  });
  it("does not abort or lose a header attempt because of an abandoned suspended render", async () => {
    const pending = deferred<Result>();
    state.write.mockImplementation((request: Request) =>
      request.table === "quotes" ? pending.promise : ok(request.payload),
    );
    const never = new Promise<void>(() => {});
    const probe = vi.fn();
    let update!: React.Dispatch<React.SetStateAction<boolean>>;
    function SuspendAfterRoute({ suspend }: { suspend: boolean }) {
      probe(suspend);
      if (suspend) throw never;
      return null;
    }
    function Harness() {
      const [suspend, setSuspend] = React.useState(false);
      update = setSuspend;
      // A render-local synthetic unavailable read, not a committed cache
      // mutation. The following sibling suspends the same boundary after the
      // actual route renders, so its layout effects must not publish the mask.
      state.maskCustomerRead = suspend;
      return (
        <React.Suspense fallback={<p>Suspended draft</p>}>
          <Page />
          <SuspendAfterRoute suspend={suspend} />
        </React.Suspense>
      );
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    clients.push(client);
    render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );
    await fill();
    submit();
    await waitFor(() => expect(writes("quotes")).toHaveLength(1));
    const header = writes("quotes")[0];
    act(() => {
      React.startTransition(() => update(true));
    });
    await waitFor(() => expect(probe).toHaveBeenCalledWith(true));
    expect(screen.queryByText("Suspended draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading customers…")).not.toBeInTheDocument();
    expect(header.signal?.aborted).toBe(false);
    // Discard the transition; the last committed selection is still valid.
    act(() => update(false));
    await act(async () => pending.resolve(ok({ ...header.payload, quote_number: "Q-1" })));
    await waitFor(() => expect(state.success).toHaveBeenCalledTimes(1));
    expect(writes("quote_items")).toHaveLength(1);
    expect(header.signal?.aborted).toBe(false);
    expect(screen.queryByText(UNKNOWN)).not.toBeInTheDocument();
  });
  it("stops read-only preflight after context loss without making any write", async () => {
    const pending = deferred<Result>();
    state.responses[`account-a:customers:id:${id(1)}`] = pending.promise;
    const view = mount();
    await fill(true);
    submit();
    await waitFor(() =>
      expect(state.read.mock.calls.some(([r]) => (r as Request).single)).toBe(true),
    );
    state.loading = true;
    view.refresh();
    await act(async () => pending.resolve(ok(customer())));
    expect(state.write).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
    expect(screen.getByText("Checking account…")).toBeInTheDocument();
  });
  it("uses unique read lifetimes so old A reads cannot supply a new A witness", async () => {
    const pending = deferred<Result>();
    state.responses["account-a:customers:list"] = pending.promise;
    const view = mount();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    const old = state.read.mock.calls[0][0] as Request;
    state.account = "account-b";
    view.refresh();
    await screen.findByRole("option", { name: "Customer1 Synthetic" });
    state.responses["account-a:customers:list"] = ok([customer(3)], 1);
    state.account = "account-a";
    view.refresh();
    await screen.findByRole("option", { name: "Customer3 Synthetic" });
    await act(async () => pending.resolve(ok([customer(700)], 1)));
    expect(screen.queryByRole("option", { name: "Customer700 Synthetic" })).not.toBeInTheDocument();
    expect(old.signal?.aborted).toBe(true);
  });
  it("hides options while refetching/error, keeps draft, and exposes generic manual retry", async () => {
    const view = mount();
    await fill();
    const pending = deferred<Result>();
    state.responses["account-a:customers:list"] = pending.promise;
    fireEvent.click(screen.getByRole("button", { name: "Refresh customers" }));
    await screen.findByText("Loading customers…");
    expect(screen.queryByRole("option", { name: "Customer1 Synthetic" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create quote" })).toBeDisabled();
    await act(async () => pending.reject(new Error("SECRET load")));
    await screen.findByText(LOAD);
    expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name 1")).toHaveValue("Synthetic service");
    populate();
    fireEvent.click(screen.getByRole("button", { name: "Retry customers" }));
    await screen.findByRole("option", { name: "Customer1 Synthetic" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Create quote" })).not.toBeDisabled(),
    );
    expect(
      view.client
        .getQueryCache()
        .getAll()
        .every((q) => q.options.retry === false),
    ).toBe(true);
  });
  it("resets vehicle selection immediately on customer change and rejects stale vehicle responses", async () => {
    const pending = deferred<Result>();
    state.responses[`account-a:vehicles:${id(1)}`] = pending.promise;
    mount();
    await screen.findByRole("option", { name: "Customer1 Synthetic" });
    fireEvent.change(screen.getByLabelText("Customer *"), { target: { value: id(1) } });
    await screen.findByText("Loading vehicles…");
    fireEvent.change(screen.getByLabelText("Customer *"), { target: { value: id(2) } });
    await screen.findByRole("option", { name: "2025 Make102 Synthetic" });
    await act(async () => pending.resolve(ok([vehicle()], 1)));
    expect(
      screen.queryByRole("option", { name: "2025 Make101 Synthetic" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Vehicle (optional)")).toHaveValue("");
  });
  it("caps at100 options honestly and permits revalidated selected row from a partial list", async () => {
    state.responses["account-a:customers:list"] = ok(
      Array.from({ length: 101 }, (_, n) => customer(n + 1)),
      250,
    );
    mount();
    await fill();
    expect(within(screen.getByLabelText("Customer *")).getAllByRole("option")).toHaveLength(101);
    expect(screen.queryByRole("option", { name: "Customer101 Synthetic" })).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 100 customer options of 250 visible/)).toBeInTheDocument();
    submit();
    await waitFor(() => expect(state.success).toHaveBeenCalled());
  });
  it.each([null, 20])(
    "qualifies empty/partial option count %s without claiming none exist",
    async (count) => {
      state.responses["account-a:customers:list"] = ok([], count);
      mount();
      await screen.findByText(count === null ? /total unknown/ : /of 20 visible/);
      expect(screen.queryByText(/No customers/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create quote" })).toBeDisabled();
    },
  );
  it.each([
    "null data",
    "over cap",
    "duplicate",
    "bad sentinel",
    "missing count",
    "bad count",
    "extra field",
  ])("fails closed on customer options %s", async (kind) => {
    let response: Result = ok([customer()], 1);
    if (kind === "null data") response = ok(null, 0);
    if (kind === "over cap")
      response = ok(
        Array.from({ length: 102 }, (_, n) => customer(n + 1)),
        102,
      );
    if (kind === "duplicate")
      response = ok([customer(), customer(1, { id: id(1).toUpperCase() })], 2);
    if (kind === "bad sentinel")
      response = ok(
        [
          ...Array.from({ length: 100 }, (_, n) => customer(n + 1)),
          customer(101, { shop_id: null }),
        ],
        101,
      );
    if (kind === "missing count") response = ok([customer()]);
    if (kind === "bad count") response = ok([customer()], 0);
    if (kind === "extra field") response = ok([customer(1, { secret: "PRIVATE" })], 1);
    state.responses["account-a:customers:list"] = response;
    mount();
    await screen.findByText(LOAD);
    expect(state.write).not.toHaveBeenCalled();
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
  });
  it("validates vehicle sentinel binding, not just the first100", async () => {
    state.responses[`account-a:vehicles:${id(1)}`] = ok(
      [...Array.from({ length: 100 }, (_, n) => vehicle(n + 101)), vehicle(300, id(2))],
      101,
    );
    mount();
    await screen.findByRole("option", { name: "Customer1 Synthetic" });
    fireEvent.change(screen.getByLabelText("Customer *"), { target: { value: id(1) } });
    await screen.findByText(LOAD);
    expect(screen.getByRole("button", { name: "Create quote" })).toBeDisabled();
    expect(
      screen.queryByRole("option", { name: "2025 Make101 Synthetic" }),
    ).not.toBeInTheDocument();
  });
  it("keeps a generic route error boundary and explicit accessible field labels", async () => {
    const reset = vi.fn();
    render(<ErrorView error={new Error("SECRET route")} reset={reset} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not open quote creation.");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledOnce();
    cleanup();
    mount();
    await fill();
    expect(screen.getByLabelText("Description 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Terms & conditions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove line 1" })).toBeDisabled();
  });
});
