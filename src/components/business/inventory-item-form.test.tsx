// Real form and QueryClient; server replies are mocked, not production acceptance.
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InventoryItemFormDialog } from "./inventory-item-form";
const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const ITEM = "00000000-0000-4000-8000-000000000011";
const ACCOUNT = "00000000-0000-4000-8000-000000000021";
const OTHER = "00000000-0000-4000-8000-000000000022";
const VERSION = "2026-10-20T12:00:00.123456+00:00";
const state = vi.hoisted(() => ({
  userId: "",
  loading: false,
  save: vi.fn(),
  locations: vi.fn(),
  saved: vi.fn(),
  close: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null, loading: state.loading }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/business-inventory.functions", () => ({ upsertBusinessInventoryItem: state.save }));
vi.mock("@/lib/parts-network-operations.functions", () => ({
  listBusinessPartsLocations: state.locations,
  getCanonicalCatalogMatches: async () => [],
}));
vi.mock("@/lib/plan-limit-toast", () => ({ handlePlanLimitResult: () => false }));
vi.mock("sonner", () => ({ toast: { success: state.success, error: state.error } }));
const clients: QueryClient[] = [];
function row() {
  return {
    id: ITEM,
    business_id: A,
    updated_at: VERSION,
    name: "Brake pads",
    main_category: "Parts",
    category: "Brakes",
    price: 125,
    qty_on_hand: 10,
    qty_on_hold: 3,
    qty_on_order: 5,
    network_visible: false,
    notes: "Private stock note",
  };
}
function show(editing: Record<string, unknown> = row()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  let props = {
    open: true,
    onOpenChange: state.close,
    onSaved: state.saved,
    businessId: A,
    readAccountId: ACCOUNT,
    editing,
  };
  const view = () => (
    <QueryClientProvider client={client}>
      <InventoryItemFormDialog {...props} />
    </QueryClientProvider>
  );
  const ui = render(view());
  return {
    rerender: (patch: Partial<typeof props> = {}) => {
      props = { ...props, ...patch };
      ui.rerender(view());
    },
  };
}
const save = () => fireEvent.click(screen.getByRole("button", { name: "Update Item" }));
beforeEach(() => {
  vi.clearAllMocks();
  state.userId = ACCOUNT;
  state.loading = false;
  state.locations.mockResolvedValue([]);
  state.save.mockImplementation(async () => ({ ...row(), updated_at: "2026-10-20T12:01:00Z" }));
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});
describe("scoped inventory metadata editing", () => {
  it("saves notes with account/version and never submits cached stock or catalogue identifiers", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Additional" }));
    fireEvent.change(screen.getByPlaceholderText("Enter any additional notes about this item"), {
      target: { value: "New workshop note" },
    });
    save();
    await waitFor(() => expect(state.success).toHaveBeenCalledWith("Item updated"));
    const data = state.save.mock.calls[0][0].data;
    expect(data).toMatchObject({
      id: ITEM,
      businessId: A,
      expectedAccountId: ACCOUNT,
      expectedUpdatedAt: VERSION,
      notes: "New workshop note",
      network_visible: false,
    });
    expect(data).not.toHaveProperty("qty_on_hand");
    expect(data).not.toHaveProperty("catalog_part_id");
    expect(data.extra).not.toHaveProperty("qty_on_hold");
    expect(data.extra).not.toHaveProperty("qty_on_order");
    expect(state.saved).toHaveBeenCalledOnce();
    expect(state.close).toHaveBeenCalledWith(false);
  });
  it("shows existing quantities read-only rather than offering an unsafe stock write", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Inventory" }));
    for (const label of ["Current Quantity", "On Hold", "On Order"])
      expect(screen.getByLabelText(label)).toHaveAttribute("readonly");
    expect(screen.getByRole("note")).toHaveTextContent("will not change");
  });
  it("retains the opening version even when realtime delivers a newer row", async () => {
    const ui = show();
    fireEvent.change(screen.getByPlaceholderText("Enter item name"), {
      target: { value: "Draft from original snapshot" },
    });
    ui.rerender({
      editing: { ...row(), name: "Colleague's new name", updated_at: "2026-10-20T12:02:00Z" },
    });
    save();
    await waitFor(() => expect(state.save).toHaveBeenCalledOnce());
    expect(state.save.mock.calls[0][0].data).toMatchObject({
      expectedUpdatedAt: VERSION,
      name: "Draft from original snapshot",
    });
  });
  it("conflicts keep the draft, refuse a second save, and offer an explicit reload", async () => {
    state.save.mockResolvedValue({ error: "INVENTORY_EDIT_CONFLICT" });
    show();
    fireEvent.change(screen.getByPlaceholderText("Enter item name"), {
      target: { value: "Unsaved draft" },
    });
    save();
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was saved");
    expect(screen.getByPlaceholderText("Enter item name")).toHaveValue("Unsaved draft");
    expect(screen.getByRole("button", { name: "Update Item" })).toBeDisabled();
    expect(state.success).not.toHaveBeenCalled();
    expect(state.saved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close and reload inventory" }));
    expect(state.saved).toHaveBeenCalledOnce();
    expect(state.close).toHaveBeenCalledWith(false);
  });
  it("an unconfirmed reply cannot report success or trigger a blind retry", async () => {
    state.save.mockResolvedValue({ ...row(), business_id: B });
    show();
    save();
    expect(await screen.findByRole("alert")).toHaveTextContent("may have completed");
    expect(screen.getByRole("button", { name: "Update Item" })).toBeDisabled();
    expect(state.success).not.toHaveBeenCalled();
  });
  it("double clicking while waiting dispatches one request", async () => {
    let resolve!: (value: unknown) => void;
    state.save.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    show();
    const button = screen.getByRole("button", { name: "Update Item" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(state.save).toHaveBeenCalledOnce();
    await act(async () => resolve(row()));
  });
  it("closing during save suppresses the late reply and callbacks", async () => {
    let resolve!: (value: unknown) => void;
    state.save.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const ui = show();
    save();
    ui.rerender({ open: false });
    await act(async () => resolve(row()));
    expect(state.success).not.toHaveBeenCalled();
    expect(state.saved).not.toHaveBeenCalled();
    expect(state.close).not.toHaveBeenCalled();
  });
  it("an account change hides the old private draft and ignores an old save", async () => {
    let resolve!: (value: unknown) => void;
    state.save.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const ui = show();
    save();
    state.userId = OTHER;
    ui.rerender();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await act(async () => resolve(row()));
    expect(state.success).not.toHaveBeenCalled();
    expect(state.saved).not.toHaveBeenCalled();
  });
  it("a mismatched business is never rendered or submitted", () => {
    const ui = show();
    ui.rerender({ businessId: B });
    expect(screen.getByRole("alert")).toHaveTextContent("does not belong");
    expect(screen.queryByDisplayValue("Brake pads")).not.toBeInTheDocument();
    expect(state.save).not.toHaveBeenCalled();
  });
  it("reopening the editor drops the old draft and reads the supplied fresh snapshot", () => {
    const ui = show();
    fireEvent.change(screen.getByPlaceholderText("Enter item name"), {
      target: { value: "Discard me" },
    });
    ui.rerender({ open: false });
    ui.rerender({ open: true, editing: { ...row(), name: "Fresh server name" } });
    expect(screen.getByPlaceholderText("Enter item name")).toHaveValue("Fresh server name");
  });
  it("a missing original timestamp refuses to dispatch", () => {
    show({ ...row(), updated_at: null });
    save();
    expect(state.save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("original version");
  });
});
