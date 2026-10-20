// Actual page and QueryClient. Server/auth replies are doubles, not a live tenant test.
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "./dashboard.business.$businessId.inventory";
const state = vi.hoisted(() => ({
  account: "account-a",
  business: "business-a",
  loading: false,
  load: vi.fn(),
  capability: vi.fn(),
  inquiries: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.account ? { id: state.account } : null, loading: state.loading }),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useParams: () => ({ businessId: state.business }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/business-inventory.functions", () => ({
  listBusinessInventory: state.load,
  getCanonicalLinkCapability: state.capability,
  adjustBusinessInventory: vi.fn(),
  deleteBusinessInventoryItem: vi.fn(),
  linkBusinessInventoryCanonicalPart: vi.fn(),
}));
vi.mock("@/lib/parts-network-operations.functions", () => ({
  getCanonicalCatalogMatches: async () => [],
}));
vi.mock("@/lib/network-stock.functions", () => ({
  listShopInquiries: state.inquiries,
  updateNetworkInquiryStatus: vi.fn(),
  reserveNetworkInquiry: vi.fn(),
  releaseNetworkInquiry: vi.fn(),
  NETWORK_INQUIRY_STATUSES: ["pending"],
}));
vi.mock("@/components/business/stock-adjustment", () => ({
  BusinessStockAdjustment: ({ selected }: { selected: { name: string } | null }) =>
    selected ? <div role="dialog">Stock correction for {selected.name}</div> : null,
}));
vi.mock("@/components/parts/network-exposure-card", () => ({ NetworkExposureCard: () => null }));
vi.mock("@/components/business/inventory-item-form", () => ({
  InventoryItemFormDialog: ({
    open,
    editing,
    readAccountId,
  }: {
    open: boolean;
    editing: { name: string } | null;
    readAccountId: string;
  }) =>
    open ? (
      <div role="dialog">
        Draft: {editing?.name} for {readAccountId}
      </div>
    ) : null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: { type_slug: "parts" }, error: null }),
      };
      return q;
    },
    channel: () => {
      const ch = { on: () => ch, subscribe: () => ch };
      return ch;
    },
    removeChannel: vi.fn(),
  },
}));
const Page = Route.options.component as React.ComponentType;
const clients: QueryClient[] = [];
const row = (name = "Account A private stock") => ({
  id: "item-a",
  business_id: state.business,
  name,
  qty_on_hand: 10,
  network_visible: false,
});
function show(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  clients.push(client);
  const view = () => (
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  const ui = render(view());
  return { rerender: () => ui.rerender(view()), client };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.account = "account-a";
  state.business = "business-a";
  state.loading = false;
  state.load.mockImplementation(async () => [row()]);
  state.capability.mockResolvedValue({ canManage: true, allowed: false });
  state.inquiries.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  for (const c of clients.splice(0)) c.clear();
});
it("an account switch clears rows and the open draft before the next read completes", async () => {
  const ui = show();
  fireEvent.click(await screen.findByRole("button", { name: "Edit Account A private stock" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("Account A private stock");
  let resolve!: (v: unknown) => void;
  state.load.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  state.account = "account-b";
  ui.rerender();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByText("Account A private stock")).not.toBeInTheDocument();
  await act(async () => resolve([row("Account B permitted stock")]));
  expect(await screen.findByText("Account B permitted stock")).toBeInTheDocument();
});
it("a business switch cannot retain the old store's search or item draft", async () => {
  const ui = show();
  fireEvent.click(await screen.findByRole("button", { name: "Edit Account A private stock" }));
  fireEvent.change(
    screen.getByLabelText("Search business inventory and private part cross-references"),
    { target: { value: "private" } },
  );
  state.business = "business-b";
  state.load.mockResolvedValue([row("Business B stock")]);
  ui.rerender();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    screen.getByLabelText("Search business inventory and private part cross-references"),
  ).toHaveValue("");
  expect(await screen.findByText("Business B stock")).toBeInTheDocument();
  expect(screen.queryByText("Account A private stock")).not.toBeInTheDocument();
});
it("a legacy business-only cache entry is never treated as the new account's inventory", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["business-inventory", "business-a"], [row("Wrong cached secret")]);
  let resolve!: (v: unknown) => void;
  state.load.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  show(client);
  expect(screen.queryByText("Wrong cached secret")).not.toBeInTheDocument();
  await act(async () => resolve([row("Fresh stock")]));
  expect(await screen.findByText("Fresh stock")).toBeInTheDocument();
});
it("a failed inventory read shows retry, not an empty stock list or enabled editing", async () => {
  state.load.mockRejectedValue(new Error("private database failure"));
  show();
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  expect(screen.queryByText(/No inventory yet/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add item" })).not.toBeInTheDocument();
  expect(screen.queryByText(/private database failure/)).not.toBeInTheDocument();
  state.load.mockResolvedValue([row("Recovered")]);
  fireEvent.click(screen.getByRole("button", { name: "Reload inventory" }));
  expect(await screen.findByText("Recovered")).toBeInTheDocument();
});
it("logout and auth loading immediately hide the inventory", async () => {
  const ui = show();
  await screen.findByText("Account A private stock");
  state.loading = true;
  ui.rerender();
  expect(screen.queryByText("Account A private stock")).not.toBeInTheDocument();
  state.account = "";
  state.loading = false;
  ui.rerender();
  expect(screen.queryByRole("button", { name: "Add item" })).not.toBeInTheDocument();
  await waitFor(() => expect(state.load).toHaveBeenCalledTimes(1));
});

it("authorized staff opens the stock correction flow instead of dispatching a blind plus/minus write", async () => {
  show();
  fireEvent.click(
    await screen.findByRole("button", { name: "Adjust stock for Account A private stock" }),
  );
  expect(screen.getByRole("dialog")).toHaveTextContent(
    "Stock correction for Account A private stock",
  );
  expect(screen.queryByRole("button", { name: "Increase", exact: true })).not.toBeInTheDocument();
});
it("ordinary staff does not receive stock adjustment controls", async () => {
  state.capability.mockResolvedValue({ canManage: false, allowed: false });
  show();
  await screen.findByText("Account A private stock");
  expect(screen.queryByRole("button", { name: /Adjust stock for/ })).not.toBeInTheDocument();
});
