import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { Route } from "@/routes/_authenticated/workspace.expenses";

type Kind = "expenses" | "categories" | "vehicles";
type Request = { expectedAccountId: string; expectedShopId: string; kind: Kind; page: number };
const state = vi.hoisted(() => ({
  account: "71000000-0000-4000-8000-000000000001" as string | null,
  loading: false,
  scope: vi.fn<(options: { data: unknown; signal?: AbortSignal }) => Promise<unknown>>(),
  page: vi.fn<(options: { data: unknown; signal?: AbortSignal }) => Promise<unknown>>(),
  write: vi.fn(),
  sign: vi.fn(),
  upload: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.account ? { id: state.account } : null, loading: state.loading }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock("@/lib/shop-expenses-read.functions", () => ({
  getShopExpenseScope: state.scope,
  getShopExpenseReadPage: state.page,
}));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: {
    from: (table: string) => {
      const builder = {
        delete: () => builder,
        eq: (column: string, value: string) =>
          state.write({ table, kind: "delete", column, value }),
        insert: (payload: unknown) => state.write({ table, kind: "insert", payload }),
      };
      return builder;
    },
  },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: state.currentUser },
    storage: { from: () => ({ createSignedUrl: state.sign, upload: state.upload }) },
  },
}));
vi.mock("@/components/vehicle-receipt-panel", async () => {
  const { useState } = await import("react");
  return {
    VehicleReceiptPanel: ({ shopVehicleId }: { shopVehicleId: string }) => {
      const [note, setNote] = useState("");
      return (
        <section data-testid="receipt-panel">
          <span>{shopVehicleId}</span>
          <input
            aria-label="Synthetic retained receipt note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </section>
      );
    },
  };
});
const accountA = "71000000-0000-4000-8000-000000000001";
const accountB = "71000000-0000-4000-8000-000000000002";
const shopA = "72000000-0000-4000-8000-000000000001";
const shopB = "72000000-0000-4000-8000-000000000002";
const categoryId = "73000000-0000-4000-8000-000000000001";
const vehicleId = "74000000-0000-4000-8000-000000000001";
const customerId = "75000000-0000-4000-8000-000000000001";
const expenseId = "76000000-0000-4000-8000-000000000001";
const Page = Route.options.component as React.ComponentType;
const ErrorView = Route.options.errorComponent as React.ComponentType<{
  error: unknown;
  reset: () => void;
}>;
const clients: QueryClient[] = [];
function expense(overrides: Record<string, unknown> = {}) {
  return {
    id: expenseId,
    shop_id: shopA,
    amount: "10.50",
    tax_amount: "0.10",
    expense_date: "2026-10-16",
    payment_method: null,
    reference_number: null,
    description: "Synthetic expense",
    status: "recorded",
    category_id: categoryId,
    receipt_url: "synthetic/path.pdf",
    vehicle_id: null,
    vehicle_receipt_id: null,
    ...overrides,
  };
}
function category(overrides: Record<string, unknown> = {}) {
  return {
    id: categoryId,
    shop_id: shopA,
    name: "Synthetic category",
    is_active: true,
    ...overrides,
  };
}
function vehicle(overrides: Record<string, unknown> = {}) {
  return {
    id: vehicleId,
    customer_id: customerId,
    owner_type: "company",
    make: "Synthetic",
    model: "Vehicle",
    license_plate: null,
    customers: { id: customerId, shop_id: shopA },
    ...overrides,
  };
}
function result(kind: Kind, rows?: unknown[], page = 0, totalCount?: number, shopId = shopA) {
  const values =
    rows ??
    (kind === "expenses"
      ? [expense({ shop_id: shopId })]
      : kind === "categories"
        ? [category({ shop_id: shopId })]
        : [vehicle({ customers: { id: customerId, shop_id: shopId } })]);
  const count = totalCount ?? values.length;
  return {
    kind,
    shopId,
    page,
    totalCount: count,
    hasNext: page * 100 + values.length < count,
    rows: values,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function input(options: { data: unknown }): Request {
  return options.data as Request;
}
function show(
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
) {
  clients.push(client);
  const view = () => (
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>
  );
  return { ...render(view()), client, view };
}
function findRead(client: QueryClient, kind: Kind) {
  const prefix =
    kind === "expenses"
      ? "expenses"
      : kind === "categories"
        ? "expense_categories"
        : "receipt-vehicle-choices";
  const query = client
    .getQueryCache()
    .find({ queryKey: ["shop-manager", state.account, prefix], exact: false });
  if (!query) throw new Error("Missing synthetic query.");
  return query;
}
function rawClick(button: HTMLElement) {
  const key = Object.getOwnPropertyNames(button).find((name) => name.startsWith("__reactProps$"));
  const props: unknown = key ? Reflect.get(button, key) : undefined;
  if (
    !props ||
    typeof props !== "object" ||
    !("onClick" in props) ||
    typeof props.onClick !== "function"
  )
    throw new Error("Missing source handler.");
  const handler = props.onClick;
  return () => handler();
}
beforeEach(() => {
  vi.clearAllMocks();
  state.account = accountA;
  state.loading = false;
  state.scope.mockReset().mockResolvedValue({ available: true, shopId: shopA });
  state.page.mockReset().mockImplementation(async (options) => {
    const request = input(options);
    return result(request.kind, undefined, request.page, undefined, request.expectedShopId);
  });
  state.write.mockReset().mockResolvedValue({ error: null });
  state.sign
    .mockReset()
    .mockResolvedValue({ data: { signedUrl: "https://synthetic.example/signed" }, error: null });
  state.upload.mockReset().mockResolvedValue({ error: null });
  state.currentUser.mockReset().mockResolvedValue({ data: { user: { id: accountA } } });
  vi.spyOn(window, "open").mockReturnValue(null);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(toast, "message").mockImplementation(() => 0);
  vi.spyOn(toast, "error").mockImplementation(() => 0);
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.restoreAllMocks();
});

// Actual route + QueryClient, synthetic Auth/server/Storage/CRUD only. No native
// role/API/posting, atomic snapshots, writer cancellation or recovery proof.
describe("account and native-shop expense read windows", () => {
  it.each(["signed out", "Auth loading"] as const)(
    "mounts no private reads during %s even with legacy cache",
    (mode) => {
      if (mode === "signed out") state.account = null;
      else state.loading = true;
      const client = new QueryClient();
      client.setQueryData(["shop-manager", "expenses"], [expense()]);
      expect(show(client).container).toBeEmptyDOMElement();
      expect(state.scope).not.toHaveBeenCalled();
      expect(state.page).not.toHaveBeenCalled();
    },
  );
  it("requires fresh scope before independent account/shop/kind pages and forwards distinct signals", async () => {
    const pending = deferred<unknown>();
    state.scope.mockReturnValueOnce(pending.promise);
    const { client } = show();
    expect(state.page).not.toHaveBeenCalled();
    expect(screen.getByText("Loading expense workspace…")).toBeVisible();
    await act(async () => pending.resolve({ available: true, shopId: shopA }));
    await screen.findByText("Synthetic expense");
    expect(state.scope.mock.calls[0][0]).toMatchObject({
      data: { expectedAccountId: accountA },
      signal: expect.any(AbortSignal),
    });
    expect(state.page).toHaveBeenCalledTimes(3);
    for (const [options] of state.page.mock.calls)
      expect(options).toMatchObject({
        data: { expectedAccountId: accountA, expectedShopId: shopA, page: 0 },
        signal: expect.any(AbortSignal),
      });
    for (const kind of ["expenses", "categories", "vehicles"] as const)
      expect(findRead(client, kind).queryKey).toContain(shopA);
    expect(state.write).not.toHaveBeenCalled();
    expect(state.sign).not.toHaveBeenCalled();
    expect(state.upload).not.toHaveBeenCalled();
  });
  it("distinguishes unavailable shop from error/empty expenses and permits context refresh", async () => {
    state.scope.mockResolvedValueOnce({ available: false, shopId: null });
    show();
    await screen.findByText("No native shop is currently available for this account.");
    expect(state.page).not.toHaveBeenCalled();
    expect(screen.queryByText(/No expenses are visible/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh expense workspace" }));
    await screen.findByText("Synthetic expense");
  });
  it("shows generic scope failure and retries without leaking raw errors", async () => {
    state.scope.mockRejectedValueOnce(new Error("PRIVATE scope cause"));
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load this expense workspace",
    );
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    expect(state.page).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry expense workspace" }));
    await screen.findByText("Synthetic expense");
  });
  it("removes misleading MTD/total arithmetic and preserves signed decimals, NaN, DATE and unrestricted status", async () => {
    state.page.mockImplementation(async (options) => {
      const request = input(options);
      return request.kind === "expenses"
        ? result("expenses", [
            expense({
              id: "76000000-0000-4000-8000-000000000002",
              amount: "NaN",
              expense_date: "infinity",
              description: "Special native date",
              category_id: null,
            }),
            expense({
              amount: "-123456789012.34",
              tax_amount: "0.10",
              expense_date: "0044-03-15 BC",
              status: "",
            }),
          ])
        : result(request.kind);
    });
    show();
    await screen.findByText("Amount: -123456789012.34");
    expect(screen.getAllByText("Tax: 0.10")[0]).toBeVisible();
    expect(screen.getByText("Amount: Unusable amount (NaN)")).toBeVisible();
    expect(screen.getByText("0044-03-15 BC")).toBeVisible();
    expect(screen.getByText("infinity")).toBeVisible();
    expect(screen.queryByText(/Month-to-date:|₱|Invalid Date/)).not.toBeInTheDocument();
  });
  it.each(["expenses", "categories", "vehicles"] as const)(
    "handles independent %s errors and manual retries without false empty/default data",
    async (kind) => {
      state.page.mockImplementation(async (options) => {
        const request = input(options);
        if (request.kind === kind) throw new Error("PRIVATE page cause");
        return result(request.kind);
      });
      show();
      await screen.findByRole("button", { name: `Retry ${kind}` });
      expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
      if (kind !== "expenses") expect(screen.getByText("Synthetic expense")).toBeVisible();
      if (kind === "categories") expect(screen.getByText("Category unavailable")).toBeVisible();
      state.page.mockImplementation(async (options) => {
        const request = input(options);
        return result(request.kind);
      });
      fireEvent.click(screen.getByRole("button", { name: `Retry ${kind}` }));
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: `Retry ${kind}` })).not.toBeInTheDocument(),
      );
    },
  );
  it.each(["fetching", "paused", "invalidated", "error"] as const)(
    "hides expense rows on %s and refuses old delete/open handlers",
    async (kind) => {
      const { client } = show();
      await screen.findByText("Synthetic expense");
      const remove = rawClick(screen.getByRole("button", { name: "Delete expense" }));
      const open = rawClick(screen.getByRole("button", { name: "View expense receipt" }));
      const query = findRead(client, "expenses");
      act(() => {
        if (kind === "invalidated")
          void client.invalidateQueries({ queryKey: query.queryKey, refetchType: "none" });
        else
          query.setState(
            kind === "error"
              ? { status: "error", error: new Error("PRIVATE") }
              : { fetchStatus: kind },
          );
        remove();
        open();
      });
      expect(screen.queryByText("Synthetic expense")).not.toBeInTheDocument();
      expect(screen.queryByText(/No expenses are visible/)).not.toBeInTheDocument();
      expect(state.write).not.toHaveBeenCalled();
      expect(state.sign).not.toHaveBeenCalled();
    },
  );
  it("rechecks the exact expense read after the confirm callback before delete dispatch", async () => {
    const { client } = show();
    await screen.findByText("Synthetic expense");
    vi.mocked(window.confirm).mockImplementationOnce(() => {
      void client.invalidateQueries({
        queryKey: findRead(client, "expenses").queryKey,
        refetchType: "none",
      });
      return true;
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete expense" }));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(state.write).not.toHaveBeenCalled();
  });
  it("pages 100-row windows without cached page ABA or duplicate same-tick intent", async () => {
    state.page.mockImplementation(async (options) => {
      const request = input(options);
      if (request.kind !== "expenses") return result(request.kind);
      return request.page === 0
        ? result(
            "expenses",
            Array.from({ length: 100 }, (_, i) =>
              expense({
                id: `76000000-0000-4000-8000-${String(100 - i).padStart(12, "0")}`,
                description: `Expense ${i + 1}`,
              }),
            ),
            0,
            101,
          )
        : result("expenses", [expense({ description: "Expense 101" })], 1, 101);
    });
    const { client } = show();
    await screen.findByText("Expense 100");
    const first = findRead(client, "expenses").queryKey;
    const next = rawClick(screen.getByRole("button", { name: "Next expenses" }));
    act(() => {
      next();
      next();
    });
    await screen.findByText("Expense 101");
    expect(screen.queryByText("Expense 1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous expenses" }));
    await screen.findByText("Expense 1");
    expect(findRead(client, "expenses").queryKey).not.toEqual(first);
  });
  it("preserves the selected receipt child across independent read refreshes/errors/pages but clears it on scope loss", async () => {
    const context = show();
    await screen.findByRole("option", { name: "Synthetic Vehicle" });
    fireEvent.change(screen.getByLabelText("Scan or enter a receipt for a vehicle"), {
      target: { value: vehicleId },
    });
    const panel = screen.getByTestId("receipt-panel");
    fireEvent.change(screen.getByLabelText("Synthetic retained receipt note"), {
      target: { value: "Private held entry" },
    });
    for (const kind of ["expenses", "categories", "vehicles"] as const) {
      const query = findRead(context.client, kind);
      act(() => query.setState({ status: "error", error: new Error("PRIVATE") }));
      expect(screen.getByTestId("receipt-panel")).toBe(panel);
      expect(screen.getByLabelText("Synthetic retained receipt note")).toHaveValue(
        "Private held entry",
      );
    }
    const scope = context.client
      .getQueryCache()
      .find({ queryKey: ["shop-manager", accountA, "expense-scope"], exact: false })!;
    act(() => scope.setState({ fetchStatus: "paused" }));
    expect(screen.queryByTestId("receipt-panel")).not.toBeInTheDocument();
    act(() => scope.setState({ fetchStatus: "idle" }));
    await screen.findByText("Synthetic expense");
    expect(screen.queryByTestId("receipt-panel")).not.toBeInTheDocument();
  });
  it("keeps an open expense form and draft values mounted through ordinary expense refresh failure", async () => {
    const { client } = show();
    await screen.findByText("Synthetic expense");
    await waitFor(() => expect(screen.getByRole("button", { name: "New Expense" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "New Expense" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Expense description"), {
      target: { value: "Private unsaved expense" },
    });
    const query = findRead(client, "expenses");
    act(() => query.setState({ fetchStatus: "fetching" }));
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(dialog).getByLabelText("Expense description")).toHaveValue(
      "Private unsaved expense",
    );
    act(() =>
      query.setState({ fetchStatus: "idle", status: "error", error: new Error("PRIVATE") }),
    );
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(dialog).getByRole("button", { name: "Record" })).toBeDisabled();
    expect(state.write).not.toHaveBeenCalled();
  });

  it.each(["resolve", "reject"] as const)(
    "does not adopt an old pending scope %s on account ABA",
    async (outcome) => {
      const old = deferred<unknown>(),
        current = deferred<unknown>();
      state.scope
        .mockReturnValueOnce(old.promise)
        .mockResolvedValueOnce({ available: true, shopId: shopB })
        .mockReturnValueOnce(current.promise);
      const context = show();
      await waitFor(() => expect(state.scope).toHaveBeenCalledTimes(1));
      const oldSignal = state.scope.mock.calls[0][0].signal;
      state.account = accountB;
      context.rerender(context.view());
      await screen.findByText("Synthetic expense");
      state.account = accountA;
      context.rerender(context.view());
      await waitFor(() => expect(state.scope).toHaveBeenCalledTimes(3));
      expect(oldSignal?.aborted).toBe(true);
      await act(async () =>
        outcome === "resolve"
          ? old.resolve({ available: true, shopId: shopA })
          : old.reject(new Error("PRIVATE old scope")),
      );
      expect(screen.queryByText("Synthetic expense")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      await act(async () => current.resolve({ available: true, shopId: shopA }));
      await screen.findByText("Synthetic expense");
    },
  );

  it.each(["missing count", "truncated count", "wrong shop", "duplicate IDs"] as const)(
    "refuses %s expense envelopes instead of rendering a partial/empty success",
    async (kind) => {
      state.page.mockImplementation(async (options) => {
        const request = input(options);
        if (request.kind !== "expenses") return result(request.kind);
        const page: Record<string, unknown> = result("expenses");
        if (kind === "missing count") delete page.totalCount;
        if (kind === "truncated count") page.totalCount = 2;
        if (kind === "wrong shop") page.shopId = shopB;
        if (kind === "duplicate IDs") {
          page.rows = [expense(), expense()];
          page.totalCount = 2;
        }
        return page;
      });
      show();
      await screen.findByRole("button", { name: "Retry expenses" });
      expect(screen.queryByText("Synthetic expense")).not.toBeInTheDocument();
      expect(screen.queryByText(/No expenses are visible/)).not.toBeInTheDocument();
    },
  );

  it("refuses an unknown company-vehicle customer binding without claiming no vehicles exist", async () => {
    state.page.mockImplementation(async (options) => {
      const request = input(options);
      return request.kind === "vehicles"
        ? result("vehicles", [vehicle({ customer_id: null, customers: null })])
        : result(request.kind);
    });
    show();
    await screen.findByRole("button", { name: "Retry vehicles" });
    expect(screen.queryByText(/No vehicles are visible/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Scan or enter a receipt for a vehicle")).toBeDisabled();
    expect(screen.queryByTestId("receipt-panel")).not.toBeInTheDocument();
  });

  it("uses neutral delete acknowledgment and current scoped plus legacy invalidation without altering its payload", async () => {
    const { client } = show();
    await screen.findByText("Synthetic expense");
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(screen.getByRole("button", { name: "Delete expense" }));
    await waitFor(() =>
      expect(toast.message).toHaveBeenCalledExactlyOnceWith(
        "Expense request acknowledged. Refresh expenses to check.",
      ),
    );
    expect(state.write).toHaveBeenCalledExactlyOnceWith({
      table: "expenses",
      kind: "delete",
      column: "id",
      value: expenseId,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", "expenses"],
      exact: true,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["shop-manager", accountA, "expenses", shopA],
    });
  });

  for (const outcome of ["resolve", "reject"] as const) {
    it.each([
      "account ABA",
      "shop ABA",
      "scope version",
      "expense read loss",
      "Auth loading",
      "logout",
      "unmount",
    ] as const)(`silences a late signed receipt ${outcome} after %s`, async (kind) => {
      const pending = deferred<unknown>();
      state.sign.mockReturnValueOnce(pending.promise);
      const context = show();
      await screen.findByText("Synthetic expense");
      fireEvent.click(screen.getByRole("button", { name: "View expense receipt" }));
      expect(state.sign).toHaveBeenCalledExactlyOnceWith("synthetic/path.pdf", 600);
      const scope = context.client
        .getQueryCache()
        .find({ queryKey: ["shop-manager", accountA, "expense-scope"], exact: false })!;
      if (kind === "account ABA") {
        state.account = accountB;
        context.rerender(context.view());
        state.account = accountA;
        context.rerender(context.view());
      }
      if (kind === "shop ABA") {
        act(() => context.client.setQueryData(scope.queryKey, { available: true, shopId: shopB }));
        await screen.findByText("Synthetic expense");
        act(() => context.client.setQueryData(scope.queryKey, { available: true, shopId: shopA }));
      }
      if (kind === "scope version")
        act(() => context.client.setQueryData(scope.queryKey, scope.state.data));
      if (kind === "expense read loss") {
        const query = findRead(context.client, "expenses");
        act(() => query.setState({ fetchStatus: "paused" }));
        act(() => query.setState({ fetchStatus: "idle" }));
      }
      if (kind === "Auth loading") {
        state.loading = true;
        context.rerender(context.view());
      }
      if (kind === "logout") {
        state.account = null;
        context.rerender(context.view());
      }
      if (kind === "unmount") context.unmount();
      await act(async () =>
        outcome === "resolve"
          ? pending.resolve({ data: { signedUrl: "https://synthetic.example/late" }, error: null })
          : pending.reject(new Error("PRIVATE late cause")),
      );
      expect(window.open).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.message).not.toHaveBeenCalled();
    });
  }
  it("opens only a current signed receipt and reports current signing failure generically", async () => {
    show();
    await screen.findByText("Synthetic expense");
    fireEvent.click(screen.getByRole("button", { name: "View expense receipt" }));
    await waitFor(() =>
      expect(window.open).toHaveBeenCalledExactlyOnceWith(
        "https://synthetic.example/signed",
        "_blank",
      ),
    );
    state.sign.mockRejectedValueOnce(new Error("PRIVATE signing cause"));
    fireEvent.click(screen.getByRole("button", { name: "View expense receipt" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledExactlyOnceWith("Could not open receipt"),
    );
  });
  it("uses generic signed-in route error feedback and mounts no error view while signed out", () => {
    const reset = vi.fn();
    const context = render(<ErrorView error={new Error("PRIVATE")} reset={reset} />);
    expect(screen.getByRole("alert")).not.toHaveTextContent("PRIVATE");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledTimes(1);
    state.account = null;
    context.rerender(<ErrorView error={new Error("PRIVATE")} reset={reset} />);
    expect(context.container).toBeEmptyDOMElement();
  });
});
