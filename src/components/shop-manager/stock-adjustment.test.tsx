// Actual dialog and route + real QueryClient. SQL/session acceptance is a separate test job.
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShopStockAdjustment } from "@/components/shop-manager/stock-adjustment";
import { Route } from "@/routes/_authenticated/workspace.inventory.$id";
import {
  shopStockPendingKey,
  saveShopStockPending,
  type ShopStockRequest,
} from "@/lib/shop-stock-operation";
const a = "10000000-0000-4000-8000-000000000001",
  b = "10000000-0000-4000-8000-000000000002";
const shop = "20000000-0000-4000-8000-000000000001",
  item = "30000000-0000-4000-8000-000000000001";
const op = "80000000-0000-4000-8000-000000000001";
const state = vi.hoisted(() => ({
  account: "10000000-0000-4000-8000-000000000001",
  loading: false,
  read: vi.fn(),
  submit: vi.fn(),
  inspect: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.account ? { id: state.account } : null, loading: state.loading }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/shop-stock-operation.functions", () => ({
  getShopStockItem: (v: unknown) => state.read(v),
  submitShopStockAdjustment: (v: unknown) => state.submit(v),
  inspectShopStockAdjustment: (v: unknown) => state.inspect(v),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useParams: () => ({ id: "30000000-0000-4000-8000-000000000001" }),
  }),
  useRouter: () => ({ invalidate: vi.fn() }),
  Link: ({ children, to }: React.PropsWithChildren<{ to: string }>) => <a href={to}>{children}</a>,
}));
const snapshot = {
  id: item,
  shop_id: shop,
  name: "Brake pads A",
  quantity: 10,
  updated_at: "2026-01-01T00:00:00.123456Z",
};
const request = (): ShopStockRequest => ({
  version: 1,
  operationId: op,
  expectedAccountId: a,
  shopId: shop,
  itemId: item,
  expectedQuantity: "10",
  delta: "2",
  expectedUpdatedAt: snapshot.updated_at,
  reason: "Cycle count",
});
const complete = (r: ShopStockRequest) => ({
  version: 1,
  status: "completed",
  request: r,
  transactionId: "90000000-0000-4000-8000-000000000001",
  quantityBefore: r.expectedQuantity,
  quantityAfter: (BigInt(r.expectedQuantity) + BigInt(r.delta)).toString(),
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function fixture() {
  const changed = vi.fn(),
    closed = vi.fn();
  const props = {
    accountId: a,
    shopId: shop,
    selected: snapshot,
    canAdjust: true,
    onClose: closed,
    onChanged: changed,
  };
  return { ...render(<ShopStockAdjustment {...props} />), props, changed, closed };
}
function fill(quantity = "2") {
  fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: quantity } });
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Cycle count" } });
}
beforeEach(() => {
  window.sessionStorage.clear();
  state.account = a;
  state.loading = false;
  state.submit
    .mockReset()
    .mockImplementation(({ data }: { data: ShopStockRequest }) => Promise.resolve(complete(data)));
  state.inspect
    .mockReset()
    .mockImplementation(({ data }: { data: ShopStockRequest }) => Promise.resolve(complete(data)));
  state.read.mockReset().mockResolvedValue(view());
  vi.spyOn(crypto, "randomUUID").mockReturnValue(op);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("native stock adjustment", () => {
  it("records an addition through one RPC and clears only the confirmed operation", async () => {
    const f = fixture();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
    await screen.findByText(/Stock adjustment recorded: 10 → 12/);
    expect(state.submit).toHaveBeenCalledTimes(1);
    expect(state.submit.mock.calls[0][0].data).toEqual(request());
    expect(window.sessionStorage.getItem(shopStockPendingKey(a, shop))).toBeNull();
    expect(f.changed).toHaveBeenCalledTimes(1);
  });
  it("removes whole units", async () => {
    fixture();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fill("3");
    fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
    await screen.findByText(/10 → 7/);
    expect(state.submit.mock.calls[0][0].data.delta).toBe("-3");
  });
  it("sets exact stock to zero", async () => {
    fixture();
    fireEvent.click(screen.getByRole("button", { name: "Set exact" }));
    fireEvent.change(screen.getByLabelText("New quantity"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Write-down" } });
    fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
    await screen.findByText(/10 → 0/);
    expect(state.submit.mock.calls[0][0].data.delta).toBe("-10");
  });
  it("rejects fractional quantities before storage or dispatch", async () => {
    fixture();
    fill("1.5");
    fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
    await screen.findByText(/Nothing was sent/);
    expect(state.submit).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });
  it("persists before dispatch and suppresses same-tick double submission", async () => {
    const pending = deferred<ReturnType<typeof complete>>();
    state.submit.mockImplementation(({ data }: { data: ShopStockRequest }) => {
      expect(JSON.parse(sessionStorage.getItem(shopStockPendingKey(a, shop))!)).toEqual(data);
      return pending.promise;
    });
    fixture();
    fill();
    const button = screen.getByRole("button", { name: "Record adjustment" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(state.submit).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(complete(request())));
    await screen.findByText(/Stock adjustment recorded/);
  });
  it("retains an unknown outcome and checks it without creating a replacement", async () => {
    state.submit.mockRejectedValue(new Error("connection lost"));
    fixture();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
    await screen.findByText(/result is unconfirmed/);
    expect(JSON.parse(sessionStorage.getItem(shopStockPendingKey(a, shop))!)).toEqual(request());
    fireEvent.click(screen.getByRole("button", { name: "Check result" }));
    await screen.findByText(/Stock adjustment recorded/);
    expect(state.inspect.mock.calls[0][0].data).toEqual(request());
    expect(state.submit).toHaveBeenCalledTimes(1);
  });
  it("restores a saved request after reload and retries its exact intent", async () => {
    saveShopStockPending(sessionStorage, request());
    render(
      <ShopStockAdjustment
        accountId={a}
        shopId={shop}
        selected={null}
        canAdjust
        onClose={vi.fn()}
        onChanged={vi.fn()}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Retry same request" }));
    await screen.findByText(/Stock adjustment recorded/);
    expect(state.submit.mock.calls[0][0].data).toEqual(request());
  });
  it("does not release an unresolved request when its dialog closes", async () => {
    state.submit.mockResolvedValue({ version: 1, status: "unknown" });
    const f = fixture();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
    await screen.findByText(/result is unconfirmed/);
    fireEvent.click(screen.getByText("Close", { selector: "button" }));
    expect(f.closed).toHaveBeenCalledTimes(1);
    f.rerender(<ShopStockAdjustment {...f.props} selected={null} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(sessionStorage.getItem(shopStockPendingKey(a, shop))).not.toBeNull();
    expect(screen.getByRole("button", { name: "Review stock request" })).toBeVisible();
  });
  it("suppresses a late old-account result after account change", async () => {
    const pending = deferred<ReturnType<typeof complete>>();
    state.submit.mockReturnValue(pending.promise);
    const f = fixture();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
    state.account = b;
    f.rerender(<ShopStockAdjustment {...f.props} />);
    await act(async () => pending.resolve(complete(request())));
    expect(screen.queryByText(/Stock adjustment recorded/)).toBeNull();
    expect(f.changed).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(shopStockPendingKey(a, shop))).not.toBeNull();
  });
  it("keeps unavailable requests for recovery and never silently falls back", async () => {
    state.submit.mockResolvedValue({ version: 1, status: "unavailable" });
    fixture();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
    await screen.findByText(/database update is unavailable/);
    expect(sessionStorage.getItem(shopStockPendingKey(a, shop))).not.toBeNull();
    expect(state.submit).toHaveBeenCalledTimes(1);
  });
  it("does not dispatch when durable browser storage fails", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    fixture();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
    await screen.findByText(/Nothing was sent/);
    expect(state.submit).not.toHaveBeenCalled();
  });
  it("permanent conflict permits refresh but does not retry under a new ID", async () => {
    state.submit.mockImplementation(({ data }: { data: ShopStockRequest }) =>
      Promise.resolve({ version: 1, status: "rejected", request: data, code: "conflict" }),
    );
    fixture();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Record adjustment" }));
    await screen.findByText(/record changed/);
    expect(state.submit).toHaveBeenCalledTimes(1);
    expect(sessionStorage.length).toBe(0);
    expect(screen.queryByRole("button", { name: "Record adjustment" })).toBeNull();
  });
});
function view(accountId = a, restricted = false) {
  return {
    version: 1,
    accountId,
    shopId: shop,
    canAdjust: !restricted,
    costRestricted: restricted,
    item: {
      ...snapshot,
      sku: "PAD-A",
      part_number: null,
      barcode: null,
      category: "Brakes",
      subcategory: null,
      supplier: restricted ? null : "Private supplier",
      manufacturer: null,
      quantity_in_stock: 10,
      reorder_point: 2,
      on_hold: 0,
      on_order: 0,
      unit_price: 100,
      cost_per_unit: restricted ? null : 30,
      sell_price_per_unit: 100,
      margin_markup: restricted ? null : 25,
      location: null,
      status: "In Stock",
      description: null,
      vehicle_compatibility: null,
      warranty_period: null,
      notes: null,
      created_at: null,
    },
    transactions: [],
  };
}
const Page = Route.options.component as React.ComponentType;
function page() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const content = (
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>
  );
  return { client, ...render(content), content };
}
describe("native inventory route", () => {
  it("loads the authorized account/item reader and opens the new adjustment dialog", async () => {
    page();
    await screen.findByText("Brake pads A");
    expect(state.read.mock.calls[0][0]).toEqual({ data: { expectedAccountId: a, itemId: item } });
    fireEvent.click(screen.getByRole("button", { name: "Adjust stock" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Adjust Shop Manager stock");
  });
  it("requires the correct selected shop even when the manager may read costs", async () => {
    state.read.mockResolvedValue({ ...view(), canAdjust: false });
    page();
    await screen.findByText("Brake pads A");
    expect(screen.getByText("Private supplier")).toBeVisible();
    expect(screen.getByRole("button", { name: "Adjust stock" })).toBeDisabled();
    expect(screen.getByText(/this shop selected in your employee profile/)).toBeVisible();
  });
  it("keeps clerk costs hidden and adjustment disabled", async () => {
    state.read.mockResolvedValue(view(a, true));
    page();
    await screen.findByText("Brake pads A");
    expect(screen.queryByText("Private supplier")).toBeNull();
    expect(screen.getByRole("button", { name: "Adjust stock" })).toBeDisabled();
  });
  it("shows generic failure instead of private backend diagnostics", async () => {
    state.read.mockRejectedValue(new Error("secret internal path"));
    page();
    await screen.findByRole("alert");
    expect(screen.queryByText(/secret internal/)).toBeNull();
    expect(screen.queryByText("Brake pads A")).toBeNull();
  });
  it("fences old-account in-flight reads", async () => {
    const pending = deferred<ReturnType<typeof view>>();
    state.read.mockReturnValueOnce(pending.promise);
    const f = page();
    state.account = b;
    state.read.mockResolvedValue(view(b));
    f.rerender(
      <QueryClientProvider client={f.client}>
        <Page />
      </QueryClientProvider>,
    );
    await screen.findByText("Brake pads A");
    await act(async () =>
      pending.resolve({ ...view(a), item: { ...view(a).item, name: "Old private inventory" } }),
    );
    expect(screen.queryByText("Old private inventory")).toBeNull();
  });
  it("hides stale detail while a refetch is pending", async () => {
    const f = page();
    await screen.findByText("Brake pads A");
    const pending = deferred<ReturnType<typeof view>>();
    state.read.mockReturnValue(pending.promise);
    act(() => {
      void f.client.invalidateQueries({ queryKey: ["shop-manager"] });
    });
    await waitFor(() => expect(screen.queryByText("Brake pads A")).toBeNull());
    await act(async () => pending.resolve(view()));
    await screen.findByText("Brake pads A");
  });
});
