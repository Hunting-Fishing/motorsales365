import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CustomerCommercialHistory } from "./customer-commercial-history";

const state = vi.hoisted(() => ({
  userId: "employee-a" as string | null,
  rows: {} as Record<string, unknown[]>,
  errors: {} as Record<string, { message: string }>,
  scopes: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null }),
}));
vi.mock("@/lib/shop-manager/db", () => ({
  smSupabase: {
    from: (table: string) => {
      state.from(table);
      const builder = {
        select: () => builder,
        eq: (column: string, value: string) => {
          state.scopes(table, column, value);
          return builder;
        },
        order: () => builder,
        limit: async () => ({ data: state.rows[table] ?? [], error: state.errors[table] ?? null }),
      };
      return builder;
    },
  },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: React.PropsWithChildren<{
    to: string;
    params?: { id: string };
    className?: string;
  }>) => (
    <a {...props} href={to.replace("$id", params?.id ?? "")}>
      {children}
    </a>
  ),
}));

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = () => (
    <QueryClientProvider client={client}>
      <CustomerCommercialHistory customerId="customer-a" />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "employee-a";
  state.rows = {};
  state.errors = {};
});

describe("Customer commercial history", () => {
  it("links existing customer-scoped quotes and invoices with PHP amounts", async () => {
    state.rows.quotes = [
      {
        id: "q1",
        quote_number: "Q-001",
        total_amount: 1000,
        status: "sent",
        created_at: "2026-10-14",
      },
    ];
    state.rows.invoices = [{ id: "inv1", total: 750, status: "paid", date: "2026-10-14" }];
    show();
    expect(await screen.findByRole("link", { name: "Q-001" })).toHaveAttribute(
      "href",
      "/workspace/quotes/q1",
    );
    expect(await screen.findByRole("link", { name: "Invoice inv1" })).toHaveAttribute(
      "href",
      "/workspace/invoices/inv1",
    );
    expect(screen.getByText(/₱1,000\.00/)).toBeInTheDocument();
    expect(state.scopes).toHaveBeenCalledWith("invoices", "customer_id", "customer-a");
    expect(state.scopes).toHaveBeenCalledWith("quotes", "customer_id", "customer-a");
  });

  it("reports an invoice failure without claiming an empty history or hiding quotes", async () => {
    state.errors.invoices = { message: "private database error" };
    state.rows.quotes = [{ id: "q1", quote_number: "Q-001", total_amount: null, status: "draft" }];
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load this customer's invoices.",
    );
    expect(screen.queryByText("No invoices for this customer yet.")).not.toBeInTheDocument();
    expect(screen.queryByText("private database error")).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Q-001" })).toBeInTheDocument();
  });

  it("does not reuse cached invoices after the authenticated account changes", async () => {
    state.rows.invoices = [{ id: "old-account", total: 50 }];
    const { rerender, view } = show();
    await screen.findByRole("link", { name: "Invoice old-account" });
    state.userId = "employee-b";
    state.rows.invoices = [{ id: "new-account", total: 75 }];
    rerender(view());
    expect(screen.queryByRole("link", { name: "Invoice old-account" })).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Invoice new-account" })).toBeInTheDocument();
  });

  it("does not fetch private commercial history while signed out", async () => {
    state.userId = null;
    const { container } = show();
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(state.from).not.toHaveBeenCalled();
  });

  it("labels a limited history without showing it as an all-time total", async () => {
    state.rows.invoices = Array.from({ length: 26 }, (_, i) => ({ id: `inv-${i}`, total: i }));
    show();
    expect(await screen.findByText("Showing the 25 most recent invoices.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Invoice inv-25" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Invoice inv-24" })).toBeInTheDocument();
  });
});
