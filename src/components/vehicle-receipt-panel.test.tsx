import { StrictMode, useLayoutEffect, useRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { VehicleReceiptPanel } from "./vehicle-receipt-panel";
import * as api from "@/lib/vehicle-receipts.functions";
import type { ReceiptTarget, VehicleReceipt } from "@/lib/vehicle-receipts";
const auth = vi.hoisted(() => ({ userId: "owner-a" as string | null }));
const localOcr = vi.hoisted(() => ({ scan: vi.fn(), upload: vi.fn() }));
vi.mock("@/lib/receipt-document.client", () => ({ scanReceiptDocument: localOcr.scan }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: auth.userId ? { id: auth.userId } : null }),
}));
vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
  createClientOnlyFn: (fn: unknown) => fn,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ upload: localOcr.upload }) } },
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
const draftId = "20000000-0000-4000-8000-000000000001";
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
  initialTarget: ReceiptTarget = { vehicleId: vehicle },
) {
  const view = (target: ReceiptTarget = initialTarget) => (
    <QueryClientProvider client={client}>
      <VehicleReceiptPanel {...target} />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
beforeEach(() => {
  vi.clearAllMocks();
  localOcr.upload.mockReset().mockImplementation((path: string) =>
    Promise.resolve({
      data: { path, fullPath: `vehicle-receipts/${path}` },
      error: null,
    }),
  );
  localOcr.scan.mockResolvedValue({
    vendor: "Local supplier",
    purchased_on: "2026-10-15",
    currency: "PHP",
    total: 250,
    items: [
      {
        description: "Oil filter",
        category: null,
        brand: null,
        part_number: null,
        quantity: null,
        total: null,
        confidence: 0.25,
        reviewed: false,
      },
    ],
  });
  auth.userId = "owner-a";
  vi.mocked(api.getVehicleReceipts).mockResolvedValue({ receipts: [], linkedVehicleId: null });
  vi.mocked(api.listVehicleShopLinks).mockResolvedValue([]);
  vi.mocked(api.startVehicleReceipt)
    .mockReset()
    .mockImplementation(async (options) => {
      const { data } = options as unknown as { data: { fileName?: string } };
      return {
        id: draftId,
        file_path: data.fileName ? `owner-a/${draftId}/original.png` : null,
      };
    });
  vi.mocked(api.saveVehicleReceipt).mockReset().mockResolvedValue(null);
  vi.mocked(api.extractVehicleReceipt).mockReset();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function privateReceipt(id = "private-receipt-1"): VehicleReceipt {
  return {
    ...receipt("Private supplier"),
    id,
    file_path: `owner-a/${id}/original.pdf`,
    file_name: "Private receipt.pdf",
    media_type: "application/pdf",
  };
}

describe("private receipt opening lifetime", () => {
  beforeEach(() => {
    vi.mocked(api.getPrivateReceiptUrl).mockReset();
    vi.mocked(api.getVehicleReceipts).mockResolvedValue({
      receipts: [privateReceipt()],
      linkedVehicleId: null,
    });
    vi.spyOn(window, "open").mockReturnValue(null);
    vi.spyOn(toast, "error").mockImplementation(() => 0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a current signed receipt exactly once without invalidating mutation caches", async () => {
    const signed = deferred<string>();
    vi.mocked(api.getPrivateReceiptUrl).mockReturnValueOnce(signed.promise);
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const button = await screen.findByRole("button", { name: /^Receipt$/ });
    fireEvent.click(button);
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledExactlyOnceWith({
      data: { id: "private-receipt-1" },
    });
    expect(button).toBeDisabled();
    expect(window.open).not.toHaveBeenCalled();
    await act(async () => signed.resolve("https://private.example/current-bearer"));
    expect(window.open).toHaveBeenCalledExactlyOnceWith(
      "https://private.example/current-bearer",
      "_blank",
      "noopener,noreferrer",
    );
    expect(button).toBeEnabled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(api.getVehicleReceipts).toHaveBeenCalledTimes(1);
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
    expect(api.recordVehicleReceiptExpense).not.toHaveBeenCalled();
  });

  it("releases a completed read for a separate explicit opening", async () => {
    vi.mocked(api.getPrivateReceiptUrl)
      .mockResolvedValueOnce("https://private.example/first")
      .mockResolvedValueOnce("https://private.example/second");
    show();
    const button = await screen.findByRole("button", { name: /^Receipt$/ });
    fireEvent.click(button);
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1));
    fireEvent.click(button);
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(2));
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledTimes(2);
    expect(window.open).toHaveBeenLastCalledWith(
      "https://private.example/second",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("uses a synchronous lock before React commits duplicate clicks", async () => {
    const signed = deferred<string>();
    vi.mocked(api.getPrivateReceiptUrl).mockReturnValueOnce(signed.promise);
    vi.mocked(api.getVehicleReceipts).mockResolvedValue({
      receipts: [privateReceipt(), privateReceipt("private-receipt-2")],
      linkedVehicleId: null,
    });
    show();
    const buttons = await screen.findAllByRole("button", { name: /^Receipt$/ });
    act(() => {
      buttons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      buttons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      buttons[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledTimes(1);
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
    await act(async () => signed.resolve("https://private.example/one-read"));
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(buttons[0]).toBeEnabled();
    expect(buttons[1]).toBeEnabled();
  });

  it("shows only a generic current failure and permits an explicit retry", async () => {
    const signed = deferred<string>();
    vi.mocked(api.getPrivateReceiptUrl)
      .mockReturnValueOnce(signed.promise)
      .mockResolvedValueOnce("https://private.example/retry");
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const button = await screen.findByRole("button", { name: /^Receipt$/ });
    fireEvent.click(button);
    await act(async () => signed.reject(new Error("secret bearer and private database cause")));
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "Could not open receipt. Please try again.",
    );
    expect(window.open).not.toHaveBeenCalled();
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1));
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledTimes(2);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("redacts a synchronous signing failure and releases the current attempt", async () => {
    vi.mocked(api.getPrivateReceiptUrl).mockImplementationOnce(() => {
      throw new Error("private signing cause");
    });
    show();
    const button = await screen.findByRole("button", { name: /^Receipt$/ });
    fireEvent.click(button);
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      "Could not open receipt. Please try again.",
    );
    expect(button).toBeEnabled();
    expect(window.open).not.toHaveBeenCalled();
  });

  it("redacts a current popup exception and allows an explicit retry", async () => {
    vi.mocked(api.getPrivateReceiptUrl).mockResolvedValue("https://private.example/current");
    vi.mocked(window.open).mockImplementationOnce(() => {
      throw new Error("private bearer popup cause");
    });
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const button = await screen.findByRole("button", { name: /^Receipt$/ });
    fireEvent.click(button);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(
        "Could not open receipt. Please try again.",
      ),
    );
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(2));
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledTimes(2);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it.each(["account", "sign-out", "vehicle", "shop vehicle", "unmount"] as const)(
    "does not open or refresh an old signed receipt after committed %s change",
    async (transition) => {
      const signed = deferred<string>();
      vi.mocked(api.getPrivateReceiptUrl).mockReturnValueOnce(signed.promise);
      const { client, rerender, view, unmount } = show();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      fireEvent.click(await screen.findByRole("button", { name: /^Receipt$/ }));
      if (transition === "account") {
        auth.userId = "owner-b";
        rerender(view());
      } else if (transition === "sign-out") {
        auth.userId = null;
        rerender(view());
      } else if (transition === "vehicle") {
        rerender(view({ vehicleId: "10000000-0000-4000-8000-000000000002" }));
      } else if (transition === "shop vehicle") {
        rerender(view({ shopVehicleId: "10000000-0000-4000-8000-000000000003" }));
      } else {
        unmount();
      }
      await act(async () => signed.resolve("https://private.example/old-bearer"));
      expect(window.open).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      expect(api.getPrivateReceiptUrl).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["account", "sign-out", "vehicle", "shop vehicle", "unmount"] as const)(
    "does not toast a late private failure after committed %s change",
    async (transition) => {
      const signed = deferred<string>();
      vi.mocked(api.getPrivateReceiptUrl).mockReturnValueOnce(signed.promise);
      const { client, rerender, view, unmount } = show();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      fireEvent.click(await screen.findByRole("button", { name: /^Receipt$/ }));
      if (transition === "account") {
        auth.userId = "owner-b";
        rerender(view());
      } else if (transition === "sign-out") {
        auth.userId = null;
        rerender(view());
      } else if (transition === "vehicle") {
        rerender(view({ vehicleId: "10000000-0000-4000-8000-000000000002" }));
      } else if (transition === "shop vehicle") {
        rerender(view({ shopVehicleId: "10000000-0000-4000-8000-000000000003" }));
      } else {
        unmount();
      }
      await act(async () => signed.reject(new Error("old private signing cause")));
      expect(toast.error).not.toHaveBeenCalled();
      expect(window.open).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );

  it.each(["account", "vehicle", "shop vehicle"] as const)(
    "never revives the first %s read after an A to B to A return or releases a newer read",
    async (transition) => {
      const oldRead = deferred<string>();
      const currentRead = deferred<string>();
      vi.mocked(api.getPrivateReceiptUrl)
        .mockReturnValueOnce(oldRead.promise)
        .mockReturnValueOnce(currentRead.promise);
      const { client, rerender, view } = show(
        undefined,
        transition === "shop vehicle"
          ? { shopVehicleId: "10000000-0000-4000-8000-000000000003" }
          : { vehicleId: vehicle },
      );
      const invalidate = vi.spyOn(client, "invalidateQueries");
      fireEvent.click(await screen.findByRole("button", { name: /^Receipt$/ }));
      if (transition === "account") {
        auth.userId = "owner-b";
        rerender(view());
        auth.userId = "owner-a";
        rerender(view());
      } else if (transition === "vehicle") {
        rerender(view({ vehicleId: "10000000-0000-4000-8000-000000000002" }));
        rerender(view());
      } else {
        rerender(view({ shopVehicleId: "10000000-0000-4000-8000-000000000004" }));
        rerender(view());
      }
      const currentButton = await screen.findByRole("button", { name: /^Receipt$/ });
      expect(currentButton).toBeEnabled();
      fireEvent.click(currentButton);
      expect(api.getPrivateReceiptUrl).toHaveBeenCalledTimes(2);
      await act(async () => oldRead.resolve("https://private.example/old-aba"));
      expect(window.open).not.toHaveBeenCalled();
      expect(currentButton).toBeDisabled();
      fireEvent.click(currentButton);
      expect(api.getPrivateReceiptUrl).toHaveBeenCalledTimes(2);
      await act(async () => currentRead.resolve("https://private.example/current-aba"));
      expect(window.open).toHaveBeenCalledExactlyOnceWith(
        "https://private.example/current-aba",
        "_blank",
        "noopener,noreferrer",
      );
      expect(currentButton).toBeEnabled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );

  it("permanently fences a read started before StrictMode effect cleanup and allows a new attempt", async () => {
    const oldRead = deferred<string>();
    const currentRead = deferred<string>();
    vi.mocked(api.getPrivateReceiptUrl)
      .mockReturnValueOnce(oldRead.promise)
      .mockReturnValueOnce(currentRead.promise);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(["vehicle-receipts", "owner-a", vehicle, undefined], {
      receipts: [privateReceipt()],
      linkedVehicleId: null,
    });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    let cleanups = 0;
    function StartReadDuringFirstCommit() {
      const started = useRef(false);
      useLayoutEffect(() => {
        if (!started.current) {
          started.current = true;
          screen.getByRole("button", { name: /^Receipt$/ }).click();
        }
        return () => {
          cleanups += 1;
        };
      }, []);
      return null;
    }
    render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <VehicleReceiptPanel vehicleId={vehicle} />
          <StartReadDuringFirstCommit />
        </QueryClientProvider>
      </StrictMode>,
    );
    expect(cleanups).toBe(1);
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledTimes(1);
    const button = screen.getByRole("button", { name: /^Receipt$/ });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledTimes(2);
    await act(async () => oldRead.resolve("https://private.example/pre-cleanup"));
    expect(window.open).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    await act(async () => currentRead.resolve("https://private.example/post-cleanup"));
    expect(window.open).toHaveBeenCalledExactlyOnceWith(
      "https://private.example/post-cleanup",
      "_blank",
      "noopener,noreferrer",
    );
    expect(button).toBeEnabled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe("receipt editor dispatch and committed lifetime", () => {
  beforeEach(() => {
    vi.spyOn(toast, "success").mockImplementation(() => 0);
    vi.spyOn(toast, "message").mockImplementation(() => 0);
  });
  afterEach(() => vi.restoreAllMocks());
  async function openEntry(withFile = false) {
    const context = show();
    const add = await screen.findByRole("button", { name: "Add receipt" });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Supplier / shop"), {
      target: { value: "Manual supplier" },
    });
    fireEvent.change(dialog.getByLabelText("Item description"), {
      target: { value: "Manual brake part" },
    });
    if (withFile)
      fireEvent.change(dialog.getByLabelText("Receipt image or PDF (optional for manual entry)"), {
        target: { files: [new File(["synthetic"], "receipt.png", { type: "image/png" })] },
      });
    return { ...context, dialog };
  }
  function expectHeld(dialog: ReturnType<typeof within>) {
    expect(dialog.getByRole("alert")).toHaveTextContent("Receipt change could not be confirmed");
    expect(dialog.getByLabelText("Supplier / shop")).toHaveValue("Manual supplier");
    expect(dialog.getByLabelText("Item description")).toHaveValue("Manual brake part");
    expect(dialog.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(dialog.getByRole("button", { name: "Confirm purchases" })).toBeDisabled();
    expect(dialog.getByRole("button", { name: "Scan with AI" })).toBeDisabled();
    expect(dialog.getByRole("button", { name: "Close and check receipts" })).toBeEnabled();
    expect(toast.success).not.toHaveBeenCalled();
  }
  it("preflights invalid manual data before creating any receipt and allows correction", async () => {
    const { dialog } = await openEntry();
    fireEvent.change(dialog.getByLabelText("Item description"), { target: { value: " " } });
    fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
    await dialog.findByText(/Check the receipt details/);
    expect(api.startVehicleReceipt).not.toHaveBeenCalled();
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
    expect(dialog.getByLabelText("Item description")).toBeEnabled();
    fireEvent.change(dialog.getByLabelText("Item description"), {
      target: { value: "Corrected item" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(api.saveVehicleReceipt).toHaveBeenCalledTimes(1));
    expect(api.startVehicleReceipt).toHaveBeenCalledTimes(1);
  });
  it("admits only one same-tick remote action and refuses same-tick Close", async () => {
    const pending = deferred<{ id: string; file_path: string | null }>();
    vi.mocked(api.startVehicleReceipt).mockReturnValueOnce(pending.promise);
    const { dialog } = await openEntry(true);
    fireEvent.click(dialog.getByRole("checkbox", { name: /Allow this receipt/ }));
    fireEvent.change(dialog.getByLabelText("Purchase date"), { target: { value: "2026-10-01" } });
    fireEvent.change(dialog.getByLabelText("Category"), { target: { value: "brakes" } });
    fireEvent.click(dialog.getByRole("checkbox", { name: /I checked this item/ }));
    const save = dialog.getByRole("button", { name: "Save draft" });
    const confirm = dialog.getByRole("button", { name: "Confirm purchases" });
    expect(confirm).toBeEnabled();
    const ai = dialog.getByRole("button", { name: "Scan with AI" });
    const local = dialog.getByRole("button", { name: "Scan on this device" });
    const closes = dialog.getAllByRole("button", { name: /^Close$/ });
    act(() => {
      save.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      save.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      confirm.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      ai.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      local.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      closes.forEach((close) => close.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    });
    expect(api.startVehicleReceipt).toHaveBeenCalledTimes(1);
    expect(api.extractVehicleReceipt).not.toHaveBeenCalled();
    expect(localOcr.scan).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () =>
      pending.resolve({ id: draftId, file_path: `owner-a/${draftId}/original.png` }),
    );
    await waitFor(() => expect(api.saveVehicleReceipt).toHaveBeenCalledTimes(1));
    expect(localOcr.upload).toHaveBeenCalledTimes(1);
  });
  for (const step of ["start", "upload", "save"] as const) {
    it(`${step}: a late rejection after account loss remains silent`, async () => {
      const pending = deferred<unknown>();
      if (step === "start")
        vi.mocked(api.startVehicleReceipt).mockReturnValueOnce(
          pending.promise as ReturnType<typeof api.startVehicleReceipt>,
        );
      if (step === "upload") localOcr.upload.mockReturnValueOnce(pending.promise);
      if (step === "save") vi.mocked(api.saveVehicleReceipt).mockReturnValueOnce(pending.promise);
      const { dialog, client, rerender, view } = await openEntry(true);
      const invalidate = vi.spyOn(client, "invalidateQueries");
      fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
      if (step !== "start") await waitFor(() => expect(localOcr.upload).toHaveBeenCalledTimes(1));
      if (step === "save")
        await waitFor(() => expect(api.saveVehicleReceipt).toHaveBeenCalledTimes(1));
      auth.userId = "owner-b";
      rerender(view());
      await act(async () => pending.reject(new Error("PRIVATE old operation cause")));
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.message).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      expect(localOcr.upload).toHaveBeenCalledTimes(step === "start" ? 0 : 1);
      expect(api.saveVehicleReceipt).toHaveBeenCalledTimes(step === "save" ? 1 : 0);
    });
    it.each(["account", "sign-out", "vehicle", "shop", "unmount", "account ABA"] as const)(
      `${step}: a late reply after committed %s cannot dispatch another step or private UI effects`,
      async (transition) => {
        const pending = deferred<unknown>();
        if (step === "start")
          vi.mocked(api.startVehicleReceipt).mockReturnValueOnce(
            pending.promise as ReturnType<typeof api.startVehicleReceipt>,
          );
        if (step === "upload") localOcr.upload.mockReturnValueOnce(pending.promise);
        if (step === "save") vi.mocked(api.saveVehicleReceipt).mockReturnValueOnce(pending.promise);
        const { dialog, client, rerender, view, unmount } = await openEntry(true);
        const invalidate = vi.spyOn(client, "invalidateQueries");
        fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
        if (step !== "start") await waitFor(() => expect(localOcr.upload).toHaveBeenCalledTimes(1));
        if (step === "save")
          await waitFor(() => expect(api.saveVehicleReceipt).toHaveBeenCalledTimes(1));
        if (transition === "account" || transition === "account ABA") {
          auth.userId = "owner-b";
          rerender(view());
          if (transition === "account ABA") {
            auth.userId = "owner-a";
            rerender(view());
          }
        } else if (transition === "sign-out") {
          auth.userId = null;
          rerender(view());
        } else if (transition === "vehicle")
          rerender(view({ vehicleId: "10000000-0000-4000-8000-000000000002" }));
        else if (transition === "shop")
          rerender(view({ shopVehicleId: "10000000-0000-4000-8000-000000000003" }));
        else unmount();
        const path = `owner-a/${draftId}/original.png`;
        await act(async () =>
          pending.resolve(
            step === "start"
              ? { id: draftId, file_path: path }
              : step === "upload"
                ? { error: null, data: { path, fullPath: `vehicle-receipts/${path}` } }
                : null,
          ),
        );
        expect(localOcr.upload).toHaveBeenCalledTimes(step === "start" ? 0 : 1);
        expect(api.saveVehicleReceipt).toHaveBeenCalledTimes(step === "save" ? 1 : 0);
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.message).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
        expect(api.discardReceiptDraft).not.toHaveBeenCalled();
      },
    );
    it.each(["throw", "reject", "malformed"] as const)(
      `${step}: %s leaves entries held without blind retry`,
      async (mode) => {
        const broken = () => {
          throw new Error("PRIVATE backend detail");
        };
        const result =
          mode === "reject"
            ? () => Promise.reject(new Error("PRIVATE token cause"))
            : mode === "throw"
              ? broken
              : () => Promise.resolve({});
        if (step === "start")
          vi.mocked(api.startVehicleReceipt).mockImplementationOnce(result as never);
        if (step === "upload") localOcr.upload.mockImplementationOnce(result);
        if (step === "save") vi.mocked(api.saveVehicleReceipt).mockImplementationOnce(result);
        const { dialog, client } = await openEntry(step !== "save");
        const invalidate = vi.spyOn(client, "invalidateQueries");
        fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
        await waitFor(() => expectHeld(dialog));
        expect(dialog.getByRole("alert")).not.toHaveTextContent("PRIVATE");
        fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
        fireEvent.click(dialog.getByRole("button", { name: "Scan with AI" }));
        expect(api.startVehicleReceipt).toHaveBeenCalledTimes(1);
        expect(api.saveVehicleReceipt).toHaveBeenCalledTimes(step === "save" ? 1 : 0);
        expect(api.extractVehicleReceipt).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
        expect(api.discardReceiptDraft).not.toHaveBeenCalled();
      },
    );
  }
  it.each([
    null,
    { id: "opaque", file_path: null },
    { id: draftId, file_path: "another-owner/path" },
    { id: draftId, file_path: null },
    { id: draftId, file_path: `owner-a/${draftId}/original.pdf` },
  ])("rejects an unbound file-start acknowledgment %j without upload or save", async (ack) => {
    vi.mocked(api.startVehicleReceipt).mockResolvedValueOnce(ack as never);
    const { dialog } = await openEntry(true);
    fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expectHeld(dialog));
    expect(localOcr.upload).not.toHaveBeenCalled();
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
  });
  it("does not accept the old already-exists error as an uploaded-file acknowledgment", async () => {
    localOcr.upload.mockResolvedValueOnce({
      data: null,
      error: { message: "The resource already exists" },
    });
    const { dialog } = await openEntry(true);
    fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expectHeld(dialog));
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
  });
  it.each([
    { path: "wrong/path", fullPath: `vehicle-receipts/owner-a/${draftId}/original.png` },
    { path: `owner-a/${draftId}/original.png`, fullPath: "another-bucket/wrong/path" },
  ])("rejects an upload acknowledgment bound to the wrong path/bucket %j", async (data) => {
    localOcr.upload.mockResolvedValueOnce({ data, error: null });
    const { dialog } = await openEntry(true);
    fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expectHeld(dialog));
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
  });
  it.each([undefined, true, "", []])(
    "never calls a non-null save acknowledgment a confirmed save: %j",
    async (ack) => {
      vi.mocked(api.saveVehicleReceipt).mockResolvedValueOnce(ack);
      const { dialog } = await openEntry();
      fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
      await waitFor(() => expectHeld(dialog));
      expect(api.saveVehicleReceipt).toHaveBeenCalledTimes(1);
    },
  );
  it("closes an explicitly held editor only to reconcile, never deleting or recreating its unknown draft", async () => {
    vi.mocked(api.startVehicleReceipt).mockRejectedValueOnce(new Error("PRIVATE lost reply"));
    const { dialog, client } = await openEntry();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expectHeld(dialog));
    fireEvent.click(dialog.getByRole("button", { name: "Close and check receipts" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.startVehicleReceipt).toHaveBeenCalledTimes(1);
    expect(api.discardReceiptDraft).not.toHaveBeenCalled();
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vehicle-receipts", "owner-a"] });
  });
  it("preflights an overlong attachment name before draft creation", async () => {
    const { dialog } = await openEntry();
    fireEvent.change(dialog.getByLabelText("Receipt image or PDF (optional for manual entry)"), {
      target: { files: [new File(["synthetic"], "x".repeat(201), { type: "image/png" })] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
    await dialog.findByText(/Check the receipt details/);
    expect(api.startVehicleReceipt).not.toHaveBeenCalled();
    expect(localOcr.upload).not.toHaveBeenCalled();
  });
  it.each(["resolve", "reject"] as const)(
    "ignores a late AI %s after acknowledged upload and account loss",
    async (mode) => {
      const pending = deferred<Awaited<ReturnType<typeof api.extractVehicleReceipt>>>();
      vi.mocked(api.extractVehicleReceipt).mockReturnValueOnce(pending.promise);
      const { dialog, client, rerender, view } = await openEntry(true);
      const invalidate = vi.spyOn(client, "invalidateQueries");
      fireEvent.click(dialog.getByRole("checkbox", { name: /Allow this receipt/ }));
      fireEvent.click(dialog.getByRole("button", { name: "Scan with AI" }));
      await waitFor(() => expect(api.extractVehicleReceipt).toHaveBeenCalledTimes(1));
      expect(localOcr.upload).toHaveBeenCalledTimes(1);
      auth.userId = "owner-b";
      rerender(view());
      const add = await screen.findByRole("button", { name: "Add receipt" });
      await waitFor(() => expect(add).toBeEnabled());
      fireEvent.click(add);
      fireEvent.change(screen.getByLabelText("Supplier / shop"), {
        target: { value: "Account B details" },
      });
      await act(async () => {
        if (mode === "resolve")
          pending.resolve({
            vendor: "PRIVATE old AI supplier",
            purchased_on: null,
            currency: null,
            total: null,
            items: [],
          });
        else pending.reject(new Error("PRIVATE old AI provider cause"));
      });
      expect(screen.getByLabelText("Supplier / shop")).toHaveValue("Account B details");
      expect(toast.message).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );
  it("retains an acknowledged draft/upload for manual save after AI fails, without another create or upload", async () => {
    vi.mocked(api.extractVehicleReceipt).mockRejectedValueOnce(
      new Error("PRIVATE provider failure"),
    );
    const { dialog } = await openEntry(true);
    fireEvent.click(dialog.getByRole("checkbox", { name: /Allow this receipt/ }));
    fireEvent.click(dialog.getByRole("button", { name: "Scan with AI" }));
    await dialog.findByText(/You can enter the receipt manually/);
    expect(dialog.getByRole("button", { name: "Save draft" })).toBeEnabled();
    expect(dialog.getByLabelText("Supplier / shop")).toHaveValue("Manual supplier");
    fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(api.saveVehicleReceipt).toHaveBeenCalledTimes(1));
    expect(api.startVehicleReceipt).toHaveBeenCalledTimes(1);
    expect(localOcr.upload).toHaveBeenCalledTimes(1);
    expect(api.saveVehicleReceipt).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: draftId, vendor: "Manual supplier", confirm: false }),
    });
  });
});

describe("vehicle receipt workflow", () => {
  it("scans a selected photo without creating a receipt, uploading or calling the AI provider", async () => {
    show();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add receipt" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Add receipt" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Receipt image or PDF (optional for manual entry)"), {
      target: { files: [new File(["photo"], "receipt.png", { type: "image/png" })] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Scan on this device" }));
    await waitFor(() =>
      expect(dialog.getByLabelText("Supplier / shop")).toHaveValue("Local supplier"),
    );
    expect(dialog.getByLabelText("Item description")).toHaveValue("Oil filter");
    expect(dialog.getByRole("button", { name: "Confirm purchases" })).toBeDisabled();
    expect(api.startVehicleReceipt).not.toHaveBeenCalled();
    expect(api.extractVehicleReceipt).not.toHaveBeenCalled();
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
    expect(localOcr.upload).not.toHaveBeenCalled();
  });
  it("scans a selected PDF locally without uploading or using the AI provider", async () => {
    show();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add receipt" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Add receipt" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Receipt image or PDF (optional for manual entry)"), {
      target: { files: [new File(["pdf"], "receipt.pdf", { type: "application/pdf" })] },
    });
    expect(dialog.getByRole("button", { name: "Scan on this device" })).toBeEnabled();
    fireEvent.click(dialog.getByRole("button", { name: "Scan on this device" }));
    await waitFor(() =>
      expect(dialog.getByLabelText("Supplier / shop")).toHaveValue("Local supplier"),
    );
    expect(dialog.getByLabelText("Item description")).toBeEnabled();
    expect(localOcr.scan).toHaveBeenCalled();
    expect(localOcr.upload).not.toHaveBeenCalled();
    expect(api.startVehicleReceipt).not.toHaveBeenCalled();
    expect(api.extractVehicleReceipt).not.toHaveBeenCalled();
  });
  it("cancels local extraction without replacing manual values or uploading", async () => {
    localOcr.scan.mockImplementationOnce(
      (_file: File, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) =>
          options.signal.addEventListener("abort", () =>
            reject(new DOMException("Cancelled", "AbortError")),
          ),
        ),
    );
    show();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add receipt" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Add receipt" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Supplier / shop"), {
      target: { value: "Manual supplier" },
    });
    fireEvent.change(dialog.getByLabelText("Receipt image or PDF (optional for manual entry)"), {
      target: { files: [new File(["photo"], "receipt.png", { type: "image/png" })] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Scan on this device" }));
    await waitFor(() => expect(localOcr.scan).toHaveBeenCalled());
    fireEvent.click(dialog.getByRole("button", { name: "Cancel local scan" }));
    await waitFor(() =>
      expect(dialog.getByRole("button", { name: "Scan on this device" })).toBeEnabled(),
    );
    expect(dialog.getByLabelText("Supplier / shop")).toHaveValue("Manual supplier");
    expect(localOcr.upload).not.toHaveBeenCalled();
  });
  it("shows a local scan failure without hiding manual entry", async () => {
    localOcr.scan.mockRejectedValueOnce(new Error("Could not read photo"));
    show();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add receipt" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Add receipt" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Receipt image or PDF (optional for manual entry)"), {
      target: { files: [new File(["photo"], "receipt.png", { type: "image/png" })] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Scan on this device" }));
    await dialog.findByText("Could not read photo");
    expect(dialog.getByLabelText("Item description")).toBeEnabled();
    expect(api.startVehicleReceipt).not.toHaveBeenCalled();
  });
  it("keeps manual details when local OCR finds nothing readable", async () => {
    localOcr.scan.mockResolvedValueOnce({
      vendor: null,
      purchased_on: null,
      currency: null,
      total: null,
      items: [],
    });
    show();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add receipt" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Add receipt" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Supplier / shop"), {
      target: { value: "Manual shop" },
    });
    fireEvent.change(dialog.getByLabelText("Item description"), {
      target: { value: "Manual part" },
    });
    fireEvent.change(dialog.getByLabelText("Receipt image or PDF (optional for manual entry)"), {
      target: { files: [new File(["photo"], "receipt.png", { type: "image/png" })] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Scan on this device" }));
    await dialog.findByText(/No readable receipt details found/);
    expect(dialog.getByLabelText("Supplier / shop")).toHaveValue("Manual shop");
    expect(dialog.getByLabelText("Item description")).toHaveValue("Manual part");
    expect(api.startVehicleReceipt).not.toHaveBeenCalled();
  });
  it("aborts a local scan and ignores late private results on account change", async () => {
    let finish!: (value: unknown) => void;
    localOcr.scan.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { rerender, view } = show();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add receipt" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Add receipt" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Receipt image or PDF (optional for manual entry)"), {
      target: { files: [new File(["photo"], "receipt.png", { type: "image/png" })] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Scan on this device" }));
    await waitFor(() => expect(localOcr.scan).toHaveBeenCalled());
    const signal = localOcr.scan.mock.calls[0][1].signal as AbortSignal;
    auth.userId = "owner-b";
    rerender(view());
    expect(signal.aborted).toBe(true);
    finish({
      vendor: "Late private supplier",
      purchased_on: null,
      currency: null,
      total: null,
      items: [],
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByText("Late private supplier")).not.toBeInTheDocument();
    expect(localOcr.upload).not.toHaveBeenCalled();
    expect(api.startVehicleReceipt).not.toHaveBeenCalled();
  });
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
