import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ActivityKind, ActivityResult } from "@/lib/customer-vehicle-activity";
import { CustomerVehicleActivity } from "./customer-vehicle-activity";

type Request = {
  data: {
    expectedAccountId: string;
    customerId: string;
    shopVehicleId: string;
    kind: ActivityKind;
  };
  signal: AbortSignal;
};
const state = vi.hoisted(() => ({
  userId: "employee-a" as string | null,
  responses: {} as Record<string, unknown>,
  read: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null }),
}));
vi.mock("@/lib/customer-vehicle-activity.functions", () => ({
  getCustomerVehicleActivity: (options: Request) => state.read(options),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: React.PropsWithChildren<{ to: string; params: { id: string }; className?: string }>) => (
    <a {...props} href={to.replace("$id", params.id)}>
      {children}
    </a>
  ),
}));

const vehicleA = {
  id: "vehicle-a",
  customer_id: "customer-a",
  make: "Toyota",
  model: "Vios",
  year: 2020,
  license_plate: "ABC 123",
};
const vehicleB = {
  id: "vehicle-b",
  customer_id: "customer-a",
  make: "Honda",
  model: "City",
  year: 2021,
  license_plate: null,
};
const foreignVehicle = {
  id: "vehicle-other",
  customer_id: "customer-other",
  make: "Other",
  model: "Customer",
  year: 2022,
  license_plate: null,
};
type Props = React.ComponentProps<typeof CustomerVehicleActivity>;
const defaultProps: Props = {
  customerId: "customer-a",
  vehicles: [vehicleA, vehicleB, foreignVehicle],
  vehiclesLoading: false,
  vehiclesError: false,
};
const clients = new Set<QueryClient>();
const key = (account: string, customer: string, vehicle: string, kind: ActivityKind) =>
  `${account}|${customer}|${vehicle}|${kind}`;
const receipt = (id = "receipt-a", vendor: string | null = "Synthetic vendor") => ({
  id,
  vendor,
  purchased_on: "2026-10-15",
  currency: "PHP",
  total: 100,
});
const installation = (id = "installation-a") => ({
  id,
  name_snapshot: `Brake pad ${id}`,
  part_number_snapshot: "PAD-001",
  installed_quantity: 2,
  installed_at: "2026-10-15T08:00:00Z",
  installed_odometer_km: 0,
  work_order_id: "wo-linked",
});
const workOrder = (id = "wo-a") => ({
  id,
  work_order_number: `WO-${id}`,
  status: "in_progress",
  created_at: "2026-10-15T08:00:00Z",
});
function respond(
  kind: ActivityKind,
  rows: unknown[],
  { account = "employee-a", customer = "customer-a", vehicle = "vehicle-a", available = true } = {},
) {
  state.responses[key(account, customer, vehicle, kind)] = { kind, available, rows };
}
function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
function show(initial: Partial<Props> = {}) {
  let props = { ...defaultProps, ...initial };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
  clients.add(client);
  const view = () => (
    <QueryClientProvider client={client}>
      <CustomerVehicleActivity {...props} />
    </QueryClientProvider>
  );
  const result = render(view());
  return {
    ...result,
    client,
    view,
    update: (next: Partial<Props> = {}) => {
      props = { ...props, ...next };
      result.rerender(view());
    },
  };
}
function select(vehicle = "vehicle-a") {
  fireEvent.change(screen.getByRole("combobox", { name: "Customer vehicle" }), {
    target: { value: vehicle },
  });
}
function requests(kind?: ActivityKind) {
  return state.read.mock.calls
    .map(([request]) => request as Request)
    .filter((request) => !kind || request.data.kind === kind);
}
beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "employee-a";
  state.responses = {};
  state.read.mockImplementation(async ({ data }: Request) => {
    const stored =
      state.responses[key(data.expectedAccountId, data.customerId, data.shopVehicleId, data.kind)];
    if (stored instanceof Error) throw stored;
    return stored ?? { kind: data.kind, available: true, rows: [] };
  });
});
afterEach(() => {
  for (const client of clients) client.clear();
  clients.clear();
  vi.unstubAllEnvs();
});

describe("Customer vehicle activity read-only snapshots", () => {
  it("mounts no private UI or query while signed out, and requires an explicit choice after sign-in", async () => {
    state.userId = null;
    const shown = show();
    expect(shown.container).toBeEmptyDOMElement();
    expect(state.read).not.toHaveBeenCalled();
    state.userId = "employee-a";
    shown.update();
    expect(screen.getByRole("heading", { name: "Vehicle activity" })).toBeInTheDocument();
    expect(state.read).not.toHaveBeenCalled();
    select();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(3));
    state.userId = null;
    shown.update();
    expect(shown.container).toBeEmptyDOMElement();
  });

  it("offers only uniquely matching customer vehicles and sends independent account/customer/vehicle/source scopes and signals", async () => {
    const shown = show();
    expect(screen.queryByRole("option", { name: /Other Customer/ })).not.toBeInTheDocument();
    expect(state.read).not.toHaveBeenCalled();
    select();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(3));
    expect(
      requests()
        .map((r) => r.data.kind)
        .sort(),
    ).toEqual(["installations", "receipts", "work_orders"]);
    for (const request of requests()) {
      expect(request.data).toEqual({
        expectedAccountId: "employee-a",
        customerId: "customer-a",
        shopVehicleId: "vehicle-a",
        kind: request.data.kind,
      });
      expect(request.signal).toBeInstanceOf(AbortSignal);
    }
    for (const query of shown.client.getQueryCache().getAll()) {
      expect(query.queryKey).toEqual([
        "shop-manager",
        "employee-a",
        "customer",
        "customer-a",
        "vehicle",
        "vehicle-a",
        "activity",
        expect.any(String),
      ]);
      expect(query.options).toMatchObject({
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: "always",
        retry: false,
      });
    }
  });

  it("mounts no private source observers while signed out even when scoped private results are already cached", () => {
    state.userId = null;
    const shown = show();
    shown.client.setQueryData(
      [
        "shop-manager",
        "employee-a",
        "customer",
        "customer-a",
        "vehicle",
        "vehicle-a",
        "activity",
        "receipts",
      ],
      {
        kind: "receipts",
        available: true,
        rows: [receipt("cached", "Signed-out cached private vendor")],
      },
    );
    shown.update();
    expect(shown.client.getQueryCache().getAll()).toHaveLength(1);
    expect(shown.client.getQueryCache().getAll()[0].getObserversCount()).toBe(0);
    expect(shown.container).toBeEmptyDOMElement();
    expect(screen.queryByText("Signed-out cached private vendor")).not.toBeInTheDocument();
    expect(state.read).not.toHaveBeenCalled();
  });

  it("suppresses reads while vehicle choices load, fail or contain no exact customer match", async () => {
    const shown = show({ vehiclesLoading: true });
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(state.read).not.toHaveBeenCalled();
    shown.update({ vehiclesLoading: false, vehiclesError: true });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load customer vehicles.");
    expect(state.read).not.toHaveBeenCalled();
    shown.update({ vehiclesError: false, vehicles: [foreignVehicle] });
    expect(
      screen.getByText("No customer vehicles are available for selection."),
    ).toBeInTheDocument();
    expect(state.read).not.toHaveBeenCalled();
  });

  it("does not treat an ambiguous duplicate ID as a selectable vehicle", () => {
    show({ vehicles: [vehicleA, { ...vehicleA, model: "Conflicting copy" }] });
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.queryByRole("option", { name: /Toyota/ })).not.toBeInTheDocument();
    expect(state.read).not.toHaveBeenCalled();
  });

  it("preserves receipt currencies and unknown values without shifting calendar dates or inventing totals", async () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    respond("receipts", [
      receipt("php", "PHP vendor"),
      { ...receipt("usd", "USD vendor"), currency: "USD", total: 20.5 },
      { ...receipt("jpy", "JPY vendor"), currency: "JPY", total: 20.5 },
      { ...receipt("kwd", "KWD vendor"), currency: "KWD", total: 1.234 },
      { ...receipt("fine", "Fine source amount"), currency: "TND", total: 1.2345e-18 },
      { ...receipt("tiny", "Tiny source amount"), currency: "USD", total: 1e-25 },
      { ...receipt("unknown", null), purchased_on: null, total: null },
    ]);
    show();
    select();
    expect(await screen.findByText(/PHP\s*100\.00/)).toBeInTheDocument();
    expect(screen.getByText(/USD\s*20\.50/)).toBeInTheDocument();
    expect(screen.getByText(/JPY\s*20\.50/)).toBeInTheDocument();
    expect(screen.getByText(/KWD\s*1\.234/)).toBeInTheDocument();
    expect(screen.getByText("TND 1.2345e-18")).toBeInTheDocument();
    expect(screen.getByText("USD 1e-25")).toBeInTheDocument();
    expect(screen.queryByText(/JPY\s*21(?:\.00)?$/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Oct 15, 2026")).toHaveLength(6);
    expect(screen.getByText("Vendor not provided")).toBeInTheDocument();
    expect(screen.getByText("Amount not provided")).toBeInTheDocument();
    expect(screen.getByText("Purchase date not provided")).toBeInTheDocument();
    expect(screen.queryByText(/lifetime|all-time total/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^(scan|upload|share|install|save|delete)\b/i }),
    ).not.toBeInTheDocument();
  });

  it("labels installations and work-order current snapshots without a historical-status or verified-repair claim", async () => {
    respond("installations", [installation()]);
    respond("work_orders", [workOrder()]);
    show();
    select();
    expect(await screen.findByText("Brake pad installation-a")).toBeInTheDocument();
    expect(screen.getByText("Shop-recorded")).toBeInTheDocument();
    expect(screen.getByText("Part PAD-001")).toBeInTheDocument();
    expect(screen.getByText("0 km")).toBeInTheDocument();
    expect(screen.getByText(/Quantity 2/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open installation work order" })).toHaveAttribute(
      "href",
      "/workspace/work-orders/wo-linked",
    );
    expect(screen.getByRole("link", { name: "WO-wo-a" })).toHaveAttribute(
      "href",
      "/workspace/work-orders/wo-a",
    );
    expect(screen.getByText("Current status")).toBeInTheDocument();
    expect(screen.getByText("in_progress")).toBeInTheDocument();
    expect(screen.getByText(/Opened/)).toBeInTheDocument();
    expect(
      screen.getByText(/Link or sharing changes may not appear until the next refresh/),
    ).toBeInTheDocument();
  });

  it("caps every source at 25 and labels the 26th sentinel without rendering it", async () => {
    respond(
      "receipts",
      Array.from({ length: 26 }, (_, i) => receipt(`r-${i}`, `Vendor ${i}`)),
    );
    respond(
      "installations",
      Array.from({ length: 26 }, (_, i) => installation(`i-${i}`)),
    );
    respond(
      "work_orders",
      Array.from({ length: 26 }, (_, i) => workOrder(`wo-${i}`)),
    );
    show();
    select();
    for (const title of [
      "Receipt purchases",
      "Shop-recorded installations",
      "Work-order snapshots",
    ]) {
      const list = await screen.findByRole("list", { name: `${title} records` });
      expect(within(list).getAllByRole("listitem")).toHaveLength(25);
    }
    expect(screen.queryByText("Vendor 25")).not.toBeInTheDocument();
    expect(screen.queryByText("Brake pad i-25")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "WO-wo-25" })).not.toBeInTheDocument();
    expect(screen.getAllByText(/^Showing the 25 most recent/)).toHaveLength(3);
  });

  it("keeps sources independent and retries only the failed source with generic error copy", async () => {
    state.responses[key("employee-a", "customer-a", "vehicle-a", "receipts")] = new Error(
      "SECRET private database error",
    );
    respond("installations", [installation()]);
    respond("work_orders", [workOrder()]);
    show();
    select();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load receipt purchases.");
    expect(await screen.findByText("Brake pad installation-a")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WO-wo-a" })).toBeInTheDocument();
    expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument();
    expect(
      screen.queryByText("No visible confirmed receipt purchases in this snapshot."),
    ).not.toBeInTheDocument();
    respond("receipts", [receipt("recovered", "Recovered vendor")]);
    fireEvent.click(screen.getByRole("button", { name: "Retry receipt purchases" }));
    expect(await screen.findByText("Recovered vendor")).toBeInTheDocument();
    expect(requests("receipts")).toHaveLength(2);
    expect(requests("installations")).toHaveLength(1);
    expect(requests("work_orders")).toHaveLength(1);
  });

  it("distinguishes unavailable context from a valid empty history and hides unavailable payload rows", async () => {
    respond("receipts", [receipt("forbidden", "Must stay hidden")], { available: false });
    show();
    select();
    expect(
      await screen.findByText("Activity is unavailable for this vehicle in the current session."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Must stay hidden")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No visible confirmed receipt purchases in this snapshot."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("No visible matching shop-recorded installations in this snapshot."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No visible matching work-order snapshots in this snapshot."),
    ).toBeInTheDocument();
  });

  it("hides stale rows during refresh and replaces them with unavailable status on renewed consent check", async () => {
    respond("receipts", [receipt("before", "Before refresh")]);
    show();
    select();
    await screen.findByText("Before refresh");
    const pending = deferred();
    state.responses[key("employee-a", "customer-a", "vehicle-a", "receipts")] = pending.promise;
    fireEvent.click(screen.getByRole("button", { name: "Refresh receipt purchases" }));
    expect(screen.queryByText("Before refresh")).not.toBeInTheDocument();
    expect(screen.getByText("Checking receipt purchases…")).toBeInTheDocument();
    await act(async () => pending.resolve({ kind: "receipts", available: false, rows: [] }));
    expect(
      await screen.findByText("Activity is unavailable for this vehicle in the current session."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Before refresh")).not.toBeInTheDocument();
  });

  it("masks a prefilled matching cache throughout mount revalidation and a generic refresh error", async () => {
    const pending = deferred();
    state.responses[key("employee-a", "customer-a", "vehicle-a", "receipts")] = pending.promise;
    const shown = show();
    shown.client.setQueryData(
      [
        "shop-manager",
        "employee-a",
        "customer",
        "customer-a",
        "vehicle",
        "vehicle-a",
        "activity",
        "receipts",
      ],
      {
        kind: "receipts",
        available: true,
        rows: [receipt("cached", "Stale cached private vendor")],
      },
    );
    select();
    expect(screen.queryByText("Stale cached private vendor")).not.toBeInTheDocument();
    expect(screen.getByText("Checking receipt purchases…")).toBeInTheDocument();
    // The mock response is rejected by its thenable, not by any live transport.
    const failure = new Error("PRIVATE cached-consent error");
    await act(async () => pending.resolve(Promise.reject(failure)));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load receipt purchases.");
    expect(screen.queryByText("Stale cached private vendor")).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE cached/)).not.toBeInTheDocument();
  });

  it("does not let a pending old-account result replace the new account's selected vehicle snapshot", async () => {
    const pending = deferred();
    state.responses[key("employee-a", "customer-a", "vehicle-a", "receipts")] = pending.promise;
    const shown = show();
    select();
    await waitFor(() => expect(requests("receipts")).toHaveLength(1));
    const signal = requests("receipts")[0].signal;
    state.userId = "employee-b";
    shown.update();
    expect(signal.aborted).toBe(true);
    expect(screen.getByRole("combobox")).toHaveValue("");
    respond("receipts", [receipt("new", "Current account result")], { account: "employee-b" });
    select();
    await screen.findByText("Current account result");
    await act(async () =>
      pending.resolve({
        kind: "receipts",
        available: true,
        rows: [receipt("old", "Late old-account result")],
      }),
    );
    expect(screen.queryByText("Late old-account result")).not.toBeInTheDocument();
    expect(screen.getByText("Current account result")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("vehicle-a");
  });

  it("ignores a late old-customer rejection after a different customer's vehicle has been selected", async () => {
    const pending = deferred();
    state.responses[key("employee-a", "customer-a", "vehicle-a", "receipts")] = pending.promise;
    const shown = show();
    select();
    await waitFor(() => expect(requests("receipts")).toHaveLength(1));
    const signal = requests("receipts")[0].signal;
    shown.update({
      customerId: "customer-b",
      vehicles: [{ ...vehicleB, customer_id: "customer-b" }],
    });
    expect(signal.aborted).toBe(true);
    expect(screen.getByRole("combobox")).toHaveValue("");
    respond("receipts", [receipt("current", "Current customer's result")], {
      customer: "customer-b",
      vehicle: "vehicle-b",
    });
    select("vehicle-b");
    await screen.findByText("Current customer's result");
    await act(async () =>
      pending.resolve(Promise.reject(new Error("PRIVATE old-customer rejection"))),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE old-customer/)).not.toBeInTheDocument();
    expect(screen.getByText("Current customer's result")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("vehicle-b");
  });

  it("preserves installation quantity/unknown odometer and work-order number fallbacks without extra fields", async () => {
    respond("installations", [
      {
        ...installation(),
        installed_quantity: 1.25,
        installed_odometer_km: null,
        part_number_snapshot: null,
        work_order_id: null,
      },
    ]);
    respond("work_orders", [{ ...workOrder(), work_order_number: null }]);
    show();
    select();
    expect(await screen.findByText("Odometer not provided")).toBeInTheDocument();
    expect(screen.getByText(/Quantity 1\.25/)).toBeInTheDocument();
    expect(screen.queryByText("Part PAD-001")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open installation work order" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Work order wo-a" })).toHaveAttribute(
      "href",
      "/workspace/work-orders/wo-a",
    );
  });

  it("remounts account/customer selection, removes old caches and never reuses earlier private rows", async () => {
    respond("receipts", [receipt("old", "Old account vendor")]);
    const shown = show();
    select();
    await screen.findByText("Old account vendor");
    state.userId = "employee-b";
    shown.update();
    expect(screen.queryByText("Old account vendor")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(state.read).toHaveBeenCalledTimes(3);
    await waitFor(() =>
      expect(
        shown.client
          .getQueryCache()
          .getAll()
          .some((q) => q.queryKey.includes("employee-a")),
      ).toBe(false),
    );
    respond("receipts", [receipt("new", "New account vendor")], { account: "employee-b" });
    select();
    await screen.findByText("New account vendor");
    shown.update({
      customerId: "customer-b",
      vehicles: [{ ...vehicleB, customer_id: "customer-b" }],
    });
    expect(screen.queryByText("New account vendor")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(state.read).toHaveBeenCalledTimes(6);
    select("vehicle-b");
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(9));
    expect(
      requests()
        .slice(-3)
        .every(
          (r) =>
            r.data.expectedAccountId === "employee-b" &&
            r.data.customerId === "customer-b" &&
            r.data.shopVehicleId === "vehicle-b",
        ),
    ).toBe(true);
  });

  it("aborts old source signals and ignores late results after account or vehicle switches", async () => {
    const pending = deferred();
    state.responses[key("employee-a", "customer-a", "vehicle-a", "receipts")] = pending.promise;
    const shown = show();
    select();
    await waitFor(() => expect(requests("receipts")).toHaveLength(1));
    const oldSignal = requests("receipts")[0].signal;
    respond("receipts", [receipt("other-vehicle", "Other vehicle vendor")], {
      vehicle: "vehicle-b",
    });
    select("vehicle-b");
    expect(await screen.findByText("Other vehicle vendor")).toBeInTheDocument();
    expect(oldSignal.aborted).toBe(true);
    await act(async () =>
      pending.resolve({
        kind: "receipts",
        available: true,
        rows: [receipt("late", "Late private vendor")],
      } satisfies ActivityResult),
    );
    expect(screen.queryByText("Late private vendor")).not.toBeInTheDocument();
    state.userId = "employee-b";
    shown.update();
    expect(screen.queryByText("Other vehicle vendor")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("invalidates a selected vehicle immediately when the list no longer belongs to this customer", async () => {
    const pending = deferred();
    state.responses[key("employee-a", "customer-a", "vehicle-a", "receipts")] = pending.promise;
    const shown = show();
    select();
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(3));
    const signal = requests("receipts")[0].signal;
    shown.update({ vehicles: [{ ...vehicleA, customer_id: "customer-other" }] });
    expect(screen.queryByRole("heading", { name: "Receipt purchases" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(signal.aborted).toBe(true);
    await act(async () =>
      pending.resolve({
        kind: "receipts",
        available: true,
        rows: [receipt("late", "Wrong customer late result")],
      }),
    );
    expect(screen.queryByText("Wrong customer late result")).not.toBeInTheDocument();
    shown.update({ vehicles: [vehicleA] });
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(state.read).toHaveBeenCalledTimes(3);
  });
});
