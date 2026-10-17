// Real route/QueryClient, fluent read-only SDK double. No real roles/RLS,
// writes, vehicle ownership policy or shop-wide completeness is proven.
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "@/routes/_authenticated/workspace.work-orders";

type Result = { data: unknown; error: unknown; count?: unknown };
const state = vi.hoisted(() => ({
  userId: "employee-a" as string | null,
  loading: false,
  responses: {} as Record<string, Result | Promise<Result>>,
  read: vi.fn(),
  requests: [] as {
    userId: string | null;
    signal: AbortSignal;
    projection: string;
    options: unknown;
    orders: unknown[];
    limit: number;
    retry: boolean | undefined;
  }[],
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null, loading: state.loading }),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ options }),
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
      let projection = "";
      let options: unknown;
      let limit = 0;
      let signal: AbortSignal;
      let retry: boolean | undefined;
      const orders: unknown[] = [];
      const query = {
        select: (fields: string, settings: unknown) => {
          projection = fields;
          options = settings;
          return query;
        },
        order: (field: string, settings: unknown) => {
          orders.push([field, settings]);
          return query;
        },
        limit: (value: number) => {
          limit = value;
          return query;
        },
        abortSignal: (value: AbortSignal) => {
          signal = value;
          return query;
        },
        retry: (enabled: boolean) => {
          retry = enabled;
          return query;
        },
        then: (resolve: (value: Result) => unknown, reject: (error: unknown) => unknown) => {
          state.read(userId, table);
          state.requests.push({ userId, projection, options, orders, limit, signal, retry });
          return Promise.resolve(
            state.responses[String(userId)] ?? { data: [], error: null, count: 0 },
          ).then(resolve, reject);
        },
      };
      return query;
    },
  },
}));

const List = Route.options.component as React.ComponentType;
function sourceId(kind: "work-order" | "customer" | "vehicle", user = "employee-a", index = 1) {
  const prefix = kind === "work-order" ? "10000000" : kind === "customer" ? "20000000" : "30000000";
  return `${prefix}-0000-0000-0000-${user === "employee-b" ? "b" : "a"}${index.toString(16).padStart(11, "0")}`;
}
function row(user = "employee-a", index = 1): Record<string, unknown> {
  return {
    id: sourceId("work-order", user, index),
    work_order_number: `WO-${user}-${index}`,
    status: "in_progress",
    created_at: "2026-10-17T12:34:56.123+08:00",
    total_cost: "1234.5678",
    customer_id: sourceId("customer", user),
    vehicle_id: sourceId("vehicle", user),
    customers: { id: sourceId("customer", user), first_name: user, last_name: "Private customer" },
    vehicles: {
      id: sourceId("vehicle", user),
      year: 2020,
      make: "Synthetic",
      model: `${user} private vehicle`,
    },
  };
}
function result(
  data: unknown = [row()],
  count: unknown = Array.isArray(data) ? data.length : null,
): Result {
  return { data, error: null, count };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const clients: QueryClient[] = [];
function show(
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
) {
  clients.push(client);
  const view = () => (
    <QueryClientProvider client={client}>
      <List />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
async function ready(user = state.userId) {
  await screen.findByRole("link", { name: `WO-${user}-1` });
}
function noPrivateRows() {
  expect(screen.queryByText(/Private customer/)).not.toBeInTheDocument();
  expect(screen.queryByText(/private vehicle/)).not.toBeInTheDocument();
  expect(screen.queryByText(/WO-employee/)).not.toBeInTheDocument();
}
beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "employee-a";
  state.loading = false;
  state.requests = [];
  state.responses = { "employee-a": result(), "employee-b": result([row("employee-b")]) };
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});

describe("work-order list authentication and read lifetimes", () => {
  it.each(["signed-out", "loading"])("starts no private queries/UI when %s", (mode) => {
    if (mode === "signed-out") state.userId = null;
    else state.loading = true;
    const client = new QueryClient();
    client.setQueryData(["shop-manager", "work-orders", "list"], [row()]);
    client.setQueryData(["shop-manager", "employee-a", "work-orders", "list"], {
      rows: [row()],
      complete: true,
    });
    expect(show(client).container).toBeEmptyDOMElement();
    expect(state.read).not.toHaveBeenCalled();
  });

  it("pins actor/lifetime keys, count, deterministic tie-break ordering, bounded limit and AbortSignal", async () => {
    const { client } = show();
    await ready();
    expect(state.requests).toHaveLength(1);
    const request = state.requests[0];
    expect(request).toMatchObject({
      userId: "employee-a",
      options: { count: "exact" },
      orders: [
        ["created_at", { ascending: false }],
        ["id", { ascending: false }],
      ],
      limit: 101,
      retry: false,
    });
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(request.projection).toContain("vehicle_id");
    expect(request.projection).toContain(
      "customers!fk_work_orders_customer(id,first_name,last_name)",
    );
    expect(request.projection).toContain("vehicles!fk_work_orders_vehicle(id,year,make,model)");
    expect(request.projection).not.toContain("!inner");
    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey.slice(0, 4)).toEqual([
      "shop-manager",
      "employee-a",
      "work-orders",
      "list",
    ]);
    expect(queries[0].queryKey).toHaveLength(5);
    expect(typeof queries[0].queryKey[4]).toBe("string");
  });

  it("does not expose a seeded old same-account cache while a fresh primary read is pending", async () => {
    const pending = deferred<Result>();
    state.responses["employee-a"] = pending.promise;
    const client = new QueryClient();
    client.setQueryData(["shop-manager", "employee-a", "work-orders", "list"], {
      rows: [row()],
      complete: true,
    });
    show(client);
    await waitFor(() => expect(state.read).toHaveBeenCalledOnce());
    noPrivateRows();
    await act(async () => pending.resolve(result()));
    await ready();
  });

  it("aborts an old account read and never joins it after A to B to A", async () => {
    const oldA = deferred<Result>();
    const newA = deferred<Result>();
    state.responses["employee-a"] = oldA.promise;
    const { rerender, view } = show();
    await waitFor(() => expect(state.read).toHaveBeenCalledOnce());
    const original = state.requests[0];
    state.userId = "employee-b";
    rerender(view());
    await ready();
    expect(original.signal.aborted).toBe(true);
    state.responses["employee-a"] = newA.promise;
    state.userId = "employee-a";
    rerender(view());
    await waitFor(() =>
      expect(state.read.mock.calls.filter(([user]) => user === "employee-a")).toHaveLength(2),
    );
    noPrivateRows();
    await act(async () => oldA.resolve(result()));
    noPrivateRows();
    await act(async () => newA.resolve(result()));
    await ready();
    state.userId = null;
    rerender(view());
    noPrivateRows();
  });

  it("hides current rows during refresh and after error, retrying only manually without raw errors", async () => {
    const { client } = show();
    await ready();
    const pending = deferred<Result>();
    state.responses["employee-a"] = pending.promise;
    let refresh!: Promise<void>;
    await act(async () => {
      refresh = client.invalidateQueries({
        queryKey: ["shop-manager", "employee-a", "work-orders", "list"],
      });
    });
    await screen.findByText("Loading…");
    noPrivateRows();
    await act(async () => {
      pending.resolve({ data: [row()], error: { message: "private SQL details" }, count: 1 });
      await refresh;
    });
    await screen.findByRole("button", { name: "Retry work orders" });
    noPrivateRows();
    expect(screen.queryByText(/private SQL/)).not.toBeInTheDocument();
    const calls = state.read.mock.calls.length;
    await act(async () => undefined);
    expect(state.read).toHaveBeenCalledTimes(calls);
    state.responses["employee-a"] = result();
    fireEvent.click(screen.getByRole("button", { name: "Retry work orders" }));
    await ready();
  });
});

describe("work-order list completeness and shape", () => {
  it("casefolds native UUID identity before detecting duplicate work orders", async () => {
    const original = row();
    const alias = {
      ...original,
      id: String(original.id).toUpperCase(),
      work_order_number: "Duplicate alias",
    };
    state.responses["employee-a"] = result([original, alias], 2);
    show();
    await screen.findByRole("button", { name: "Retry work orders" });
    noPrivateRows();
  });

  it("accepts native UUIDs without inventing a version or variant policy", async () => {
    state.responses["employee-a"] = result([
      { ...row(), id: "00000000-ffff-ffff-ffff-ffffffffffff" },
    ]);
    show();
    await ready();
    expect(screen.getByRole("link", { name: "WO-employee-a-1" })).toHaveAttribute(
      "href",
      "/workspace/work-orders/00000000-ffff-ffff-ffff-ffffffffffff",
    );
  });

  it("rejects non-UUID source IDs even if their text could be a safe URL segment", async () => {
    state.responses["employee-a"] = result([{ ...row(), id: "wo-employee-a" }]);
    show();
    await screen.findByRole("button", { name: "Retry work orders" });
    noPrivateRows();
  });

  it("shows a genuine visible-empty view with existing form link and no obsolete migration advice", async () => {
    state.responses["employee-a"] = result([], 0);
    show();
    await screen.findByText("No work orders in this view");
    expect(screen.getByRole("link", { name: "New Work Order" })).toHaveAttribute(
      "href",
      "/workspace/work-orders/new",
    );
    expect(
      screen.queryByText(/porting list|legacy screens|src\/shop-manager/),
    ).not.toBeInTheDocument();
  });

  it.each([null, undefined, 2])(
    "does not claim an empty view when exact count is %j",
    async (count) => {
      state.responses["employee-a"] = { data: [], error: null, count };
      show();
      await screen.findByText("Work-order results are unconfirmed.");
      expect(screen.queryByText("No work orders in this view")).not.toBeInTheDocument();
    },
  );

  it.each([null, 2, 101])(
    "renders received rows without a completeness claim when count is %j",
    async (count) => {
      state.responses["employee-a"] = result([row()], count);
      show();
      await ready();
      expect(screen.getByText(/List completeness is unconfirmed/)).toBeInTheDocument();
    },
  );

  it("requests a 101st sentinel, displays at most 100, and does not claim whole-shop completeness", async () => {
    state.responses["employee-a"] = result(
      Array.from({ length: 101 }, (_, index) => row("employee-a", index + 1)),
      500,
    );
    show();
    await screen.findByRole("link", { name: "WO-employee-a-100" });
    expect(screen.queryByRole("link", { name: "WO-employee-a-101" })).not.toBeInTheDocument();
    expect(screen.getByText("Showing first 100 work orders.")).toBeInTheDocument();
    expect(screen.getByText(/not a verified shop-wide/)).toBeInTheDocument();
  });

  it.each([-1, 0, 1.5, Number.NaN, "1"])(
    "fails closed on malformed/contradictory exact count %j",
    async (count) => {
      state.responses["employee-a"] = result([row()], count);
      show();
      await screen.findByRole("button", { name: "Retry work orders" });
      noPrivateRows();
    },
  );

  it.each([
    null,
    {},
    [row(), row()],
    Array.from({ length: 102 }, (_, index) => row("employee-a", index)),
  ])("fails closed on malformed/duplicate/oversized rows", async (data) => {
    state.responses["employee-a"] = result(data, 102);
    show();
    await screen.findByRole("button", { name: "Retry work orders" });
    noPrivateRows();
  });

  it("validates the hidden sentinel's distinct id instead of ignoring a duplicate 101st row", async () => {
    const rows = Array.from({ length: 100 }, (_, index) => row("employee-a", index));
    rows.push(rows[0]);
    state.responses["employee-a"] = result(rows, 101);
    show();
    await screen.findByRole("button", { name: "Retry work orders" });
    noPrivateRows();
  });

  it.each([
    { customers: [] },
    {
      customers: {
        id: sourceId("customer", "employee-b"),
        first_name: "Wrong",
        last_name: "Person",
      },
    },
    { customers: { id: sourceId("customer"), first_name: null, last_name: "Person" } },
    { vehicles: [] },
    {
      vehicles: {
        id: sourceId("vehicle", "employee-b"),
        year: 2020,
        make: "Wrong",
        model: "Vehicle",
      },
    },
    { vehicles: { id: sourceId("vehicle"), year: 2020.5, make: "Synthetic", model: "Wrong" } },
    { vehicles: { id: sourceId("vehicle"), year: 2147483648, make: "Synthetic", model: "Wrong" } },
    { total_cost: {} },
    { id: "../unsafe" },
    { customer_id: null },
    { vehicle_id: null },
  ])("fails closed on malformed or misbound source fields", async (fields) => {
    state.responses["employee-a"] = result([{ ...row(), ...fields }]);
    show();
    await screen.findByRole("button", { name: "Retry work orders" });
    noPrivateRows();
  });
});

describe("work-order received values and honest joins", () => {
  it("casefolds corresponding UUID foreign keys/embeds and emits canonical links", async () => {
    const source = row();
    source.id = String(source.id).toUpperCase();
    source.customer_id = String(source.customer_id).toUpperCase();
    (source.vehicles as Record<string, unknown>).id = String(
      (source.vehicles as Record<string, unknown>).id,
    ).toUpperCase();
    state.responses["employee-a"] = result([source]);
    show();
    await ready();
    expect(screen.getByRole("link", { name: "WO-employee-a-1" })).toHaveAttribute(
      "href",
      `/workspace/work-orders/${sourceId("work-order")}`,
    );
    expect(screen.getByRole("link", { name: "employee-a Private customer" })).toHaveAttribute(
      "href",
      `/workspace/customers/${sourceId("customer")}`,
    );
    expect(screen.getByRole("link", { name: /private vehicle/ })).toHaveAttribute(
      "href",
      `/workspace/vehicles/${sourceId("vehicle")}`,
    );
  });

  it("preserves bounded large decimals but caps presentation before parsing/rendering oversized money", async () => {
    const exactBoundary = "9".repeat(512);
    state.responses["employee-a"] = result([
      { ...row("employee-a", 1), total_cost: exactBoundary },
      { ...row("employee-a", 2), total_cost: "9".repeat(513) },
      { ...row("employee-a", 3), total_cost: "9".repeat(100_000) },
    ]);
    show();
    await ready();
    expect(screen.getByText(`₱${exactBoundary}`)).toBeInTheDocument();
    expect(screen.getAllByText("Amount unavailable — outside display limit")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "WO-employee-a-3" })).toBeInTheDocument();
    expect(screen.queryByText(/List completeness is unconfirmed/)).not.toBeInTheDocument();
    expect(document.body.textContent?.length).toBeLessThan(5000);
  });

  it("preserves decimal precision/negative amounts and null total without zero substitution", async () => {
    state.responses["employee-a"] = result([
      { ...row("employee-a", 1), total_cost: "12345678901234567890.1234" },
      { ...row("employee-a", 2), total_cost: "-0.0001" },
      { ...row("employee-a", 3), total_cost: null },
    ]);
    show();
    await ready();
    expect(screen.getByText("₱12345678901234567890.1234")).toBeInTheDocument();
    expect(screen.getByText("₱-0.0001")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("treats hidden/null embeds as unavailable, never as absent identities or unverified links", async () => {
    state.responses["employee-a"] = result([
      { ...row(), customers: null, vehicles: null, status: null },
    ]);
    show();
    await ready();
    expect(screen.getByText("Customer details unavailable")).toBeInTheDocument();
    expect(screen.getByText("Vehicle details unavailable")).toBeInTheDocument();
    expect(screen.getByText("unknown")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Private customer|private vehicle/ }),
    ).not.toBeInTheDocument();
  });

  it("uses matching joined ids for links without imposing undocumented year/ownership policies", async () => {
    const source = row();
    (source.vehicles as Record<string, unknown>).year = -42;
    (source.vehicles as Record<string, unknown>).customer_id = "historical-different-owner";
    state.responses["employee-a"] = result([source]);
    show();
    await ready();
    expect(screen.getByRole("link", { name: "employee-a Private customer" })).toHaveAttribute(
      "href",
      `/workspace/customers/${sourceId("customer")}`,
    );
    expect(
      screen.getByRole("link", { name: /-42 Synthetic employee-a private vehicle/ }),
    ).toHaveAttribute("href", `/workspace/vehicles/${sourceId("vehicle")}`);
  });

  it("displays native special numeric values as unusable rather than usable money", async () => {
    state.responses["employee-a"] = result([
      { ...row(), total_cost: "NaN", created_at: "infinity" },
    ]);
    show();
    await ready();
    expect(screen.getByText("NaN (amount not usable)")).toBeInTheDocument();
    expect(screen.getByText("infinity")).toBeInTheDocument();
  });

  it("keeps the route error boundary generic", () => {
    const ErrorView = Route.options.errorComponent as React.ComponentType<{
      error: Error;
      reset: () => void;
    }>;
    render(<ErrorView error={new Error("private SQL diagnostic")} reset={vi.fn()} />);
    expect(screen.getByText("Could not load work orders.")).toBeInTheDocument();
    expect(screen.queryByText(/private SQL/)).not.toBeInTheDocument();
  });
});
