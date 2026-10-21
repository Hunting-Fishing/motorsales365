// Actual invoice route and QueryClient; SDK doubles, not SQL/financial acceptance.
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "@/routes/_authenticated/workspace.invoices.$id";

type Row = Record<string, unknown>;
const state = vi.hoisted(() => ({
  invoice: {} as Row,
  items: [] as Row[],
  preflightError: false,
  reads: vi.fn(),
  writes: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "employee-a" }, loading: false }),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock("sonner", () => ({ toast: { success: state.success, error: state.error } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useParams: () => ({ id: "invoice-a" }),
  }),
  useRouter: () => ({ invalidate: vi.fn() }),
  Link: ({ to, children }: React.PropsWithChildren<{ to: string }>) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: {
    from: (table: string) => {
      let method = "read";
      let payload: Row = {};
      const filters: Row = {};
      const result = () => {
        if (method !== "read") {
          state.writes({ table, method, payload, filters: { ...filters } });
          if (table === "invoice_items") {
            const added = { id: "added-line", ...payload };
            state.items = [...state.items, added];
            return { data: added, error: null };
          }
          state.invoice = { ...state.invoice, ...payload };
          return { data: { ...state.invoice }, error: null };
        }
        state.reads(table);
        if (table === "invoices") return { data: { ...state.invoice }, error: null };
        if (table === "invoice_items") {
          if (state.preflightError)
            return { data: null, error: { message: "private SQL preflight details" } };
          return {
            data: state.items.map((row) => ({ ...row })),
            count: state.items.length,
            error: null,
          };
        }
        if (table === "payments") return { data: [], count: 0, error: null };
        if (table === "inventory_items")
          return {
            data: [
              {
                id: "stock-a",
                name: "Capacity filter",
                sku: "CAP",
                quantity: 10,
                sell_price_per_unit: 125,
                unit_price: 125,
                cost_per_unit: 50,
              },
            ],
            error: null,
          };
        throw new Error(`Unexpected table ${table}`);
      };
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          filters[column] = value;
          return query;
        },
        is: (column: string, value: unknown) => {
          filters[column] = value;
          return query;
        },
        order: () => query,
        limit: () => query,
        or: () => query,
        insert: (value: Row) => {
          method = "insert";
          payload = value;
          return query;
        },
        update: (value: Row) => {
          method = "update";
          payload = value;
          return query;
        },
        single: () => Promise.resolve(result()),
        maybeSingle: () => Promise.resolve(result()),
        then: (yes: (value: unknown) => unknown, no: (error: unknown) => unknown) =>
          Promise.resolve().then(result).then(yes, no),
      };
      return query;
    },
  },
}));
const Detail = Route.options.component as React.ComponentType;
const clients: QueryClient[] = [];
function seedLines(count: number) {
  state.items = Array.from({ length: count }, (_, index) => ({
    id: `capacity-${index}`,
    invoice_id: "invoice-a",
    name: `Capacity line ${index}`,
    description: "Synthetic",
    quantity: 1,
    price: 10,
    total: 10,
    hours: false,
  }));
  state.invoice = { ...state.invoice, subtotal: count * 10, tax: 50, total: count * 10 + 50 };
}
function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <Detail />
    </QueryClientProvider>,
  );
  return client;
}
async function ready() {
  await waitFor(() => expect(screen.getByRole("button", { name: "Record payment" })).toBeEnabled());
}
async function openPicker() {
  fireEvent.click(screen.getByRole("button", { name: "Add from inventory" }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.click(await dialog.findByRole("button", { name: /Capacity filter/ }));
  return dialog;
}
beforeEach(() => {
  vi.clearAllMocks();
  state.preflightError = false;
  state.invoice = {
    id: "invoice-a",
    customer: "Synthetic customer",
    customer_id: "customer-a",
    customer_email: null,
    customer_address: null,
    description: "Capacity invoice",
    notes: null,
    date: "2026-10-20",
    due_date: null,
    status: "draft",
    work_order_id: null,
    payment_method: null,
  };
  seedLines(99);
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});

describe("invoice capacity before financial dispatch", () => {
  it("at 100 lines explains the disabled addition while retaining payment entry", async () => {
    seedLines(100);
    show();
    await ready();
    expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Record payment" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("100-line editor limit");
    fireEvent.click(screen.getByRole("button", { name: "Add from inventory" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(state.reads).not.toHaveBeenCalledWith("inventory_items");
    expect(state.writes).not.toHaveBeenCalled();
  });

  it("allows 99 to 100, then disables additions without disabling payment entry", async () => {
    show();
    await ready();
    const dialog = await openPicker();
    fireEvent.click(dialog.getByRole("button", { name: "Add to invoice" }));
    await waitFor(() => expect(state.success).toHaveBeenCalledWith("Invoice line recorded"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add from inventory" })).toBeDisabled(),
    );
    expect(state.writes).toHaveBeenCalledTimes(2);
    expect(state.invoice.subtotal).toBe(1115);
    expect(state.invoice.total).toBe(1165);
    expect(screen.getByRole("button", { name: "Record payment" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("100-line editor limit");
  });

  it("full preflight saves nothing and does not falsely report an uncertain write", async () => {
    const client = show();
    await ready();
    const dialog = await openPicker();
    seedLines(100);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(dialog.getByRole("button", { name: "Add to invoice" }));
    await waitFor(() =>
      expect(state.error).toHaveBeenCalledWith(
        "This invoice already has 100 line items. No new line was saved.",
      ),
    );
    expect(state.writes).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(screen.queryByText(/A financial write may have completed/)).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Record payment" })).toBeEnabled();
  });

  it("failed preflight neither reports possible completion nor leaks database details", async () => {
    show();
    await ready();
    const dialog = await openPicker();
    state.preflightError = true;
    fireEvent.click(dialog.getByRole("button", { name: "Add to invoice" }));
    await waitFor(() => expect(state.error).toHaveBeenCalledOnce());
    expect(state.error.mock.calls.flat().join(" ")).not.toMatch(/may have completed|private SQL/);
    expect(state.writes).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
  });
});
