import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "@/routes/_authenticated/workspace.vehicles.$id";

type Result = { data: unknown; error: { message: string } | null };
const state = vi.hoisted(() => ({
  userId: "employee-a" as string | null,
  vehicleId: "vehicle-a",
  vehicle: null as unknown,
  rows: {} as Record<string, unknown[]>,
  errors: {} as Record<string, { message: string }>,
  pending: {} as Record<string, Promise<Result> | undefined>,
  from: vi.fn(),
  scopes: vi.fn(),
  limits: vi.fn(),
  receipts: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null }),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
vi.mock("@/components/vehicle-receipt-panel", () => ({
  VehicleReceiptPanel: ({ shopVehicleId }: { shopVehicleId: string }) => {
    state.receipts(shopVehicleId);
    return <section aria-label="Vehicle receipt workflow" />;
  },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({
    options,
    useParams: () => ({ id: state.vehicleId }),
  }),
  useRouter: () => ({ invalidate: vi.fn() }),
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
vi.mock("@/lib/shop-manager/db", () => {
  const from = (table: string) => {
    state.from(table);
    const builder = {
      select: () => builder,
      eq: (column: string, value: string) => {
        state.scopes(table, column, value);
        return builder;
      },
      order: () => builder,
      maybeSingle: async () =>
        state.pending[table] ?? { data: state.vehicle, error: state.errors[table] ?? null },
      limit: async (count: number) => {
        state.limits(table, count);
        return (
          state.pending[table] ?? {
            data: state.rows[table] ?? [],
            error: state.errors[table] ?? null,
          }
        );
      },
    };
    return builder;
  };
  return { smSupabase: { from }, supabase: { from } };
});

const VehicleDetail = Route.options.component as React.ComponentType;
const vehicle = (make = "Toyota", vin = "PRIVATE-VIN-A") => ({
  id: "vehicle-a",
  customer_id: "customer-a",
  make,
  model: "Vios",
  year: 2020,
  vin,
  notes: `${make} private notes`,
  customers: { first_name: "Customer", last_name: "A" },
});
const workOrder = (id = "wo-a", number = "WO-A") => ({
  id,
  work_order_number: number,
  total_cost: 1250,
  description: "Service work",
  status: "completed",
  created_at: "2026-10-15",
});
const part = (name = "Private installed part") => ({
  id: name,
  name_snapshot: name,
  installed_at: "2026-10-15",
  installed_quantity: 1,
});
function deferred() {
  let resolve!: (value: Result) => void;
  const promise = new Promise<Result>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
function show(
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
) {
  const view = () => (
    <QueryClientProvider client={client}>
      <VehicleDetail />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "employee-a";
  state.vehicleId = "vehicle-a";
  state.vehicle = vehicle();
  state.rows = { work_orders: [workOrder()], installed_components: [part()] };
  state.errors = {};
  state.pending = {};
});

describe("Shop Manager vehicle detail", () => {
  it("loads vehicle-scoped histories, preserves receipts and uses PHP for operational amounts", async () => {
    show();
    await screen.findByRole("heading", { name: "2020 Toyota Vios" });
    await screen.findByRole("link", { name: "WO-A" });
    await screen.findByText("Private installed part");
    expect(screen.getByText(/₱1,250\.00/)).toBeInTheDocument();
    expect(screen.queryByText(/\$1,250\.00/)).not.toBeInTheDocument();
    expect(state.scopes).toHaveBeenCalledWith("vehicles", "id", "vehicle-a");
    expect(state.scopes).toHaveBeenCalledWith("work_orders", "vehicle_id", "vehicle-a");
    expect(state.scopes).toHaveBeenCalledWith(
      "installed_components",
      "shop_manager_vehicle_id",
      "vehicle-a",
    );
    expect(state.receipts).toHaveBeenCalledWith("vehicle-a");
  });

  it("does not reuse cached vehicle, service or installed-part data after switching accounts", async () => {
    const { rerender, view, client } = show();
    await screen.findByText("PRIVATE-VIN-A");
    await screen.findByRole("link", { name: "WO-A" });
    await screen.findByText("Private installed part");
    state.userId = "employee-b";
    state.vehicle = vehicle("Honda", "PRIVATE-VIN-B");
    state.rows.work_orders = [workOrder("wo-b", "WO-B")];
    state.rows.installed_components = [part("Account B installed part")];
    rerender(view());
    expect(screen.queryByText("PRIVATE-VIN-A")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "WO-A" })).not.toBeInTheDocument();
    expect(screen.queryByText("Private installed part")).not.toBeInTheDocument();
    await screen.findByText("PRIVATE-VIN-B");
    await screen.findByRole("link", { name: "WO-B" });
    await screen.findByText("Account B installed part");
    for (const user of ["employee-a", "employee-b"]) {
      expect(client.getQueryData(["shop-manager", user, "vehicle", "vehicle-a"])).toBeDefined();
      expect(
        client.getQueryData(["shop-manager", user, "vehicle", "vehicle-a", "work-orders"]),
      ).toBeDefined();
      expect(
        client.getQueryData(["shop-manager", user, "vehicle", "vehicle-a", "installed-components"]),
      ).toBeDefined();
    }
  });

  it("hides already-loaded private data and stops fetching on sign-out", async () => {
    const { rerender, view, container } = show();
    await screen.findByText("PRIVATE-VIN-A");
    await screen.findByRole("link", { name: "WO-A" });
    await screen.findByText("Private installed part");
    const calls = state.from.mock.calls.length;
    state.userId = null;
    rerender(view());
    expect(container).toBeEmptyDOMElement();
    expect(state.from).toHaveBeenCalledTimes(calls);
    expect(
      screen.queryByRole("region", { name: "Vehicle receipt workflow" }),
    ).not.toBeInTheDocument();
  });

  it("does not render or fetch even if signed-out query keys were prefilled with private cache entries", () => {
    state.userId = null;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["shop-manager", undefined, "vehicle", "vehicle-a"], vehicle());
    client.setQueryData(
      ["shop-manager", undefined, "vehicle", "vehicle-a", "work-orders"],
      [workOrder()],
    );
    client.setQueryData(
      ["shop-manager", undefined, "vehicle", "vehicle-a", "installed-components"],
      [part()],
    );
    const { container } = show(client);
    expect(container).toBeEmptyDOMElement();
    expect(state.from).not.toHaveBeenCalled();
    expect(state.receipts).not.toHaveBeenCalled();
  });

  it("waits for an accessible vehicle before fetching either dependent history", async () => {
    const fetched = deferred();
    state.pending.vehicles = fetched.promise;
    show();
    expect(await screen.findByRole("status")).toHaveTextContent("Loading vehicle");
    expect(state.from).toHaveBeenCalledWith("vehicles");
    expect(state.from).not.toHaveBeenCalledWith("work_orders");
    expect(state.from).not.toHaveBeenCalledWith("installed_components");
    fetched.resolve({ data: vehicle(), error: null });
    await screen.findByRole("link", { name: "WO-A" });
    await screen.findByText("Private installed part");
  });

  it("does not fetch dependent histories for a missing or inaccessible vehicle", async () => {
    state.vehicle = null;
    show();
    await screen.findByText("Vehicle not found.");
    expect(state.from).not.toHaveBeenCalledWith("work_orders");
    expect(state.from).not.toHaveBeenCalledWith("installed_components");
    expect(state.receipts).not.toHaveBeenCalled();
  });

  it("shows a generic vehicle error distinct from not-found and retries without exposing database details", async () => {
    state.errors.vehicles = { message: "secret vehicle database diagnostic" };
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load this vehicle.");
    expect(screen.queryByText("Vehicle not found.")).not.toBeInTheDocument();
    expect(screen.queryByText("secret vehicle database diagnostic")).not.toBeInTheDocument();
    expect(state.from).not.toHaveBeenCalledWith("work_orders");
    delete state.errors.vehicles;
    fireEvent.click(screen.getByRole("button", { name: "Retry vehicle" }));
    await screen.findByText("PRIVATE-VIN-A");
    await screen.findByRole("link", { name: "WO-A" });
  });

  it("keeps installed components visible when service history fails and retries that history independently", async () => {
    state.errors.work_orders = { message: "secret service database diagnostic" };
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load service history.");
    await screen.findByText("Private installed part");
    expect(screen.queryByText("No work orders yet for this vehicle.")).not.toBeInTheDocument();
    expect(screen.queryByText("secret service database diagnostic")).not.toBeInTheDocument();
    delete state.errors.work_orders;
    fireEvent.click(screen.getByRole("button", { name: "Retry service history" }));
    await screen.findByRole("link", { name: "WO-A" });
    expect(
      state.from.mock.calls.filter(([table]) => table === "installed_components"),
    ).toHaveLength(1);
  });

  it("shows a generic installed-component error without diagnosing an unverified linkage problem", async () => {
    state.errors.installed_components = { message: "secret component database diagnostic" };
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load installed components.",
    );
    await screen.findByRole("link", { name: "WO-A" });
    expect(
      screen.queryByText(/available after this Shop Manager workspace is linked/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("No network parts have been recorded as installed on this vehicle."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("secret component database diagnostic")).not.toBeInTheDocument();
    delete state.errors.installed_components;
    fireEvent.click(screen.getByRole("button", { name: "Retry installed components" }));
    await screen.findByText("Private installed part");
    expect(state.from.mock.calls.filter(([table]) => table === "work_orders")).toHaveLength(1);
  });

  it("distinguishes independent loading states from genuinely empty histories", async () => {
    const services = deferred(),
      installed = deferred();
    state.pending.work_orders = services.promise;
    state.pending.installed_components = installed.promise;
    show();
    await screen.findByRole("heading", { name: "2020 Toyota Vios" });
    expect(screen.getByText("Loading history…")).toHaveAttribute("role", "status");
    expect(screen.getByText("Loading installed parts…")).toHaveAttribute("role", "status");
    expect(screen.queryByText("No work orders yet for this vehicle.")).not.toBeInTheDocument();
    services.resolve({ data: [], error: null });
    installed.resolve({ data: [], error: null });
    await screen.findByText("No work orders yet for this vehicle.");
    await screen.findByText("No network parts have been recorded as installed on this vehicle.");
  });

  it("labels bounded histories and never presents the omitted 101st record as visible", async () => {
    state.rows.work_orders = Array.from({ length: 101 }, (_, index) =>
      workOrder(`wo-${index}`, `WO-${index}`),
    );
    state.rows.installed_components = Array.from({ length: 101 }, (_, index) =>
      part(`Installed part ${index}`),
    );
    show();
    await screen.findByText("Showing the 100 most recent work orders.");
    await screen.findByText("Showing the 100 most recent installed components.");
    expect(state.limits).toHaveBeenCalledWith("work_orders", 101);
    expect(state.limits).toHaveBeenCalledWith("installed_components", 101);
    expect(screen.getByRole("link", { name: "WO-99" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "WO-100" })).not.toBeInTheDocument();
    expect(screen.getByText("Installed part 99")).toBeInTheDocument();
    expect(screen.queryByText("Installed part 100")).not.toBeInTheDocument();
  });
});
