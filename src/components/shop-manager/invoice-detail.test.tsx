// Actual route + real QueryClient with fluent SDK doubles. No real SQL, RLS,
// accounting reconciliation, atomic payment writer, stock or COGS proof.
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "@/routes/_authenticated/workspace.invoices.$id";

type DbResult = { data: unknown; error: { message: string } | null; count?: number | null };
type Write = {
  userId: string | null;
  table: string;
  operation: string;
  payload: Record<string, unknown>;
  filters: Record<string, unknown>;
  projection: string;
};
const state = vi.hoisted(() => ({
  userId: "employee-a" as string | null,
  id: "invoice-1",
  responses: {} as Record<string, DbResult | Promise<DbResult>>,
  read: vi.fn(),
  write: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null }),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock("sonner", () => ({
  toast: {
    success: state.success,
    error: state.error,
    warning: state.warning,
    message: state.warning,
  },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useParams: () => ({ id: state.id }),
  }),
  useNavigate: () => state.navigate,
  useRouter: () => ({ invalidate: vi.fn() }),
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
    from: (table: string) => {
      const userId = state.userId;
      const scopeId = state.id;
      const filters: Record<string, unknown> = {};
      let operation = "read";
      let payload: Record<string, unknown> = {};
      let projection = "";
      let limit: number | undefined;
      let countMode: string | undefined;
      const result = () => {
        if (operation !== "read")
          return state.write({
            userId,
            table,
            operation,
            payload,
            filters: { ...filters },
            projection,
          });
        const target = String(filters.invoice_id ?? filters.id ?? scopeId);
        state.read({
          userId,
          table,
          target,
          projection,
          limit,
          countMode,
          filters: { ...filters },
        });
        const response = state.responses[`${userId}:${table}:${target}`] ?? {
          data: table === "invoices" ? null : [],
          error: null,
        };
        return Promise.resolve(response).then((value) => ({
          ...value,
          ...(Array.isArray(value.data) && !Object.hasOwn(value, "count")
            ? { count: value.data.length }
            : {}),
        }));
      };
      const builder = {
        select: (fields: string, options?: { count?: string }) => {
          projection = fields;
          countMode = options?.count;
          return builder;
        },
        eq: (column: string, value: unknown) => {
          filters[column] = value;
          return builder;
        },
        is: (column: string, value: unknown) => {
          filters[column] = value;
          return builder;
        },
        order: () => builder,
        limit: (value: number) => {
          limit = value;
          return builder;
        },
        or: (value: string) => {
          filters.or = value;
          return builder;
        },
        insert: (value: Record<string, unknown>) => {
          operation = "insert";
          payload = value;
          return builder;
        },
        update: (value: Record<string, unknown>) => {
          operation = "update";
          payload = value;
          return builder;
        },
        single: () => Promise.resolve(result()),
        maybeSingle: () => Promise.resolve(result()),
        then: (resolve: (value: DbResult) => unknown, reject: (error: unknown) => unknown) =>
          Promise.resolve(result()).then(resolve, reject),
      };
      return builder;
    },
  },
}));
const Detail = Route.options.component as React.ComponentType;
const key = (user: string, table: string, id = "invoice-1") => `${user}:${table}:${id}`;
function invoice(user = "employee-a", id = "invoice-1") {
  return {
    id,
    customer: `${user} customer`,
    customer_id: `${user}-customer`,
    customer_email: `${user}@example.invalid`,
    customer_address: `${user} private address`,
    description: `${user} private invoice`,
    notes: null,
    date: "2026-10-17",
    due_date: null,
    status: "draft",
    work_order_id: null,
    subtotal: 1000,
    tax: 50,
    total: 1050,
    payment_method: null,
  };
}
function populate(user: string, id = "invoice-1") {
  state.responses[key(user, "invoices", id)] = { data: invoice(user, id), error: null };
  state.responses[key(user, "invoice_items", id)] = {
    data: [
      {
        id: `${user}-line`,
        invoice_id: id,
        name: `${user} line`,
        description: "Synthetic line",
        quantity: 1,
        price: 1000,
        total: 1000,
        hours: false,
      },
    ],
    error: null,
  };
  state.responses[key(user, "payments", id)] = {
    data: [
      {
        id: `${user}-payment`,
        invoice_id: id,
        customer_id: `${user}-customer`,
        amount: 200,
        payment_type: "cash",
        status: "completed",
        transaction_date: null,
        transaction_id: `${user}-reference`,
        notes: null,
      },
    ],
    error: null,
  };
  state.responses[key(user, "inventory_items", id)] = {
    data: [
      {
        id: `${user}-inventory`,
        name: `${user} filter`,
        sku: "SYNTHETIC-SKU",
        quantity: 10,
        sell_price_per_unit: 125,
        unit_price: 100,
        cost_per_unit: 50,
      },
    ],
    error: null,
  };
}
function receipt(write: Write): DbResult {
  const select = (row: Record<string, unknown>): DbResult => ({
    data: Object.fromEntries(write.projection.split(",").map((field) => [field, row[field]])),
    error: null,
  });
  if (write.table === "payments" || write.table === "invoice_items") {
    const row = {
      id: write.table === "payments" ? "recorded-payment" : "recorded-line",
      ...write.payload,
    };
    const source = state.responses[
      key(String(write.userId), write.table, String(write.payload.invoice_id))
    ] as DbResult;
    if (source && Array.isArray(source.data)) source.data = [...source.data, row];
    return select(row);
  }
  const source = state.responses[
    key(String(write.userId), "invoices", String(write.filters.id))
  ] as DbResult;
  const row = { ...invoice(String(write.userId), String(write.filters.id)), ...write.payload };
  if (source) source.data = row;
  return select(row);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, failed) => {
    resolve = done;
    reject = failed;
  });
  return { promise, resolve, reject };
}
const clients: QueryClient[] = [];
function show(
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  }),
) {
  clients.push(client);
  const view = () => (
    <QueryClientProvider client={client}>
      <Detail />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
async function ready() {
  await screen.findByText(`${state.userId} private invoice`);
  await waitFor(() => expect(screen.getByRole("button", { name: "Record payment" })).toBeEnabled());
}
function lifetimeKey(client: QueryClient, prefix: readonly unknown[]) {
  const matches = client
    .getQueryCache()
    .getAll()
    .filter(
      (query) =>
        query.queryKey.length === prefix.length + 1 &&
        prefix.every((part, index) => query.queryKey[index] === part),
    );
  expect(matches).toHaveLength(1);
  expect(typeof matches[0].queryKey.at(-1)).toBe("string");
  return matches[0].queryKey;
}
async function payment(amount = "100") {
  fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.change(dialog.getByLabelText(/Amount/), { target: { value: amount } });
  fireEvent.change(dialog.getByLabelText(/Reference/), { target: { value: "synthetic-ref" } });
  return dialog;
}
async function inventoryDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Add from inventory" }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.click(
    await dialog.findByRole("button", { name: new RegExp(`${state.userId} filter`) }),
  );
  return dialog;
}
function noPrivateDiagnostics() {
  const messages = [
    ...state.error.mock.calls,
    ...state.warning.mock.calls,
    ...state.success.mock.calls,
  ]
    .flat()
    .join(" ");
  expect(messages).not.toContain("private SQL");
  expect(screen.queryByText(/private SQL/)).not.toBeInTheDocument();
}
beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "employee-a";
  state.id = "invoice-1";
  state.responses = {};
  populate("employee-a");
  populate("employee-b");
  populate("employee-a", "invoice-2");
  state.write.mockImplementation(receipt);
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});

describe("account-scoped invoice reads", () => {
  it("does not use an old same-account cache entry as a fresh primary read witness", async () => {
    const pending = deferred<DbResult>();
    state.responses[key("employee-a", "invoices")] = pending.promise;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(
      ["shop-manager", "employee-a", "invoices", "detail", "invoice-1"],
      invoice(),
    );
    show(client);
    await waitFor(() => expect(state.read).toHaveBeenCalled());
    expect(screen.queryByText("employee-a private invoice")).not.toBeInTheDocument();
    expect(state.read.mock.calls.every(([read]) => read.table === "invoices")).toBe(true);
    await act(async () => pending.resolve({ data: invoice(), error: null }));
    await ready();
  });

  it("does not join an old pending A read when returning from B to A", async () => {
    const oldA = deferred<DbResult>();
    const newA = deferred<DbResult>();
    state.responses[key("employee-a", "invoices")] = oldA.promise;
    const { rerender, view } = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledOnce());
    state.userId = "employee-b";
    rerender(view());
    await ready();
    state.responses[key("employee-a", "invoices")] = newA.promise;
    state.userId = "employee-a";
    rerender(view());
    await waitFor(() =>
      expect(
        state.read.mock.calls.filter(
          ([read]) => read.userId === "employee-a" && read.table === "invoices",
        ),
      ).toHaveLength(2),
    );
    await act(async () => oldA.resolve({ data: invoice(), error: null }));
    expect(screen.queryByText("employee-a private invoice")).not.toBeInTheDocument();
    expect(screen.queryByText("employee-b private invoice")).not.toBeInTheDocument();
    expect(
      state.read.mock.calls.some(
        ([read]) => read.userId === "employee-a" && read.table !== "invoices",
      ),
    ).toBe(false);
    await act(async () => newA.resolve({ data: invoice(), error: null }));
    await ready();
  });

  it.each(["invoice_items", "payments"])(
    "does not show a false empty %s state when zero returned rows have unknown/positive count",
    async (table) => {
      state.responses[key("employee-a", table)] = { data: [], error: null, count: null };
      const { client } = show();
      await screen.findByText(
        table === "payments" ? "Payments are unconfirmed." : "Line items are unconfirmed.",
      );
      expect(
        screen.queryByText(table === "payments" ? "No payments recorded." : "No line items."),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
      state.responses[key("employee-a", table)] = { data: [], error: null, count: 2 };
      await act(async () => {
        await client.invalidateQueries({
          queryKey: [
            "shop-manager",
            "employee-a",
            "invoices",
            table === "payments" ? "payments" : "items",
            "invoice-1",
          ],
        });
      });
      expect(
        screen.getByText(
          table === "payments" ? "Payments are unconfirmed." : "Line items are unconfirmed.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled();
    },
  );

  it("preserves unsupported-precision and large exact numeric strings in received-value displays", async () => {
    const items = state.responses[key("employee-a", "invoice_items")] as DbResult;
    (items.data as Record<string, unknown>[])[0].price = "0.0001";
    (items.data as Record<string, unknown>[])[0].total = "12345678901234567890.1234";
    const payments = state.responses[key("employee-a", "payments")] as DbResult;
    (payments.data as Record<string, unknown>[])[0].amount = "0.0001";
    show();
    await screen.findAllByText("₱0.0001");
    expect(screen.getByText("₱12345678901234567890.1234")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled();
  });

  it.each(["paid", "void", "cancelled", "refunded", "unknown-status"])(
    "keeps %s invoice visible but blocks unsupported writes",
    async (status) => {
      (state.responses[key("employee-a", "invoices")] as DbResult).data = { ...invoice(), status };
      show();
      await screen.findByText("employee-a private invoice");
      await screen.findByText("employee-a line");
      expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled();
    },
  );

  it("keeps the route error boundary generic instead of exposing backend details", () => {
    const ErrorView = Route.options.errorComponent as React.ComponentType<{
      error: Error;
      reset: () => void;
    }>;
    render(<ErrorView error={new Error("private SQL route diagnostics")} reset={vi.fn()} />);
    expect(screen.getByText("Could not load this invoice.")).toBeInTheDocument();
    expect(screen.queryByText(/private SQL/)).not.toBeInTheDocument();
  });

  it.each(["invoice_items", "payments"])(
    "blocks aggregates/writes for %s when exact visible-row completeness is unknown or mismatched",
    async (table) => {
      const source = state.responses[key("employee-a", table)] as DbResult;
      source.count = null;
      const { client } = show();
      await screen.findByText("employee-a private invoice");
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled(),
      );
      expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled();
      expect(screen.getAllByText(/Unavailable/).length).toBeGreaterThan(0);
      expect(
        screen.getByText(table === "payments" ? "employee-a-reference" : "employee-a line"),
      ).toBeInTheDocument();
      for (const count of [0, 2, 101]) {
        source.count = count;
        await act(async () => {
          await client.invalidateQueries({
            queryKey: [
              "shop-manager",
              "employee-a",
              "invoices",
              table === "payments" ? "payments" : "items",
              "invoice-1",
            ],
          });
        });
        expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled();
      }
    },
  );

  it.each(["invoice_items", "payments"])("retries only the failed %s source", async (table) => {
    state.responses[key("employee-a", table)] = {
      data: null,
      error: { message: "private SQL child" },
    };
    show();
    const label = table === "payments" ? "payments" : "line items";
    await screen.findByText(new RegExp(`Could not load ${label}`));
    const other = table === "payments" ? "invoice_items" : "payments";
    const otherReads = state.read.mock.calls.filter(([read]) => read.table === other).length;
    populate("employee-a");
    fireEvent.click(screen.getByRole("button", { name: `Retry ${label}` }));
    await ready();
    expect(state.read.mock.calls.filter(([read]) => read.table === other).length).toBe(otherReads);
  });

  it.each(["pending", "unknown-status", "unsupported-precision"])(
    "does not assume %s payment data means a zero balance",
    async (kind) => {
      const source = state.responses[key("employee-a", "payments")] as DbResult;
      source.data = [
        {
          ...(source.data as Record<string, unknown>[])[0],
          status:
            kind === "unknown-status"
              ? "another-status"
              : kind === "pending"
                ? "pending"
                : "completed",
          amount: kind === "unsupported-precision" ? 0.001 : 200,
        },
      ];
      show();
      await screen.findByText("employee-a private invoice");
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled(),
      );
      expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled();
      expect(screen.getAllByText(/Unavailable/).length).toBeGreaterThan(0);
    },
  );

  it("uses account/invoice cache keys and bounded child reads", async () => {
    const { client } = show();
    await ready();
    for (const source of ["detail", "items", "payments"]) {
      const prefix = ["shop-manager", "employee-a", "invoices", source, "invoice-1"];
      expect(client.getQueryData(lifetimeKey(client, prefix))).toBeDefined();
      expect(client.getQueryData(prefix)).toBeUndefined();
    }
    expect(
      client.getQueryData(["shop-manager", "invoices", "detail", "invoice-1"]),
    ).toBeUndefined();
    for (const table of ["invoice_items", "payments"])
      expect(
        state.read.mock.calls.some(
          ([read]) => read.table === table && read.limit === 101 && read.countMode === "exact",
        ),
      ).toBe(true);
    expect(state.read.mock.calls.some(([read]) => read.table === "inventory_items")).toBe(false);
  });

  it("renders no private UI and starts no queries while signed out", () => {
    state.userId = null;
    const client = new QueryClient();
    client.setQueryData(
      ["shop-manager", "employee-a", "invoices", "detail", "invoice-1"],
      invoice(),
    );
    expect(show(client).container).toBeEmptyDOMElement();
    expect(state.read).not.toHaveBeenCalled();
  });

  it.each(["missing", "error", "mismatched"])(
    "does not start dependent reads for %s primary data",
    async (kind) => {
      state.responses[key("employee-a", "invoices")] = {
        data: kind === "mismatched" ? invoice("employee-a", "another-invoice") : null,
        error: kind === "error" ? { message: "private SQL primary" } : null,
      };
      show();
      await waitFor(() => expect(state.read).toHaveBeenCalled());
      await waitFor(() => expect(screen.queryByText(/Loading invoice/)).not.toBeInTheDocument());
      expect(state.read.mock.calls.every(([read]) => read.table === "invoices")).toBe(true);
      expect(screen.queryByRole("button", { name: "Record payment" })).not.toBeInTheDocument();
      noPrivateDiagnostics();
    },
  );

  it("does not show previous-account or previous-invoice data after scope changes", async () => {
    const { rerender, view } = show();
    await ready();
    state.userId = "employee-b";
    rerender(view());
    expect(screen.queryByText("employee-a private invoice")).not.toBeInTheDocument();
    await ready();
    expect(screen.queryByText("employee-a line")).not.toBeInTheDocument();
    state.userId = "employee-a";
    state.id = "invoice-2";
    rerender(view());
    await ready();
    state.userId = null;
    rerender(view());
    expect(screen.queryByText("employee-a private invoice")).not.toBeInTheDocument();
  });

  it.each(["invoice_items", "payments"])(
    "keeps %s failure independent and blocks unsafe writes",
    async (table) => {
      state.responses[key("employee-a", table)] = {
        data: null,
        error: { message: "private SQL child" },
      };
      show();
      await screen.findByText(
        new RegExp(`Could not load ${table === "payments" ? "payments" : "line items"}`),
      );
      expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled();
      expect(
        screen.queryByText(table === "payments" ? "No payments recorded." : "No line items."),
      ).not.toBeInTheDocument();
      noPrivateDiagnostics();
    },
  );

  it.each(["invoice_items", "payments"])(
    "caps %s display at 100 and blocks writes on truncated inputs",
    async (table) => {
      const source = state.responses[key("employee-a", table)] as DbResult;
      const row = (source.data as Record<string, unknown>[])[0];
      source.data = Array.from({ length: 101 }, (_, index) => ({
        ...row,
        id: `row-${index}`,
        name: `Capped line ${index}`,
        transaction_id: `Capped reference ${index}`,
      }));
      show();
      await screen.findByText(table === "payments" ? "Capped reference 99" : "Capped line 99");
      expect(
        screen.getByText(
          table === "payments" ? /Showing first 100 payments/ : /Showing first 100 line items/,
        ),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled(),
      );
      expect(
        screen.queryByText(table === "payments" ? "Capped reference 100" : "Capped line 100"),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled();
    },
  );

  it("blocks writes while a child source is pending instead of treating it as empty", async () => {
    const pending = deferred<DbResult>();
    state.responses[key("employee-a", "payments")] = pending.promise;
    show();
    await screen.findByText("employee-a private invoice");
    expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
    expect(screen.queryByText("No payments recorded.")).not.toBeInTheDocument();
    await act(async () => pending.resolve({ data: [], error: null }));
    await ready();
  });
});

describe("invoice payment receipt boundary", () => {
  it("accepts a generated receipt reference when the input reference is blank", async () => {
    state.write.mockImplementation((write: Write) => {
      const response = receipt(write);
      if (write.table === "payments")
        (response.data as Record<string, unknown>).transaction_id = "RC-SYNTHETIC-123";
      return response;
    });
    show();
    await ready();
    const dialog = await payment("100");
    fireEvent.change(dialog.getByLabelText(/Reference/), { target: { value: "" } });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.success).toHaveBeenCalledWith("Payment entry recorded"));
    expect(state.write).toHaveBeenCalledOnce();
  });

  it("keeps a shared review hold after a dispatched payment promise rejects, even after closing/reopening", async () => {
    state.write.mockRejectedValue(new Error("private SQL ambiguous transport"));
    show();
    await ready();
    const dialog = await payment();
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await screen.findByText(/A financial write may have completed/);
    expect(state.success).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
    noPrivateDiagnostics();
  });

  it("records a confirmed partial payment without prematurely marking the invoice paid", async () => {
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await ready();
    const dialog = await payment("100.25");
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.success).toHaveBeenCalledWith("Payment entry recorded"));
    expect(state.write).toHaveBeenCalledTimes(1);
    expect(state.write.mock.calls[0][0]).toMatchObject({
      table: "payments",
      operation: "insert",
      payload: {
        invoice_id: "invoice-1",
        customer_id: "employee-a-customer",
        amount: 100.25,
        payment_type: "cash",
        status: "completed",
        transaction_id: "synthetic-ref",
      },
    });
    expect(state.write.mock.calls[0][0].projection).toBe(
      "id,invoice_id,customer_id,amount,payment_type,status,transaction_id",
    );
    expect(
      invalidate.mock.calls.some(
        ([args]) =>
          args?.queryKey?.includes("employee-a") === true &&
          args?.queryKey?.includes("invoices") === true,
      ),
    ).toBe(true);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "invoices", "list"],
      exact: true,
    });
  });

  it("requires an exact paid-update receipt only after a covering payment receipt", async () => {
    show();
    await ready();
    const dialog = await payment("850");
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.success).toHaveBeenCalledWith("Payment entry recorded"));
    expect(state.write.mock.calls.map(([write]) => write.table)).toEqual(["payments", "invoices"]);
    expect(state.write.mock.calls[1][0]).toMatchObject({
      filters: { id: "invoice-1" },
      projection: "id,customer_id,status,payment_method,total",
      payload: { status: "paid", payment_method: "cash" },
    });
  });

  it.each(["0", "-1", "0.001", "1.234", "1000", "Infinity"])(
    "does not dispatch invalid payment amount %s",
    async (amount) => {
      show();
      await ready();
      const dialog = await payment(amount);
      fireEvent.click(dialog.getByRole("button", { name: "Save" }));
      await act(async () => undefined);
      expect(state.write).not.toHaveBeenCalled();
    },
  );

  it.each([
    "null",
    "wrong-id",
    "wrong-customer",
    "wrong-amount",
    "wrong-method",
    "wrong-status",
    "wrong-reference",
  ])("does not chain paid writes or success for %s receipt", async (kind) => {
    state.write.mockImplementation((write: Write) => {
      const valid = receipt(write);
      if (kind === "null") return { data: null, error: null };
      const data = { ...(valid.data as Record<string, unknown>) };
      const field = {
        "wrong-id": "invoice_id",
        "wrong-customer": "customer_id",
        "wrong-amount": "amount",
        "wrong-method": "payment_type",
        "wrong-status": "status",
        "wrong-reference": "transaction_id",
      }[kind];
      data[field!] = kind === "wrong-amount" ? 999 : "mismatched";
      return { data, error: null };
    });
    show();
    await ready();
    const dialog = await payment("850");
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.write).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(state.warning.mock.calls.length + state.error.mock.calls.length).toBeGreaterThan(0),
    );
    expect(state.success).not.toHaveBeenCalled();
    expect(state.write).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
    noPrivateDiagnostics();
  });

  it("sanitizes a known insert error without acknowledging a payment", async () => {
    state.write.mockResolvedValue({ data: null, error: { message: "private SQL payment error" } });
    show();
    await ready();
    const dialog = await payment();
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.error).toHaveBeenCalled());
    expect(state.success).not.toHaveBeenCalled();
    noPrivateDiagnostics();
  });

  it.each(["error", "mismatch"])(
    "warns and locks after payment receipt but %s paid-update acknowledgment",
    async (kind) => {
      state.write.mockImplementation((write: Write) =>
        write.table === "payments"
          ? receipt(write)
          : {
              data:
                kind === "mismatch"
                  ? { id: "another-invoice", status: "paid", payment_method: "cash" }
                  : null,
              error: kind === "error" ? { message: "private SQL status" } : null,
            },
      );
      show();
      await ready();
      const dialog = await payment("850");
      fireEvent.click(dialog.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(state.write).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(state.warning.mock.calls.length + state.error.mock.calls.length).toBeGreaterThan(0),
      );
      expect(state.success).not.toHaveBeenCalled();
      noPrivateDiagnostics();
    },
  );
});

describe("invoice inventory receipt and editor lifetime", () => {
  it("does not chain a late inventory insertion or reset another account's draft", async () => {
    const pending = deferred<DbResult>();
    state.write.mockReturnValue(pending.promise);
    const { rerender, view, client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await ready();
    const old = await inventoryDialog();
    fireEvent.click(old.getByRole("button", { name: "Add to invoice" }));
    await waitFor(() => expect(state.write).toHaveBeenCalledOnce());
    const write = state.write.mock.calls[0][0] as Write;
    state.userId = "employee-b";
    rerender(view());
    await ready();
    const current = await inventoryDialog();
    fireEvent.change(current.getByLabelText(/Quantity/), { target: { value: "3" } });
    const oldReads = state.read.mock.calls.filter(([read]) => read.userId === "employee-a").length;
    await act(async () => pending.resolve(receipt(write)));
    expect(current.getByLabelText(/Quantity/)).toHaveValue(3);
    expect(state.write).toHaveBeenCalledOnce();
    expect(state.read.mock.calls.filter(([read]) => read.userId === "employee-a").length).toBe(
      oldReads,
    );
    expect(state.success).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("halts a covering-payment follow-up when the same invoice snapshot changes while insertion is pending", async () => {
    const pending = deferred<DbResult>();
    state.write.mockReturnValue(pending.promise);
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await ready();
    const old = await payment("850");
    fireEvent.click(old.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.write).toHaveBeenCalledOnce());
    const write = state.write.mock.calls[0][0] as Write;
    await act(async () =>
      client.setQueryData(
        lifetimeKey(client, ["shop-manager", "employee-a", "invoices", "detail", "invoice-1"]),
        {
          ...invoice(),
          status: "open",
        },
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await act(async () => pending.resolve(receipt(write)));
    expect(state.write).toHaveBeenCalledOnce();
    expect(state.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled();
  });

  it.each(["id", "invoice_id", "inventory_item_id", "quantity", "price", "total"])(
    "does not follow up an inventory receipt with mismatched %s",
    async (field) => {
      state.write.mockImplementation((write: Write) => {
        const response = receipt(write);
        (response.data as Record<string, unknown>)[field] =
          field === "id" ? "" : ["quantity", "price", "total"].includes(field) ? 999 : "another-id";
        return response;
      });
      show();
      await ready();
      const dialog = await inventoryDialog();
      fireEvent.click(dialog.getByRole("button", { name: "Add to invoice" }));
      await screen.findByText(/A financial write may have completed/);
      expect(state.write).toHaveBeenCalledOnce();
      expect(state.success).not.toHaveBeenCalled();
    },
  );

  it.each(["count-mismatch", "missing-inserted-id"])(
    "does not update totals from %s after an acknowledged line insert",
    async (kind) => {
      state.write.mockImplementation((write: Write) => {
        const response = receipt(write);
        if (write.table === "invoice_items") {
          const source = state.responses[key("employee-a", "invoice_items")] as DbResult;
          if (kind === "count-mismatch") source.count = 3;
          else
            source.data = (source.data as Record<string, unknown>[]).filter(
              (row) => row.id !== "recorded-line",
            );
        }
        return response;
      });
      show();
      await ready();
      const dialog = await inventoryDialog();
      fireEvent.click(dialog.getByRole("button", { name: "Add to invoice" }));
      await screen.findByText(/A financial write may have completed/);
      expect(state.write).toHaveBeenCalledOnce();
      expect(state.success).not.toHaveBeenCalled();
    },
  );

  it.each(["0", "-1", "Infinity"])(
    "does not dispatch invalid inventory quantity %s",
    async (quantity) => {
      show();
      await ready();
      const dialog = await inventoryDialog();
      fireEvent.change(dialog.getByLabelText(/Quantity/), { target: { value: quantity } });
      fireEvent.click(dialog.getByRole("button", { name: "Add to invoice" }));
      await act(async () => undefined);
      expect(state.write).not.toHaveBeenCalled();
    },
  );

  it("fails closed on a totals re-read error after an acknowledged line insert", async () => {
    state.write.mockImplementation((write: Write) => {
      const response = receipt(write);
      if (write.table === "invoice_items")
        state.responses[key("employee-a", "invoice_items")] = {
          data: null,
          error: { message: "private SQL totals read" },
        };
      return response;
    });
    show();
    await ready();
    const dialog = await inventoryDialog();
    fireEvent.click(dialog.getByRole("button", { name: "Add to invoice" }));
    await screen.findByText(/A financial write may have completed/);
    expect(state.write).toHaveBeenCalledOnce();
    expect(state.success).not.toHaveBeenCalled();
    noPrivateDiagnostics();
  });

  it("loads the picker only while open, with current-account/invoice scope", async () => {
    const { client } = show();
    await ready();
    await inventoryDialog();
    expect(
      client.getQueryData(
        lifetimeKey(client, [
          "shop-manager",
          "employee-a",
          "invoices",
          "inventory-pick",
          "invoice-1",
          "",
        ]),
      ),
    ).toBeDefined();
    expect(client.getQueryData(["shop-manager", "inventory-pick", ""])).toBeUndefined();
  });

  it("uses neutral line-receipt copy rather than claiming stock/COGS effects", async () => {
    show();
    await ready();
    const dialog = await inventoryDialog();
    fireEvent.click(dialog.getByRole("button", { name: "Add to invoice" }));
    await waitFor(() => expect(state.success).toHaveBeenCalledWith("Invoice line recorded"));
    expect(state.success.mock.calls.flat().join(" ")).not.toMatch(
      /stock deducted|COGS posted|will deduct/i,
    );
    expect(state.write.mock.calls[0][0].projection).toBe(
      "id,invoice_id,inventory_item_id,quantity,price,total",
    );
  });

  it("does not follow up or acknowledge an unmatched inventory insert receipt", async () => {
    state.write.mockResolvedValue({ data: null, error: null });
    show();
    await ready();
    const dialog = await inventoryDialog();
    fireEvent.click(dialog.getByRole("button", { name: "Add to invoice" }));
    await waitFor(() =>
      expect(state.warning.mock.calls.length + state.error.mock.calls.length).toBeGreaterThan(0),
    );
    expect(state.write).toHaveBeenCalledOnce();
    expect(state.success).not.toHaveBeenCalled();
  });

  it.each(["account", "invoice", "account-aba"])(
    "does not chain a late covering payment or affect current drafts after %s change",
    async (change) => {
      const pending = deferred<DbResult>();
      state.write.mockReturnValue(pending.promise);
      const { rerender, view, client } = show();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      await ready();
      const old = await payment("850");
      fireEvent.click(old.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(state.write).toHaveBeenCalledOnce());
      const write = state.write.mock.calls[0][0] as Write;
      if (change === "invoice") state.id = "invoice-2";
      else state.userId = "employee-b";
      rerender(view());
      await ready();
      if (change === "account-aba") {
        state.userId = "employee-a";
        rerender(view());
        await ready();
      }
      const current = await payment("42");
      await act(async () => pending.resolve(receipt(write)));
      expect(current.getByLabelText(/Amount/)).toHaveValue(42);
      expect(state.write).toHaveBeenCalledOnce();
      expect(state.success).not.toHaveBeenCalled();
      expect(state.error).not.toHaveBeenCalled();
      expect(state.warning).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );

  it("blocks dialog reopen and auto-follow-up after closing while a write is pending", async () => {
    const pending = deferred<DbResult>();
    state.write.mockReturnValue(pending.promise);
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await ready();
    const old = await payment("850");
    fireEvent.click(old.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.write).toHaveBeenCalledOnce());
    const write = state.write.mock.calls[0][0] as Write;
    fireEvent.click(old.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await act(async () => pending.resolve(receipt(write)));
    expect(state.write).toHaveBeenCalledOnce();
    expect(state.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
  });
});
