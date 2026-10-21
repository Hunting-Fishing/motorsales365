// Actual workspace boundary and QueryClient. Backend signing/SQL are separate gates.
import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkspaceShopSwitcher } from "./shop-switcher";
import {
  selectionPendingKey,
  selectionChangedKey,
  saveSelectionPending,
  type ShopSelectionRequest,
} from "@/lib/shop-selection";
const a = "10000000-0000-4000-8000-000000000001",
  b = "10000000-0000-4000-8000-000000000002",
  s = "20000000-0000-4000-8000-000000000001",
  target = "20000000-0000-4000-8000-000000000002",
  op = "80000000-0000-4000-8000-000000000001";
const state = vi.hoisted(() => ({
  account: "10000000-0000-4000-8000-000000000001",
  read: vi.fn(),
  change: vi.fn(),
  inspect: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.account ? { id: state.account } : null, loading: false }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/shop-selection.functions", () => ({
  listSelectableShops: (v: unknown) => state.read(v),
  changeSelectedShop: (v: unknown) => state.change(v),
  inspectShopSelection: (v: unknown) => state.inspect(v),
}));
const request = (): ShopSelectionRequest => ({
  version: 1,
  expectedAccountId: a,
  operationId: op,
  profileId: a,
  expectedShopId: s,
  expectedUpdatedAt: "2026-01-01T00:00:00.123456Z",
  targetShopId: target,
});
const view = (account = a, blocker: string | null = null) => ({
  version: 1,
  accountId: account,
  profileId: account,
  selectedShopId: s,
  profileUpdatedAt: request().expectedUpdatedAt,
  blocker,
  shops: [
    { shopId: s, businessId: s, name: "Shop A", role: "owner" },
    { shopId: target, businessId: target, name: "Shop B", role: "clerk" },
  ],
});
const completed = (r = request()) => ({
  version: 1,
  status: "completed",
  request: r,
  selectedShopId: r.targetShopId,
  profileUpdatedAt: "2026-01-02T00:00:00Z",
  nativeRole: "office_admin",
});
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function setup() {
  const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
    reload = vi.fn();
  client.setQueryData(["old-private-customer"], "Private A");
  const tree = () => (
    <QueryClientProvider client={client}>
      <WorkspaceShopSwitcher onReload={reload}>
        <p>Workspace private data</p>
      </WorkspaceShopSwitcher>
    </QueryClientProvider>
  );
  return { ...render(tree()), client, reload, tree };
}
async function prepare() {
  fireEvent.click(screen.getByRole("button", { name: "Switch shop" }));
  const select = await screen.findByLabelText("Destination shop");
  fireEvent.change(select, { target: { value: target } });
  fireEvent.click(screen.getByRole("checkbox"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm switch" })).toBeEnabled());
}
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  state.account = a;
  state.read
    .mockReset()
    .mockImplementation(({ data }: { data: { expectedAccountId: string } }) =>
      Promise.resolve(view(data.expectedAccountId)),
    );
  state.change
    .mockReset()
    .mockImplementation(({ data }: { data: ShopSelectionRequest }) =>
      Promise.resolve(completed(data)),
    );
  state.inspect
    .mockReset()
    .mockImplementation(({ data }: { data: ShopSelectionRequest }) =>
      Promise.resolve(completed(data)),
    );
  vi.spyOn(crypto, "randomUUID").mockReturnValue(op);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("authorized shop switching", () => {
  it("persists intent, clears former-shop cache and reloads after confirmed switch", async () => {
    const f = setup();
    state.change.mockImplementation(({ data }: { data: ShopSelectionRequest }) => {
      expect(JSON.parse(sessionStorage.getItem(selectionPendingKey(a))!)).toEqual(data);
      return Promise.resolve(completed(data));
    });
    await prepare();
    fireEvent.click(screen.getByRole("button", { name: "Confirm switch" }));
    await waitFor(() => expect(f.reload).toHaveBeenCalledTimes(1));
    expect(state.change).toHaveBeenCalledTimes(1);
    expect(state.change.mock.calls[0][0].data).toEqual(request());
    expect(f.client.getQueryData(["old-private-customer"])).toBeUndefined();
    expect(sessionStorage.getItem(selectionPendingKey(a))).toBeNull();
    expect(screen.queryByText("Workspace private data")).toBeNull();
  });
  for (const blocker of ["active_shift", "open_register", "role_review"])
    it(`blocks new switch for ${blocker}`, async () => {
      state.read.mockResolvedValue(view(a, blocker));
      setup();
      fireEvent.click(screen.getByRole("button", { name: "Switch shop" }));
      expect(await screen.findByLabelText("Destination shop")).toBeDisabled();
      expect(screen.getByRole("button", { name: "Confirm switch" })).toBeDisabled();
      expect(state.change).not.toHaveBeenCalled();
    });
  it("requires explicit acknowledgement of other tabs and devices", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Switch shop" }));
    fireEvent.change(await screen.findByLabelText("Destination shop"), {
      target: { value: target },
    });
    expect(screen.getByRole("button", { name: "Confirm switch" })).toBeDisabled();
  });
  it("refuses to abandon a pending stock operation", async () => {
    sessionStorage.setItem(`365.shop.stock.pending.v1:${a}:${s}`, "{}");
    setup();
    await prepare();
    fireEvent.click(screen.getByRole("button", { name: "Confirm switch" }));
    await screen.findByText(/recover outstanding stock requests/);
    expect(state.change).not.toHaveBeenCalled();
  });
  it("suppresses duplicate clicks and pauses former-shop forms while the request is pending", async () => {
    const p = deferred<ReturnType<typeof completed>>();
    state.change.mockReturnValue(p.promise);
    setup();
    await prepare();
    const button = screen.getByRole("button", { name: "Confirm switch" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(state.change).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Workspace private data")).toBeNull();
    await act(async () => p.resolve(completed()));
  });
  it("recovers a lost reply with the original identity", async () => {
    state.change.mockRejectedValue(Error("lost connection"));
    const f = setup();
    await prepare();
    fireEvent.click(screen.getByRole("button", { name: "Confirm switch" }));
    await screen.findByText(/result is unconfirmed/);
    expect(sessionStorage.getItem(selectionPendingKey(a))).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Check result" }));
    await waitFor(() => expect(f.reload).toHaveBeenCalledTimes(1));
    expect(state.inspect.mock.calls[0][0].data).toEqual(request());
    expect(state.change).toHaveBeenCalledTimes(1);
  });
  it("reload recovery retries the saved request instead of replacing it", async () => {
    saveSelectionPending(sessionStorage, request());
    const f = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Retry same request" }));
    await waitFor(() => expect(f.reload).toHaveBeenCalledTimes(1));
    expect(state.change.mock.calls[0][0].data).toEqual(request());
  });
  it("not observed stays pending; closing the dialog does not resume old forms", async () => {
    saveSelectionPending(sessionStorage, request());
    state.inspect.mockResolvedValue({ version: 1, status: "not_observed", request: request() });
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Check result" }));
    await screen.findByText(/not cancellation/);
    fireEvent.click(screen.getByText("Close", { selector: "button" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Workspace private data")).toBeNull();
    expect(sessionStorage.getItem(selectionPendingKey(a))).not.toBeNull();
  });
  it("late prior-account replies never reload the new account or clear old recovery", async () => {
    const p = deferred<ReturnType<typeof completed>>();
    state.change.mockReturnValue(p.promise);
    const f = setup();
    await prepare();
    fireEvent.click(screen.getByRole("button", { name: "Confirm switch" }));
    await waitFor(() => expect(state.change).toHaveBeenCalledTimes(1));
    state.account = b;
    f.rerender(f.tree());
    await act(async () => p.resolve(completed()));
    expect(f.reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(selectionPendingKey(a))).not.toBeNull();
  });
  it("another tab selection event pauses workspace and requires a fresh reload", async () => {
    const f = setup();
    await screen.findByText("Workspace private data");
    fireEvent(window, new StorageEvent("storage", { key: selectionChangedKey(a), newValue: op }));
    await waitFor(() => expect(screen.queryByText("Workspace private data")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Reload workspace" }));
    expect(f.reload).toHaveBeenCalledTimes(1);
  });
  it("storage failure never dispatches", async () => {
    setup();
    await prepare();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw Error("blocked");
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm switch" }));
    await screen.findByText(/Nothing was sent/);
    expect(state.change).not.toHaveBeenCalled();
  });
  it("no database endpoint leaves existing workspace available but cannot switch", async () => {
    state.read.mockRejectedValue(Error("internal secret"));
    setup();
    await screen.findByText("Workspace private data");
    fireEvent.click(screen.getByRole("button", { name: "Switch shop" }));
    await screen.findByText(/database update or employee profile/);
    expect(screen.queryByText("internal secret")).toBeNull();
    expect(state.change).not.toHaveBeenCalled();
  });
});
