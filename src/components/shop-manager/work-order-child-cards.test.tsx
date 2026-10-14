import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkOrderTimeEntries } from "./work-order-time-entries";
import { WorkOrderInspectionsCard } from "./work-order-inspections-card";

type Result = { data?: unknown; error: { message: string } | null };
type Request = {
  table: string;
  accountId: string | null;
  operation: "select" | "insert" | "delete";
  filters: Record<string, unknown>;
  payload?: unknown;
};
const state = vi.hoisted(() => ({
  userId: "employee-a" as string | null,
  rows: {} as Record<string, unknown[]>,
  errors: {} as Record<string, { message: string }>,
  execute: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  navigate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null }),
}));
vi.mock("sonner", () => ({ toast: { success: state.success, error: state.error } }));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: {
    rpc: (...args: unknown[]) => state.rpc(...args),
    from: (table: string) => {
      state.from(table);
      const request: Request = {
        table,
        accountId: state.userId,
        operation: "select",
        filters: {},
      };
      const run = () => Promise.resolve(state.execute(request));
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          request.filters[column] = value;
          return builder;
        },
        order: () => builder,
        limit: () => builder,
        insert: (payload: unknown) => {
          request.operation = "insert";
          request.payload = payload;
          return builder;
        },
        delete: () => {
          request.operation = "delete";
          return builder;
        },
        maybeSingle: run,
        single: run,
        then: (resolve: (value: Result) => unknown, reject: (error: unknown) => unknown) =>
          run().then(resolve, reject),
      };
      return builder;
    },
  },
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => state.navigate,
  Link: ({
    to,
    params,
    children,
    ...props
  }: React.PropsWithChildren<{
    to: string;
    params: { id: string };
    className?: string;
  }>) => (
    <a {...props} href={to.replace("$id", params.id)}>
      {children}
    </a>
  ),
}));

function resultFor(request: Request): Result {
  if (request.operation !== "select") {
    return {
      data: request.table === "vehicle_inspections" ? { id: "created-inspection" } : null,
      error: state.errors[`${request.table}:${request.operation}`] ?? null,
    };
  }
  const error = state.errors[request.table] ?? null;
  if (request.table === "inspection_templates") return { data: { id: "template-a" }, error };
  if (request.table === "inspection_template_items") {
    return { data: [{ category: "Safety", label: "Brakes", sort_order: 1 }], error };
  }
  return { data: state.rows[`${request.accountId}:${request.table}`] ?? [], error };
}

function deferred() {
  let resolve!: (value: Result) => void;
  const promise = new Promise<Result>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

function show(
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
) {
  let workOrderId = "work-order-a";
  const view = () => (
    <QueryClientProvider client={client}>
      <WorkOrderTimeEntries workOrderId={workOrderId} />
      <WorkOrderInspectionsCard workOrderId={workOrderId} />
    </QueryClientProvider>
  );
  const rendered = render(view());
  return {
    ...rendered,
    view,
    client,
    changeWorkOrder: (id: string) => {
      workOrderId = id;
      rendered.rerender(view());
    },
  };
}

async function openTimeDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Log time" }));
  const dialog = within(screen.getByRole("dialog"));
  await waitFor(() => expect(dialog.getByRole("button", { name: "Save" })).toBeEnabled());
  return dialog;
}

function calls(table: string, operation = "select") {
  return state.execute.mock.calls
    .map(([request]) => request as Request)
    .filter((request) => request.table === table && request.operation === operation);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "employee-a";
  state.rows = {};
  state.errors = {};
  state.rpc.mockResolvedValue({ data: "shop-a", error: null });
  state.execute.mockImplementation(resultFor);
});
afterEach(() => vi.restoreAllMocks());

describe("Work-order child-card account boundaries", () => {
  it("separates cached time entries and inspections on the same QueryClient", async () => {
    state.rows["employee-a:work_order_time_entries"] = [
      { id: "time-a", employee_name: "Private technician A" },
    ];
    state.rows["employee-a:vehicle_inspections"] = [
      {
        id: "inspection-a",
        title: "Private inspection A",
        status: "in_progress",
        inspection_date: "2026-10-14",
      },
    ];
    const { client, rerender, view } = show();
    await screen.findByText("Private technician A");
    await screen.findByText("Private inspection A");

    state.userId = "employee-b";
    state.rows["employee-b:work_order_time_entries"] = [
      { id: "time-b", employee_name: "Technician B" },
    ];
    state.rows["employee-b:vehicle_inspections"] = [
      {
        id: "inspection-b",
        title: "Inspection B",
        status: "in_progress",
        inspection_date: "2026-10-15",
      },
    ];
    rerender(view());
    expect(screen.queryByText("Private technician A")).not.toBeInTheDocument();
    expect(screen.queryByText("Private inspection A")).not.toBeInTheDocument();
    await screen.findByText("Technician B");
    await screen.findByText("Inspection B");
    for (const account of ["employee-a", "employee-b"]) {
      expect(
        client.getQueryData(["shop-manager", account, "wo-time", "work-order-a"]),
      ).toBeDefined();
      expect(
        client.getQueryData(["shop-manager", account, "wo-inspections", "work-order-a"]),
      ).toBeDefined();
    }
    expect(
      calls("work_order_time_entries").every(
        (request) => request.filters.work_order_id === "work-order-a",
      ),
    ).toBe(true);
    expect(
      calls("vehicle_inspections").every(
        (request) => request.filters.work_order_id === "work-order-a",
      ),
    ).toBe(true);
  });

  it("ignores delayed private list results after an account switch", async () => {
    const time = deferred();
    const inspections = deferred();
    state.execute.mockImplementation((request: Request) => {
      if (request.accountId === "employee-a" && request.table === "work_order_time_entries")
        return time.promise;
      if (request.accountId === "employee-a" && request.table === "vehicle_inspections")
        return inspections.promise;
      return resultFor(request);
    });
    const view = show();
    await waitFor(() => expect(calls("work_order_time_entries")).toHaveLength(1));
    await waitFor(() => expect(calls("vehicle_inspections")).toHaveLength(1));
    state.userId = "employee-b";
    state.rows["employee-b:work_order_time_entries"] = [
      { id: "time-b", employee_name: "Current technician" },
    ];
    view.rerender(view.view());
    await screen.findByText("Current technician");
    await act(async () => {
      time.resolve({
        data: [{ id: "late-time", employee_name: "Late private technician" }],
        error: null,
      });
      inspections.resolve({
        data: [
          {
            id: "late-inspection",
            title: "Late private inspection",
            inspection_date: "2026-10-14",
            status: "in_progress",
          },
        ],
        error: null,
      });
    });
    expect(screen.queryByText("Late private technician")).not.toBeInTheDocument();
    expect(screen.queryByText("Late private inspection")).not.toBeInTheDocument();
    expect(
      view.client.getQueryData(["shop-manager", "employee-a", "wo-time", "work-order-a"]),
    ).toBeUndefined();
    expect(
      view.client.getQueryData(["shop-manager", "employee-a", "wo-inspections", "work-order-a"]),
    ).toBeUndefined();
  });

  it("renders nothing and does not fetch while signed out even with private caches", () => {
    state.userId = null;
    const client = new QueryClient();
    client.setQueryData(
      ["shop-manager", "employee-a", "wo-time", "work-order-a"],
      [{ id: "private-time", employee_name: "Private cached technician" }],
    );
    client.setQueryData(
      ["shop-manager", "employee-a", "wo-inspections", "work-order-a"],
      [{ id: "private-inspection", title: "Private cached inspection" }],
    );
    const { container } = show(client);
    expect(container).toBeEmptyDOMElement();
    expect(state.from).not.toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it.each(["account", "work order", "sign-out"])(
    "clears an open draft after %s changes",
    async (change) => {
      const view = show();
      const dialog = await openTimeDialog();
      fireEvent.change(dialog.getByLabelText("Notes"), { target: { value: "Private old draft" } });
      if (change === "work order") view.changeWorkOrder("work-order-b");
      else {
        state.userId = change === "sign-out" ? null : "employee-b";
        view.rerender(view.view());
      }
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue("Private old draft")).not.toBeInTheDocument();
      if (change !== "sign-out")
        expect((await openTimeDialog()).getByLabelText("Notes")).toHaveValue("");
    },
  );

  it("scopes technician caches to the account and work order", async () => {
    state.rows["employee-a:profiles"] = [{ id: "tech-a", full_name: "Private technician A" }];
    const view = show();
    await openTimeDialog();
    expect(
      view.client.getQueryData([
        "shop-manager",
        "employee-a",
        "technicians",
        "picker",
        "work-order-a",
      ]),
    ).toEqual(state.rows["employee-a:profiles"]);
    state.userId = "employee-b";
    state.rows["employee-b:profiles"] = [{ id: "tech-b", full_name: "Technician B" }];
    view.rerender(view.view());
    await openTimeDialog();
    expect(
      view.client.getQueryData([
        "shop-manager",
        "employee-b",
        "technicians",
        "picker",
        "work-order-a",
      ]),
    ).toEqual(state.rows["employee-b:profiles"]);
    expect(calls("profiles")).toHaveLength(2);
  });

  it("shows generic list failures with working retries instead of empty histories", async () => {
    state.errors.work_order_time_entries = { message: "private time database detail" };
    state.errors.vehicle_inspections = { message: "private inspection database detail" };
    show();
    await screen.findByText("Could not load this work order's time entries.");
    await screen.findByText("Could not load this work order's inspections.");
    expect(screen.queryByText("No time entries yet.")).not.toBeInTheDocument();
    expect(screen.queryByText("No inspections yet.")).not.toBeInTheDocument();
    expect(screen.queryByText(/private .* database detail/)).not.toBeInTheDocument();
    state.errors = {};
    fireEvent.click(screen.getByRole("button", { name: "Retry time entries" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry inspections" }));
    await screen.findByText("No time entries yet.");
    await screen.findByText("No inspections yet.");
  });

  it("handles a failed technician-shop lookup with a generic error and retry", async () => {
    state.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "private shop lookup detail" },
    });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Log time" }));
    const dialog = within(screen.getByRole("dialog"));
    await dialog.findByText("Could not load technicians.");
    expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(state.from).not.toHaveBeenCalledWith("profiles");
    expect(screen.queryByText("private shop lookup detail")).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole("button", { name: "Retry technicians" }));
    await waitFor(() => expect(dialog.getByRole("button", { name: "Save" })).toBeEnabled());
    expect(calls("profiles")).toHaveLength(1);
  });

  it("stops a late technician lookup before dispatching a profile query", async () => {
    const pending = deferred();
    state.rpc.mockReturnValueOnce(pending.promise);
    const view = show();
    fireEvent.click(screen.getByRole("button", { name: "Log time" }));
    await waitFor(() => expect(state.rpc).toHaveBeenCalledTimes(1));
    state.userId = "employee-b";
    view.rerender(view.view());
    await act(async () => {
      pending.resolve({ data: "old-shop", error: null });
    });
    expect(state.from).not.toHaveBeenCalledWith("profiles");
  });

  it("ignores a late time-save callback without resetting another account's draft", async () => {
    const pending = deferred();
    state.execute.mockImplementation((request: Request) =>
      request.table === "work_order_time_entries" && request.operation === "insert"
        ? pending.promise
        : resultFor(request),
    );
    const view = show();
    const invalidate = vi.spyOn(view.client, "invalidateQueries");
    const oldDialog = await openTimeDialog();
    fireEvent.click(oldDialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls("work_order_time_entries", "insert")).toHaveLength(1));
    state.userId = "employee-b";
    view.rerender(view.view());
    const newDialog = await openTimeDialog();
    fireEvent.change(newDialog.getByLabelText("Notes"), { target: { value: "New account draft" } });
    await act(async () => {
      pending.resolve({ data: null, error: null });
    });
    expect(newDialog.getByLabelText("Notes")).toHaveValue("New account draft");
    expect(state.success).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("ignores a late delete error after sign-out", async () => {
    state.rows["employee-a:work_order_time_entries"] = [
      { id: "time-a", employee_name: "Technician A" },
    ];
    const pending = deferred();
    state.execute.mockImplementation((request: Request) =>
      request.operation === "delete" ? pending.promise : resultFor(request),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const view = show();
    const invalidate = vi.spyOn(view.client, "invalidateQueries");
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete time entry for Technician A" }),
    );
    await waitFor(() => expect(calls("work_order_time_entries", "delete")).toHaveLength(1));
    state.userId = null;
    view.rerender(view.view());
    await act(async () => {
      pending.resolve({ error: { message: "private delete failure" } });
    });
    expect(view.container).toBeEmptyDOMElement();
    expect(state.success).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("invalidates only the current account and work order after a successful time save", async () => {
    const view = show();
    const invalidate = vi.spyOn(view.client, "invalidateQueries");
    fireEvent.click((await openTimeDialog()).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.success).toHaveBeenCalledWith("Time entry added"));
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({
      queryKey: ["shop-manager", "employee-a", "wo-time", "work-order-a"],
    });
  });

  it.each(["account", "work order"])(
    "stops inspection setup after a pending shop lookup and a %s switch",
    async (change) => {
      const pending = deferred();
      state.rpc.mockReturnValueOnce(pending.promise);
      const view = show();
      const invalidate = vi.spyOn(view.client, "invalidateQueries");
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Start inspection" })).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole("button", { name: "Start inspection" }));
      await waitFor(() => expect(state.rpc).toHaveBeenCalledTimes(1));
      if (change === "work order") view.changeWorkOrder("work-order-b");
      else {
        state.userId = "employee-b";
        view.rerender(view.view());
      }
      await act(async () => {
        pending.resolve({ data: "old-shop", error: null });
      });
      expect(state.from).not.toHaveBeenCalledWith("inspection_templates");
      expect(state.navigate).not.toHaveBeenCalled();
      expect(state.error).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );

  it("does not create an inspection when fetching its checklist fails", async () => {
    state.errors.inspection_template_items = { message: "private checklist lookup detail" };
    show();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start inspection" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start inspection" }));
    await waitFor(() =>
      expect(state.error).toHaveBeenCalledWith(
        "Could not finish creating this inspection. Check existing inspections before trying again.",
      ),
    );
    expect(calls("vehicle_inspections", "insert")).toHaveLength(0);
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("does not report success or navigate when inserting checklist items fails", async () => {
    state.errors["inspection_items:insert"] = { message: "private checklist insert detail" };
    const view = show();
    const invalidate = vi.spyOn(view.client, "invalidateQueries");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start inspection" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start inspection" }));
    await waitFor(() =>
      expect(state.error).toHaveBeenCalledWith(
        "Could not finish creating this inspection. Check existing inspections before trying again.",
      ),
    );
    expect(calls("vehicle_inspections", "insert")).toHaveLength(1);
    expect(calls("inspection_items", "insert")).toHaveLength(1);
    expect(state.navigate).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({
      queryKey: ["shop-manager", "employee-a", "wo-inspections", "work-order-a"],
    });
  });

  it("does not dispatch checklist writes after an inspection-header response arrives in another account", async () => {
    const pending = deferred();
    state.execute.mockImplementation((request: Request) =>
      request.table === "vehicle_inspections" && request.operation === "insert"
        ? pending.promise
        : resultFor(request),
    );
    const view = show();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start inspection" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start inspection" }));
    await waitFor(() => expect(calls("vehicle_inspections", "insert")).toHaveLength(1));
    state.userId = "employee-b";
    view.rerender(view.view());
    await act(async () => {
      pending.resolve({ data: { id: "old-inspection" }, error: null });
    });
    expect(calls("inspection_items", "insert")).toHaveLength(0);
    expect(state.navigate).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
  });

  it("ignores a late checklist success after account switching", async () => {
    const pending = deferred();
    state.execute.mockImplementation((request: Request) =>
      request.table === "inspection_items" && request.operation === "insert"
        ? pending.promise
        : resultFor(request),
    );
    const view = show();
    const invalidate = vi.spyOn(view.client, "invalidateQueries");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start inspection" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start inspection" }));
    await waitFor(() => expect(calls("inspection_items", "insert")).toHaveLength(1));
    state.userId = "employee-b";
    view.rerender(view.view());
    await act(async () => {
      pending.resolve({ data: null, error: null });
    });
    expect(state.navigate).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start inspection" })).toBeEnabled(),
    );
  });

  it("navigates only after complete inspection creation and scopes invalidation", async () => {
    const view = show();
    const invalidate = vi.spyOn(view.client, "invalidateQueries");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start inspection" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start inspection" }));
    await waitFor(() =>
      expect(state.navigate).toHaveBeenCalledWith({
        to: "/workspace/inspections/$id",
        params: { id: "created-inspection" },
      }),
    );
    expect(calls("inspection_items", "insert")).toHaveLength(1);
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({
      queryKey: ["shop-manager", "employee-a", "wo-inspections", "work-order-a"],
    });
    expect(state.error).not.toHaveBeenCalled();
  });
});
