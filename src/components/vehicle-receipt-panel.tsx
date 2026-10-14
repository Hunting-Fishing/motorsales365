import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClientOnlyFn, useServerFn } from "@tanstack/react-start";
import { Receipt, Plus, ScanLine, Loader2, Lock, Wrench, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { PART_CATEGORIES, localReceiptDate, validateReceiptFile } from "@/lib/vehicle-receipts";
import type { ReceiptLine, ReceiptTarget, VehicleReceipt } from "@/lib/vehicle-receipts";
import type { ReceiptOcrProgress } from "@/lib/receipt-ocr.client";
import { withReceiptAbort } from "@/lib/receipt-abort";

// The import itself must be client-only, not just the exported scanner body.
// Start's SSR import protection rejects any server-visible .client module edge.
const scanReceiptOnDevice = createClientOnlyFn(
  async (
    file: File,
    options: {
      signal: AbortSignal;
      onProgress: (progress: ReceiptOcrProgress) => void;
    },
  ) => {
    const { scanReceiptDocument } = await withReceiptAbort(
      import("@/lib/receipt-document.client"),
      options.signal,
    );
    if (options.signal.aborted) throw new DOMException("Local scan cancelled", "AbortError");
    return scanReceiptDocument(file, options);
  },
);
import {
  recordVehicleReceiptExpense,
  getVehicleReceipts,
  startVehicleReceipt,
  saveVehicleReceipt,
  extractVehicleReceipt,
  getPrivateReceiptUrl,
  installReceiptItem,
  setReceiptSharing,
  discardReceiptDraft,
  requestShopVehicleLink,
  approveShopVehicleLink,
  listVehicleShopLinks,
  revokeShopVehicleLink,
} from "@/lib/vehicle-receipts.functions";

const blankLine = (): ReceiptLine => ({
  description: "",
  category: null,
  brand: null,
  part_number: null,
  quantity: 1,
  total: null,
  confidence: 0,
  reviewed: false,
});
const num = (s: string) => (s === "" ? null : Number(s));

export function VehicleReceiptPanel({ vehicleId, shopVehicleId }: ReceiptTarget) {
  const { user } = useAuth();
  if (!user) return null;

  // Remount account-local editors and connection codes as well as changing the
  // query keys. A receipt opened by the previous account must not remain visible.
  return (
    <AuthenticatedVehicleReceiptPanel
      key={`${user.id}:${vehicleId ?? ""}:${shopVehicleId ?? ""}`}
      userId={user.id}
      vehicleId={vehicleId}
      shopVehicleId={shopVehicleId}
    />
  );
}

function AuthenticatedVehicleReceiptPanel({
  userId,
  vehicleId,
  shopVehicleId,
}: ReceiptTarget & { userId: string }) {
  const target = vehicleId ? { vehicleId } : { shopVehicleId: shopVehicleId! };
  const qc = useQueryClient();
  const fetchFn = useServerFn(getVehicleReceipts);
  const signFn = useServerFn(getPrivateReceiptUrl);
  const shareFn = useServerFn(setReceiptSharing);
  const discardFn = useServerFn(discardReceiptDraft);
  const expenseFn = useServerFn(recordVehicleReceiptExpense);
  const { data, error, isLoading } = useQuery({
    queryKey: ["vehicle-receipts", userId, vehicleId, shopVehicleId],
    enabled: Boolean(userId),
    queryFn: () => fetchFn({ data: target }),
  });
  const [edit, setEdit] = useState<VehicleReceipt | "new" | null>(null);
  const [install, setInstall] = useState<VehicleReceipt["items"][number] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["vehicle-receipts", userId] });
    void qc.invalidateQueries({ queryKey: ["vehicle-history"] });
  };
  async function action(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try {
      await fn();
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Could not save");
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Receipt className="h-5 w-5" /> Receipts & parts history
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep purchases separate from installations. Review scanned items before adding them to
            history.
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Receipt files stay private. Public summaries require the
            vehicle owner’s approval.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={Boolean(error) || isLoading || data?.canWrite === false}
          onClick={() => setEdit("new")}
        >
          <Plus className="mr-1 h-4 w-4" /> Add receipt
        </Button>
      </div>
      <VehicleShopConnections {...target} userId={userId} onChanged={refresh} />
      {isLoading && <p className="text-sm">Loading receipts…</p>}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {data && !data.receipts.length && (
        <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">
          No receipts yet. Upload a receipt or enter purchases manually.
        </p>
      )}
      {data?.receipts.length ? (
        <div>
          <Label htmlFor={`receipt-category-filter-${vehicleId || shopVehicleId}`}>
            Filter parts by section
          </Label>
          <select
            id={`receipt-category-filter-${vehicleId || shopVehicleId}`}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {Object.entries(PART_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {data?.receipts
        .filter((r) => !categoryFilter || r.items.some((i) => i.category === categoryFilter))
        .map((r) => (
          <div key={r.id} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium">{r.vendor || r.file_name || "Manual purchase"}</span>{" "}
                <Badge variant={r.status === "draft" ? "outline" : "secondary"}>
                  {r.status === "draft" ? "Needs review" : "Confirmed"}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Purchased: {r.purchased_on || "Date needed"}
                  {r.total !== null ? ` · ${r.currency} ${Number(r.total).toLocaleString()}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {r.file_path && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === r.id}
                    onClick={() =>
                      action(r.id, async () => {
                        const url = await signFn({ data: { id: r.id } });
                        window.open(url, "_blank", "noopener,noreferrer");
                      })
                    }
                  >
                    <FileText className="mr-1 h-3 w-3" /> Receipt
                  </Button>
                )}
                {shopVehicleId &&
                  data?.canRecordExpense &&
                  r.shop_vehicle_id &&
                  r.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id}
                      onClick={() =>
                        action(r.id, async () => {
                          await expenseFn({ data: { id: r.id } });
                          toast.success("Recorded in shop expenses");
                          void qc.invalidateQueries({ queryKey: ["shop-manager", "expenses"] });
                        })
                      }
                    >
                      Record shop expense
                    </Button>
                  )}
                {r.status === "draft" && r.can_write !== false && (
                  <>
                    <Button size="sm" onClick={() => setEdit(r)}>
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === r.id}
                      onClick={() => action(r.id, () => discardFn({ data: { id: r.id } }))}
                      aria-label="Discard draft"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            {r.items
              .filter((i) => !categoryFilter || i.category === categoryFilter)
              .slice()
              .sort((a, b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0))
              .map((i) => (
                <div
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded bg-muted/40 p-2 text-sm"
                >
                  <div>
                    <b>{i.description}</b>
                    <span className="ml-2 text-muted-foreground">
                      {i.category ? PART_CATEGORIES[i.category] : "Category needed"}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {i.brand || ""} {i.part_number || ""} · Qty {i.quantity ?? "?"}
                      {i.total !== null ? ` · ${r.currency} ${i.total}` : ""}
                    </p>
                    <p className="text-xs">
                      {i.installed_on
                        ? `Installed ${i.installed_on}${i.odometer_km !== null ? ` · ${i.odometer_km.toLocaleString()} km` : ""}`
                        : "Not recorded as installed"}
                    </p>
                  </div>
                  {r.status === "confirmed" && r.can_write !== false && !i.installed_on && (
                    <Button size="sm" variant="outline" onClick={() => setInstall(i)}>
                      <Wrench className="mr-1 h-3 w-3" /> Record installation
                    </Button>
                  )}
                </div>
              ))}
            {vehicleId && r.status === "confirmed" && (
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={r.share_with_shop}
                    disabled={busy === r.id}
                    onChange={(e) =>
                      action(r.id, () =>
                        shareFn({
                          data: {
                            id: r.id,
                            shareWithShop: e.target.checked,
                            publicSummary: r.items.some((i) => i.public_summary_allowed),
                          },
                        }),
                      )
                    }
                  />{" "}
                  Share with linked shops
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={r.items.length > 0 && r.items.every((i) => i.public_summary_allowed)}
                    disabled={busy === r.id}
                    onChange={(e) =>
                      action(r.id, () =>
                        shareFn({
                          data: {
                            id: r.id,
                            shareWithShop: r.share_with_shop,
                            publicSummary: e.target.checked,
                          },
                        }),
                      )
                    }
                  />{" "}
                  Show parts summary on public ride/passport
                </label>
              </div>
            )}
          </div>
        ))}
      {edit && (
        <ReceiptEditor
          target={target}
          receipt={edit === "new" ? null : edit}
          onClose={() => {
            setEdit(null);
            refresh();
          }}
        />
      )}
      {install && (
        <InstallReceiptDialog
          item={install}
          onClose={() => {
            setInstall(null);
            refresh();
          }}
        />
      )}
    </section>
  );
}

function ReceiptEditor({
  target,
  receipt,
  onClose,
}: {
  target: ReceiptTarget;
  receipt: VehicleReceipt | null;
  onClose: () => void;
}) {
  const start = useServerFn(startVehicleReceipt),
    save = useServerFn(saveVehicleReceipt),
    scan = useServerFn(extractVehicleReceipt);
  const [id, setId] = useState(receipt?.id ?? null);
  const [attached, setAttached] = useState(
    Boolean(receipt?.attachment_uploaded ?? receipt?.file_path),
  );
  const [file, setFile] = useState<File | null>(null);
  const [vendor, setVendor] = useState(receipt?.vendor || "");
  const [date, setDate] = useState(receipt?.purchased_on || "");
  const [currency, setCurrency] = useState(receipt?.currency || "PHP");
  const [total, setTotal] = useState(receipt?.total?.toString() || "");
  const [items, setItems] = useState<ReceiptLine[]>(
    receipt?.items.length ? receipt.items : [blankLine()],
  );
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploadPath, setUploadPath] = useState<string | null>(receipt?.file_path ?? null);
  const localScan = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [localProgress, setLocalProgress] = useState<ReceiptOcrProgress | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      localScan.current?.abort();
    };
  }, []);
  async function ensureReceipt() {
    let current = id,
      path = uploadPath;
    if (!current) {
      const row = await start({
        data: {
          ...target,
          ...(file
            ? { fileName: file.name, mediaType: file.type as any, fileSize: file.size }
            : {}),
        },
      });
      current = row.id;
      path = row.file_path;
      setId(current);
      setUploadPath(path);
    }
    if (file && path && !attached) {
      if (receipt?.media_type && receipt.media_type !== file.type)
        throw new Error(
          "Use the original file type for this draft, or discard it and create a new receipt.",
        );
      const uploaded = await supabase.storage
        .from("vehicle-receipts")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploaded.error && uploaded.error.message !== "The resource already exists")
        throw new Error(uploaded.error.message);
      setAttached(true);
    }
    return current;
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e: any) {
      setError(e.message || "Could not process receipt");
    } finally {
      setBusy(false);
    }
  }
  function change(i: number, patch: Partial<ReceiptLine>) {
    setItems(items.map((x, j) => (j === i ? { ...x, ...patch, reviewed: false } : x)));
  }
  async function extract() {
    await run(async () => {
      if (!file && !attached) throw new Error("Upload a receipt first.");
      const current = await ensureReceipt();
      const result = await scan({ data: { id: current, consent: true } });
      setVendor(result.vendor || "");
      setDate(result.purchased_on || "");
      setCurrency(result.currency || "PHP");
      setTotal(result.total?.toString() || "");
      setItems(result.items.length ? result.items : [blankLine()]);
      toast.message("Scan complete. Check every item and fill any missing fields.");
    });
  }
  async function extractLocal() {
    if (!file || busy) return;
    const controller = new AbortController();
    localScan.current = controller;
    setBusy(true);
    setError("");
    setLocalProgress({ stage: "Preparing scanner", progress: 0 });
    try {
      if (controller.signal.aborted) return;
      const result = await scanReceiptOnDevice(file, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (mounted.current && !controller.signal.aborted) setLocalProgress(progress);
        },
      });
      if (!mounted.current || controller.signal.aborted) return;
      if (
        !result.vendor &&
        !result.purchased_on &&
        !result.currency &&
        result.total === null &&
        !result.items.length
      ) {
        throw new Error(
          "No readable receipt details found. Your entries were kept; try a clearer photo or enter the receipt manually.",
        );
      }
      if (result.vendor) setVendor(result.vendor);
      if (result.purchased_on) setDate(result.purchased_on);
      if (result.currency) setCurrency(result.currency);
      if (result.total !== null) setTotal(result.total.toString());
      if (result.items.length) setItems(result.items);
      toast.message("On-device scan complete. Review every suggestion before saving.");
    } catch (err) {
      if (mounted.current && !controller.signal.aborted) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not scan this photo. You can enter the receipt manually.",
        );
      }
    } finally {
      if (localScan.current === controller) localScan.current = null;
      if (mounted.current) {
        setBusy(false);
        setLocalProgress(null);
      }
    }
  }
  async function persist(confirm: boolean) {
    await run(async () => {
      const current = await ensureReceipt();
      await save({
        data: {
          id: current,
          vendor: vendor || null,
          purchasedOn: date || null,
          currency,
          total: num(total),
          items,
          confirm,
        },
      });
      toast.success(confirm ? "Purchase history saved" : "Draft saved");
      onClose();
    });
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{receipt ? "Review receipt" : "Add a vehicle receipt"}</DialogTitle>
          <DialogDescription>
            Check the receipt details and review every purchased item before confirming.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!attached && (
            <div>
              <Label htmlFor="receipt-file">Receipt image or PDF (optional for manual entry)</Label>
              <Input
                id="receipt-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                disabled={busy || Boolean(id && attached)}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    validateReceiptFile(f);
                    setFile(f);
                    setError("");
                  } catch (err: any) {
                    setError(err.message);
                    e.target.value = "";
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Maximum 10 MB. Photos from your phone are supported.
              </p>
            </div>
          )}
          <div className="rounded-lg border p-3 space-y-2">
            <Button type="button" variant="outline" disabled={busy || !file} onClick={extractLocal}>
              <ScanLine className="mr-1 h-4 w-4" /> Scan on this device
            </Button>
            {localProgress && (
              <div>
                <p role="status" className="text-sm" aria-live="polite">
                  {localProgress.stage} — {Math.round(localProgress.progress * 100)}%
                </p>
                <Button type="button" variant="ghost" onClick={() => localScan.current?.abort()}>
                  Cancel local scan
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP and receipt PDFs of up to 3 pages are read on this device in English.
              Scanning replaces known suggestions but does not upload the file. Saving uploads the
              attachment to private storage. Compare every page against the original and check
              supplier, date, currency and every item. Password-protected, interactive, unreadable
              or longer PDFs require manual entry or the separate AI option below.
            </p>
          </div>
          <div className="rounded-lg border p-3 space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />{" "}
              Allow this receipt to be sent to the configured AI provider for extraction.
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !consent || (!file && !attached)}
              onClick={extract}
            >
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="mr-1 h-4 w-4" />
              )}{" "}
              Scan with AI
            </Button>
            <p className="text-xs text-muted-foreground">
              AI suggests details. You confirm them. You can enter everything manually.
            </p>
          </div>
          <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Label htmlFor="receipt-vendor">Supplier / shop</Label>
              <Input
                id="receipt-vendor"
                value={vendor}
                maxLength={200}
                onChange={(e) => setVendor(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="receipt-date">Purchase date</Label>
              <Input
                id="receipt-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="receipt-currency">Currency</Label>
              <Input
                id="receipt-currency"
                value={currency}
                maxLength={3}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <Label htmlFor="receipt-total">Receipt total</Label>
              <Input
                id="receipt-total"
                type="number"
                min={0}
                step="0.01"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </div>
          </fieldset>
          <fieldset disabled={busy} className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="outline">
                    {item.reviewed
                      ? "Reviewed"
                      : item.confidence < 0.85
                        ? "Needs review"
                        : "Check suggestion"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy || items.length === 1}
                    onClick={() => setItems(items.filter((_, j) => j !== i))}
                  >
                    Remove item
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`item-name-${i}`}>Item description</Label>
                    <Input
                      id={`item-name-${i}`}
                      value={item.description}
                      maxLength={250}
                      onChange={(e) => change(i, { description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`item-category-${i}`}>Category</Label>
                    <select
                      id={`item-category-${i}`}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={item.category || ""}
                      onChange={(e) => change(i, { category: (e.target.value as any) || null })}
                    >
                      <option value="">Choose category</option>
                      {Object.entries(PART_CATEGORIES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor={`item-brand-${i}`}>Brand</Label>
                    <Input
                      id={`item-brand-${i}`}
                      value={item.brand || ""}
                      maxLength={120}
                      onChange={(e) => change(i, { brand: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`item-part-${i}`}>Part number</Label>
                    <Input
                      id={`item-part-${i}`}
                      value={item.part_number || ""}
                      maxLength={120}
                      onChange={(e) => change(i, { part_number: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`item-qty-${i}`}>Quantity</Label>
                    <Input
                      id={`item-qty-${i}`}
                      type="number"
                      min="0.001"
                      step="any"
                      value={item.quantity ?? ""}
                      onChange={(e) => change(i, { quantity: num(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`item-total-${i}`}>Line total ({currency})</Label>
                    <Input
                      id={`item-total-${i}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.total ?? ""}
                      onChange={(e) => change(i, { total: num(e.target.value) })}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.reviewed}
                    disabled={!item.description.trim() || !item.category || !item.quantity}
                    onChange={(e) =>
                      setItems(
                        items.map((x, j) => (j === i ? { ...x, reviewed: e.target.checked } : x)),
                      )
                    }
                  />{" "}
                  I checked this item’s description, category and quantity.
                </label>
              </div>
            ))}
          </fieldset>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || items.length >= 100}
            onClick={() => setItems([...items, blankLine()])}
          >
            <Plus className="mr-1 h-3 w-3" /> Add item
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => persist(false)}>
            Save draft
          </Button>
          <Button
            disabled={busy || !date || items.some((i) => !i.reviewed)}
            onClick={() => persist(true)}
          >
            Confirm purchases
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function InstallReceiptDialog({
  item,
  onClose,
}: {
  item: VehicleReceipt["items"][number];
  onClose: () => void;
}) {
  const install = useServerFn(installReceiptItem);
  const [date, setDate] = useState(localReceiptDate()),
    [km, setKm] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !busy) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record installation: {item.description}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Record when this item was actually fitted to the vehicle.
          </p>
          <Label htmlFor="installed-date">Installation date</Label>
          <Input
            id="installed-date"
            type="date"
            value={date}
            max={localReceiptDate()}
            onChange={(e) => setDate(e.target.value)}
          />
          <Label htmlFor="installed-km">Odometer (km, optional)</Label>
          <Input
            id="installed-km"
            type="number"
            min={0}
            value={km}
            onChange={(e) => setKm(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={busy || !date}
            onClick={async () => {
              setBusy(true);
              try {
                await install({
                  data: { itemId: item.id, installedOn: date, odometerKm: num(km) },
                });
                toast.success("Installation recorded");
                onClose();
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save installation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function VehicleShopConnections({
  userId,
  vehicleId,
  shopVehicleId,
  onChanged,
}: ReceiptTarget & { userId: string; onChanged: () => void }) {
  const request = useServerFn(requestShopVehicleLink),
    approve = useServerFn(approveShopVehicleLink),
    list = useServerFn(listVehicleShopLinks),
    revoke = useServerFn(revokeShopVehicleLink);
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const qc = useQueryClient();
  const links = useQuery({
    queryKey: ["vehicle-shop-links", userId, vehicleId],
    enabled: Boolean(userId && vehicleId),
    queryFn: () => list({ data: { vehicleId: vehicleId! } }),
  });
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      void qc.invalidateQueries({ queryKey: ["vehicle-shop-links", userId] });
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded border p-3 text-sm">
      <summary className="cursor-pointer font-medium">Connect vehicle history with a shop</summary>
      <div className="mt-3 space-y-2">
        {shopVehicleId ? (
          <>
            <p className="text-muted-foreground">
              Give the vehicle owner a connection code. They approve it from their My Vehicles
              record. Confirm the vehicle identity with them first.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => run(async () => setCode(await request({ data: { shopVehicleId } })))}
            >
              Create owner connection code
            </Button>
            {code && (
              <Input
                aria-label="Owner connection code"
                readOnly
                value={code}
                onFocus={(e) => e.target.select()}
              />
            )}
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              Use the code supplied by your shop after confirming this is the same vehicle. Linking
              adds its shop receipts and installations to this vehicle; your private receipts remain
              private unless you share them.
            </p>
            <Input
              aria-label="Shop connection code"
              value={code}
              placeholder="Paste shop connection code"
              onChange={(e) => setCode(e.target.value.trim())}
            />
            <Button
              size="sm"
              disabled={busy || !code}
              onClick={() =>
                run(async () => {
                  await approve({ data: { vehicleId: vehicleId!, code } });
                  setCode("");
                  toast.success("Shop vehicle connected");
                })
              }
            >
              Approve connection
            </Button>
            {links.data
              ?.filter((l) => l.active)
              .map((l) => (
                <div key={l.shop_vehicle_id} className="flex items-center justify-between">
                  <span>{l.shop_name || "Linked shop"}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        revoke({
                          data: { vehicleId: vehicleId!, shopVehicleId: l.shop_vehicle_id },
                        }),
                      )
                    }
                  >
                    Revoke access
                  </Button>
                </div>
              ))}
          </>
        )}
        {error && (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
