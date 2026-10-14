import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VehicleReceiptPanel } from "./vehicle-receipt-panel";
import * as api from "@/lib/vehicle-receipts.functions";
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
function show() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <VehicleReceiptPanel vehicleId={vehicle} />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getVehicleReceipts).mockResolvedValue({ receipts: [], linkedVehicleId: null });
  vi.mocked(api.listVehicleShopLinks).mockResolvedValue([]);
  vi.mocked(api.startVehicleReceipt).mockResolvedValue({ id: "receipt-1", file_path: null });
  vi.mocked(api.saveVehicleReceipt).mockResolvedValue(null);
});
describe("vehicle receipt workflow", () => {
  it("requires manual category and human review before confirming purchases", async () => {
    show();
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
});
