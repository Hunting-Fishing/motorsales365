import { StrictMode, useLayoutEffect, useRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { VehicleReceiptPanel } from "./vehicle-receipt-panel";
import * as api from "@/lib/vehicle-receipts.functions";
import type { ReceiptTarget, VehicleReceipt } from "@/lib/vehicle-receipts";
const auth = vi.hoisted(() => ({ userId: "owner-a" as string | null, loading: false }));
const localOcr = vi.hoisted(() => ({ scan: vi.fn(), upload: vi.fn() }));
vi.mock("@/lib/receipt-document.client", () => ({ scanReceiptDocument: localOcr.scan }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: auth.userId ? { id: auth.userId } : null, loading: auth.loading }),
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
  getVehicleReceiptItemPage: vi.fn(),
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
type ReceiptRead = Awaited<ReturnType<typeof api.getVehicleReceipts>>;
type LinkRead = Awaited<ReturnType<typeof api.listVehicleShopLinks>>;
// UI transport fixtures remain synthetic; server tests exercise the actual DTO parser.
function receiptPage(
  input: {
    receipts: Array<VehicleReceipt & Partial<Omit<ReceiptRead["receipts"][number], "items">>>;
    linkedVehicleId: string | null;
    canWrite?: boolean;
    canRecordExpense?: boolean;
  },
  page = 0,
  totalCount = input.receipts.length,
): ReceiptRead {
  return {
    ...input,
    receipts: input.receipts.map((r) => ({
      ...r,
      items: r.items.map((item, index) => ({ ...item, receipt_id: r.id, sort_order: index })),
      created_at: "2026-10-16T00:00:00Z",
      can_write: r.can_write ?? true,
      attachment_uploaded: r.attachment_uploaded ?? Boolean(r.file_path),
      item_count: r.item_count ?? r.items.length,
      items_complete: r.items_complete ?? true,
      edit_eligible: r.edit_eligible ?? true,
    })),
    canWrite: input.canWrite ?? true,
    canRecordExpense: input.canRecordExpense ?? false,
    page,
    totalCount,
    hasNext: (page + 1) * 25 < totalCount,
  };
}
function linkPage(
  links: Array<{ shop_vehicle_id: string; shop_name: string | null; active: boolean }>,
  page = 0,
  totalCount = links.length,
): LinkRead {
  return {
    links: links.map((l) => ({ ...l, vehicle_id: vehicle })),
    page,
    totalCount,
    hasNext: (page + 1) * 100 < totalCount,
  };
}
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
  auth.loading = false;
  vi.mocked(api.getVehicleReceipts)
    .mockReset()
    .mockResolvedValue(receiptPage({ receipts: [], linkedVehicleId: null }));
  vi.mocked(api.listVehicleShopLinks).mockReset().mockResolvedValue(linkPage([]));
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
  const signingRequest = (expectedAccountId = "owner-a", id = "private-receipt-1") => ({
    data: { id, expectedAccountId },
  });
  beforeEach(() => {
    vi.mocked(api.getPrivateReceiptUrl).mockReset();
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(
      receiptPage({
        receipts: [privateReceipt()],
        linkedVehicleId: null,
      }),
    );
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
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledExactlyOnceWith(signingRequest());
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
    expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(1, signingRequest());
    expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(2, signingRequest());
    expect(window.open).toHaveBeenLastCalledWith(
      "https://private.example/second",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("uses a synchronous lock before React commits duplicate clicks", async () => {
    const signed = deferred<string>();
    vi.mocked(api.getPrivateReceiptUrl).mockReturnValueOnce(signed.promise);
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(
      receiptPage({
        receipts: [privateReceipt(), privateReceipt("private-receipt-2")],
        linkedVehicleId: null,
      }),
    );
    show();
    const buttons = await screen.findAllByRole("button", { name: /^Receipt$/ });
    act(() => {
      buttons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      buttons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      buttons[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledTimes(1);
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledExactlyOnceWith(signingRequest());
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
    expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(1, signingRequest());
    expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(2, signingRequest());
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
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledExactlyOnceWith(signingRequest());
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
    expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(1, signingRequest());
    expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(2, signingRequest());
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
      expect(api.getPrivateReceiptUrl).toHaveBeenCalledExactlyOnceWith(signingRequest());
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
      expect(api.getPrivateReceiptUrl).toHaveBeenCalledExactlyOnceWith(signingRequest());
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
      expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(1, signingRequest());
      expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(2, signingRequest());
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

  it("pins the issuing account in an old request instead of adopting a new account's explicit opening", async () => {
    const oldRead = deferred<string>();
    const currentRead = deferred<string>();
    vi.mocked(api.getPrivateReceiptUrl)
      .mockReturnValueOnce(oldRead.promise)
      .mockReturnValueOnce(currentRead.promise);
    const { client, rerender, view } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(await screen.findByRole("button", { name: /^Receipt$/ }));
    const originalRequest = vi.mocked(api.getPrivateReceiptUrl).mock.calls[0][0];
    expect(originalRequest).toEqual(signingRequest());

    auth.userId = "owner-b";
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(
      receiptPage({
        receipts: [
          {
            ...privateReceipt("private-receipt-b"),
            created_by: "owner-b",
            file_path: "owner-b/private-receipt-b/original.pdf",
          },
        ],
        linkedVehicleId: null,
      }),
    );
    rerender(view());
    const button = await screen.findByRole("button", { name: /^Receipt$/ });
    fireEvent.click(button);
    expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(1, signingRequest());
    expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(
      2,
      signingRequest("owner-b", "private-receipt-b"),
    );
    expect(originalRequest).toEqual(signingRequest());
    await act(async () => oldRead.resolve("https://private.example/old-account"));
    expect(window.open).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(originalRequest).toEqual(signingRequest());
    await act(async () => currentRead.resolve("https://private.example/current-account"));
    expect(window.open).toHaveBeenCalledExactlyOnceWith(
      "https://private.example/current-account",
      "_blank",
      "noopener,noreferrer",
    );
    expect(button).toBeEnabled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("never revives a captured private request across committed retained-user Auth loading", async () => {
    const oldRead = deferred<string>();
    const currentRead = deferred<string>();
    vi.mocked(api.getPrivateReceiptUrl)
      .mockReturnValueOnce(oldRead.promise)
      .mockReturnValueOnce(currentRead.promise);
    const { container, rerender, view } = show();
    fireEvent.click(await screen.findByRole("button", { name: /^Receipt$/ }));
    auth.loading = true;
    rerender(view());
    expect(container).toBeEmptyDOMElement();
    auth.loading = false;
    rerender(view());
    const button = await screen.findByRole("button", { name: /^Receipt$/ });
    fireEvent.click(button);
    expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(1, signingRequest());
    expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(2, signingRequest());
    await act(async () => oldRead.resolve("https://private.example/pre-bootstrap"));
    expect(window.open).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    await act(async () => currentRead.resolve("https://private.example/post-bootstrap"));
    expect(window.open).toHaveBeenCalledExactlyOnceWith(
      "https://private.example/post-bootstrap",
      "_blank",
      "noopener,noreferrer",
    );
    expect(button).toBeEnabled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("permanently fences a read started before StrictMode effect cleanup and allows a new attempt", async () => {
    const oldRead = deferred<string>();
    const currentRead = deferred<string>();
    vi.mocked(api.getPrivateReceiptUrl)
      .mockReturnValueOnce(oldRead.promise)
      .mockReturnValueOnce(currentRead.promise);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const seededKeys: (readonly unknown[])[] = [];
    const unsubscribe = client.getQueryCache().subscribe((event) => {
      if (event.type !== "added" || event.query.queryKey[0] !== "vehicle-receipts") return;
      // Seed the real useId-suffixed key during Query construction, before the
      // first layout commit. A future test-only timestamp avoids an optimistic
      // stale refetch hiding the button; no hook/key or opener is substituted.
      expect(event.query.queryKey.slice(0, 4)).toEqual([
        "vehicle-receipts",
        "owner-a",
        vehicle,
        undefined,
      ]);
      expect(event.query.queryKey).toHaveLength(6);
      seededKeys.push(event.query.queryKey);
      event.query.setData(receiptPage({ receipts: [privateReceipt()], linkedVehicleId: null }), {
        updatedAt: Date.now() + 60_000,
        manual: true,
      });
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
    unsubscribe();
    expect(seededKeys.length).toBeGreaterThan(0);
    expect(cleanups).toBe(1);
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledTimes(1);
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledExactlyOnceWith(signingRequest());
    const button = screen.getByRole("button", { name: /^Receipt$/ });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(api.getPrivateReceiptUrl).toHaveBeenCalledTimes(2);
    expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(1, signingRequest());
    expect(api.getPrivateReceiptUrl).toHaveBeenNthCalledWith(2, signingRequest());
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
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(
      receiptPage({
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
      }),
    );
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
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(
      receiptPage({
        receipts: [receipt("Account A private supplier")],
        linkedVehicleId: null,
      }),
    );
    vi.mocked(api.listVehicleShopLinks).mockResolvedValue(
      linkPage([{ shop_vehicle_id: "shop-a", shop_name: "Account A linked shop", active: true }]),
    );
    const { rerender, view, client } = show();
    await screen.findByText("Account A private supplier");
    await screen.findByText("Account A linked shop");
    const oldReceiptKey = client
      .getQueryCache()
      .find({ queryKey: ["vehicle-receipts", "owner-a"], exact: false })!.queryKey;
    const oldLinkKey = client
      .getQueryCache()
      .find({ queryKey: ["vehicle-shop-links", "owner-a"], exact: false })!.queryKey;
    expect(oldReceiptKey).toHaveLength(6);
    expect(oldLinkKey).toHaveLength(5);
    expect(client.getQueryData(oldReceiptKey)).toBeDefined();
    expect(client.getQueryData(oldLinkKey)).toBeDefined();

    auth.userId = "owner-b";
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(
      receiptPage({
        receipts: [receipt("Account B private supplier")],
        linkedVehicleId: null,
      }),
    );
    vi.mocked(api.listVehicleShopLinks).mockResolvedValue(
      linkPage([{ shop_vehicle_id: "shop-b", shop_name: "Account B linked shop", active: true }]),
    );
    rerender(view());
    expect(screen.queryByText("Account A private supplier")).not.toBeInTheDocument();
    expect(screen.queryByText("Account A linked shop")).not.toBeInTheDocument();
    await screen.findByText("Account B private supplier");
    await screen.findByText("Account B linked shop");
    expect(api.getVehicleReceipts).toHaveBeenCalledTimes(2);
    expect(api.listVehicleShopLinks).toHaveBeenCalledTimes(2);
    const newReceiptKey = client
      .getQueryCache()
      .find({ queryKey: ["vehicle-receipts", "owner-b"], exact: false })!.queryKey;
    const newLinkKey = client
      .getQueryCache()
      .find({ queryKey: ["vehicle-shop-links", "owner-b"], exact: false })!.queryKey;
    expect(newReceiptKey.slice(0, 4)).toEqual(["vehicle-receipts", "owner-b", vehicle, undefined]);
    expect(newLinkKey.slice(0, 3)).toEqual(["vehicle-shop-links", "owner-b", vehicle]);
    expect(newReceiptKey[4]).not.toBe(oldReceiptKey[4]);
    expect(newLinkKey[3]).not.toBe(oldLinkKey[3]);
    expect(client.getQueryData(newReceiptKey)).toBeDefined();
    expect(client.getQueryData(newLinkKey)).toBeDefined();
  });

  it("does not fetch or render private cached data while signed out", async () => {
    auth.userId = null;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(
      ["vehicle-receipts", "owner-a", vehicle, undefined],
      receiptPage({
        receipts: [receipt("Cached private supplier")],
        linkedVehicleId: null,
      }),
    );
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
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(
      receiptPage({
        receipts: [receipt("Account A editor supplier")],
        linkedVehicleId: null,
      }),
    );
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
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(
      receiptPage({ receipts: [], linkedVehicleId: null }),
    );
    rerender(view());
    await screen.findByText(
      "No receipts are visible in this snapshot. Upload a receipt or enter purchases manually.",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Account A editor supplier")).not.toBeInTheDocument();
  });

  it("resets an open private receipt editor on a direct account switch", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(
      receiptPage({
        receipts: [receipt("Account A editor supplier")],
        linkedVehicleId: null,
      }),
    );
    const { rerender, view } = show();
    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    expect(screen.getByLabelText("Supplier / shop")).toHaveValue("Account A editor supplier");

    auth.userId = "owner-b";
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(
      receiptPage({ receipts: [], linkedVehicleId: null }),
    );
    rerender(view());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await screen.findByText(
      "No receipts are visible in this snapshot. Upload a receipt or enter purchases manually.",
    );
  });

  it("invalidates only the current account's receipt and shop-link caches after connecting a shop", async () => {
    const { client } = show();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fireEvent.change(screen.getByLabelText("Shop connection code"), {
      target: { value: "0123456789abcdef0123456789abcdef" },
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Approve connection" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Approve connection" }));
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vehicle-shop-links", "owner-a"] }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vehicle-receipts", "owner-a"] });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["vehicle-shop-links"] });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["vehicle-receipts"] });
  });
});

describe("bounded receipt and connection pages", () => {
  it("binds receipt pages to the account and keeps an open editor during page changes", async () => {
    const first = receiptPage(
      {
        receipts: Array.from({ length: 25 }, (_, i) => ({
          ...receipt(`Page zero supplier ${i}`),
          id: `page-zero-${i}`,
        })),
        linkedVehicleId: null,
      },
      0,
      26,
    );
    const next = deferred<ReceiptRead>();
    vi.mocked(api.getVehicleReceipts)
      .mockResolvedValueOnce(first)
      .mockReturnValueOnce(next.promise);
    show();
    const review = (await screen.findAllByRole("button", { name: "Review" }))[0];
    const oldAdd = screen.getByRole("button", { name: "Add receipt" });
    const nextButton = screen.getByRole("button", { name: "Next receipts" });
    const previousButton = screen.getByRole("button", { name: "Previous receipts" });
    fireEvent.click(review);
    const editor = screen.getByRole("dialog");
    fireEvent.change(within(editor).getByLabelText("Supplier / shop"), {
      target: { value: "Preserved page draft" },
    });
    act(() => {
      // The modal correctly hides background controls from accessibility. Retain
      // their pre-modal references to exercise same-tick background callbacks.
      nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      oldAdd.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await waitFor(() => expect(api.getVehicleReceipts).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.getVehicleReceipts).mock.calls[1][0]).toMatchObject({
      data: { expectedAccountId: "owner-a", vehicleId: vehicle, page: 1 },
    });
    expect(screen.queryByText("Page zero supplier 0")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBe(editor);
    await act(async () =>
      next.resolve(
        receiptPage({ receipts: [receipt("Page one supplier")], linkedVehicleId: null }, 1, 26),
      ),
    );
    await screen.findByText("Page one supplier");
    expect(within(editor).getByLabelText("Supplier / shop")).toHaveValue("Preserved page draft");
    expect(nextButton).toBeDisabled();
    expect(previousButton).toBeEnabled();
    expect(api.startVehicleReceipt).not.toHaveBeenCalled();
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
  });

  it("lets a failed later page return to a fresh first-page read", async () => {
    vi.mocked(api.getVehicleReceipts)
      .mockResolvedValueOnce(
        receiptPage({ receipts: [receipt("First page supplier")], linkedVehicleId: null }, 0, 26),
      )
      .mockRejectedValueOnce(new Error("private later page cause"))
      .mockResolvedValueOnce(
        receiptPage({ receipts: [receipt("Fresh first page")], linkedVehicleId: null }),
      );
    show();
    await screen.findByText("First page supplier");
    fireEvent.click(screen.getByRole("button", { name: "Next receipts" }));
    await screen.findByText("Could not load receipts. Please try again.");
    expect(screen.queryByText("First page supplier")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous receipts" }));
    await screen.findByText("Fresh first page");
    expect(api.getVehicleReceipts).toHaveBeenCalledTimes(3);
    expect(vi.mocked(api.getVehicleReceipts).mock.calls[2][0]).toMatchObject({ data: { page: 0 } });
  });

  it.each([
    { items_complete: false, edit_eligible: false, item_count: 101 },
    { items_complete: true, edit_eligible: false, item_count: 0 },
  ])("does not review a partial or nonrepresentable retained draft %j", async (eligibility) => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
      receiptPage({
        receipts: [{ ...receipt("Read only retained supplier"), ...eligibility }],
        linkedVehicleId: null,
      }),
    );
    show();
    await screen.findByText("Read only retained supplier");
    expect(screen.queryByRole("button", { name: "Review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
  });

  it("cannot change summary sharing from an incomplete item set and displays the unrounded total", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
      receiptPage({
        receipts: [
          {
            ...receipt("Partial confirmed supplier"),
            status: "confirmed",
            total: 12.345678,
            items_complete: false,
            item_count: 101,
            edit_eligible: false,
          },
        ],
        linkedVehicleId: null,
      }),
    );
    show();
    await screen.findByText("Partial confirmed supplier");
    expect(screen.getByText(/PHP 12\.345678/)).toBeInTheDocument();
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeDisabled();
      fireEvent.click(checkbox);
    }
    expect(api.setReceiptSharing).not.toHaveBeenCalled();
    expect(screen.getByText(/Showing 0 of 101 lines/)).toBeInTheDocument();
  });

  it("pages connections independently and fences the old revoke control before commit", async () => {
    vi.mocked(api.listVehicleShopLinks).mockResolvedValueOnce(
      linkPage(
        [{ shop_vehicle_id: "old-shop", shop_name: "First page shop", active: true }],
        0,
        101,
      ),
    );
    const next = deferred<LinkRead>();
    vi.mocked(api.listVehicleShopLinks).mockReturnValueOnce(next.promise);
    show();
    await screen.findByText("First page shop");
    const oldRevoke = screen.getByRole("button", { name: "Revoke access" });
    act(() => {
      screen
        .getByRole("button", { name: "Next connections" })
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      oldRevoke.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await waitFor(() => expect(api.listVehicleShopLinks).toHaveBeenCalledTimes(2));
    expect(api.revokeShopVehicleLink).not.toHaveBeenCalled();
    expect(vi.mocked(api.listVehicleShopLinks).mock.calls[1][0]).toMatchObject({
      data: { expectedAccountId: "owner-a", vehicleId: vehicle, page: 1 },
    });
    await act(async () =>
      next.resolve(
        linkPage(
          [{ shop_vehicle_id: "next-shop", shop_name: "Second page shop", active: true }],
          1,
          101,
        ),
      ),
    );
    await screen.findByText("Second page shop");
    expect(screen.queryByText("First page shop")).not.toBeInTheDocument();
    expect(api.getVehicleReceipts).toHaveBeenCalledTimes(1);
  });
});

// Actual panel + React Query; every transport/Auth result remains synthetic.
// Read cancellation does not prove server/DB cancellation, role revocation or
// bounded/complete backend DTOs. Existing mutation chains are not changed here.
describe("receipt and shop-link read snapshots", () => {
  type ReceiptRead = Awaited<ReturnType<typeof api.getVehicleReceipts>>;
  type LinkRead = Awaited<ReturnType<typeof api.listVehicleShopLinks>>;
  const otherVehicle = "10000000-0000-4000-8000-000000000002";
  const shopVehicle = "10000000-0000-4000-8000-000000000003";
  const otherShopVehicle = "10000000-0000-4000-8000-000000000004";
  const empty =
    "No receipts are visible in this snapshot. Upload a receipt or enter purchases manually.";
  const reply = (vendor: string): ReceiptRead =>
    receiptPage({
      receipts: [receipt(vendor)],
      linkedVehicleId: null,
      canWrite: true,
    });
  const links = (shop: string): LinkRead =>
    linkPage([{ shop_vehicle_id: "synthetic-shop", shop_name: shop, active: true }]);
  function installedCandidate(): VehicleReceipt {
    return {
      ...receipt("Confirmed supplier"),
      id: "confirmed-receipt",
      status: "confirmed",
      items: [
        {
          id: "item-1",
          description: "Reviewed brake part",
          category: "brakes",
          brand: null,
          part_number: null,
          quantity: 1,
          total: null,
          confidence: 1,
          reviewed: true,
          installed_on: null,
          odometer_km: null,
          public_summary_allowed: false,
        },
      ],
    };
  }
  function expectNoListWrites() {
    for (const fn of [
      api.startVehicleReceipt,
      api.saveVehicleReceipt,
      api.installReceiptItem,
      api.getPrivateReceiptUrl,
      api.setReceiptSharing,
      api.discardReceiptDraft,
      api.recordVehicleReceiptExpense,
      api.requestShopVehicleLink,
      api.approveShopVehicleLink,
      api.revokeShopVehicleLink,
    ])
      expect(fn).not.toHaveBeenCalled();
  }
  beforeEach(() => {
    for (const fn of [
      api.installReceiptItem,
      api.setReceiptSharing,
      api.discardReceiptDraft,
      api.recordVehicleReceiptExpense,
      api.requestShopVehicleLink,
      api.approveShopVehicleLink,
      api.revokeShopVehicleLink,
      api.getPrivateReceiptUrl,
    ])
      vi.mocked(fn).mockReset();
    vi.spyOn(toast, "success").mockImplementation(() => 0);
    vi.spyOn(toast, "error").mockImplementation(() => 0);
  });
  afterEach(() => {
    onlineManager.setOnline(true);
    vi.restoreAllMocks();
  });

  it("uses actual per-mount keys and forwards each Query signal outside data", async () => {
    const { client, unmount } = show();
    await screen.findByText(empty);
    await screen.findByText("No active shop connections in this snapshot.");
    const receiptKey = client
      .getQueryCache()
      .findAll({ queryKey: ["vehicle-receipts"] })[0].queryKey;
    const linkKey = client
      .getQueryCache()
      .findAll({ queryKey: ["vehicle-shop-links"] })[0].queryKey;
    expect(receiptKey.slice(0, 4)).toEqual(["vehicle-receipts", "owner-a", vehicle, undefined]);
    expect(linkKey.slice(0, 3)).toEqual(["vehicle-shop-links", "owner-a", vehicle]);
    expect(receiptKey).toHaveLength(6);
    expect(linkKey).toHaveLength(5);
    expect(typeof receiptKey[4]).toBe("string");
    expect(typeof linkKey[3]).toBe("string");
    const receiptCall = vi.mocked(api.getVehicleReceipts).mock.calls[0][0] as unknown as {
      data: ReceiptTarget;
      signal: AbortSignal;
    };
    const linkCall = vi.mocked(api.listVehicleShopLinks).mock.calls[0][0] as unknown as {
      data: { vehicleId: string };
      signal: AbortSignal;
    };
    expect(receiptCall.data).toEqual({ vehicleId: vehicle, expectedAccountId: "owner-a", page: 0 });
    expect(linkCall.data).toEqual({ vehicleId: vehicle, expectedAccountId: "owner-a", page: 0 });
    expect(receiptCall.signal).toBeInstanceOf(AbortSignal);
    expect(linkCall.signal).toBeInstanceOf(AbortSignal);
    expect(receiptCall.signal).not.toBe(linkCall.signal);
    unmount();
  });

  it("does not reuse legacy cached rows/permissions/links or invent an empty state during a new read", async () => {
    const pending = deferred<ReceiptRead>();
    const pendingLinks = deferred<LinkRead>();
    vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(pending.promise);
    vi.mocked(api.listVehicleShopLinks).mockReturnValueOnce(pendingLinks.promise);
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    client.setQueryData(
      ["vehicle-receipts", "owner-a", vehicle, undefined],
      reply("Legacy cached private supplier"),
    );
    client.setQueryData(["vehicle-shop-links", "owner-a", vehicle], links("Legacy cached shop"));
    show(client);
    expect(screen.queryByText("Legacy cached private supplier")).not.toBeInTheDocument();
    expect(screen.queryByText("Legacy cached shop")).not.toBeInTheDocument();
    expect(screen.queryByText(empty)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke access" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add receipt" })).toBeDisabled();
    await act(async () => {
      pending.resolve(receiptPage({ receipts: [], linkedVehicleId: null, canWrite: false }));
      pendingLinks.resolve(linkPage([]));
    });
    await screen.findByText(empty);
    expect(screen.getByRole("button", { name: "Add receipt" })).toBeDisabled();
    expectNoListWrites();
  });

  it("retained-user Auth loading mounts no private scope and commits a teardown of an active editor", async () => {
    auth.loading = true;
    const { container, rerender, view, client } = show();
    expect(container).toBeEmptyDOMElement();
    expect(api.getVehicleReceipts).not.toHaveBeenCalled();
    expect(api.listVehicleShopLinks).not.toHaveBeenCalled();
    auth.loading = false;
    rerender(view());
    await waitFor(() => expect(screen.getByRole("button", { name: "Add receipt" })).toBeEnabled());
    const firstKey = client.getQueryCache().findAll({ queryKey: ["vehicle-receipts"] })[0].queryKey;
    fireEvent.click(screen.getByRole("button", { name: "Add receipt" }));
    fireEvent.change(screen.getByLabelText("Item description"), {
      target: { value: "Private pending entry" },
    });
    const pending = deferred<Awaited<ReturnType<typeof api.startVehicleReceipt>>>();
    vi.mocked(api.startVehicleReceipt).mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(api.startVehicleReceipt).toHaveBeenCalledTimes(1);
    auth.loading = true;
    rerender(view());
    expect(container).toBeEmptyDOMElement();
    auth.loading = false;
    rerender(view());
    await screen.findByText(empty);
    const nextKey = client
      .getQueryCache()
      .findAll({ queryKey: ["vehicle-receipts"] })
      .find((query) => query.getObserversCount() > 0)!.queryKey;
    expect(nextKey[4]).not.toBe(firstKey[4]);
    await act(async () => pending.resolve({ id: draftId, file_path: null }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  for (const transition of ["account", "vehicle", "shop"] as const) {
    it.each(["resolve", "reject"] as const)(
      `${transition} ABA ignores an original pending %s and requires a new mounted read`,
      async (settle) => {
        const old = deferred<ReceiptRead>(),
          current = deferred<ReceiptRead>();
        const oldLinks = deferred<LinkRead>(),
          currentLinks = deferred<LinkRead>();
        vi.mocked(api.getVehicleReceipts)
          .mockReturnValueOnce(old.promise)
          .mockResolvedValueOnce(reply("B supplier"))
          .mockReturnValueOnce(current.promise);
        if (transition !== "shop")
          vi.mocked(api.listVehicleShopLinks)
            .mockReturnValueOnce(oldLinks.promise)
            .mockResolvedValueOnce(links("B shop"))
            .mockReturnValueOnce(currentLinks.promise);
        const initialTarget =
          transition === "shop" ? { shopVehicleId: shopVehicle } : { vehicleId: vehicle };
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const keys: (readonly unknown[])[] = [];
        const unsubscribe = client.getQueryCache().subscribe((event) => {
          if (event.type === "added" && event.query.queryKey[0] === "vehicle-receipts")
            keys.push(event.query.queryKey);
        });
        const { rerender, view } = show(client, initialTarget);
        const oldSignal = (
          vi.mocked(api.getVehicleReceipts).mock.calls[0][0] as unknown as { signal: AbortSignal }
        ).signal;
        if (transition === "account") {
          auth.userId = "owner-b";
          rerender(view());
        } else
          rerender(
            view(
              transition === "vehicle"
                ? { vehicleId: otherVehicle }
                : { shopVehicleId: otherShopVehicle },
            ),
          );
        await screen.findByText("B supplier");
        if (transition !== "shop") await screen.findByText("B shop");
        if (transition === "account") auth.userId = "owner-a";
        rerender(view());
        expect(api.getVehicleReceipts).toHaveBeenCalledTimes(3);
        expect(oldSignal.aborted).toBe(true);
        expect(screen.queryByText("B supplier")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add receipt" })).toBeDisabled();
        await act(async () => {
          if (settle === "resolve") {
            old.resolve(reply("PRIVATE original A"));
            if (transition !== "shop") oldLinks.resolve(links("PRIVATE original shop"));
          } else {
            old.reject(new Error("PRIVATE original read failure"));
            if (transition !== "shop") oldLinks.reject(new Error("PRIVATE old link failure"));
          }
        });
        expect(screen.queryByText("PRIVATE original A")).not.toBeInTheDocument();
        expect(screen.queryByText("PRIVATE original shop")).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.queryByText(empty)).not.toBeInTheDocument();
        await act(async () => {
          current.resolve(reply("Fresh A supplier"));
          if (transition !== "shop") currentLinks.resolve(links("Fresh A shop"));
        });
        await screen.findByText("Fresh A supplier");
        if (transition !== "shop") await screen.findByText("Fresh A shop");
        expect(keys).toHaveLength(3);
        expect(keys[0].slice(0, 4)).toEqual(keys[2].slice(0, 4));
        expect(new Set(keys.map((key) => key[4])).size).toBe(3);
        expectNoListWrites();
        unsubscribe();
      },
    );
  }

  it.each(["logout", "unmount"] as const)(
    "ignores both late list outcomes after %s and forwards abort to pending reads",
    async (transition) => {
      const pending = deferred<ReceiptRead>(),
        pendingLinks = deferred<LinkRead>();
      vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(pending.promise);
      vi.mocked(api.listVehicleShopLinks).mockReturnValueOnce(pendingLinks.promise);
      const { rerender, view, unmount, container } = show();
      const readSignal = (
        vi.mocked(api.getVehicleReceipts).mock.calls[0][0] as unknown as { signal: AbortSignal }
      ).signal;
      const linkSignal = (
        vi.mocked(api.listVehicleShopLinks).mock.calls[0][0] as unknown as { signal: AbortSignal }
      ).signal;
      if (transition === "logout") {
        auth.userId = null;
        rerender(view());
      } else unmount();
      expect(readSignal.aborted).toBe(true);
      expect(linkSignal.aborted).toBe(true);
      await act(async () => {
        pending.resolve(reply("PRIVATE late row"));
        pendingLinks.reject(new Error("PRIVATE late link error"));
      });
      expect(container).toBeEmptyDOMElement();
      expect(toast.error).not.toHaveBeenCalled();
      expectNoListWrites();
    },
  );

  it("hides retained rows/filter/empty/actions on independent refetch errors and retries with generic copy", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(reply("Visible supplier"));
    vi.mocked(api.listVehicleShopLinks).mockResolvedValueOnce(links("Visible shop"));
    const { client } = show();
    await screen.findByText("Visible supplier");
    await screen.findByText("Visible shop");
    const read = deferred<ReceiptRead>(),
      linkRead = deferred<LinkRead>();
    vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(read.promise);
    vi.mocked(api.listVehicleShopLinks).mockReturnValueOnce(linkRead.promise);
    act(() => {
      void client.invalidateQueries({ queryKey: ["vehicle-receipts", "owner-a"] });
    });
    await screen.findByText("Loading receipts…");
    expect(screen.queryByText("Visible supplier")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Filter parts by section")).not.toBeInTheDocument();
    expect(screen.getByText("Visible shop")).toBeInTheDocument();
    await act(async () => read.reject(new Error("PRIVATE receipt cause")));
    await screen.findByText("Could not load receipts. Please try again.");
    expect(screen.queryByText(empty)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add receipt" })).toBeDisabled();
    act(() => {
      void client.invalidateQueries({ queryKey: ["vehicle-shop-links", "owner-a"] });
    });
    await screen.findByText("Loading shop connections…");
    expect(screen.queryByText("Visible shop")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke access" })).not.toBeInTheDocument();
    await act(async () => linkRead.reject(new Error("PRIVATE link cause")));
    await screen.findByText("Could not load shop connections. Please try again.");
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    expect(
      screen.queryByText("No active shop connections in this snapshot."),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry receipts" }));
    await screen.findByText(empty);
    expect(
      screen.getByText("Could not load shop connections. Please try again."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry shop connections" }));
    await screen.findByText("No active shop connections in this snapshot.");
    expect(api.getVehicleReceipts).toHaveBeenCalledTimes(3);
    expect(api.listVehicleShopLinks).toHaveBeenCalledTimes(3);
    expectNoListWrites();
  });

  it("blocks old DOM list controls in the exact tick invalidation begins", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
      receiptPage({
        receipts: [privateReceipt(), installedCandidate()],
        linkedVehicleId: null,
        canWrite: true,
      }),
    );
    vi.mocked(api.listVehicleShopLinks).mockResolvedValueOnce(links("Current shop"));
    const { client } = show();
    await screen.findByText("Current shop");
    const buttons = [
      screen.getByRole("button", { name: "Add receipt" }),
      screen.getByRole("button", { name: "Review" }),
      screen.getByRole("button", { name: "Discard draft" }),
      screen.getByRole("button", { name: /^Receipt$/ }),
      screen.getByRole("button", { name: "Record installation" }),
      screen.getByRole("button", { name: "Revoke access" }),
    ];
    fireEvent.change(screen.getByLabelText("Shop connection code"), {
      target: { value: "synthetic-code" },
    });
    buttons.push(screen.getByRole("button", { name: "Approve connection" }));
    const checkboxes = screen.getAllByRole("checkbox");
    const read = deferred<ReceiptRead>(),
      linkRead = deferred<LinkRead>();
    vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(read.promise);
    vi.mocked(api.listVehicleShopLinks).mockReturnValueOnce(linkRead.promise);
    act(() => {
      void client.invalidateQueries({ queryKey: ["vehicle-receipts", "owner-a"] });
      void client.invalidateQueries({ queryKey: ["vehicle-shop-links", "owner-a"] });
      buttons.forEach((button) => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      checkboxes.forEach((checkbox) =>
        checkbox.dispatchEvent(new MouseEvent("click", { bubbles: true })),
      );
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expectNoListWrites();
    await act(async () => {
      read.resolve(receiptPage({ receipts: [], linkedVehicleId: null }));
      linkRead.resolve(linkPage([]));
    });
  });

  it("masks paused and invalidated-without-refetch snapshots instead of treating them as fresh", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(reply("Previously visible supplier"));
    vi.mocked(api.listVehicleShopLinks).mockResolvedValue(links("Previously visible shop"));
    const { client } = show();
    await screen.findByText("Previously visible supplier");
    await screen.findByText("Previously visible shop");
    act(() => {
      void client.invalidateQueries({
        queryKey: ["vehicle-receipts", "owner-a"],
        refetchType: "none",
      });
      void client.invalidateQueries({
        queryKey: ["vehicle-shop-links", "owner-a"],
        refetchType: "none",
      });
    });
    expect(screen.queryByText("Previously visible supplier")).not.toBeInTheDocument();
    expect(screen.queryByText("Previously visible shop")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh receipts" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Refresh shop connections" })).toBeEnabled();
    expect(api.getVehicleReceipts).toHaveBeenCalledTimes(1);
    expect(api.listVehicleShopLinks).toHaveBeenCalledTimes(1);
    act(() => onlineManager.setOnline(false));
    fireEvent.click(screen.getByRole("button", { name: "Refresh receipts" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh shop connections" }));
    await waitFor(() => {
      expect(
        client.getQueryCache().find({ queryKey: ["vehicle-receipts"], exact: false })!.state
          .fetchStatus,
      ).toBe("paused");
      expect(
        client.getQueryCache().find({ queryKey: ["vehicle-shop-links"], exact: false })!.state
          .fetchStatus,
      ).toBe("paused");
    });
    expect(screen.queryByText("Previously visible supplier")).not.toBeInTheDocument();
    expect(screen.queryByText("Previously visible shop")).not.toBeInTheDocument();
    expect(screen.queryByText(empty)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add receipt" })).toBeDisabled();
    act(() => onlineManager.setOnline(true));
    await screen.findByText("Previously visible supplier");
    await screen.findByText("Previously visible shop");
  });

  it.each(["receipts", "shop connections"] as const)(
    "repeated old %s retry clicks join a pending read instead of cancelling/restarting it",
    async (kind) => {
      const isReceipts = kind === "receipts";
      if (isReceipts)
        vi.mocked(api.getVehicleReceipts).mockRejectedValueOnce(new Error("PRIVATE receipt cause"));
      else
        vi.mocked(api.listVehicleShopLinks).mockRejectedValueOnce(new Error("PRIVATE link cause"));
      show();
      const retry = await screen.findByRole("button", { name: `Retry ${kind}` });
      const pending = deferred<ReceiptRead | LinkRead>();
      if (isReceipts)
        vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(
          pending.promise as Promise<ReceiptRead>,
        );
      else
        vi.mocked(api.listVehicleShopLinks).mockReturnValueOnce(
          pending.promise as Promise<LinkRead>,
        );
      act(() => {
        retry.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        retry.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(isReceipts ? api.getVehicleReceipts : api.listVehicleShopLinks).toHaveBeenCalledTimes(
        2,
      );
      const call = (isReceipts
        ? vi.mocked(api.getVehicleReceipts).mock.calls[1][0]
        : vi.mocked(api.listVehicleShopLinks).mock.calls[1][0]) as unknown as {
        signal: AbortSignal;
      };
      expect(call.signal.aborted).toBe(false);
      await act(async () =>
        pending.resolve(isReceipts ? reply("Retried supplier") : links("Retried shop")),
      );
      await screen.findByText(isReceipts ? "Retried supplier" : "Retried shop");
    },
  );

  it("has no perpetual disabled-link loading in native-shop mode and guards same-tick code/expense admission", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
      receiptPage({
        receipts: [{ ...installedCandidate(), shop_vehicle_id: shopVehicle }],
        linkedVehicleId: null,
        canWrite: true,
        canRecordExpense: true,
      }),
    );
    const { client } = show(undefined, { shopVehicleId: shopVehicle });
    const code = await screen.findByRole("button", { name: "Create owner connection code" });
    await waitFor(() => expect(code).toBeEnabled());
    expect(api.listVehicleShopLinks).not.toHaveBeenCalled();
    expect(screen.queryByText("Loading shop connections…")).not.toBeInTheDocument();
    const expense = screen.getByRole("button", { name: "Record shop expense" });
    const pending = deferred<ReceiptRead>();
    vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(pending.promise);
    act(() => {
      void client.invalidateQueries({ queryKey: ["vehicle-receipts", "owner-a"] });
      code.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expense.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(api.requestShopVehicleLink).not.toHaveBeenCalled();
    expect(api.recordVehicleReceiptExpense).not.toHaveBeenCalled();
    await act(async () =>
      pending.resolve(receiptPage({ receipts: [], linkedVehicleId: null, canWrite: true })),
    );
    vi.mocked(api.requestShopVehicleLink).mockResolvedValueOnce("synthetic-owner-code");
    fireEvent.click(screen.getByRole("button", { name: "Create owner connection code" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Owner connection code")).toHaveValue("synthetic-owner-code"),
    );
  });

  it("keeps review and installation drafts mounted across fetching/error/success without applying new rows to them", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
      receiptPage({
        receipts: [receipt("Original supplier"), installedCandidate()],
        linkedVehicleId: null,
        canWrite: true,
      }),
    );
    const { client } = show();
    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    const editor = screen.getByRole("dialog");
    fireEvent.change(within(editor).getByLabelText("Supplier / shop"), {
      target: { value: "Unsaved private draft" },
    });
    const read = deferred<ReceiptRead>();
    vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(read.promise);
    act(() => {
      void client.invalidateQueries({ queryKey: ["vehicle-receipts", "owner-a"] });
    });
    expect(screen.getByRole("dialog")).toBe(editor);
    expect(screen.getByLabelText("Supplier / shop")).toHaveValue("Unsaved private draft");
    await act(async () => read.reject(new Error("PRIVATE refresh failure")));
    await screen.findByText("Could not load receipts. Please try again.");
    expect(screen.getByRole("dialog")).toBe(editor);
    vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
      receiptPage({
        receipts: [receipt("New row supplier"), installedCandidate()],
        linkedVehicleId: null,
        canWrite: false,
      }),
    );
    act(() => {
      void client.refetchQueries({ queryKey: ["vehicle-receipts", "owner-a"] });
    });
    await screen.findByText("New row supplier");
    expect(screen.getByRole("dialog")).toBe(editor);
    expect(screen.getByLabelText("Supplier / shop")).toHaveValue("Unsaved private draft");
    vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
      receiptPage({
        receipts: [installedCandidate()],
        linkedVehicleId: null,
        canWrite: true,
      }),
    );
    fireEvent.click(within(editor).getAllByRole("button", { name: /^Close$/ })[0]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await screen.findByRole("button", { name: "Record installation" });
    fireEvent.click(screen.getByRole("button", { name: "Record installation" }));
    const install = screen.getByRole("dialog");
    fireEvent.change(within(install).getByLabelText("Odometer (km, optional)"), {
      target: { value: "12345" },
    });
    const installRead = deferred<ReceiptRead>();
    vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(installRead.promise);
    act(() => {
      void client.invalidateQueries({ queryKey: ["vehicle-receipts", "owner-a"] });
    });
    expect(screen.getByRole("dialog")).toBe(install);
    await act(async () => installRead.reject(new Error("PRIVATE install refresh failure")));
    await screen.findByText("Could not load receipts. Please try again.");
    expect(screen.getByRole("dialog")).toBe(install);
    expect(within(install).getByLabelText("Odometer (km, optional)")).toHaveValue(12345);
    act(() => {
      void client.refetchQueries({ queryKey: ["vehicle-receipts", "owner-a"] });
    });
    await screen.findByText(empty);
    expect(screen.getByRole("dialog")).toBe(install);
    expect(within(install).getByLabelText("Odometer (km, optional)")).toHaveValue(12345);
    expectNoListWrites();
  });

  it("preserves an unknown editor hold and acknowledged ID across both list refresh failures/retries", async () => {
    vi.mocked(api.saveVehicleReceipt).mockRejectedValueOnce(new Error("PRIVATE unknown save"));
    const { client } = show();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add receipt" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Add receipt" }));
    const editor = screen.getByRole("dialog");
    fireEvent.change(within(editor).getByLabelText("Supplier / shop"), {
      target: { value: "Held supplier" },
    });
    fireEvent.change(within(editor).getByLabelText("Item description"), {
      target: { value: "Held part" },
    });
    fireEvent.click(within(editor).getByRole("button", { name: "Save draft" }));
    await within(editor).findByText(/Receipt change could not be confirmed/);
    expect(api.saveVehicleReceipt).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: draftId }),
    });
    const read = deferred<ReceiptRead>(),
      linkRead = deferred<LinkRead>();
    vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(read.promise);
    vi.mocked(api.listVehicleShopLinks).mockReturnValueOnce(linkRead.promise);
    act(() => {
      void client.invalidateQueries({ queryKey: ["vehicle-receipts", "owner-a"] });
      void client.invalidateQueries({ queryKey: ["vehicle-shop-links", "owner-a"] });
    });
    expect(screen.getByRole("dialog")).toBe(editor);
    await act(async () => {
      read.reject(new Error("PRIVATE receipt refresh"));
      linkRead.reject(new Error("PRIVATE link refresh"));
    });
    await screen.findByText("Could not load receipts. Please try again.");
    await screen.findByText("Could not load shop connections. Please try again.");
    act(() => {
      void client.refetchQueries({ queryKey: ["vehicle-receipts", "owner-a"] });
      void client.refetchQueries({ queryKey: ["vehicle-shop-links", "owner-a"] });
    });
    await screen.findByText(empty);
    expect(screen.getByRole("dialog")).toBe(editor);
    expect(within(editor).getByLabelText("Supplier / shop")).toHaveValue("Held supplier");
    expect(within(editor).getByLabelText("Item description")).toHaveValue("Held part");
    expect(within(editor).getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(within(editor).getByRole("button", { name: "Close and check receipts" })).toBeEnabled();
    expect(api.startVehicleReceipt).toHaveBeenCalledTimes(1);
    expect(api.saveVehicleReceipt).toHaveBeenCalledTimes(1);
    expect(localOcr.upload).not.toHaveBeenCalled();
    expect(api.discardReceiptDraft).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe("temporary mixed receipt public-sharing interlock", () => {
  const shopControl = "Share with linked shops";
  const publicControl = "Show parts summary on public ride/passport";
  function line(publicSummary: boolean, index: number): VehicleReceipt["items"][number] {
    return {
      id: `sharing-item-${index}`,
      description: `Sharing test item ${index}`,
      category: index === 0 ? "brakes" : "engine",
      brand: null,
      part_number: null,
      quantity: 1,
      total: null,
      confidence: 1,
      reviewed: true,
      installed_on: null,
      odometer_km: null,
      public_summary_allowed: publicSummary,
    };
  }
  function sharingRow(flags: boolean[], shareWithShop = false) {
    return {
      ...receipt("Sharing preference supplier"),
      status: "confirmed" as const,
      share_with_shop: shareWithShop,
      items: flags.map(line),
    };
  }
  function rawChange(checkbox: HTMLElement) {
    const input = checkbox as HTMLInputElement;
    const delivered = vi.fn();
    input.addEventListener("click", delivered);
    act(() => {
      // Deliberately bypass DOM disabled admission. The component's onChange
      // must independently refuse this event; native disabled behavior alone
      // is not the privacy interlock under test.
      input.disabled = false;
      input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      input.disabled = true;
    });
    expect(delivered).toHaveBeenCalledTimes(1);
    input.removeEventListener("click", delivered);
  }
  beforeEach(() => {
    vi.mocked(api.setReceiptSharing).mockReset().mockResolvedValue(null);
  });

  for (const filter of ["", "brakes", "engine"] as const) {
    it.each([
      [true, false],
      [false, true],
    ])(
      `preserves mixed %s/%s choices and refuses both raw controls with category '${filter || "all"}'`,
      async (first, second) => {
        const row = sharingRow([first, second], first);
        vi.mocked(api.getVehicleReceipts).mockResolvedValue(
          receiptPage({ receipts: [row], linkedVehicleId: null }),
        );
        const { client } = show();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        await screen.findByText("Sharing preference supplier");
        if (filter)
          fireEvent.change(screen.getByLabelText("Filter parts by section"), {
            target: { value: filter },
          });
        if (filter === "brakes")
          expect(screen.queryByText("Sharing test item 1")).not.toBeInTheDocument();
        if (filter === "engine")
          expect(screen.queryByText("Sharing test item 0")).not.toBeInTheDocument();
        const shop = screen.getByRole("checkbox", { name: shopControl });
        const summary = screen.getByRole("checkbox", { name: publicControl });
        expect(shop).toBeDisabled();
        expect(summary).toBeDisabled();
        expect(shop).toHaveProperty("checked", first);
        expect(summary).not.toBeChecked();
        expect(
          screen.getByText(/These items have different public-sharing choices/),
        ).toHaveTextContent(
          "A separate control is needed to change shop access without changing individual public choices.",
        );
        rawChange(shop);
        rawChange(summary);
        expect(api.setReceiptSharing).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
        expect(row.items.map((item) => item.public_summary_allowed)).toEqual([first, second]);
        expect(api.getVehicleReceipts).toHaveBeenCalledTimes(1);
      },
    );
  }

  it.each([
    { allPublic: false, shared: false },
    { allPublic: false, shared: true },
    { allPublic: true, shared: false },
    { allPublic: true, shared: true },
  ])(
    "retains homogeneous receipt intent without changing the other choice: %j",
    async ({ allPublic, shared }) => {
      const row = sharingRow([allPublic, allPublic], shared);
      vi.mocked(api.getVehicleReceipts).mockResolvedValue(
        receiptPage({ receipts: [row], linkedVehicleId: null }),
      );
      show();
      await screen.findByText("Sharing preference supplier");
      expect(
        screen.queryByText(/These items have different public-sharing choices/),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: shopControl })).toBeEnabled();
      expect(screen.getByRole("checkbox", { name: publicControl })).toHaveProperty(
        "checked",
        allPublic,
      );
      fireEvent.click(screen.getByRole("checkbox", { name: shopControl }));
      await waitFor(() =>
        expect(api.setReceiptSharing).toHaveBeenCalledExactlyOnceWith({
          data: { id: row.id, shareWithShop: !shared, publicSummary: allPublic },
        }),
      );
      await waitFor(() =>
        expect(screen.getByRole("checkbox", { name: publicControl })).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole("checkbox", { name: publicControl }));
      await waitFor(() => expect(api.setReceiptSharing).toHaveBeenCalledTimes(2));
      expect(api.setReceiptSharing).toHaveBeenNthCalledWith(2, {
        data: { id: row.id, shareWithShop: shared, publicSummary: !allPublic },
      });
      expect(row.items.map((item) => item.public_summary_allowed)).toEqual([allPublic, allPublic]);
    },
  );

  it.each([false, true])(
    "keeps existing zero-item sharing behavior for shop preference %s",
    async (shared) => {
      const row = sharingRow([], shared);
      vi.mocked(api.getVehicleReceipts).mockResolvedValue(
        receiptPage({ receipts: [row], linkedVehicleId: null }),
      );
      show();
      await screen.findByText("Sharing preference supplier");
      expect(screen.getByRole("checkbox", { name: shopControl })).toBeEnabled();
      expect(screen.getByRole("checkbox", { name: publicControl })).toBeEnabled();
      expect(screen.getByRole("checkbox", { name: publicControl })).not.toBeChecked();
      fireEvent.click(screen.getByRole("checkbox", { name: shopControl }));
      await waitFor(() =>
        expect(api.setReceiptSharing).toHaveBeenCalledExactlyOnceWith({
          data: { id: row.id, shareWithShop: !shared, publicSummary: false },
        }),
      );
      await waitFor(() =>
        expect(screen.getByRole("checkbox", { name: publicControl })).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole("checkbox", { name: publicControl }));
      await waitFor(() => expect(api.setReceiptSharing).toHaveBeenCalledTimes(2));
      expect(api.setReceiptSharing).toHaveBeenNthCalledWith(2, {
        data: { id: row.id, shareWithShop: shared, publicSummary: true },
      });
    },
  );

  it.each([
    [false, false],
    [true, true],
    [true, false],
  ])(
    "retains the incomplete-set guard for visible %s/%s choices without guessing hidden choices",
    async (first, second) => {
      const row = sharingRow([first, second]);
      vi.mocked(api.getVehicleReceipts).mockResolvedValue(
        receiptPage({
          receipts: [{ ...row, items_complete: false, item_count: 101 }],
          linkedVehicleId: null,
        }),
      );
      show();
      await screen.findByText("Sharing preference supplier");
      expect(screen.getByText(/Showing 2 of 101 lines/)).toBeInTheDocument();
      expect(
        screen.queryByText(/These items have different public-sharing choices/),
      ).not.toBeInTheDocument();
      for (const name of [shopControl, publicControl]) {
        const control = screen.getByRole("checkbox", { name });
        expect(control).toBeDisabled();
        rawChange(control);
      }
      expect(api.setReceiptSharing).not.toHaveBeenCalled();
      expect(row.items.map((item) => item.public_summary_allowed)).toEqual([first, second]);
    },
  );
});

// Actual panel + QueryClient, synthetic transport acknowledgments only. These
// cases do not execute the expense RPC or prove posting, rollback or dedupe.
describe("receipt expense request acknowledgment and committed lifetime", () => {
  const shopVehicle = "31000000-aaaa-4000-8000-000000000001";
  const otherShopVehicle = "31000000-bbbb-4000-8000-000000000002";
  const receiptId = "32000000-0000-4000-8000-000000000001";
  const otherReceiptId = "32000000-0000-4000-8000-000000000002";
  const expenseId = "33000000-0000-4000-8000-000000000001";
  const control = "Record shop expense";
  const neutral = "Expense request acknowledged. Check shop expenses to confirm.";
  const failure =
    "Expense change could not be confirmed. Check shop expenses before repeating this request.";
  type ExpenseAck = Awaited<ReturnType<typeof api.recordVehicleReceiptExpense>>;
  type FixtureReceiptReadOptions = {
    data: { expectedAccountId: string; shopVehicleId?: string; page?: number };
  };
  const acknowledgment = (id = receiptId, target = shopVehicle): ExpenseAck => ({
    receiptId: id,
    shopVehicleId: target,
    expenseId,
  });
  const expenseRow = (id = receiptId, target = shopVehicle): VehicleReceipt => ({
    ...receipt("Expense source supplier"),
    id,
    vehicle_id: null,
    shop_vehicle_id: target,
    status: "confirmed",
  });
  function page(target = shopVehicle, currentPage = 0, totalCount = 2): ReceiptRead {
    return receiptPage(
      {
        receipts:
          currentPage === 0
            ? [expenseRow(receiptId, target), expenseRow(otherReceiptId, target)]
            : [expenseRow(otherReceiptId, target)],
        linkedVehicleId: null,
        canWrite: false,
        canRecordExpense: true,
      },
      currentPage,
      totalCount,
    );
  }
  function request(index = 0) {
    return vi.mocked(api.recordVehicleReceiptExpense).mock.calls[index][0] as unknown as {
      data: { id: string; expectedAccountId: string; expectedShopVehicleId: string };
      signal: AbortSignal;
    };
  }
  function captureSourceClick(button: HTMLElement) {
    // Deliberately retain the actual source handler, bypassing native/React
    // disabled admission. This is an adversarial component harness, not a
    // keyboard/browser accessibility or authorization proof.
    const key = Object.getOwnPropertyNames(button).find((name) => name.startsWith("__reactProps$"));
    expect(key).toBeDefined();
    const props = Reflect.get(button, key!) as { onClick: () => void };
    expect(props.onClick).toBeTypeOf("function");
    return props.onClick;
  }
  async function showExpense() {
    const view = show(undefined, { shopVehicleId: shopVehicle });
    await screen.findAllByRole("button", { name: control });
    return view;
  }
  beforeEach(() => {
    vi.mocked(api.recordVehicleReceiptExpense).mockReset().mockResolvedValue(acknowledgment());
    vi.mocked(api.getVehicleReceipts).mockImplementation((options) => {
      const input = (options as unknown as FixtureReceiptReadOptions).data;
      return Promise.resolve(page(input.shopVehicleId ?? shopVehicle, input.page));
    });
    vi.spyOn(toast, "message").mockImplementation(() => 0);
    vi.spyOn(toast, "success").mockImplementation(() => 0);
    vi.spyOn(toast, "error").mockImplementation(() => 0);
  });
  afterEach(() => {
    onlineManager.setOnline(true);
    vi.restoreAllMocks();
  });

  it("admits one synchronous request across receipt controls and acknowledges only exact bound IDs", async () => {
    const pending = deferred<ExpenseAck>();
    vi.mocked(api.recordVehicleReceiptExpense).mockReturnValueOnce(pending.promise);
    const { client } = await showExpense();
    const currentExpenses = ["shop-manager", "owner-a", "expenses", "scope-a"];
    const otherExpenses = ["shop-manager", "owner-b", "expenses", "scope-b"];
    const vehicleChoices = ["shop-manager", "owner-a", "receipt-vehicle-choices", "scope-a"];
    client.setQueryData(currentExpenses, { marker: "current expense window" });
    client.setQueryData(otherExpenses, { marker: "other account window" });
    client.setQueryData(vehicleChoices, { marker: "independent vehicle window" });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const buttons = screen.getAllByRole("button", { name: control });
    const rawFirst = captureSourceClick(buttons[0]);
    const rawSecond = captureSourceClick(buttons[1]);
    act(() => {
      rawFirst();
      rawFirst();
      rawSecond();
    });
    expect(api.recordVehicleReceiptExpense).toHaveBeenCalledTimes(1);
    expect(request().data).toEqual({
      id: receiptId,
      expectedAccountId: "owner-a",
      expectedShopVehicleId: shopVehicle,
    });
    expect(Object.isFrozen(request().data)).toBe(true);
    expect(request().signal).toBeInstanceOf(AbortSignal);
    expect(request().signal.aborted).toBe(false);
    expect(screen.getByText("Checking expense request…")).toBeInTheDocument();
    for (const button of buttons) expect(button).toBeDisabled();
    expect(toast.message).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    await act(async () => pending.resolve(acknowledgment()));
    expect(toast.message).toHaveBeenCalledExactlyOnceWith(neutral);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      ["shop-manager", "owner-a", "expenses"],
      ["shop-manager", "expenses"],
      ["vehicle-receipts", "owner-a"],
      ["vehicle-history"],
    ]);
    expect(client.getQueryState(currentExpenses)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherExpenses)?.isInvalidated).toBe(false);
    expect(client.getQueryState(vehicleChoices)?.isInvalidated).toBe(false);
    expect(screen.queryByText(failure)).not.toBeInTheDocument();
    expect(screen.queryByText(/Recorded in shop expenses/)).not.toBeInTheDocument();
  });

  it("matches direct shop UUIDs case-insensitively while capturing the selected target spelling", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
      receiptPage({
        receipts: [expenseRow(receiptId, shopVehicle.toUpperCase())],
        linkedVehicleId: null,
        canWrite: false,
        canRecordExpense: true,
      }),
    );
    vi.mocked(api.recordVehicleReceiptExpense).mockResolvedValueOnce(
      acknowledgment(receiptId, shopVehicle.toUpperCase()),
    );
    await showExpense();
    fireEvent.click(screen.getByRole("button", { name: control }));
    await waitFor(() => expect(toast.message).toHaveBeenCalledExactlyOnceWith(neutral));
    expect(request().data.expectedShopVehicleId).toBe(shopVehicle);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["void success", { ok: true }],
    ["missing expense", { receiptId, shopVehicleId: shopVehicle }],
    ["wrong receipt", { receiptId: otherReceiptId, shopVehicleId: shopVehicle, expenseId }],
    ["wrong shop", { receiptId, shopVehicleId: otherShopVehicle, expenseId }],
    ["malformed expense", { receiptId, shopVehicleId: shopVehicle, expenseId: "not-an-id" }],
    ["extra field", { receiptId, shopVehicleId: shopVehicle, expenseId, posted: true }],
  ] as const)(
    "holds redispatch after a %s acknowledgment without optimistic financial success",
    async (_label, value) => {
      vi.mocked(api.recordVehicleReceiptExpense).mockResolvedValueOnce(value as ExpenseAck);
      const { client } = await showExpense();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      const raw = captureSourceClick(screen.getAllByRole("button", { name: control })[0]);
      act(raw);
      await screen.findByText(failure);
      act(raw);
      for (const button of screen.getAllByRole("button", { name: control }))
        expect(button).toBeDisabled();
      expect(api.recordVehicleReceiptExpense).toHaveBeenCalledTimes(1);
      expect(toast.message).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      expect(screen.queryByText(/not-an-id|posted/)).not.toBeInTheDocument();
    },
  );

  it("holds a rejected unknown outcome through read failure, retry and page changes", async () => {
    vi.mocked(api.getVehicleReceipts).mockImplementation((options) =>
      Promise.resolve(
        page(
          (options as unknown as FixtureReceiptReadOptions).data.shopVehicleId ?? shopVehicle,
          (options as unknown as FixtureReceiptReadOptions).data.page,
          26,
        ),
      ),
    );
    vi.mocked(api.recordVehicleReceiptExpense).mockRejectedValueOnce(
      new Error("PRIVATE expense SQL detail"),
    );
    const { client } = await showExpense();
    const raw = captureSourceClick(screen.getAllByRole("button", { name: control })[0]);
    act(raw);
    await screen.findByText(failure);
    vi.mocked(api.getVehicleReceipts).mockRejectedValueOnce(new Error("PRIVATE refresh detail"));
    act(() => {
      void client.refetchQueries({ queryKey: ["vehicle-receipts", "owner-a"] });
    });
    await screen.findByText("Could not load receipts. Please try again.");
    expect(screen.getByText(failure)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry receipts" }));
    await screen.findAllByRole("button", { name: control });
    fireEvent.click(screen.getByRole("button", { name: "Next receipts" }));
    await screen.findByText(/Receipt page 2/);
    const second = await screen.findByRole("button", { name: control });
    expect(second).toBeDisabled();
    act(raw);
    act(captureSourceClick(second));
    expect(api.recordVehicleReceiptExpense).toHaveBeenCalledTimes(1);
    expect(screen.getByText(failure)).toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    expect(toast.message).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it.each(["missing capability", "draft", "owner receipt", "other shop"] as const)(
    "does not offer expense admission for %s in the selected workspace",
    async (kind) => {
      const row = expenseRow();
      vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
        receiptPage({
          receipts: [
            {
              ...row,
              ...(kind === "draft" ? { status: "draft" as const } : {}),
              ...(kind === "owner receipt" ? { shop_vehicle_id: null, vehicle_id: vehicle } : {}),
              ...(kind === "other shop" ? { shop_vehicle_id: otherShopVehicle } : {}),
            },
          ],
          linkedVehicleId: vehicle,
          canWrite: true,
          canRecordExpense: kind !== "missing capability",
        }),
      );
      show(undefined, { shopVehicleId: shopVehicle });
      await screen.findByText("Expense source supplier");
      expect(screen.queryByRole("button", { name: control })).not.toBeInTheDocument();
      expect(api.recordVehicleReceiptExpense).not.toHaveBeenCalled();
    },
  );

  it.each(["invalidated", "paused", "error", "replaced capability", "page intent"] as const)(
    "rejects a retained raw expense handler after synchronous %s read loss",
    async (kind) => {
      const { client } = await showExpense();
      const raw = captureSourceClick(screen.getAllByRole("button", { name: control })[0]);
      const cached = client.getQueryCache().find({ queryKey: ["vehicle-receipts"], exact: false })!;
      const pending = deferred<ReceiptRead>();
      vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(pending.promise);
      act(() => {
        if (kind === "invalidated")
          void client.invalidateQueries({ queryKey: ["vehicle-receipts"] });
        if (kind === "paused") {
          onlineManager.setOnline(false);
          void client.refetchQueries({ queryKey: ["vehicle-receipts"] });
        }
        if (kind === "error") cached.setState({ status: "error", error: new Error("PRIVATE") });
        if (kind === "replaced capability")
          client.setQueryData(cached.queryKey, { ...page(), canRecordExpense: false });
        if (kind === "page intent") {
          client.setQueryData(cached.queryKey, page(shopVehicle, 0, 26));
        }
        raw();
      });
      if (kind === "page intent") {
        await waitFor(() =>
          expect(screen.getByRole("button", { name: "Next receipts" })).toBeEnabled(),
        );
        const latest = captureSourceClick(screen.getAllByRole("button", { name: control })[0]);
        act(() => {
          screen.getByRole("button", { name: "Next receipts" }).click();
          latest();
        });
        expect(screen.getByText(/Receipt page 2/)).toBeInTheDocument();
      }
      expect(api.recordVehicleReceiptExpense).not.toHaveBeenCalled();
      expect(toast.message).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      await act(async () => pending.resolve(page(shopVehicle, 1, 26)));
    },
  );

  it("does not treat an ordinary receipt refresh as transport cancellation or an expense outcome", async () => {
    const pending = deferred<ExpenseAck>();
    const read = deferred<ReceiptRead>();
    vi.mocked(api.recordVehicleReceiptExpense).mockReturnValueOnce(pending.promise);
    const { client } = await showExpense();
    fireEvent.click(screen.getAllByRole("button", { name: control })[0]);
    vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(read.promise);
    act(() => {
      void client.refetchQueries({ queryKey: ["vehicle-receipts"] });
    });
    expect(request().signal.aborted).toBe(false);
    expect(screen.getByText("Checking expense request…")).toBeInTheDocument();
    await act(async () => pending.resolve(acknowledgment()));
    expect(toast.message).toHaveBeenCalledExactlyOnceWith(neutral);
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.queryByText(failure)).not.toBeInTheDocument();
    await act(async () => read.resolve(page()));
  });

  for (const settlement of ["resolve", "reject"] as const) {
    it.each([
      "account",
      "shop target",
      "logout",
      "Auth loading",
      "account ABA",
      "target ABA",
    ] as const)(
      `silences old ${settlement} after committed %s and cannot release a new expense lock`,
      async (kind) => {
        const old = deferred<ExpenseAck>(),
          current = deferred<ExpenseAck>();
        vi.mocked(api.recordVehicleReceiptExpense)
          .mockReturnValueOnce(old.promise)
          .mockReturnValueOnce(current.promise);
        const { client, container, rerender, view } = await showExpense();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        fireEvent.click(screen.getAllByRole("button", { name: control })[0]);
        const original = request();
        let selectedShop = shopVehicle;
        if (kind === "account" || kind === "account ABA") {
          auth.userId = "owner-b";
          rerender(view());
        }
        if (kind === "account ABA") {
          auth.userId = "owner-a";
          rerender(view());
        }
        if (kind === "shop target" || kind === "target ABA") {
          selectedShop = otherShopVehicle;
          rerender(view({ shopVehicleId: selectedShop }));
        }
        if (kind === "target ABA") {
          selectedShop = shopVehicle;
          rerender(view({ shopVehicleId: selectedShop }));
        }
        if (kind === "logout") {
          auth.userId = null;
          rerender(view());
          expect(container).toBeEmptyDOMElement();
          auth.userId = "owner-a";
          rerender(view());
        }
        if (kind === "Auth loading") {
          auth.loading = true;
          rerender(view());
          expect(container).toBeEmptyDOMElement();
          auth.loading = false;
          rerender(view());
        }
        expect(original.signal.aborted).toBe(true);
        const button = (await screen.findAllByRole("button", { name: control }))[0];
        fireEvent.click(button);
        expect(api.recordVehicleReceiptExpense).toHaveBeenCalledTimes(2);
        expect(request(1).data).toEqual({
          id: receiptId,
          expectedAccountId: auth.userId,
          expectedShopVehicleId: selectedShop,
        });
        expect(original.data).toEqual({
          id: receiptId,
          expectedAccountId: "owner-a",
          expectedShopVehicleId: shopVehicle,
        });
        await act(async () =>
          settlement === "resolve"
            ? old.resolve(acknowledgment())
            : old.reject(new Error("PRIVATE old outcome")),
        );
        expect(button).toBeDisabled();
        expect(toast.message).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
        expect(screen.queryByText(failure)).not.toBeInTheDocument();
        await act(async () => current.resolve(acknowledgment(receiptId, selectedShop)));
        expect(toast.message).toHaveBeenCalledExactlyOnceWith(neutral);
        expect(toast.success).not.toHaveBeenCalled();
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vehicle-receipts", auth.userId] });
      },
    );

    it(`silences ${settlement} after unmount and aborts only the expense transport`, async () => {
      const old = deferred<ExpenseAck>();
      vi.mocked(api.recordVehicleReceiptExpense).mockReturnValueOnce(old.promise);
      const { client, unmount } = await showExpense();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      fireEvent.click(screen.getAllByRole("button", { name: control })[0]);
      unmount();
      expect(request().signal.aborted).toBe(true);
      await act(async () =>
        settlement === "resolve"
          ? old.resolve(acknowledgment())
          : old.reject(new Error("PRIVATE unmounted outcome")),
      );
      expect(invalidate).not.toHaveBeenCalled();
      expect(toast.message).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it(`retains an uncertain in-flight StrictMode hold despite late ${settlement}`, async () => {
      const old = deferred<ExpenseAck>();
      vi.mocked(api.recordVehicleReceiptExpense).mockReturnValueOnce(old.promise);
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      let seeded = 0,
        cleanups = 0;
      const unsubscribe = client.getQueryCache().subscribe((event) => {
        if (event.type !== "added" || event.query.queryKey[0] !== "vehicle-receipts") return;
        expect(event.query.queryKey.slice(0, 4)).toEqual([
          "vehicle-receipts",
          "owner-a",
          undefined,
          shopVehicle,
        ]);
        expect(event.query.queryKey).toHaveLength(6);
        seeded += 1;
        event.query.setData(page(), { updatedAt: Date.now() + 60_000, manual: true });
      });
      const invalidate = vi.spyOn(client, "invalidateQueries");
      function StartDuringFirstCommit() {
        const started = useRef(false);
        useLayoutEffect(() => {
          if (!started.current) {
            started.current = true;
            screen.getAllByRole("button", { name: control })[0].click();
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
            <VehicleReceiptPanel shopVehicleId={shopVehicle} />
            <StartDuringFirstCommit />
          </QueryClientProvider>
        </StrictMode>,
      );
      unsubscribe();
      expect(seeded).toBeGreaterThan(0);
      expect(cleanups).toBe(1);
      expect(api.recordVehicleReceiptExpense).toHaveBeenCalledTimes(1);
      expect(toast.message).not.toHaveBeenCalled();
      expect(request().signal.aborted).toBe(true);
      expect(screen.getByText(failure)).toBeInTheDocument();
      const button = screen.getAllByRole("button", { name: control })[0];
      expect(button).toBeDisabled();
      act(captureSourceClick(button));
      await act(async () =>
        settlement === "resolve"
          ? old.resolve(acknowledgment())
          : old.reject(new Error("PRIVATE replay outcome")),
      );
      expect(screen.getByText(failure)).toBeInTheDocument();
      expect(button).toBeDisabled();
      expect(api.recordVehicleReceiptExpense).toHaveBeenCalledTimes(1);
      expect(toast.message).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    });
  }
});

// Source-only interlock: no removal transport is admitted. These synthetic
// component cases do not prove Storage/database recovery or safe deletion.
describe("temporary receipt draft-removal unavailability", () => {
  const unavailable =
    "Draft removal is temporarily unavailable until recovery is verified. Keep this draft and its original file.";
  type State = "editable" | "retained read-only" | "incomplete";
  function draft(attached: boolean, state: State): ReceiptRead["receipts"][number] {
    return receiptPage({
      receipts: [
        {
          ...receipt("Preserved draft supplier"),
          id: draftId,
          file_path: attached ? `owner-a/${draftId}/original.pdf` : null,
          file_name: attached ? "Preserved original.pdf" : null,
          media_type: attached ? "application/pdf" : null,
          items: ["brakes", "engine"].map((category, index) => ({
            id: `preserved-draft-line-${index}`,
            description: `Preserved line ${index}`,
            category: category as "brakes" | "engine",
            brand: null,
            part_number: null,
            quantity: 1,
            total: null,
            confidence: 1,
            reviewed: true,
            installed_on: null,
            odometer_km: null,
            public_summary_allowed: false,
          })),
          items_complete: state !== "incomplete",
          item_count: state === "incomplete" ? 101 : 2,
          edit_eligible: state === "editable",
        },
      ],
      linkedVehicleId: null,
    }).receipts[0];
  }
  function expectNoRemovalDispatch() {
    expect(api.discardReceiptDraft).not.toHaveBeenCalled();
    expect(api.startVehicleReceipt).not.toHaveBeenCalled();
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
    expect(api.extractVehicleReceipt).not.toHaveBeenCalled();
    expect(localOcr.upload).not.toHaveBeenCalled();
  }
  function rawDisabledBypass(button: HTMLElement) {
    const key = Object.getOwnPropertyNames(button).find((name) => name.startsWith("__reactProps$"));
    if (key) {
      const props = Reflect.get(button, key) as { onClick?: unknown };
      expect(props.onClick).toBeUndefined();
    } else {
      // React may remove its prop pointer when detaching an old account/target.
      expect(button.isConnected).toBe(false);
    }
    const delivered = vi.fn();
    button.addEventListener("click", delivered);
    act(() => {
      (button as HTMLButtonElement).disabled = false;
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      (button as HTMLButtonElement).disabled = true;
    });
    button.removeEventListener("click", delivered);
    expect(delivered).toHaveBeenCalledExactlyOnceWith(expect.any(MouseEvent));
  }
  beforeEach(() => {
    vi.mocked(api.discardReceiptDraft).mockReset();
    vi.spyOn(toast, "success").mockImplementation(() => 0);
    vi.spyOn(toast, "error").mockImplementation(() => 0);
    vi.spyOn(toast, "message").mockImplementation(() => 0);
  });
  afterEach(() => vi.restoreAllMocks());

  for (const attached of [false, true]) {
    for (const filtered of [false, true]) {
      it.each(["editable", "retained read-only", "incomplete"] as const)(
        `keeps ${attached ? "attached" : "manual"} %s drafts with removal disabled and ${filtered ? "filtered" : "all"} lines`,
        async (state) => {
          const row = draft(attached, state);
          const original = structuredClone(row);
          vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
            receiptPage({ receipts: [row], linkedVehicleId: null }),
          );
          const { client } = show();
          const invalidate = vi.spyOn(client, "invalidateQueries");
          await screen.findByText("Preserved draft supplier");
          if (filtered) {
            fireEvent.change(screen.getByLabelText("Filter parts by section"), {
              target: { value: "brakes" },
            });
            expect(screen.queryByText("Preserved line 1")).not.toBeInTheDocument();
          }
          const remove = screen.getByRole("button", { name: "Discard draft" });
          expect(remove).toBeDisabled();
          expect(remove).toHaveAccessibleDescription(unavailable);
          expect(screen.getByText(unavailable)).toBeVisible();
          rawDisabledBypass(remove);
          expectNoRemovalDispatch();
          expect(invalidate).not.toHaveBeenCalled();
          expect(toast.success).not.toHaveBeenCalled();
          expect(toast.error).not.toHaveBeenCalled();
          expect(toast.message).not.toHaveBeenCalled();
          expect(row).toEqual(original);
          if (state === "editable") {
            const review = screen.getByRole("button", { name: "Review" });
            expect(review).toBeEnabled();
            fireEvent.click(review);
            const editor = screen.getByRole("dialog");
            expect(within(editor).getByLabelText("Supplier / shop")).toHaveValue(
              "Preserved draft supplier",
            );
            expect(within(editor).getByRole("button", { name: "Save draft" })).toBeEnabled();
            expectNoRemovalDispatch();
          } else expect(screen.queryByRole("button", { name: "Review" })).not.toBeInTheDocument();
        },
      );
    }
  }

  it("keeps zero-item manual drafts reviewable without any removal exception", async () => {
    const row = { ...receipt("Empty preserved draft"), id: draftId };
    vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
      receiptPage({ receipts: [row], linkedVehicleId: null }),
    );
    show();
    const remove = await screen.findByRole("button", { name: "Discard draft" });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAccessibleDescription(unavailable);
    rawDisabledBypass(remove);
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(within(screen.getByRole("dialog")).getByLabelText("Item description")).toHaveValue("");
    expectNoRemovalDispatch();
  });

  it("does not add draft actions or imply write access to a read-only receipt", async () => {
    const row = { ...draft(true, "editable"), can_write: false };
    vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
      receiptPage({ receipts: [row], linkedVehicleId: null, canWrite: false }),
    );
    show();
    await screen.findByText("Preserved draft supplier");
    expect(screen.queryByRole("button", { name: "Discard draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review" })).not.toBeInTheDocument();
    expect(screen.queryByText(unavailable)).not.toBeInTheDocument();
    expectNoRemovalDispatch();
  });

  it.each(["account", "vehicle", "Auth loading"] as const)(
    "has no raw removal fallback during a committed %s transition and new read",
    async (kind) => {
      vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(
        receiptPage({ receipts: [draft(true, "editable")], linkedVehicleId: null }),
      );
      const { container, rerender, view } = show();
      const old = await screen.findByRole("button", { name: "Discard draft" });
      const pending = deferred<ReceiptRead>();
      vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(pending.promise);
      if (kind === "account") {
        auth.userId = "owner-b";
        rerender(view());
      }
      if (kind === "vehicle") rerender(view({ vehicleId: "10000000-0000-4000-8000-000000000002" }));
      if (kind === "Auth loading") {
        auth.loading = true;
        rerender(view());
        expect(container).toBeEmptyDOMElement();
        auth.loading = false;
        rerender(view());
      }
      expect(screen.queryByRole("button", { name: "Discard draft" })).not.toBeInTheDocument();
      rawDisabledBypass(old);
      expectNoRemovalDispatch();
      await act(async () =>
        pending.resolve(
          receiptPage({ receipts: [draft(false, "editable")], linkedVehicleId: null }),
        ),
      );
      const current = await screen.findByRole("button", { name: "Discard draft" });
      expect(current).not.toBe(old);
      expect(current).toBeDisabled();
      expect(current).toHaveAccessibleDescription(unavailable);
      rawDisabledBypass(current);
      expectNoRemovalDispatch();
      expect(screen.getByRole("button", { name: "Review" })).toBeEnabled();
    },
  );

  it("retains the interlock through generic read failure and explicit retry without a hold or false removal", async () => {
    const row = draft(true, "editable");
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(
      receiptPage({ receipts: [row], linkedVehicleId: null }),
    );
    const { client } = show();
    const old = await screen.findByRole("button", { name: "Discard draft" });
    vi.mocked(api.getVehicleReceipts).mockRejectedValueOnce(new Error("PRIVATE read detail"));
    act(() => {
      void client.refetchQueries({ queryKey: ["vehicle-receipts", "owner-a"] });
    });
    await screen.findByText("Could not load receipts. Please try again.");
    rawDisabledBypass(old);
    expectNoRemovalDispatch();
    fireEvent.click(screen.getByRole("button", { name: "Retry receipts" }));
    const current = await screen.findByRole("button", { name: "Discard draft" });
    expect(current).toBeDisabled();
    expect(current).toHaveAccessibleDescription(unavailable);
    expect(screen.queryByText(/PRIVATE|Draft removed|Draft deleted/)).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.message).not.toHaveBeenCalled();
    expectNoRemovalDispatch();
  });
});

describe("receipt installation intent, acknowledgment and committed session", () => {
  const accountA = "41000000-aaaa-4000-8000-000000000001";
  const accountB = "41000000-bbbb-4000-8000-000000000002";
  const shop = "42000000-aaaa-4000-8000-000000000001";
  const otherVehicle = "10000000-0000-4000-8000-000000000002";
  const parentId = "43000000-aaaa-4000-8000-000000000001";
  const itemId = "44000000-aaaa-4000-8000-000000000001";
  const installedOn = "2020-01-02";
  const failure =
    "Installation change could not be confirmed. Check vehicle history before repeating this request.";
  const neutral = "Installation request acknowledged. Refresh vehicle history to confirm.";
  type Intent = {
    expectedAccountId: string;
    receiptId: string;
    itemId: string;
    expectedVehicleId: string | null;
    expectedShopVehicleId: string | null;
    installedOn: string;
    odometerKm: number | null;
  };
  type Ack = Awaited<ReturnType<typeof api.installReceiptItem>>;
  type ReadOptions = {
    data: { expectedAccountId: string; vehicleId?: string; shopVehicleId?: string; page?: number };
  };
  function row(): VehicleReceipt {
    return {
      ...receipt("Installation supplier"),
      id: parentId,
      vehicle_id: vehicle,
      shop_vehicle_id: shop,
      status: "confirmed",
      items: [
        {
          id: itemId,
          description: "Retained brake assembly",
          category: "brakes",
          brand: null,
          part_number: null,
          quantity: 1,
          total: null,
          confidence: 1,
          reviewed: true,
          installed_on: null,
          odometer_km: null,
          public_summary_allowed: false,
        },
      ],
    };
  }
  function page(input: ReadOptions["data"] = { expectedAccountId: accountA }): ReceiptRead {
    const receipt = {
      ...row(),
      vehicle_id: input.vehicleId ?? vehicle,
      shop_vehicle_id: input.shopVehicleId ?? shop,
    };
    if (input.page === 1) receipt.id = "43000000-bbbb-4000-8000-000000000002";
    return receiptPage(
      { receipts: [receipt], linkedVehicleId: null, canWrite: true },
      input.page,
      26,
    );
  }
  function request(index = 0) {
    return vi.mocked(api.installReceiptItem).mock.calls[index][0] as unknown as {
      data: Intent;
      signal: AbortSignal;
    };
  }
  function rawClick(button: HTMLElement) {
    const key = Object.getOwnPropertyNames(button).find((name) => name.startsWith("__reactProps$"));
    expect(key).toBeDefined();
    const handler = (Reflect.get(button, key!) as { onClick: () => void }).onClick;
    expect(handler).toBeTypeOf("function");
    return handler;
  }
  function fields(dialog: HTMLElement, date = installedOn, km = "12345") {
    fireEvent.change(within(dialog).getByLabelText("Installation date"), {
      target: { value: date },
    });
    fireEvent.change(within(dialog).getByLabelText("Odometer (km, optional)"), {
      target: { value: km },
    });
  }
  async function open(target: ReceiptTarget = { vehicleId: vehicle }) {
    const context = show(undefined, target);
    fireEvent.click(await screen.findByRole("button", { name: "Record installation" }));
    const dialog = screen.getByRole("dialog");
    fields(dialog);
    return { ...context, dialog };
  }
  beforeEach(() => {
    auth.userId = accountA;
    vi.mocked(api.installReceiptItem)
      .mockReset()
      .mockImplementation((options) =>
        Promise.resolve({ ...(options as unknown as { data: Intent }).data }),
      );
    vi.mocked(api.getVehicleReceipts).mockImplementation((options) =>
      Promise.resolve(page((options as unknown as ReadOptions).data)),
    );
    vi.spyOn(toast, "message").mockImplementation(() => 0);
    vi.spyOn(toast, "success").mockImplementation(() => 0);
    vi.spyOn(toast, "error").mockImplementation(() => 0);
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(["owner", "shop"] as const)(
    "captures a dual-ID %s receipt and synchronously admits only one checked installation",
    async (mode) => {
      const pending = deferred<Ack>();
      vi.mocked(api.installReceiptItem).mockReturnValueOnce(pending.promise);
      const { dialog, client } = await open(
        mode === "owner" ? { vehicleId: vehicle } : { shopVehicleId: shop },
      );
      if (mode === "shop") fields(dialog, installedOn, "");
      const invalidate = vi.spyOn(client, "invalidateQueries");
      const submit = rawClick(within(dialog).getByRole("button", { name: "Save installation" }));
      act(() => {
        submit();
        submit();
      });
      expect(api.installReceiptItem).toHaveBeenCalledTimes(1);
      expect(request().data).toEqual({
        expectedAccountId: accountA,
        receiptId: parentId,
        itemId,
        expectedVehicleId: mode === "owner" ? vehicle : null,
        expectedShopVehicleId: mode === "shop" ? shop : null,
        installedOn,
        odometerKm: mode === "owner" ? 12345 : null,
      });
      expect(Object.isFrozen(request().data)).toBe(true);
      expect(request().signal.aborted).toBe(false);
      expect(toast.message).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      await act(async () => pending.resolve({ ...request().data }));
      expect(toast.message).toHaveBeenCalledExactlyOnceWith(neutral);
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(invalidate.mock.calls.map(([filter]) => filter?.queryKey)).toEqual([
        ["vehicle-receipts", accountA],
        ["vehicle-history"],
      ]);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
  );

  it.each(["void", "wrong item", "changed date"] as const)(
    "holds a %s acknowledgment and cannot repeat via a captured submit",
    async (kind) => {
      vi.mocked(api.installReceiptItem).mockImplementationOnce((options) => {
        const intent = (options as unknown as { data: Intent }).data;
        return Promise.resolve(
          (kind === "void"
            ? null
            : {
                ...intent,
                ...(kind === "wrong item" ? { itemId: parentId } : { installedOn: "2020-01-03" }),
              }) as Ack,
        );
      });
      const { dialog, client } = await open();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      const submit = rawClick(within(dialog).getByRole("button", { name: "Save installation" }));
      act(submit);
      await within(dialog).findByText(failure);
      act(submit);
      expect(api.installReceiptItem).toHaveBeenCalledTimes(1);
      expect(within(dialog).getByRole("button", { name: "Save installation" })).toBeDisabled();
      expect(toast.message).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );

  it.each([
    { date: "9999-12-31", km: "0" },
    { date: "2020-02-30", km: "0" },
    { date: "", km: "0" },
    { date: installedOn, km: "-1" },
    { date: installedOn, km: "1.5" },
    { date: installedOn, km: "2000001" },
  ])("refuses invalid date/odometer input without dispatch: %j", async ({ date, km }) => {
    const { dialog } = await open();
    // Expose the caller validator beyond native input sanitization/disabled admission.
    (within(dialog).getByLabelText("Installation date") as HTMLInputElement).type = "text";
    (within(dialog).getByLabelText("Odometer (km, optional)") as HTMLInputElement).type = "text";
    fields(dialog, date, km);
    act(rawClick(within(dialog).getByRole("button", { name: "Save installation" })));
    expect(api.installReceiptItem).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Check the installation date");
    expect(within(dialog).queryByText(failure)).not.toBeInTheDocument();
  });

  it("preserves fields through read refresh and paging, then retains an unknown hold across close/reopen", async () => {
    const context = show();
    const next = await screen.findByRole("button", { name: "Next receipts" });
    await waitFor(() => expect(next).toBeEnabled());
    const previous = rawClick(screen.getByRole("button", { name: "Previous receipts" }));
    fireEvent.click(screen.getByRole("button", { name: "Record installation" }));
    const dialog = screen.getByRole("dialog");
    fields(dialog);
    const refresh = deferred<ReceiptRead>();
    vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(refresh.promise);
    act(() => {
      void context.client.refetchQueries({ queryKey: ["vehicle-receipts", accountA] });
    });
    expect(screen.getByRole("dialog")).toBe(dialog);
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Save installation" })).toBeDisabled(),
    );
    await act(async () => refresh.resolve(page()));
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Save installation" })).toBeEnabled(),
    );
    fireEvent.click(next);
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Save installation" })).toBeDisabled(),
    );
    expect(within(dialog).getByLabelText("Installation date")).toHaveValue(installedOn);
    expect(within(dialog).getByLabelText("Odometer (km, optional)")).toHaveValue(12345);
    act(previous);
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Save installation" })).toBeEnabled(),
    );
    vi.mocked(api.installReceiptItem).mockRejectedValueOnce(
      new Error("PRIVATE native installation detail"),
    );
    const oldSubmit = rawClick(within(dialog).getByRole("button", { name: "Save installation" }));
    act(oldSubmit);
    await within(dialog).findByText(failure);
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.getByText(failure)).toBeVisible();
    act(() => {
      void context.client.refetchQueries({ queryKey: ["vehicle-receipts", accountA] });
    });
    fireEvent.click(await screen.findByRole("button", { name: "Record installation" }));
    const reopened = screen.getByRole("dialog");
    expect(reopened).not.toBe(dialog);
    expect(within(reopened).getByText(failure)).toBeVisible();
    act(oldSubmit);
    act(rawClick(within(reopened).getByRole("button", { name: "Save installation" })));
    expect(api.installReceiptItem).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
    expect(toast.message).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it.each(["write", "status", "reviewed", "installed", "target"] as const)(
    "rechecks same-ID current rows after %s eligibility changes, even through the old submit",
    async (kind) => {
      const { dialog, client } = await open();
      const submit = rawClick(within(dialog).getByRole("button", { name: "Save installation" }));
      const replacement = page();
      const receipt = replacement.receipts[0];
      if (kind === "write") receipt.can_write = false;
      if (kind === "status") receipt.status = "draft";
      if (kind === "reviewed") receipt.items[0].reviewed = false;
      if (kind === "installed") receipt.items[0].installed_on = "2020-01-01";
      if (kind === "target") receipt.vehicle_id = otherVehicle;
      const key = client
        .getQueryCache()
        .find({ queryKey: ["vehicle-receipts"], exact: false })!.queryKey;
      act(() => {
        client.setQueryData(key, replacement);
      });
      await waitFor(() =>
        expect(within(dialog).getByRole("button", { name: "Save installation" })).toBeDisabled(),
      );
      act(submit);
      expect(api.installReceiptItem).not.toHaveBeenCalled();
      expect(within(dialog).getByLabelText("Installation date")).toHaveValue(installedOn);
      expect(within(dialog).queryByText(failure)).not.toBeInTheDocument();
    },
  );

  it("admits an unchanged fresh replacement witness, rather than requiring the launch object's identity forever", async () => {
    const { dialog, client } = await open();
    const submit = rawClick(within(dialog).getByRole("button", { name: "Save installation" }));
    const replacement = page();
    replacement.receipts[0].vendor = "Fresh replacement supplier";
    const key = client
      .getQueryCache()
      .find({ queryKey: ["vehicle-receipts"], exact: false })!.queryKey;
    act(() => {
      client.setQueryData(key, replacement);
    });
    await screen.findByText("Fresh replacement supplier");
    act(submit);
    await waitFor(() => expect(toast.message).toHaveBeenCalledExactlyOnceWith(neutral));
    expect(api.installReceiptItem).toHaveBeenCalledTimes(1);
  });

  it("blocks a raw submit in the exact tick its current receipt read is invalidated", async () => {
    const { dialog, client } = await open();
    const submit = rawClick(within(dialog).getByRole("button", { name: "Save installation" }));
    const refresh = deferred<ReceiptRead>();
    vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(refresh.promise);
    act(() => {
      void client.invalidateQueries({ queryKey: ["vehicle-receipts", accountA] });
      submit();
    });
    expect(api.installReceiptItem).not.toHaveBeenCalled();
    await act(async () => refresh.resolve(page()));
  });

  it.each(["both selected", "linked other target", "unreviewed"] as const)(
    "does not launch installation for %s visibility",
    async (kind) => {
      const source = page();
      if (kind === "linked other target")
        source.receipts[0].shop_vehicle_id = "42000000-bbbb-4000-8000-000000000002";
      if (kind === "unreviewed") source.receipts[0].items[0].reviewed = false;
      vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(source);
      show(
        undefined,
        kind === "both selected"
          ? { vehicleId: vehicle, shopVehicleId: shop }
          : kind === "linked other target"
            ? { shopVehicleId: shop }
            : { vehicleId: vehicle },
      );
      await screen.findByText("Installation supplier");
      expect(screen.queryByRole("button", { name: "Record installation" })).not.toBeInTheDocument();
      expect(api.installReceiptItem).not.toHaveBeenCalled();
    },
  );

  for (const settlement of ["resolve", "reject"] as const) {
    it.each(["account", "account ABA", "target ABA", "Auth loading", "logout"] as const)(
      `silences late ${settlement} after %s without releasing the new installation lock`,
      async (kind) => {
        const old = deferred<Ack>(),
          current = deferred<Ack>();
        vi.mocked(api.installReceiptItem)
          .mockReturnValueOnce(old.promise)
          .mockReturnValueOnce(current.promise);
        const { dialog, client, container, rerender, view } = await open();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        fireEvent.click(within(dialog).getByRole("button", { name: "Save installation" }));
        const original = request();
        if (kind === "account" || kind === "account ABA") {
          auth.userId = accountB;
          rerender(view());
        }
        if (kind === "account ABA") {
          auth.userId = accountA;
          rerender(view());
        }
        if (kind === "target ABA") {
          rerender(view({ vehicleId: otherVehicle }));
          rerender(view());
        }
        if (kind === "Auth loading") {
          auth.loading = true;
          rerender(view());
          expect(container).toBeEmptyDOMElement();
          auth.loading = false;
          rerender(view());
        }
        if (kind === "logout") {
          auth.userId = null;
          rerender(view());
          expect(container).toBeEmptyDOMElement();
          auth.userId = accountA;
          rerender(view());
        }
        expect(original.signal.aborted).toBe(true);
        fireEvent.click(await screen.findByRole("button", { name: "Record installation" }));
        const next = screen.getByRole("dialog");
        fields(next);
        fireEvent.click(within(next).getByRole("button", { name: "Save installation" }));
        expect(api.installReceiptItem).toHaveBeenCalledTimes(2);
        expect(request(1).data.expectedAccountId).toBe(auth.userId);
        await act(async () =>
          settlement === "resolve"
            ? old.resolve({ ...original.data })
            : old.reject(new Error("PRIVATE abandoned installation")),
        );
        expect(within(next).getByRole("button", { name: "Save installation" })).toBeDisabled();
        expect(toast.message).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
        expect(within(next).queryByText(failure)).not.toBeInTheDocument();
        await act(async () => current.resolve({ ...request(1).data }));
        expect(toast.message).toHaveBeenCalledExactlyOnceWith(neutral);
        expect(original.data.expectedAccountId).toBe(accountA);
      },
    );

    it(`silences installation ${settlement} after unmount`, async () => {
      const old = deferred<Ack>();
      vi.mocked(api.installReceiptItem).mockReturnValueOnce(old.promise);
      const { dialog, client, unmount } = await open();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      fireEvent.click(within(dialog).getByRole("button", { name: "Save installation" }));
      const original = request();
      unmount();
      expect(original.signal.aborted).toBe(true);
      await act(async () =>
        settlement === "resolve"
          ? old.resolve({ ...original.data })
          : old.reject(new Error("PRIVATE unmounted installation")),
      );
      expect(toast.message).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    });
  }

  it("holds a pending write when its installation dialog closes, and does not revive it on reopen", async () => {
    const old = deferred<Ack>();
    vi.mocked(api.installReceiptItem).mockReturnValueOnce(old.promise);
    const { dialog, client } = await open();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save installation" }));
    const original = request();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(original.signal.aborted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Record installation" }));
    const next = screen.getByRole("dialog");
    expect(within(next).getByText(failure)).toBeVisible();
    act(rawClick(within(next).getByRole("button", { name: "Save installation" })));
    await act(async () => old.resolve({ ...original.data }));
    expect(api.installReceiptItem).toHaveBeenCalledTimes(1);
    expect(within(next).getByText(failure)).toBeVisible();
    expect(toast.message).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("does not revive a real write started during the installation dialog's first StrictMode commit", async () => {
    const old = deferred<Ack>();
    vi.mocked(api.installReceiptItem).mockReturnValueOnce(old.promise);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <VehicleReceiptPanel vehicleId={vehicle} />
        </QueryClientProvider>
      </StrictMode>,
    );
    const launch = await screen.findByRole("button", { name: "Record installation" });
    let started = false;
    const append = Node.prototype.appendChild;
    const spy = vi.spyOn(Node.prototype, "appendChild").mockImplementation(function <
      T extends Node,
    >(this: Node, node: T): T {
      const result = append.call(this, node) as T;
      const submit = Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent === "Save installation",
      );
      if (!started && submit?.isConnected && !submit.disabled) {
        started = true;
        // React's delegated event admission may be disabled during mutation
        // commit. Invoke the actual installed source prop at this same point,
        // before the dialog's real layout setup/StrictMode cleanup runs.
        rawClick(submit)();
      }
      return result;
    });
    try {
      fireEvent.click(launch);
    } finally {
      spy.mockRestore();
    }
    expect(started).toBe(true);
    expect(api.installReceiptItem).toHaveBeenCalledTimes(1);
    const original = request();
    expect(original.signal.aborted).toBe(true);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(failure)).toBeVisible();
    act(rawClick(within(dialog).getByRole("button", { name: "Save installation" })));
    await act(async () => old.resolve({ ...original.data }));
    expect(api.installReceiptItem).toHaveBeenCalledTimes(1);
    expect(within(dialog).getByText(failure)).toBeVisible();
    expect(toast.message).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe("read-only complete-line viewer integration", () => {
  const accountA = "61000000-0000-4000-8000-000000000001";
  const accountB = "61000000-0000-4000-8000-000000000002";
  const parentId = "62000000-0000-4000-8000-000000000001";
  const otherVehicle = "10000000-0000-4000-8000-000000000002";
  type LinePage = Awaited<ReturnType<typeof api.getVehicleReceiptItemPage>>;
  function line(index: number): LinePage["items"][number] {
    return {
      id: `63000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      receipt_id: parentId,
      description: `Viewer-only line ${index + 1}`,
      category: "brakes",
      brand: null,
      part_number: null,
      quantity: 1,
      total: null,
      confidence: 1,
      reviewed: true,
      installed_on: null,
      odometer_km: null,
      public_summary_allowed: false,
      sort_order: index,
    };
  }
  function window(page = 0): LinePage {
    return {
      receiptId: parentId,
      vehicleId: vehicle,
      shopVehicleId: null,
      page,
      totalCount: 101,
      hasNext: page === 0,
      items: page === 0 ? Array.from({ length: 100 }, (_, i) => line(i)) : [line(100)],
    };
  }
  function source(complete = false): ReceiptRead {
    return receiptPage({
      receipts: [
        {
          ...receipt("Viewer supplier"),
          id: parentId,
          status: "confirmed",
          items: [line(0)],
          items_complete: complete,
          item_count: complete ? 1 : 101,
          edit_eligible: false,
          can_write: false,
        },
      ],
      linkedVehicleId: null,
      canWrite: false,
    });
  }
  function raw(button: HTMLElement) {
    const key = Object.getOwnPropertyNames(button).find((name) => name.startsWith("__reactProps$"));
    if (!key) throw new Error("Missing source handler.");
    const props: unknown = Reflect.get(button, key);
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
    auth.userId = accountA;
    vi.mocked(api.getVehicleReceipts).mockResolvedValue(source());
    vi.mocked(api.getVehicleReceiptItemPage).mockReset().mockResolvedValue(window());
  });
  afterEach(() => onlineManager.setOnline(true));

  it("offers all retained line pages on a read-only partial receipt without unlocking existing controls", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "View all lines" }));
    await within(screen.getByRole("dialog")).findByText("Viewer-only line 100");
    expect(vi.mocked(api.getVehicleReceiptItemPage).mock.calls[0][0]).toMatchObject({
      data: { expectedAccountId: accountA, receiptId: parentId, vehicleId: vehicle, page: 0 },
      signal: expect.any(AbortSignal),
    });
    expect(
      screen.queryByRole("button", { name: /Review|Save|Record installation/ }),
    ).not.toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).queryByRole("checkbox")).not.toBeInTheDocument();
    vi.mocked(api.getVehicleReceiptItemPage).mockResolvedValueOnce(window(1));
    fireEvent.click(screen.getByRole("button", { name: "Next lines" }));
    await screen.findByText("Viewer-only line 101");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("checkbox", { name: "Share with linked shops" })).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: "Show parts summary on public ride/passport" }),
    ).toBeDisabled();
    expect(api.saveVehicleReceipt).not.toHaveBeenCalled();
    expect(api.setReceiptSharing).not.toHaveBeenCalled();
    expect(api.installReceiptItem).not.toHaveBeenCalled();
  });

  it("does not add a second reader to a complete receipt", async () => {
    vi.mocked(api.getVehicleReceipts).mockResolvedValueOnce(source(true));
    show();
    await screen.findByText("Viewer supplier");
    expect(screen.queryByRole("button", { name: "View all lines" })).not.toBeInTheDocument();
    expect(api.getVehicleReceiptItemPage).not.toHaveBeenCalled();
  });

  it.each(["invalidated", "fetching", "paused", "error", "same-object success"] as const)(
    "destroys the display selection on committed parent %s and never reopens it after recovery",
    async (kind) => {
      const { client } = show();
      fireEvent.click(await screen.findByRole("button", { name: "View all lines" }));
      await within(screen.getByRole("dialog")).findByText("Viewer-only line 100");
      const oldNext = raw(screen.getByRole("button", { name: "Next lines" }));
      const parent = client.getQueryCache().find({ queryKey: ["vehicle-receipts"], exact: false })!;
      const snapshot = parent.state.data;
      act(() => {
        if (kind === "invalidated")
          void client.invalidateQueries({ queryKey: parent.queryKey, refetchType: "none" });
        if (kind === "fetching" || kind === "paused") parent.setState({ fetchStatus: kind });
        if (kind === "error") parent.setState({ status: "error", error: new Error("PRIVATE") });
        if (kind === "same-object success") client.setQueryData(parent.queryKey, snapshot);
        oldNext();
      });
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(api.getVehicleReceiptItemPage).toHaveBeenCalledTimes(1);
      act(() => {
        parent.setState({
          fetchStatus: "idle",
          status: "success",
          error: null,
          isInvalidated: false,
        });
      });
      await screen.findByRole("button", { name: "View all lines" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      act(oldNext);
      expect(api.getVehicleReceiptItemPage).toHaveBeenCalledTimes(1);
    },
  );

  it("blocks a same-tick old launch after invalidation without dispatching a line read", async () => {
    const { client } = show();
    const launch = raw(await screen.findByRole("button", { name: "View all lines" }));
    act(() => {
      void client.invalidateQueries({ queryKey: ["vehicle-receipts"], refetchType: "none" });
      launch();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.getVehicleReceiptItemPage).not.toHaveBeenCalled();
  });

  it("close synchronously fences captured pagination before React removes the dialog", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "View all lines" }));
    await within(screen.getByRole("dialog")).findByText("Viewer-only line 100");
    const next = raw(screen.getByRole("button", { name: "Next lines" }));
    const close = screen.getByRole("button", { name: "Close" });
    act(() => {
      close.click();
      next();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.getVehicleReceiptItemPage).toHaveBeenCalledTimes(1);
  });

  it("aborts a pending line read when the parent refreshes and requires a new explicit viewer", async () => {
    const oldLines = deferred<LinePage>();
    const parentRefresh = deferred<ReceiptRead>();
    vi.mocked(api.getVehicleReceiptItemPage).mockReturnValueOnce(oldLines.promise);
    const context = show();
    fireEvent.click(await screen.findByRole("button", { name: "View all lines" }));
    await waitFor(() => expect(api.getVehicleReceiptItemPage).toHaveBeenCalledTimes(1));
    const issued = vi.mocked(api.getVehicleReceiptItemPage).mock.calls[0][0];
    if (!issued?.signal) throw new Error("Missing synthetic signal.");
    vi.mocked(api.getVehicleReceipts).mockReturnValueOnce(parentRefresh.promise);
    act(() => {
      void context.client.refetchQueries({ queryKey: ["vehicle-receipts"] });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(issued.signal.aborted).toBe(true);
    await act(async () => {
      parentRefresh.resolve(source());
      oldLines.resolve(window());
    });
    await screen.findByRole("button", { name: "View all lines" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View all lines" }));
    await within(screen.getByRole("dialog")).findByText("Viewer-only line 100");
    expect(api.getVehicleReceiptItemPage).toHaveBeenCalledTimes(2);
  });

  for (const outcome of ["resolve", "reject"] as const) {
    it.each(["account ABA", "target ABA", "logout", "Auth loading", "unmount"] as const)(
      `aborts the old line read on %s and ignores its late ${outcome}`,
      async (kind) => {
        const pending = deferred<LinePage>();
        vi.mocked(api.getVehicleReceiptItemPage).mockReturnValueOnce(pending.promise);
        const context = show();
        fireEvent.click(await screen.findByRole("button", { name: "View all lines" }));
        await waitFor(() => expect(api.getVehicleReceiptItemPage).toHaveBeenCalledTimes(1));
        const options = vi.mocked(api.getVehicleReceiptItemPage).mock.calls[0][0];
        if (!options?.signal) throw new Error("Missing synthetic signal.");
        if (kind === "account ABA") {
          auth.userId = accountB;
          context.rerender(context.view());
          auth.userId = accountA;
          context.rerender(context.view());
        }
        if (kind === "target ABA") {
          context.rerender(context.view({ vehicleId: otherVehicle }));
          context.rerender(context.view());
        }
        if (kind === "logout") {
          auth.userId = null;
          context.rerender(context.view());
        }
        if (kind === "Auth loading") {
          auth.loading = true;
          context.rerender(context.view());
        }
        if (kind === "unmount") context.unmount();
        expect(options.signal.aborted).toBe(true);
        expect(options.data).toEqual({
          expectedAccountId: accountA,
          receiptId: parentId,
          vehicleId: vehicle,
          page: 0,
        });
        await act(async () =>
          outcome === "resolve"
            ? pending.resolve(window())
            : pending.reject(new Error("PRIVATE old failure")),
        );
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(screen.queryByText("Viewer-only line 100")).not.toBeInTheDocument();
        expect(screen.queryByText(/PRIVATE old failure/)).not.toBeInTheDocument();
      },
    );
  }
});
