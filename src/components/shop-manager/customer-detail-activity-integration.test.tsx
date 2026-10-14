import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  CustomerDetail,
  CustomerDetailKind,
  CustomerDetailResult,
  CustomerDetailVehicle,
  CustomerDetailWorkOrder,
} from "@/lib/customer-detail";
import { Route } from "@/routes/_authenticated/workspace.customers.$id";

// Route/child integration only: request-bound readers and activity are mocked.
// Real React Query covers cache masking, request scopes and AbortSignals, not
// HTTP/JWT transport, PostgreSQL cancellation, live RLS or linked-vehicle consent.
type Request = {
  data: { expectedAccountId: string; customerId: string; kind: CustomerDetailKind };
  signal: AbortSignal;
};
type ActivityProps = {
  customerId: string;
  vehicles: CustomerDetailVehicle[];
  vehiclesLoading: boolean;
  vehiclesError: boolean;
};
type Response = CustomerDetailResult | Error | Promise<CustomerDetailResult>;
const state = vi.hoisted(() => ({
  userId: "employee-a" as string | null,
  customerId: "customer-a",
  responses: {} as Record<string, Response>,
  read: vi.fn(),
  activity: vi.fn(),
  otherChild: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null }),
}));
vi.mock("@/lib/customer-detail.functions", () => ({
  getCustomerDetailSnapshot: (options: Request) => state.read(options),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
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
    const [bornFor] = React.useState(`${state.userId}:${props.customerId}`);
    return (
      <section
        aria-label="Captured customer vehicle activity"
        data-customer={props.customerId}
        data-born-for={bornFor}
        data-loading={String(props.vehiclesLoading)}
        data-error={String(props.vehiclesError)}
      >
        {props.vehicles.map((row) => (
          <span key={row.id} data-testid="activity-vehicle">
            {row.id}:{row.customer_id}
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

const CustomerDetailRoute = Route.options.component as React.ComponentType;
const customer = (id = "customer-a", firstName = "Account A customer"): CustomerDetail => ({
  id,
  first_name: firstName,
  last_name: null,
  email: `${id}@example.invalid`,
  phone: null,
  address: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  company: null,
  notes: `${id} private notes`,
  is_fleet: false,
  fleet_company: null,
  business_type: null,
  business_email: null,
  business_phone: null,
  communication_preference: null,
  referral_source: null,
  created_at: "2026-10-15T00:00:00Z",
});
const vehicle = (
  id = "vehicle-a",
  customerId = "customer-a",
  make = "Toyota",
): CustomerDetailVehicle => ({
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
const workOrder = (id = "work-order-a", customerId = "customer-a"): CustomerDetailWorkOrder => ({
  id,
  customer_id: customerId,
  work_order_number: `WO-${id}`,
  status: "in_progress",
  description: `${id} private work`,
  total_cost: 123,
  created_at: "2026-10-15T00:00:00Z",
  vehicle_id: "vehicle-a",
});
const primary = (row: CustomerDetail | null = customer()): CustomerDetailResult => ({
  kind: "customer",
  customer: row,
});
function list(
  kind: "vehicles" | "work_orders",
  rows: CustomerDetailVehicle[] | CustomerDetailWorkOrder[] = [],
  { available = true, hasMore = false } = {},
): CustomerDetailResult {
  return kind === "vehicles"
    ? { kind, rows: rows as CustomerDetailVehicle[], available, hasMore }
    : { kind, rows: rows as CustomerDetailWorkOrder[], available, hasMore };
}
const responseKey = (account: string, id: string, kind: CustomerDetailKind) =>
  `${account}|${id}|${kind}`;
const queryKey = (account: string | undefined, id: string, kind: CustomerDetailKind) => [
  "shop-manager",
  account,
  "customer",
  id,
  ...(kind === "customer" ? [] : [kind === "vehicles" ? "vehicles" : "work-orders"]),
];
function respond(
  kind: CustomerDetailKind,
  response: Response,
  { account = "employee-a", id = "customer-a" } = {},
) {
  state.responses[responseKey(account, id, kind)] = response;
}
function requests(kind?: CustomerDetailKind) {
  return state.read.mock.calls
    .map(([request]) => request as Request)
    .filter((request) => !kind || request.data.kind === kind);
}
function deferred() {
  let resolve!: (result: CustomerDetailResult) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<CustomerDetailResult>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const clients = new Set<QueryClient>();
const client = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
function show(cache = client()) {
  clients.add(cache);
  const view = () => (
    <QueryClientProvider client={cache}>
      <CustomerDetailRoute />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client: cache };
}
const activity = () => screen.getByRole("region", { name: "Captured customer vehicle activity" });
const lastProps = (): ActivityProps => state.activity.mock.calls.at(-1)![0];
const countLabel = (title: string, count: string | number) =>
  screen.getByText(`${title} (${count})`);
const expectNoPrivateChildren = () => {
  for (const name of [
    "Captured customer vehicle activity",
    "Stub communications",
    "Stub reminders",
    "Stub commercial history",
  ])
    expect(screen.queryByRole("region", { name })).not.toBeInTheDocument();
};
function seed(
  cache: QueryClient,
  account: string | undefined,
  id = "customer-a",
  name = "Cached private customer",
  vehicleId = "cached-private-vehicle",
) {
  cache.setQueryData(queryKey(account, id, "customer"), primary(customer(id, name)));
  cache.setQueryData(queryKey(account, id, "vehicles"), list("vehicles", [vehicle(vehicleId, id)]));
  cache.setQueryData(
    queryKey(account, id, "work_orders"),
    list("work_orders", [workOrder("cached-private-work-order", id)]),
  );
}
async function expectLoaded() {
  await screen.findByRole("heading", { name: "Account A customer" });
  await waitFor(() => expect(lastProps().vehicles).toEqual([vehicle()]));
  await screen.findByText("WO-work-order-a");
}
beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "employee-a";
  state.customerId = "customer-a";
  state.responses = {};
  respond("customer", primary());
  respond("vehicles", list("vehicles", [vehicle()]));
  respond("work_orders", list("work_orders", [workOrder()]));
  state.read.mockImplementation(async ({ data }: Request) => {
    // Capture the response at dispatch. Intentionally ignore abort in this mock:
    // late-result tests exercise React Query's consumed cancellation signal.
    const stored = state.responses[responseKey(data.expectedAccountId, data.customerId, data.kind)];
    if (stored instanceof Error) throw stored;
    return stored ?? (data.kind === "customer" ? primary(null) : list(data.kind));
  });
});
afterEach(() => {
  for (const cache of clients) cache.clear();
  clients.clear();
});

describe("Customer detail request-bound snapshot integration", () => {
  it("keeps route error-boundary diagnostics private and invokes the generic retry contract", () => {
    const CustomerError = Route.options.errorComponent as React.ComponentType<{
      error: Error;
      reset: () => void;
    }>;
    const reset = vi.fn();
    render(<CustomerError error={new Error("secret route database diagnostic")} reset={reset} />);
    expect(screen.getByText("Could not load this customer.")).toBeInTheDocument();
    expect(screen.queryByText("secret route database diagnostic")).not.toBeInTheDocument();
    expect(state.read).not.toHaveBeenCalled();
    expect(state.activity).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(state.invalidate).toHaveBeenCalledTimes(1);
  });

  it("passes fresh vehicle identities and independent account/customer/source scopes and signals", async () => {
    const shown = show();
    await expectLoaded();
    expect(lastProps()).toEqual({
      customerId: "customer-a",
      vehicles: [vehicle()],
      vehiclesLoading: false,
      vehiclesError: false,
    });
    expect(state.read).toHaveBeenCalledTimes(3);
    for (const kind of ["customer", "vehicles", "work_orders"] as const) {
      const [request] = requests(kind);
      expect(request.data).toEqual({
        expectedAccountId: "employee-a",
        customerId: "customer-a",
        kind,
      });
      expect(request.signal).toBeInstanceOf(AbortSignal);
      expect(request.signal.aborted).toBe(false);
      expect(shown.client.getQueryData(queryKey("employee-a", "customer-a", kind))).toEqual(
        state.responses[responseKey("employee-a", "customer-a", kind)],
      );
    }
  });

  it("hides seeded caches until fresh primary success, without early dependent requests", async () => {
    const pending = deferred();
    respond("customer", pending.promise);
    const cache = client();
    seed(cache, "employee-a");
    show(cache);
    expect(screen.queryByText("Cached private customer")).not.toBeInTheDocument();
    expect(screen.queryByText("customer-a private notes")).not.toBeInTheDocument();
    expect(screen.queryByText("cached-private-vehicle private VIN")).not.toBeInTheDocument();
    expectNoPrivateChildren();
    await screen.findByText("Loading customer…");
    expect(requests().map((request) => request.data.kind)).toEqual(["customer"]);
    expect(state.activity).not.toHaveBeenCalled();
    expect(state.otherChild).not.toHaveBeenCalled();
    pending.resolve(primary());
    await expectLoaded();
    expect(screen.queryByText("WO-cached-private-work-order")).not.toBeInTheDocument();
    for (const [props] of state.activity.mock.calls)
      expect(
        props.vehicles.every((row: CustomerDetailVehicle) => row.id !== "cached-private-vehicle"),
      ).toBe(true);
  });

  it("does not reveal cached data or mount children when the fresh primary is missing", async () => {
    respond("customer", primary(null));
    const cache = client();
    seed(cache, "employee-a");
    show(cache);
    await screen.findByText("Customer not found.");
    expect(screen.queryByText("Cached private customer")).not.toBeInTheDocument();
    expectNoPrivateChildren();
    expect(state.activity).not.toHaveBeenCalled();
    expect(state.otherChild).not.toHaveBeenCalled();
    expect(requests().map((request) => request.data.kind)).toEqual(["customer"]);
  });

  it("masks primary errors and starts dependent reads only after explicit successful retry", async () => {
    respond("customer", new Error("secret customer database diagnostic"));
    const cache = client();
    seed(cache, "employee-a");
    show(cache);
    await screen.findByText("Could not load this customer.");
    expect(screen.queryByText("secret customer database diagnostic")).not.toBeInTheDocument();
    expect(screen.queryByText("Cached private customer")).not.toBeInTheDocument();
    expectNoPrivateChildren();
    expect(requests().map((request) => request.data.kind)).toEqual(["customer"]);
    respond("customer", primary());
    fireEvent.click(screen.getByRole("button", { name: "Retry customer" }));
    await expectLoaded();
    expect(requests("customer")).toHaveLength(2);
    expect(requests("vehicles")).toHaveLength(1);
    expect(requests("work_orders")).toHaveLength(1);
  });

  it("dispatches no private request or child while signed out, even with seeded private caches", () => {
    state.userId = null;
    const cache = client();
    seed(cache, undefined, "customer-a", "Signed-out private cache");
    seed(cache, "employee-a", "customer-a", "Previous account private cache");
    const { container } = show(cache);
    expect(container).toBeEmptyDOMElement();
    expect(state.read).not.toHaveBeenCalled();
    expect(state.activity).not.toHaveBeenCalled();
    expect(state.otherChild).not.toHaveBeenCalled();
  });

  it("unmounts all private children and cancels pending list requests on sign-out", async () => {
    const pending = deferred();
    respond("vehicles", pending.promise);
    const shown = show();
    await screen.findByRole("heading", { name: "Account A customer" });
    await waitFor(() => expect(requests("vehicles")).toHaveLength(1));
    const request = requests("vehicles")[0];
    const count = requests().length;
    state.activity.mockClear();
    state.otherChild.mockClear();
    state.userId = null;
    shown.rerender(shown.view());
    expect(shown.container).toBeEmptyDOMElement();
    expect(request.signal.aborted).toBe(true);
    expect(state.activity).not.toHaveBeenCalled();
    expect(state.otherChild).not.toHaveBeenCalled();
    expect(requests()).toHaveLength(count);
    await act(async () => {
      pending.resolve(list("vehicles", [vehicle("late-signed-out-vehicle")]));
      await pending.promise;
    });
    expect(shown.container).toBeEmptyDOMElement();
  });

  for (const boundary of ["account", "customer"] as const) {
    it(`remounts on a cached ${boundary} switch and requires fresh snapshots before passing props`, async () => {
      const shown = show();
      await expectLoaded();
      expect(activity()).toHaveAttribute("data-born-for", "employee-a:customer-a");
      const account = boundary === "account" ? "employee-b" : "employee-a";
      const id = boundary === "customer" ? "customer-b" : "customer-a";
      const pending = deferred();
      seed(
        shown.client,
        account,
        id,
        "Next private cached customer",
        "next-private-cached-vehicle",
      );
      respond("customer", pending.promise, { account, id });
      respond("vehicles", list("vehicles", [vehicle("next-fresh-vehicle", id)]), { account, id });
      respond("work_orders", list("work_orders"), { account, id });
      state.activity.mockClear();
      state.otherChild.mockClear();
      state.userId = account;
      state.customerId = id;
      shown.rerender(shown.view());
      expectNoPrivateChildren();
      expect(screen.queryByText("Account A customer")).not.toBeInTheDocument();
      expect(screen.queryByText("Next private cached customer")).not.toBeInTheDocument();
      pending.resolve(primary(customer(id, "Next fresh customer")));
      await screen.findByRole("heading", { name: "Next fresh customer" });
      await waitFor(() =>
        expect(lastProps().vehicles).toEqual([vehicle("next-fresh-vehicle", id)]),
      );
      expect(activity()).toHaveAttribute("data-born-for", `${account}:${id}`);
      for (const [props] of state.activity.mock.calls) {
        expect(props.customerId).toBe(id);
        expect(
          props.vehicles.every((row: CustomerDetailVehicle) => row.id === "next-fresh-vehicle"),
        ).toBe(true);
      }
      for (const [, childCustomer] of state.otherChild.mock.calls) expect(childCustomer).toBe(id);
    });

    it(`cancels and ignores a late prior-${boundary} primary result without dispatching its lists`, async () => {
      const pending = deferred();
      respond("customer", pending.promise);
      const shown = show();
      await screen.findByText("Loading customer…");
      const oldRequest = requests("customer")[0];
      const account = boundary === "account" ? "employee-b" : "employee-a";
      const id = boundary === "customer" ? "customer-b" : "customer-a";
      respond("customer", primary(customer(id, "Current private customer")), { account, id });
      respond("vehicles", list("vehicles", [vehicle("current-vehicle", id)]), { account, id });
      respond("work_orders", list("work_orders"), { account, id });
      state.userId = account;
      state.customerId = id;
      shown.rerender(shown.view());
      expect(oldRequest.signal.aborted).toBe(true);
      await waitFor(() => expect(lastProps().vehicles).toEqual([vehicle("current-vehicle", id)]));
      await act(async () => {
        pending.resolve(primary(customer("customer-a", "Late private prior customer")));
        await pending.promise;
      });
      expect(screen.queryByText("Late private prior customer")).not.toBeInTheDocument();
      expect(requests("vehicles").map((request) => request.data)).toEqual([
        { expectedAccountId: account, customerId: id, kind: "vehicles" },
      ]);
      expect(requests("work_orders").map((request) => request.data)).toEqual([
        { expectedAccountId: account, customerId: id, kind: "work_orders" },
      ]);
      expect(shown.client.getQueryData(queryKey(account, id, "customer"))).toEqual(
        primary(customer(id, "Current private customer")),
      );
    });
  }

  it("cancels late prior-account list requests without contaminating current props or caches", async () => {
    const oldVehicles = deferred();
    const oldOrders = deferred();
    respond("vehicles", oldVehicles.promise);
    respond("work_orders", oldOrders.promise);
    const shown = show();
    await screen.findByRole("heading", { name: "Account A customer" });
    await waitFor(() => expect(requests()).toHaveLength(3));
    const oldRequests = [...requests("vehicles"), ...requests("work_orders")];
    respond("customer", primary(customer("customer-a", "Account B customer")), {
      account: "employee-b",
    });
    respond("vehicles", list("vehicles", [vehicle("account-b-vehicle")]), {
      account: "employee-b",
    });
    respond("work_orders", list("work_orders", [workOrder("account-b-work-order")]), {
      account: "employee-b",
    });
    state.activity.mockClear();
    state.userId = "employee-b";
    shown.rerender(shown.view());
    for (const request of oldRequests) expect(request.signal.aborted).toBe(true);
    await waitFor(() => expect(lastProps().vehicles).toEqual([vehicle("account-b-vehicle")]));
    await screen.findByText("WO-account-b-work-order");
    await act(async () => {
      oldVehicles.resolve(list("vehicles", [vehicle("late-account-a-vehicle")]));
      oldOrders.resolve(list("work_orders", [workOrder("late-account-a-work-order")]));
      await Promise.all([oldVehicles.promise, oldOrders.promise]);
    });
    expect(screen.queryByText("late-account-a-vehicle:customer-a")).not.toBeInTheDocument();
    expect(screen.queryByText("WO-late-account-a-work-order")).not.toBeInTheDocument();
    expect(shown.client.getQueryData(queryKey("employee-b", "customer-a", "vehicles"))).toEqual(
      list("vehicles", [vehicle("account-b-vehicle")]),
    );
    expect(shown.client.getQueryData(queryKey("employee-b", "customer-a", "work_orders"))).toEqual(
      list("work_orders", [workOrder("account-b-work-order")]),
    );
    for (const [props] of state.activity.mock.calls)
      expect(
        props.vehicles.every((row: CustomerDetailVehicle) => row.id !== "late-account-a-vehicle"),
      ).toBe(true);
  });

  it("passes independent vehicle loading without false empty state or blocking fresh work orders", async () => {
    const pending = deferred();
    respond("vehicles", pending.promise);
    const cache = client();
    seed(cache, "employee-a");
    show(cache);
    await screen.findByText("WO-work-order-a");
    await waitFor(() =>
      expect(lastProps()).toEqual({
        customerId: "customer-a",
        vehicles: [],
        vehiclesLoading: true,
        vehiclesError: false,
      }),
    );
    expect(screen.queryByText("No vehicles on file.")).not.toBeInTheDocument();
    expect(screen.queryByText("cached-private-vehicle private VIN")).not.toBeInTheDocument();
    expect(countLabel("Vehicles", "—")).toBeInTheDocument();
    pending.resolve(list("vehicles", [vehicle()]));
    await waitFor(() => expect(lastProps().vehiclesLoading).toBe(false));
    expect(lastProps().vehicles).toEqual([vehicle()]);
  });

  for (const kind of ["vehicles", "work_orders"] as const) {
    const title = kind === "vehicles" ? "Vehicles" : "Work order history";
    const retry = kind === "vehicles" ? "Retry vehicles" : "Retry work orders";
    const failure =
      kind === "vehicles" ? "Could not load vehicles." : "Could not load work order history.";
    const unavailable =
      kind === "vehicles"
        ? "Vehicles unavailable. Refresh customer to check access."
        : "Work order history unavailable. Refresh customer to check access.";
    const oldText = kind === "vehicles" ? "vehicle-a private VIN" : "WO-work-order-a";

    it(`${kind}: contains errors to its source and retries only the requested reader`, async () => {
      respond(kind, new Error(`secret ${kind} database diagnostic`));
      show();
      await screen.findByText(failure);
      expect(screen.queryByText(`secret ${kind} database diagnostic`)).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Account A customer" })).toBeInTheDocument();
      expect(countLabel(title, "—")).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Stub commercial history" })).toBeInTheDocument();
      if (kind === "vehicles") {
        await screen.findByText("WO-work-order-a");
        expect(lastProps()).toEqual({
          customerId: "customer-a",
          vehicles: [],
          vehiclesLoading: false,
          vehiclesError: true,
        });
      } else await waitFor(() => expect(lastProps().vehicles).toEqual([vehicle()]));
      respond(kind, kind === "vehicles" ? list(kind, [vehicle()]) : list(kind, [workOrder()]));
      fireEvent.click(screen.getByRole("button", { name: retry }));
      await screen.findByText(oldText);
      expect(requests("customer")).toHaveLength(1);
      expect(requests(kind)).toHaveLength(2);
      expect(requests(kind === "vehicles" ? "work_orders" : "vehicles")).toHaveLength(1);
    });

    it(`${kind}: masks cached rows, options and counts throughout refetch and its subsequent error`, async () => {
      const shown = show();
      await expectLoaded();
      const pending = deferred();
      respond(kind, pending.promise);
      await act(async () => {
        void shown.client.invalidateQueries({
          queryKey: queryKey("employee-a", "customer-a", kind),
          exact: true,
        });
      });
      await waitFor(() => expect(requests(kind)).toHaveLength(2));
      expect(screen.queryByText(oldText)).not.toBeInTheDocument();
      expect(countLabel(title, "—")).toBeInTheDocument();
      if (kind === "vehicles")
        expect(lastProps()).toEqual({
          customerId: "customer-a",
          vehicles: [],
          vehiclesLoading: true,
          vehiclesError: false,
        });
      else expect(lastProps().vehicles).toEqual([vehicle()]);
      await act(async () => {
        pending.reject(new Error(`secret refreshed ${kind}`));
        await pending.promise.catch(() => undefined);
      });
      await screen.findByText(failure);
      expect(screen.queryByText(`secret refreshed ${kind}`)).not.toBeInTheDocument();
      expect(screen.queryByText(oldText)).not.toBeInTheDocument();
      expect(countLabel(title, "—")).toBeInTheDocument();
      respond(kind, kind === "vehicles" ? list(kind, [vehicle()]) : list(kind, [workOrder()]));
      fireEvent.click(screen.getByRole("button", { name: retry }));
      await screen.findByText(oldText);
      expect(requests(kind)).toHaveLength(3);
      expect(requests("customer")).toHaveLength(1);
      expect(requests(kind === "vehicles" ? "work_orders" : "vehicles")).toHaveLength(1);
    });

    it(`${kind}: distinguishes unavailable from available empty while keeping the other source visible`, async () => {
      respond(kind, list(kind, [], { available: false }));
      show();
      await screen.findByText(unavailable);
      expect(countLabel(title, "—")).toBeInTheDocument();
      expect(
        screen.queryByText(kind === "vehicles" ? "No vehicles on file." : "No work orders yet."),
      ).not.toBeInTheDocument();
      if (kind === "vehicles") {
        await screen.findByText("WO-work-order-a");
        expect(lastProps().vehicles).toEqual([]);
        expect(lastProps().vehiclesError).toBe(true);
      } else await waitFor(() => expect(lastProps().vehicles).toEqual([vehicle()]));
    });
  }

  it("immediately masks loaded primary and all private children during refresh until fresh success", async () => {
    const shown = show();
    await expectLoaded();
    const pending = deferred();
    respond("customer", pending.promise);
    fireEvent.click(screen.getByRole("button", { name: "Refresh customer" }));
    expectNoPrivateChildren();
    expect(screen.queryByText("Account A customer")).not.toBeInTheDocument();
    expect(screen.queryByText("customer-a private notes")).not.toBeInTheDocument();
    expect(screen.queryByText("vehicle-a private VIN")).not.toBeInTheDocument();
    expect(screen.queryByText("WO-work-order-a")).not.toBeInTheDocument();
    await waitFor(() => expect(requests("customer")).toHaveLength(2));
    expect(requests("vehicles")).toHaveLength(1);
    expect(requests("work_orders")).toHaveLength(1);
    pending.resolve(primary(customer("customer-a", "Refreshed customer")));
    await screen.findByRole("heading", { name: "Refreshed customer" });
    await waitFor(() => expect(requests("vehicles")).toHaveLength(2));
    expect(requests("work_orders")).toHaveLength(2);
    expect(shown.client.getQueryData(queryKey("employee-a", "customer-a", "customer"))).toEqual(
      primary(customer("customer-a", "Refreshed customer")),
    );
  });

  it("cancels in-flight lists on primary refresh and masks their cached or late values on remount", async () => {
    const oldVehicles = deferred();
    const oldOrders = deferred();
    respond("vehicles", oldVehicles.promise);
    respond("work_orders", oldOrders.promise);
    const shown = show();
    await screen.findByRole("heading", { name: "Account A customer" });
    await waitFor(() => expect(requests()).toHaveLength(3));
    const oldRequests = [...requests("vehicles"), ...requests("work_orders")];
    const freshCustomer = deferred();
    respond("customer", freshCustomer.promise);
    fireEvent.click(screen.getByRole("button", { name: "Refresh customer" }));
    expectNoPrivateChildren();
    for (const request of oldRequests) expect(request.signal.aborted).toBe(true);
    await act(async () => {
      oldVehicles.resolve(list("vehicles", [vehicle("late-refresh-vehicle")]));
      oldOrders.resolve(list("work_orders", [workOrder("late-refresh-work-order")]));
      await Promise.all([oldVehicles.promise, oldOrders.promise]);
    });
    respond("vehicles", list("vehicles", [vehicle("fresh-refresh-vehicle")]));
    respond("work_orders", list("work_orders", [workOrder("fresh-refresh-work-order")]));
    freshCustomer.resolve(primary());
    await screen.findByText("WO-fresh-refresh-work-order");
    await waitFor(() => expect(lastProps().vehicles).toEqual([vehicle("fresh-refresh-vehicle")]));
    expect(screen.queryByText("WO-late-refresh-work-order")).not.toBeInTheDocument();
    expect(screen.queryByText("late-refresh-vehicle:customer-a")).not.toBeInTheDocument();
    expect(requests("vehicles")).toHaveLength(2);
    expect(requests("work_orders")).toHaveLength(2);
    expect(shown.client.getQueryData(queryKey("employee-a", "customer-a", "vehicles"))).toEqual(
      list("vehicles", [vehicle("fresh-refresh-vehicle")]),
    );
  });

  it("hides all private children after a primary background-refetch error despite cached data", async () => {
    const shown = show();
    await expectLoaded();
    respond("customer", new Error("secret refreshed primary diagnostic"));
    await act(async () => {
      void shown.client.invalidateQueries({
        queryKey: queryKey("employee-a", "customer-a", "customer"),
        exact: true,
      });
    });
    await screen.findByText("Could not load this customer.");
    expectNoPrivateChildren();
    expect(screen.queryByText("Account A customer")).not.toBeInTheDocument();
    expect(screen.queryByText("customer-a private notes")).not.toBeInTheDocument();
    expect(screen.queryByText("secret refreshed primary diagnostic")).not.toBeInTheDocument();
    expect(requests("vehicles")).toHaveLength(1);
    expect(requests("work_orders")).toHaveLength(1);
  });

  it("shows genuine zero counts only for fresh available empty snapshots", async () => {
    respond("vehicles", list("vehicles"));
    respond("work_orders", list("work_orders"));
    show();
    await screen.findByText("No work orders yet.");
    expect(countLabel("Vehicles", 0)).toBeInTheDocument();
    expect(countLabel("Work order history", 0)).toBeInTheDocument();
    expect(screen.getByText("No vehicles on file.")).toBeInTheDocument();
    expect(lastProps()).toEqual({
      customerId: "customer-a",
      vehicles: [],
      vehiclesLoading: false,
      vehiclesError: false,
    });
  });

  it("labels capped snapshots as 100+ and passes only the 100 returned vehicle rows to activity", async () => {
    const vehicles = Array.from({ length: 100 }, (_, i) => vehicle(`bounded-vehicle-${i}`));
    const orders = Array.from({ length: 100 }, (_, i) => workOrder(`bounded-order-${i}`));
    respond("vehicles", list("vehicles", vehicles, { hasMore: true }));
    respond("work_orders", list("work_orders", orders, { hasMore: true }));
    const shown = show();
    await screen.findByText("Showing the 100 most recent visible vehicles.");
    await screen.findByText("Showing the 100 most recent visible work orders.");
    expect(countLabel("Vehicles", "100+")).toBeInTheDocument();
    expect(countLabel("Work order history", "100+")).toBeInTheDocument();
    expect(screen.getAllByTestId("activity-vehicle")).toHaveLength(100);
    expect(lastProps().vehicles).toEqual(vehicles);
    expect(screen.getAllByRole("row")).toHaveLength(202); // Two headers, 200 bounded rows.
    expect(state.read).toHaveBeenCalledTimes(3);
    for (const kind of ["vehicles", "work_orders"] as const) {
      const pending = deferred();
      respond(kind, pending.promise);
      await act(async () => {
        void shown.client.invalidateQueries({
          queryKey: queryKey("employee-a", "customer-a", kind),
          exact: true,
        });
      });
      await waitFor(() => expect(requests(kind)).toHaveLength(2));
      const title = kind === "vehicles" ? "Vehicles" : "Work order history";
      const label = `Showing the 100 most recent visible ${kind === "vehicles" ? "vehicles" : "work orders"}.`;
      expect(countLabel(title, "—")).toBeInTheDocument();
      expect(screen.queryByText(label)).not.toBeInTheDocument();
      if (kind === "vehicles") expect(lastProps().vehicles).toEqual([]);
      pending.resolve(list(kind, [], { available: false }));
      await screen.findByText(`${title} unavailable. Refresh customer to check access.`);
      expect(countLabel(title, "—")).toBeInTheDocument();
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });
});
