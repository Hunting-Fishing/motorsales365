import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "@/routes/_authenticated/workspace.customers.$id";

// Route/child integration only. Activity is stubbed: no RPC, JWT, live RLS,
// linked-vehicle consent or HTTP transport behavior is established here.
type Result = { data: unknown; error: { message: string } | null };
type ActivityProps = {
  customerId: string;
  vehicles: Array<{ id: string; customer_id: string | null; make?: string | null }>;
  vehiclesLoading: boolean;
  vehiclesError: boolean;
};
const state = vi.hoisted(() => ({
  userId: "employee-a" as string | null,
  customerId: "customer-a",
  customer: null as unknown,
  rows: {} as Record<string, unknown[]>,
  errors: {} as Record<string, { message: string }>,
  pending: {} as Record<string, Promise<Result> | undefined>,
  from: vi.fn(),
  scopes: vi.fn(),
  projections: vi.fn(),
  activity: vi.fn(),
  otherChild: vi.fn(),
  rpc: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null }),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
vi.mock("@/components/shop-manager/customer-communications-log", () => ({
  CustomerCommunicationsLog: ({ customerId }: { customerId: string }) => {
    state.otherChild("communications", customerId);
    return <section aria-label="Stub communications" />;
  },
}));
vi.mock("@/components/shop-manager/customer-reminders-card", () => ({
  CustomerRemindersCard: ({ customerId }: { customerId: string }) => {
    state.otherChild("reminders", customerId);
    return <section aria-label="Stub reminders" />;
  },
}));
vi.mock("@/components/shop-manager/customer-commercial-history", () => ({
  CustomerCommercialHistory: ({ customerId }: { customerId: string }) => {
    state.otherChild("commercial", customerId);
    return <section aria-label="Stub commercial history" />;
  },
}));
vi.mock("@/components/shop-manager/customer-vehicle-activity", () => ({
  CustomerVehicleActivity: (props: ActivityProps) => {
    state.activity(props);
    // A deliberately account/customer-local child draft detects whether the
    // private route boundary remounts even when the next context is cached.
    const [bornFor] = React.useState(`${state.userId}:${props.customerId}`);
    return (
      <section
        aria-label="Captured customer vehicle activity"
        data-customer={props.customerId}
        data-born-for={bornFor}
        data-loading={String(props.vehiclesLoading)}
        data-error={String(props.vehiclesError)}
      >
        {props.vehicles.map((vehicle) => (
          <span key={vehicle.id} data-testid="activity-vehicle">
            {vehicle.id}:{vehicle.customer_id}
          </span>
        ))}
      </section>
    );
  },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({
    options,
    useParams: () => ({ id: state.customerId }),
  }),
  useRouter: () => ({ invalidate: state.invalidate }),
  Link: ({
    to,
    params,
    search: _search,
    children,
    ...props
  }: React.PropsWithChildren<{
    to: string;
    params?: { id: string };
    search?: unknown;
    className?: string;
  }>) => (
    <a {...props} href={to.replace("$id", params?.id ?? "")}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: {
    rpc: state.rpc,
    from: (table: string) => {
      state.from(table);
      // Capture the request's response now. Switching mock account/customer
      // must not retroactively change an earlier in-flight request's data.
      const result = {
        data: table === "customers" ? state.customer : (state.rows[table] ?? []),
        error: state.errors[table] ?? null,
      };
      const pending = state.pending[table];
      const finish = () => pending ?? Promise.resolve(result);
      const builder = {
        select: (columns: string) => {
          state.projections(table, columns);
          return builder;
        },
        eq: (column: string, value: string) => {
          state.scopes(table, column, value);
          return builder;
        },
        order: () => builder,
        maybeSingle: finish,
        limit: finish,
        then: (resolve: (value: Result) => unknown, reject?: (error: unknown) => unknown) =>
          finish().then(resolve, reject),
      };
      return builder;
    },
  },
}));

const CustomerDetail = Route.options.component as React.ComponentType;
const customer = (id = "customer-a", firstName = "Account A customer") => ({
  id,
  first_name: firstName,
  last_name: null,
  created_at: "2026-10-15",
});
const vehicle = (id = "vehicle-a", customerId = "customer-a", make = "Toyota") => ({
  id,
  customer_id: customerId,
  make,
  model: "Vios",
  year: 2020,
  vin: `${id} private VIN`,
  license_plate: `${id} private plate`,
  color: "Blue",
  last_service_date: null,
});
function deferred() {
  let resolve!: (result: Result) => void;
  const promise = new Promise<Result>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const clients = new Set<QueryClient>();
function show(
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
) {
  clients.add(client);
  const view = () => (
    <QueryClientProvider client={client}>
      <CustomerDetail />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
const activity = () => screen.getByRole("region", { name: "Captured customer vehicle activity" });
const lastProps = (): ActivityProps => state.activity.mock.calls.at(-1)![0];
function seed(
  client: QueryClient,
  accountId: string | undefined,
  customerId: string,
  name: string,
  vehicleId: string,
) {
  client.setQueryData(
    ["shop-manager", accountId, "customer", customerId],
    customer(customerId, name),
  );
  client.setQueryData(
    ["shop-manager", accountId, "customer", customerId, "vehicles"],
    [vehicle(vehicleId, customerId)],
  );
  client.setQueryData(["shop-manager", accountId, "customer", customerId, "work-orders"], []);
}
beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "employee-a";
  state.customerId = "customer-a";
  state.customer = customer();
  state.rows = { vehicles: [vehicle()], work_orders: [] };
  state.errors = {};
  state.pending = {};
});
afterEach(() => {
  for (const client of clients) client.clear();
  clients.clear();
});

describe("Customer detail read-only activity integration", () => {
  it("keeps route error-boundary diagnostics private and invokes the generic retry contract", () => {
    const CustomerError = Route.options.errorComponent as React.ComponentType<{
      error: Error;
      reset: () => void;
    }>;
    const reset = vi.fn();
    render(<CustomerError error={new Error("secret route database diagnostic")} reset={reset} />);
    expect(screen.getByText("Could not load this customer.")).toBeInTheDocument();
    expect(screen.queryByText("secret route database diagnostic")).not.toBeInTheDocument();
    expect(state.activity).not.toHaveBeenCalled();
    expect(state.otherChild).not.toHaveBeenCalled();
    expect(state.from).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(state.invalidate).toHaveBeenCalledTimes(1);
  });

  it("passes the visible customer's vehicle identity including customer_id with scoped projections and caches", async () => {
    const { client } = show();
    await screen.findByRole("heading", { name: "Account A customer" });
    await waitFor(() => expect(lastProps().vehicles).toEqual([vehicle()]));
    expect(lastProps()).toEqual({
      customerId: "customer-a",
      vehicles: [vehicle()],
      vehiclesLoading: false,
      vehiclesError: false,
    });
    const projection = state.projections.mock.calls.find(([table]) => table === "vehicles")![1];
    expect(projection.split(",").map((field: string) => field.trim())).toContain("customer_id");
    expect(state.scopes).toHaveBeenCalledWith("customers", "id", "customer-a");
    expect(state.scopes).toHaveBeenCalledWith("vehicles", "customer_id", "customer-a");
    expect(state.scopes).toHaveBeenCalledWith("work_orders", "customer_id", "customer-a");
    for (const suffix of [[], ["vehicles"], ["work-orders"]])
      expect(
        client.getQueryData(["shop-manager", "employee-a", "customer", "customer-a", ...suffix]),
      ).toBeDefined();
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("mounts no activity or dependent read while the primary customer is pending", async () => {
    const pending = deferred();
    state.pending.customers = pending.promise;
    show();
    await screen.findByText("Loading customer…");
    expect(state.activity).not.toHaveBeenCalled();
    expect(state.otherChild).not.toHaveBeenCalled();
    expect(state.from.mock.calls).toEqual([["customers"]]);
    pending.resolve({ data: customer(), error: null });
    await screen.findByRole("region", { name: "Captured customer vehicle activity" });
  });

  it("mounts no activity or dependent read for a missing primary customer", async () => {
    state.customer = null;
    show();
    await screen.findByText("Customer not found.");
    expect(state.activity).not.toHaveBeenCalled();
    expect(state.otherChild).not.toHaveBeenCalled();
    expect(state.from.mock.calls).toEqual([["customers"]]);
  });

  it("mounts no activity on a primary-customer error and keeps diagnostics private", async () => {
    state.errors.customers = { message: "secret customer database diagnostic" };
    show();
    await screen.findByText("Could not load this customer.");
    expect(screen.queryByText("secret customer database diagnostic")).not.toBeInTheDocument();
    expect(state.activity).not.toHaveBeenCalled();
    expect(state.otherChild).not.toHaveBeenCalled();
    expect(state.from.mock.calls).toEqual([["customers"]]);
    delete state.errors.customers;
    fireEvent.click(screen.getByRole("button", { name: "Retry customer" }));
    await screen.findByRole("region", { name: "Captured customer vehicle activity" });
  });

  it("mounts no private source or child while signed out, even with seeded signed-out and account caches", () => {
    state.userId = null;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    seed(
      client,
      undefined,
      "customer-a",
      "Signed-out private cached customer",
      "signed-out-vehicle",
    );
    seed(
      client,
      "employee-a",
      "customer-a",
      "Previous account private customer",
      "previous-vehicle",
    );
    const { container } = show(client);
    expect(container).toBeEmptyDOMElement();
    expect(state.from).not.toHaveBeenCalled();
    expect(state.activity).not.toHaveBeenCalled();
    expect(state.otherChild).not.toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("unmounts loaded private children immediately on sign-out and dispatches no additional reads", async () => {
    const { rerender, view, container } = show();
    await waitFor(() => expect(lastProps().vehicles).toEqual([vehicle()]));
    const calls = state.from.mock.calls.length;
    state.activity.mockClear();
    state.otherChild.mockClear();
    state.userId = null;
    rerender(view());
    expect(container).toBeEmptyDOMElement();
    expect(state.activity).not.toHaveBeenCalled();
    expect(state.otherChild).not.toHaveBeenCalled();
    expect(state.from).toHaveBeenCalledTimes(calls);
  });

  for (const boundary of ["account", "customer"] as const) {
    it(`remounts the private child on a cached ${boundary} switch without passing prior context`, async () => {
      const { rerender, view, client } = show();
      await waitFor(() => expect(lastProps().vehicles).toEqual([vehicle()]));
      expect(activity()).toHaveAttribute("data-born-for", "employee-a:customer-a");
      const nextAccount = boundary === "account" ? "employee-b" : "employee-a";
      const nextCustomer = boundary === "customer" ? "customer-b" : "customer-a";
      seed(client, nextAccount, nextCustomer, "Next private customer", "next-private-vehicle");
      state.activity.mockClear();
      state.otherChild.mockClear();
      state.userId = nextAccount;
      state.customerId = nextCustomer;
      rerender(view());
      expect(screen.queryByRole("heading", { name: "Account A customer" })).not.toBeInTheDocument();
      expect(screen.queryByText("vehicle-a:customer-a")).not.toBeInTheDocument();
      await screen.findByRole("heading", { name: "Next private customer" });
      expect(activity()).toHaveAttribute("data-born-for", `${nextAccount}:${nextCustomer}`);
      for (const [props] of state.activity.mock.calls) {
        expect(props.customerId).toBe(nextCustomer);
        expect(props.vehicles).toEqual([vehicle("next-private-vehicle", nextCustomer)]);
      }
      for (const [, childCustomer] of state.otherChild.mock.calls)
        expect(childCustomer).toBe(nextCustomer);
    });
  }

  it("ignores a late prior-account vehicle response without contaminating current props or cache", async () => {
    const oldVehicles = deferred();
    state.pending.vehicles = oldVehicles.promise;
    const { rerender, view, client } = show();
    await screen.findByRole("heading", { name: "Account A customer" });
    await waitFor(() => expect(lastProps().vehiclesLoading).toBe(true));
    delete state.pending.vehicles;
    state.userId = "employee-b";
    state.customer = customer("customer-a", "Account B customer");
    state.rows.vehicles = [vehicle("account-b-vehicle")];
    state.activity.mockClear();
    rerender(view());
    expect(
      screen.queryByRole("region", { name: "Captured customer vehicle activity" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(lastProps().vehicles).toEqual([vehicle("account-b-vehicle")]));
    await act(async () => {
      oldVehicles.resolve({ data: [vehicle("late-account-a-vehicle")], error: null });
      await oldVehicles.promise;
    });
    expect(screen.queryByText("late-account-a-vehicle:customer-a")).not.toBeInTheDocument();
    for (const [props] of state.activity.mock.calls)
      expect(
        props.vehicles.every((row: { id: string }) => row.id !== "late-account-a-vehicle"),
      ).toBe(true);
    expect(
      client.getQueryData(["shop-manager", "employee-b", "customer", "customer-a", "vehicles"]),
    ).toEqual([vehicle("account-b-vehicle")]);
  });

  it("ignores a late prior-customer primary response and never mounts dependent reads for it", async () => {
    const oldCustomer = deferred();
    state.pending.customers = oldCustomer.promise;
    const { rerender, view, client } = show();
    await screen.findByText("Loading customer…");
    delete state.pending.customers;
    state.customerId = "customer-b";
    state.customer = customer("customer-b", "Current customer B");
    state.rows.vehicles = [vehicle("customer-b-vehicle", "customer-b")];
    rerender(view());
    await waitFor(() =>
      expect(lastProps().vehicles).toEqual([vehicle("customer-b-vehicle", "customer-b")]),
    );
    await act(async () => {
      oldCustomer.resolve({ data: customer("customer-a", "Late private customer A"), error: null });
      await oldCustomer.promise;
    });
    expect(screen.queryByText("Late private customer A")).not.toBeInTheDocument();
    expect(state.scopes).not.toHaveBeenCalledWith("vehicles", "customer_id", "customer-a");
    expect(state.scopes).not.toHaveBeenCalledWith("work_orders", "customer_id", "customer-a");
    for (const [props] of state.activity.mock.calls) expect(props.customerId).toBe("customer-b");
    expect(
      client.getQueryData(["shop-manager", "employee-a", "customer", "customer-b", "vehicles"]),
    ).toEqual([vehicle("customer-b-vehicle", "customer-b")]);
  });

  it("passes an independent vehicle-loading flag instead of presenting unknown vehicles as empty", async () => {
    const vehicles = deferred();
    state.pending.vehicles = vehicles.promise;
    show();
    await screen.findByRole("heading", { name: "Account A customer" });
    await waitFor(() =>
      expect(lastProps()).toEqual({
        customerId: "customer-a",
        vehicles: [],
        vehiclesLoading: true,
        vehiclesError: false,
      }),
    );
    vehicles.resolve({ data: [vehicle()], error: null });
    await waitFor(() => expect(lastProps().vehiclesLoading).toBe(false));
    expect(lastProps().vehicles).toEqual([vehicle()]);
  });

  it("passes an independent vehicle-error flag while retaining the visible customer and other cards", async () => {
    state.errors.vehicles = { message: "secret vehicle database diagnostic" };
    show();
    await screen.findByRole("heading", { name: "Account A customer" });
    await waitFor(() =>
      expect(lastProps()).toEqual({
        customerId: "customer-a",
        vehicles: [],
        vehiclesLoading: false,
        vehiclesError: true,
      }),
    );
    expect(screen.queryByText("secret vehicle database diagnostic")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Stub commercial history" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Stub communications" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Stub reminders" })).toBeInTheDocument();
  });
});
