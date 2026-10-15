import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "@/routes/_authenticated/workspace.work-orders.$id";

type DbResult = { data: unknown; error: { message: string } | null };
const state = vi.hoisted(() => ({
  userId: "employee-a" as string | null,
  id: "wo-1",
  responses: {} as Record<string, DbResult | Promise<DbResult>>,
  read: vi.fn(),
  select: vi.fn(),
  write: vi.fn(),
  navigate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null }),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock("@/components/shop-manager/work-order-time-entries", () => ({
  WorkOrderTimeEntries: () => <div>Time-entry child (tested separately)</div>,
}));
vi.mock("@/components/shop-manager/work-order-inspections-card", () => ({
  WorkOrderInspectionsCard: () => <div>Inspection child (tested separately)</div>,
}));
vi.mock("sonner", () => ({ toast: { success: state.success, error: state.error } }));
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
    from: (table: string) => {
      const userId = state.userId;
      const filters: Record<string, string> = {};
      let operation = "read";
      let payload: unknown;
      const result = () => {
        if (operation !== "read")
          return state.write({ userId, table, operation, payload, filters: { ...filters } });
        const target = filters.work_order_id ?? filters.id;
        state.read(userId, table, target);
        return (
          state.responses[`${userId}:${table}:${target}`] ?? {
            data: table === "work_orders" ? null : [],
            error: null,
          }
        );
      };
      const builder = {
        select: (columns: string) => {
          state.select(userId, table, columns);
          return builder;
        },
        eq: (column: string, value: string) => {
          filters[column] = value;
          return builder;
        },
        maybeSingle: () => Promise.resolve(result()),
        order: () => Promise.resolve(result()),
        insert: (value: unknown) => {
          operation = "insert";
          payload = value;
          return Promise.resolve(result());
        },
        update: (value: unknown) => {
          operation = "update";
          payload = value;
          return builder;
        },
        delete: () => {
          operation = "delete";
          return builder;
        },
        then: (resolve: (value: DbResult) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(result()).then(resolve, reject),
      };
      return builder;
    },
  },
}));

const Detail = Route.options.component as React.ComponentType;
const key = (user: string, table: string, id = "wo-1") => `${user}:${table}:${id}`;
function populate(user: string, id = "wo-1") {
  state.responses[key(user, "work_orders", id)] = {
    data: {
      id,
      work_order_number: `${user}-${id}`,
      status: "pending",
      service_type: `Private ${user} service`,
      description: `${user} complaint`,
      customer_id: `${user}-customer`,
      vehicle_id: `${user}-vehicle`,
      customers: {
        first_name: user,
        last_name: "Customer",
        email: `${user}@example.test`,
        phone: null,
      },
      vehicles: null,
      total_cost: null,
    },
    error: null,
  };
  state.responses[key(user, "work_order_job_lines", id)] = {
    data: [
      {
        id: `${user}-labor`,
        name: `${user} labor`,
        estimated_hours: 2,
        labor_rate: 625.25,
        total_amount: 1250.5,
        status: "pending",
      },
    ],
    error: null,
  };
  state.responses[key(user, "work_order_parts", id)] = {
    data: [
      {
        id: `${user}-part`,
        part_name: `${user} filter`,
        quantity: 2,
        customer_price: 125,
        status: "pending",
      },
    ],
    error: null,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function show(
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  }),
) {
  const view = () => (
    <QueryClientProvider client={client}>
      <Detail />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
async function ready() {
  await screen.findByRole("heading", { name: `WO #${state.userId}-${state.id}` });
  await waitFor(() => expect(screen.getByRole("button", { name: "Add job line" })).toBeEnabled());
}

beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "employee-a";
  state.id = "wo-1";
  state.responses = {};
  state.write.mockResolvedValue({ data: null, error: null });
  populate("employee-a");
  populate("employee-b");
  populate("employee-a", "wo-2");
});

describe("Account-scoped work-order detail", () => {
  it("loads PHP totals and account/target-scoped source caches", async () => {
    const { client } = show();
    await ready();
    expect(state.select).toHaveBeenCalledWith(
      "employee-a",
      "work_orders",
      expect.stringContaining(
        "customers!fk_work_orders_customer(first_name,last_name,email,phone)",
      ),
    );
    expect(state.select).toHaveBeenCalledWith(
      "employee-a",
      "work_orders",
      expect.stringContaining("vehicles!fk_work_orders_vehicle(year,make,model,license_plate,vin)"),
    );
    expect(screen.getAllByText("₱1,250.50").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₱250.00").length).toBeGreaterThan(0);
    expect(screen.getByText("₱1,500.50")).toBeInTheDocument();
    for (const source of ["detail", "job-lines", "parts"]) {
      expect(
        client.getQueryData(["shop-manager", "employee-a", "work-orders", source, "wo-1"]),
      ).toBeDefined();
    }
    expect(client.getQueryData(["shop-manager", "work-orders", "detail", "wo-1"])).toBeUndefined();
  });

  it("does not render or query cached private data while signed out", async () => {
    state.userId = null;
    const client = new QueryClient();
    client.setQueryData(["shop-manager", "employee-a", "work-orders", "detail", "wo-1"], {
      id: "secret",
      description: "Cached private complaint",
    });
    const { container } = show(client);
    expect(container).toBeEmptyDOMElement();
    expect(state.read).not.toHaveBeenCalled();
  });

  it("never reuses the previous account's work order, job lines or parts", async () => {
    const { rerender, view } = show();
    await ready();
    expect(screen.getByText("employee-a labor")).toBeInTheDocument();
    state.userId = "employee-b";
    rerender(view());
    expect(screen.queryByText("employee-a complaint")).not.toBeInTheDocument();
    expect(screen.queryByText("employee-a labor")).not.toBeInTheDocument();
    expect(screen.queryByText("employee-a filter")).not.toBeInTheDocument();
    await ready();
    expect(screen.getByText("employee-b labor")).toBeInTheDocument();
    expect(screen.getByText("employee-b filter")).toBeInTheDocument();
    state.userId = null;
    rerender(view());
    expect(screen.queryByText("employee-b complaint")).not.toBeInTheDocument();
  });

  it.each(["error", "missing"])(
    "does not fetch dependent sources when the primary record is %s",
    async (mode) => {
      state.responses[key("employee-a", "work_orders")] = {
        data: null,
        error: mode === "error" ? { message: "private SQL details" } : null,
      };
      show();
      await screen.findByText(
        mode === "error" ? "Could not load this work order." : "Work order not found",
      );
      expect(state.read).toHaveBeenCalledWith("employee-a", "work_orders", "wo-1");
      expect(state.read.mock.calls.every((call) => call[1] === "work_orders")).toBe(true);
      expect(screen.queryByText("private SQL details")).not.toBeInTheDocument();
    },
  );

  it("shows independent source failures instead of empty rows and blocks partial invoices", async () => {
    state.responses[key("employee-a", "work_order_parts")] = {
      data: null,
      error: { message: "private parts SQL" },
    };
    show();
    await screen.findByText("Could not load parts.");
    expect(await screen.findByText("employee-a labor")).toBeInTheDocument();
    expect(screen.queryByText("No parts attached.")).not.toBeInTheDocument();
    expect(screen.queryByText("private parts SQL")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate invoice" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add job line" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add part" })).toBeDisabled();
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove employee-a labor" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Generate invoice" }));
    expect(state.write).not.toHaveBeenCalled();
  });

  it("blocks writes while a dependent source is pending and retries only its failure", async () => {
    const pending = deferred<DbResult>();
    state.responses[key("employee-a", "work_order_job_lines")] = pending.promise;
    show();
    await screen.findByText("Loading job lines…");
    expect(screen.getByRole("button", { name: "Generate invoice" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add part" })).toBeDisabled();
    expect(screen.queryByText("No job lines yet.")).not.toBeInTheDocument();
    await act(async () => pending.resolve({ data: null, error: { message: "private job SQL" } }));
    await screen.findByText("Could not load job lines.");
    const partReads = state.read.mock.calls.filter((call) => call[1] === "work_order_parts").length;
    populate("employee-a");
    fireEvent.click(screen.getByRole("button", { name: "Retry job lines" }));
    await ready();
    expect(state.read.mock.calls.filter((call) => call[1] === "work_order_parts").length).toBe(
      partReads,
    );
  });

  it("resets open editor drafts when the account or work-order target changes", async () => {
    const { rerender, view } = show();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Add job line" }));
    fireEvent.change(within(screen.getByRole("dialog")).getByPlaceholderText("e.g. Oil change"), {
      target: { value: "Account A draft" },
    });
    state.userId = "employee-b";
    rerender(view());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Add job line" }));
    expect(within(screen.getByRole("dialog")).getByPlaceholderText("e.g. Oil change")).toHaveValue(
      "",
    );
    state.userId = "employee-a";
    state.id = "wo-2";
    rerender(view());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Add job line" }));
    expect(within(screen.getByRole("dialog")).getByPlaceholderText("e.g. Oil change")).toHaveValue(
      "",
    );
  });

  it("ignores a late editor success without resetting the new account's draft or cache", async () => {
    const pending = deferred<DbResult>();
    state.write.mockReturnValue(pending.promise);
    const { rerender, view, client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Add job line" }));
    let dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByPlaceholderText("e.g. Oil change"), {
      target: { value: "Old account mutation" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(state.write).toHaveBeenCalledTimes(1));
    state.userId = "employee-b";
    rerender(view());
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Add job line" }));
    dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByPlaceholderText("e.g. Oil change"), {
      target: { value: "New account draft" },
    });
    await act(async () => pending.resolve({ data: null, error: null }));
    expect(dialog.getByPlaceholderText("e.g. Oil change")).toHaveValue("New account draft");
    expect(state.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("does not dispatch invoice items or navigate after an account change during invoice creation", async () => {
    const pending = deferred<DbResult>();
    state.write.mockImplementation(({ table }: { table: string }) =>
      table === "invoices" ? pending.promise : Promise.resolve({ data: null, error: null }),
    );
    const { rerender, view, client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Generate invoice" }));
    await waitFor(() => expect(state.write).toHaveBeenCalledTimes(1));
    state.userId = "employee-b";
    rerender(view());
    await ready();
    await act(async () => pending.resolve({ data: null, error: null }));
    expect(state.write).toHaveBeenCalledTimes(1);
    expect(state.navigate).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("sanitizes mutation and route errors without exposing backend messages", async () => {
    state.write.mockResolvedValue({
      data: null,
      error: { message: "private SQL constraint details" },
    });
    show();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Add job line" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByPlaceholderText("e.g. Oil change"), {
      target: { value: "Test job" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(state.error).toHaveBeenCalledWith("Could not add this job line. Please retry."),
    );
    expect(state.error.mock.calls.flat().join(" ")).not.toContain("private SQL");
    const ErrorView = Route.options.errorComponent as React.ComponentType<{
      error: Error;
      reset: () => void;
    }>;
    render(<ErrorView error={new Error("private route details")} reset={vi.fn()} />);
    expect(screen.getByText("Could not load this work order.")).toBeInTheDocument();
    expect(screen.queryByText("private route details")).not.toBeInTheDocument();
  });

  it("refreshes current-account list lifetimes, the exact legacy list and service histories after a write", async () => {
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Add job line" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByPlaceholderText("e.g. Oil change"), {
      target: { value: "New job line" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(state.success).toHaveBeenCalledWith("Job line added"));
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "employee-a", "work-orders", "job-lines", "wo-1"],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "work-orders", "list"],
      exact: true,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "employee-a", "work-orders", "list"],
      exact: false,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "employee-a", "work-orders", "detail", "wo-1"],
      exact: true,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "employee-a", "customer", "employee-a-customer", "work-orders"],
      exact: true,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "employee-a", "vehicle", "employee-a-vehicle", "work-orders"],
      exact: true,
    });
    expect(invalidate.mock.calls.some(([args]) => args?.queryKey?.includes("employee-b"))).toBe(
      false,
    );
  });

  it("refreshes current-account commercial history and the compatible invoice list", async () => {
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Generate invoice" }));
    await waitFor(() => expect(state.navigate).toHaveBeenCalled());
    expect(state.write.mock.calls.map(([write]) => write.table)).toEqual([
      "invoices",
      "invoice_items",
    ]);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "employee-a", "customer", "employee-a-customer", "invoices"],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "invoices", "list"],
      exact: true,
    });
    expect(invalidate.mock.calls.some(([args]) => args?.queryKey?.includes("employee-b"))).toBe(
      false,
    );
  });
  it("refreshes possible partial invoices and warns against an uninspected retry", async () => {
    state.write.mockImplementation(({ table }: { table: string }) =>
      Promise.resolve({
        data: null,
        error: table === "invoice_items" ? { message: "private insert failure" } : null,
      }),
    );
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Generate invoice" }));
    await waitFor(() =>
      expect(state.error).toHaveBeenCalledWith(
        "Could not finish creating this invoice. Check existing invoices before trying again.",
      ),
    );
    expect(state.navigate).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
    expect(state.write).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "invoices", "list"],
      exact: true,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "employee-a", "customer", "employee-a-customer", "invoices"],
    });
  });
});
