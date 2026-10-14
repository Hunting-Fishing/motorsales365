import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VehicleReceiptPanel } from "./vehicle-receipt-panel";
import * as api from "@/lib/vehicle-receipts.functions";
import type { VehicleReceipt } from "@/lib/vehicle-receipts";
const auth = vi.hoisted(() => ({ userId: "owner-a" as string | null }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: auth.userId ? { id: auth.userId } : null }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ upload: vi.fn().mockResolvedValue({ error: null }) }) } },
}));
vi.mock("@/lib/vehicle-receipts.functions", () => ({
  getVehicleReceipts: vi.fn(),
  startVehicleReceipt: vi.fn(),
  saveVehicleReceipt: vi.fn(),
  extractVehicleReceipt: vi.fn(),
  getPrivateReceiptUrl: vi.fn(),
  installReceiptItem: vi.fn(),
  setReceiptSharing: vi.fn(),
  discardReceiptDraft: vi.fn(),
  requestShopVehicleLink: vi.fn(),
  approveShopVehicleLink: vi.fn(),
  listVehicleShopLinks: vi.fn(),
  revokeShopVehicleLink: vi.fn(),
  recordVehicleReceiptExpense: vi.fn(),
}));
const vehicle = "10000000-0000-4000-8000-000000000001";
function receipt(vendor: string): VehicleReceipt {
  return {
    id: "receipt-1",
    vehicle_id: vehicle,
    shop_vehicle_id: null,
    created_by: "owner-a",
    file_path: null,
    file_name: null,
    media_type: null,
    vendor,
    purchased_on: null,
    currency: "PHP",
    total: null,
    status: "draft",
    share_with_shop: false,
    items: [],
  };
}
function show(
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
) {
  const view = () => (
    <QueryClientProvider client={client}>
      <VehicleReceiptPanel vehicleId={vehicle} />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
beforeEach(() => {
  vi.clearAllMocks();
  auth.userId = "owner-a";
  vi.mocked(api.getVehicleReceipts).mockResolvedValue({ receipts: [], linkedVehicleId: null });
  vi.mocked(api.listVehicleShopLinks).mockResolvedValue([]);
  vi.mocked(api.startVehicleReceipt).mockResolvedValue({ id: "receipt-1", file_path: null });
  vi.mocked(api.saveVehicleReceipt).mockResolvedValue(null);
});
describe("vehicle receipt workflow", () => {
  it("requires manual category and human review before confirming purchases", async () => {
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await waitFor(() => expect(screen.getByRole("button", { name: "Add receipt" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Add receipt" }));
    const dialog = within(screen.getByRole("dialog"));
    const confirm = dialog.getByRole("button", { name: "Confirm purchases" });
    expect(confirm).toBeDisabled();
    fireEvent.change(dialog.getByLabelText("Purchase date"), { target: { value: "2026-10-01" } });
    fireEvent.change(dialog.getByLabelText("Item description"), {
      target: { value: "Rear brake shoes" },
    });
    fireEvent.change(dialog.getByLabelText("Category"), { target: { value: "brakes" } });
    fireEvent.click(dialog.getByRole("checkbox", { name: /I checked this item/ }));
    expect(confirm).toBeEnabled();
    // Editing the description invalidates the earlier human approval.
    fireEvent.change(dialog.getByLabelText("Item description"), {
      target: { value: "Front brake pads" },
    });
    expect(confirm).toBeDisabled();
    fireEvent.click(dialog.getByRole("checkbox", { name: /I checked this item/ }));
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(api.saveVehicleReceipt).toHaveBeenCalledWith({
        data: expect.objectContaining({
          purchasedOn: "2026-10-01",
          confirm: true,
          items: [
            expect.objectContaining({
              description: "Front brake pads",
              category: "brakes",
              reviewed: true,
            }),
          ],
        }),
      }),
    );
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vehicle-receipts", "owner-a"] }),
    );
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["vehicle-receipts"] });
    expect(api.installReceiptItem).not.toHaveBeenCalled();
  });
  it("offers manual entry when AI scanning fails without approving inferred data", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValue({
      linkedVehicleId: null,
      receipts: [
        {
          id: "receipt-1",
          vehicle_id: vehicle,
          shop_vehicle_id: null,
          created_by: "owner",
          file_path: "owner/receipt/original.pdf",
          file_name: "Receipt.pdf",
          media_type: "application/pdf",
          vendor: null,
          purchased_on: null,
          currency: "PHP",
          total: null,
          status: "draft",
          share_with_shop: false,
          items: [],
        },
      ],
    });
    vi.mocked(api.extractVehicleReceipt).mockRejectedValue(
      new Error("AI scanning is not configured yet. You can enter the receipt manually."),
    );
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.click(dialog.getByRole("checkbox", { name: /Allow this receipt/ }));
    fireEvent.click(dialog.getByRole("button", { name: "Scan with AI" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent("enter the receipt manually");
    expect(dialog.getByLabelText("Item description")).toBeEnabled();
    expect(dialog.getByRole("button", { name: "Confirm purchases" })).toBeDisabled();
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
  });

  it("separates cached receipts and linked shops when the authenticated account changes", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValue({
      receipts: [receipt("Account A private supplier")],
      linkedVehicleId: null,
    });
    vi.mocked(api.listVehicleShopLinks).mockResolvedValue([
      { shop_vehicle_id: "shop-a", shop_name: "Account A linked shop", active: true },
    ]);
    const { rerender, view, client } = show();
    await screen.findByText("Account A private supplier");
    await screen.findByText("Account A linked shop");

    auth.userId = "owner-b";
    vi.mocked(api.getVehicleReceipts).mockResolvedValue({
      receipts: [receipt("Account B private supplier")],
      linkedVehicleId: null,
    });
    vi.mocked(api.listVehicleShopLinks).mockResolvedValue([
      { shop_vehicle_id: "shop-b", shop_name: "Account B linked shop", active: true },
    ]);
    rerender(view());
    expect(screen.queryByText("Account A private supplier")).not.toBeInTheDocument();
    expect(screen.queryByText("Account A linked shop")).not.toBeInTheDocument();
    await screen.findByText("Account B private supplier");
    await screen.findByText("Account B linked shop");
    expect(api.getVehicleReceipts).toHaveBeenCalledTimes(2);
    expect(api.listVehicleShopLinks).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(["vehicle-receipts", "owner-a", vehicle, undefined])).toBeDefined();
    expect(client.getQueryData(["vehicle-receipts", "owner-b", vehicle, undefined])).toBeDefined();
    expect(client.getQueryData(["vehicle-shop-links", "owner-a", vehicle])).toBeDefined();
    expect(client.getQueryData(["vehicle-shop-links", "owner-b", vehicle])).toBeDefined();
  });

  it("does not fetch or render private cached data while signed out", async () => {
    auth.userId = null;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["vehicle-receipts", "owner-a", vehicle, undefined], {
      receipts: [receipt("Cached private supplier")],
      linkedVehicleId: null,
    });
    client.setQueryData(
      ["vehicle-shop-links", "owner-a", vehicle],
      [{ shop_vehicle_id: "shop-a", shop_name: "Cached private shop", active: true }],
    );
    const { container } = show(client);
    expect(container).toBeEmptyDOMElement();
    expect(api.getVehicleReceipts).not.toHaveBeenCalled();
    expect(api.listVehicleShopLinks).not.toHaveBeenCalled();
  });

  it("removes an open private receipt editor on sign-out and does not reopen it for another account", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValue({
      receipts: [receipt("Account A editor supplier")],
      linkedVehicleId: null,
    });
    const { rerender, view, container } = show();
    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    expect(screen.getByLabelText("Supplier / shop")).toHaveValue("Account A editor supplier");

    auth.userId = null;
    rerender(view());
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.getVehicleReceipts).toHaveBeenCalledTimes(1);
    expect(api.listVehicleShopLinks).toHaveBeenCalledTimes(1);

    auth.userId = "owner-b";
    vi.mocked(api.getVehicleReceipts).mockResolvedValue({ receipts: [], linkedVehicleId: null });
    rerender(view());
    await screen.findByText("No receipts yet. Upload a receipt or enter purchases manually.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Account A editor supplier")).not.toBeInTheDocument();
  });

  it("resets an open private receipt editor on a direct account switch", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValue({
      receipts: [receipt("Account A editor supplier")],
      linkedVehicleId: null,
    });
    const { rerender, view } = show();
    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    expect(screen.getByLabelText("Supplier / shop")).toHaveValue("Account A editor supplier");

    auth.userId = "owner-b";
    vi.mocked(api.getVehicleReceipts).mockResolvedValue({ receipts: [], linkedVehicleId: null });
    rerender(view());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await screen.findByText("No receipts yet. Upload a receipt or enter purchases manually.");
  });

  it("invalidates only the current account's receipt and shop-link caches after connecting a shop", async () => {
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fireEvent.change(screen.getByLabelText("Shop connection code"), {
      target: { value: "0123456789abcdef0123456789abcdef" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve connection" }));
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vehicle-shop-links", "owner-a"] }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vehicle-receipts", "owner-a"] });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["vehicle-shop-links"] });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["vehicle-receipts"] });
  });
});
