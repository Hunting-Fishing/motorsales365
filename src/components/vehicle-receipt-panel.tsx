import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { hashKey, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createClientOnlyFn, useServerFn } from "@tanstack/react-start";
import { Receipt, Plus, ScanLine, Loader2, Lock, Wrench, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
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
import {
  PART_CATEGORIES,
  localReceiptDate,
  validateReceiptFile,
  receiptEntrySchema,
  receiptSaveSchema,
  RECEIPT_DISCARD_UNAVAILABLE,
} from "@/lib/vehicle-receipts";
import type { ReceiptLine, ReceiptTarget, VehicleReceipt } from "@/lib/vehicle-receipts";
import type { ReceiptOcrProgress } from "@/lib/receipt-ocr.client";
import { withReceiptAbort } from "@/lib/receipt-abort";
import {
  parseReceiptExpenseAcknowledgment,
  RECEIPT_EXPENSE_FAILURE,
} from "@/lib/vehicle-receipt-expense-contract";
import {
  receiptInstallationRequestSchema,
  parseReceiptInstallationAcknowledgment,
  RECEIPT_INSTALLATION_FAILURE,
  type ReceiptInstallationRequest,
} from "@/lib/vehicle-receipt-installation-contract";

type InstallationSelection = Readonly<
  Pick<
    ReceiptInstallationRequest,
    "expectedAccountId" | "receiptId" | "itemId" | "expectedVehicleId" | "expectedShopVehicleId"
  > & { session: number; description: string }
>;

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

// Invalidation alone need not change QueryObserver's result when staleTime is
// zero. Subscribe to this exact state's boolean, not all cached private data.
function useReadInvalidation(client: QueryClient, key: readonly unknown[]) {
  const queryHash = hashKey(key);
  return useSyncExternalStore(
    (notify) =>
      client.getQueryCache().subscribe((event) => {
        if (event.query.queryHash === queryHash) notify();
      }),
    () => client.getQueryCache().get(queryHash)?.state.isInvalidated ?? false,
    () => false,
  );
}

function hasMixedPublicChoices(items: VehicleReceipt["items"]): boolean {
  return (
    items.some((item) => item.public_summary_allowed === true) &&
    items.some((item) => item.public_summary_allowed === false)
  );
}

export function VehicleReceiptPanel({ vehicleId, shopVehicleId }: ReceiptTarget) {
  const { user, loading } = useAuth();
  // Bootstrap loading deliberately tears down the committed private scope,
  // even if Auth temporarily retains a user. It is not a fresh-role proof.
  if (loading || !user) return null;

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
  const readLifetime = useId();
  const [page, setPage] = useState(0);
  const pageIntent = useRef(0);
  const receiptKey = [
    "vehicle-receipts",
    userId,
    vehicleId,
    shopVehicleId,
    readLifetime,
    page,
  ] as const;
  const qc = useQueryClient();
  const fetchFn = useServerFn(getVehicleReceipts);
  const signFn = useServerFn(getPrivateReceiptUrl);
  const shareFn = useServerFn(setReceiptSharing);
  const expenseFn = useServerFn(recordVehicleReceiptExpense);
  const installFn = useServerFn(installReceiptItem);
  const receipts = useQuery({
    queryKey: receiptKey,
    enabled: Boolean(userId),
    queryFn: ({ signal }) =>
      fetchFn({ data: { ...target, expectedAccountId: userId, page }, signal }),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    retry: false,
    placeholderData: undefined,
  });
  const receiptInvalidated = useReadInvalidation(qc, receiptKey);
  const data =
    receipts.isSuccess &&
    receipts.fetchStatus === "idle" &&
    !receiptInvalidated &&
    receipts.data.page === page
      ? receipts.data
      : undefined;
  function canUseReceiptRead() {
    const current = qc.getQueryState(receiptKey);
    return Boolean(
      data &&
      data.page === pageIntent.current &&
      current?.status === "success" &&
      current.fetchStatus === "idle" &&
      !current.isInvalidated &&
      current.data === data,
    );
  }
  const [edit, setEdit] = useState<VehicleReceipt | "new" | null>(null);
  const [install, setInstall] = useState<InstallationSelection | null>(null);
  const installationSelection = useRef<InstallationSelection | null>(null);
  const installationSequence = useRef(0);
  const installationRead = useRef<{ key: readonly unknown[]; data: typeof data } | null>(null);
  const installationScope = useRef({
    active: false,
    lifetime: 0,
    held: false,
    attempt: null as {
      controller: AbortController;
      selection: InstallationSelection;
      acknowledged: boolean;
    } | null,
  });
  const [installationPending, setInstallationPending] = useState(false);
  const [installationUnknown, setInstallationUnknown] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [openingReceiptId, setOpeningReceiptId] = useState<string | null>(null);
  const privateRead = useRef({ active: false, lifetime: 0, attempt: null as symbol | null });
  const expenseScope = useRef({
    active: false,
    lifetime: 0,
    attempt: null as { controller: AbortController } | null,
    held: false,
  });
  const [expensePending, setExpensePending] = useState(false);
  const [expenseUnknown, setExpenseUnknown] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  function changePage(next: number) {
    if (!Number.isSafeInteger(next) || next < 0 || next > 1_000_000) return;
    // Fence old DOM controls in the same tick, before the new query commits.
    pageIntent.current = next;
    setCategoryFilter("");
    setPage(next);
  }
  useLayoutEffect(() => {
    const scope = privateRead.current;
    scope.lifetime += 1;
    scope.active = true;
    scope.attempt = null;
    setOpeningReceiptId(null);
    return () => {
      // A later setup (including StrictMode replay) must never revive this read.
      scope.active = false;
      scope.lifetime += 1;
      scope.attempt = null;
    };
  }, []);
  async function openPrivateReceipt(id: string) {
    const scope = privateRead.current;
    if (!scope.active || scope.attempt !== null) return;
    const lifetime = scope.lifetime;
    const attempt = Symbol();
    scope.attempt = attempt;
    setOpeningReceiptId(id);
    const current = () => scope.active && scope.lifetime === lifetime && scope.attempt === attempt;
    try {
      const url = await signFn({ data: { id, expectedAccountId: userId } });
      if (!current()) return;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      if (current()) toast.error("Could not open receipt. Please try again.");
    } finally {
      if (current()) {
        scope.attempt = null;
        setOpeningReceiptId(null);
      }
    }
  }
  useLayoutEffect(() => {
    const scope = expenseScope.current;
    scope.active = true;
    scope.lifetime += 1;
    setExpensePending(false);
    setExpenseUnknown(scope.held);
    return () => {
      scope.active = false;
      scope.lifetime += 1;
      const pending = scope.attempt;
      if (pending) {
        // StrictMode setup must not revive an uncertain dispatched write.
        // Aborting its transport does not establish database rollback.
        scope.held = true;
        pending.controller.abort();
      }
      scope.attempt = null;
    };
  }, []);
  async function requestReceiptExpense(receipt: VehicleReceipt) {
    const scope = expenseScope.current;
    if (
      !scope.active ||
      scope.attempt !== null ||
      scope.held ||
      !canUseReceiptRead() ||
      data?.canRecordExpense !== true ||
      !shopVehicleId ||
      receipt.shop_vehicle_id?.toLowerCase() !== shopVehicleId.toLowerCase() ||
      receipt.status !== "confirmed"
    )
      return;
    const request = Object.freeze({
      id: receipt.id,
      expectedAccountId: userId,
      expectedShopVehicleId: shopVehicleId,
    });
    const lifetime = scope.lifetime;
    const attempt = { controller: new AbortController() };
    scope.attempt = attempt;
    setExpensePending(true);
    const current = () =>
      scope.active &&
      scope.lifetime === lifetime &&
      scope.attempt === attempt &&
      !attempt.controller.signal.aborted;
    try {
      const raw = await expenseFn({ data: request, signal: attempt.controller.signal });
      if (!current()) return;
      parseReceiptExpenseAcknowledgment(raw, request.id, request.expectedShopVehicleId);
      if (!current()) return;
      toast.message("Expense request acknowledged. Check shop expenses to confirm.");
      if (!current()) return;
      // The current expenses route still uses this legacy key. This does not
      // confer account scoping on that separate reader.
      void qc.invalidateQueries({ queryKey: ["shop-manager", "expenses"] });
      if (!current()) return;
      void qc.invalidateQueries({ queryKey: ["vehicle-receipts", userId] });
      if (!current()) return;
      void qc.invalidateQueries({ queryKey: ["vehicle-history"] });
    } catch {
      if (current()) {
        scope.held = true;
        setExpenseUnknown(true);
      }
    } finally {
      if (current()) {
        scope.attempt = null;
        setExpensePending(false);
      }
    }
  }
  useLayoutEffect(() => {
    installationRead.current = {
      key: ["vehicle-receipts", userId, vehicleId, shopVehicleId, readLifetime, page],
      data,
    };
  }, [data, userId, vehicleId, shopVehicleId, readLifetime, page]);
  useLayoutEffect(() => {
    const scope = installationScope.current;
    scope.active = true;
    scope.lifetime += 1;
    setInstallationPending(false);
    setInstallationUnknown(scope.held);
    return () => {
      scope.active = false;
      scope.lifetime += 1;
      installationRead.current = null;
      const pending = scope.attempt;
      if (pending) {
        if (!pending.acknowledged) scope.held = true;
        pending.controller.abort();
      }
      scope.attempt = null;
    };
  }, []);
  function matchesInstallationTarget(receipt: VehicleReceipt) {
    if (Boolean(vehicleId) === Boolean(shopVehicleId)) return false;
    return vehicleId
      ? receipt.vehicle_id?.toLowerCase() === vehicleId.toLowerCase()
      : receipt.shop_vehicle_id?.toLowerCase() === shopVehicleId!.toLowerCase();
  }
  function installationWitness(selection: InstallationSelection, snapshot: typeof data) {
    if (!snapshot || selection.expectedAccountId !== userId) return null;
    const receipt = snapshot.receipts.find(
      (row) => row.id.toLowerCase() === selection.receiptId.toLowerCase(),
    );
    if (
      !receipt ||
      receipt.status !== "confirmed" ||
      receipt.can_write !== true ||
      !matchesInstallationTarget(receipt)
    )
      return null;
    const item = receipt.items.find(
      (row) => row.id.toLowerCase() === selection.itemId.toLowerCase(),
    );
    if (!item || item.installed_on !== null || item.reviewed !== true) return null;
    return { receipt, item };
  }
  function currentInstallationWitness(selection: InstallationSelection) {
    const snapshot = installationRead.current;
    if (!snapshot?.data || snapshot.data.page !== pageIntent.current) return null;
    const state = qc.getQueryState(snapshot.key);
    if (
      state?.status !== "success" ||
      state.fetchStatus !== "idle" ||
      state.isInvalidated ||
      state.data !== snapshot.data
    )
      return null;
    return installationWitness(selection, snapshot.data);
  }
  function launchInstallation(receipt: VehicleReceipt, item: VehicleReceipt["items"][number]) {
    const scope = installationScope.current;
    if (!scope.active || scope.attempt || installationSelection.current || !canUseReceiptRead())
      return;
    const selection = Object.freeze({
      session: ++installationSequence.current,
      description: item.description,
      expectedAccountId: userId,
      receiptId: receipt.id,
      itemId: item.id,
      expectedVehicleId: vehicleId ?? null,
      expectedShopVehicleId: shopVehicleId ?? null,
    });
    const witness = currentInstallationWitness(selection);
    if (!witness || witness.receipt !== receipt || witness.item !== item) return;
    installationSelection.current = selection;
    setInstall(selection);
  }
  function closeInstallation(selection: InstallationSelection) {
    const scope = installationScope.current;
    if (!scope.active || installationSelection.current !== selection) return;
    const pending = scope.attempt;
    if (pending?.selection === selection) {
      if (!pending.acknowledged) {
        scope.held = true;
        setInstallationUnknown(true);
      }
      pending.controller.abort();
      scope.attempt = null;
      setInstallationPending(false);
    }
    installationSelection.current = null;
    setInstall(null);
  }
  function endInstallationSession(selection: InstallationSelection) {
    const scope = installationScope.current;
    if (!scope.active || installationSelection.current !== selection) return;
    const pending = scope.attempt;
    if (pending?.selection === selection && !pending.acknowledged) {
      scope.held = true;
      setInstallationUnknown(true);
      pending.controller.abort();
      scope.attempt = null;
      setInstallationPending(false);
    }
  }
  async function requestInstallation(
    selection: InstallationSelection,
    installedOn: string,
    odometerKm: number | null,
  ) {
    const scope = installationScope.current;
    if (
      !scope.active ||
      scope.held ||
      scope.attempt ||
      installationSelection.current !== selection ||
      !currentInstallationWitness(selection)
    )
      return;
    const parsed = receiptInstallationRequestSchema.safeParse({
      expectedAccountId: selection.expectedAccountId,
      receiptId: selection.receiptId,
      itemId: selection.itemId,
      expectedVehicleId: selection.expectedVehicleId,
      expectedShopVehicleId: selection.expectedShopVehicleId,
      installedOn,
      odometerKm,
    });
    if (!parsed.success || parsed.data.installedOn > localReceiptDate()) return;
    const intent = Object.freeze(parsed.data);
    const lifetime = scope.lifetime;
    const attempt = { controller: new AbortController(), selection, acknowledged: false };
    scope.attempt = attempt;
    setInstallationPending(true);
    const current = () =>
      scope.active &&
      scope.lifetime === lifetime &&
      scope.attempt === attempt &&
      installationSelection.current === selection &&
      !attempt.controller.signal.aborted;
    try {
      const raw = await installFn({ data: intent, signal: attempt.controller.signal });
      if (!current()) return;
      parseReceiptInstallationAcknowledgment(raw, intent);
      if (!current()) return;
      attempt.acknowledged = true;
      toast.message("Installation request acknowledged. Refresh vehicle history to confirm.");
      if (!current()) return;
      void qc.invalidateQueries({ queryKey: ["vehicle-receipts", userId] });
      if (!current()) return;
      void qc.invalidateQueries({ queryKey: ["vehicle-history"] });
      if (!current()) return;
      installationSelection.current = null;
      setInstall(null);
      scope.attempt = null;
      setInstallationPending(false);
    } catch {
      if (current()) {
        scope.held = true;
        setInstallationUnknown(true);
      }
    } finally {
      if (current()) {
        scope.attempt = null;
        setInstallationPending(false);
      }
    }
  }
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["vehicle-receipts", userId] });
    void qc.invalidateQueries({ queryKey: ["vehicle-history"] });
  };
  async function action(id: string, fn: () => Promise<unknown>) {
    if (!canUseReceiptRead()) return;
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
          disabled={!data || data.canWrite !== true}
          onClick={() => {
            if (canUseReceiptRead() && data?.canWrite === true) setEdit("new");
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add receipt
        </Button>
      </div>
      <VehicleShopConnections
        {...target}
        userId={userId}
        onChanged={refresh}
        receiptReady={Boolean(data)}
        canUseReceiptRead={canUseReceiptRead}
      />
      {expenseUnknown && (
        <p role="alert" className="text-sm text-destructive">
          {RECEIPT_EXPENSE_FAILURE}
        </p>
      )}
      {expensePending && (
        <p role="status" className="text-sm">
          Checking expense request…
        </p>
      )}
      {installationUnknown && !install && (
        <p role="alert" className="text-sm text-destructive">
          {RECEIPT_INSTALLATION_FAILURE}
        </p>
      )}
      {(receipts.isPending || receipts.fetchStatus !== "idle") && (
        <p role="status" className="text-sm">
          Loading receipts…
        </p>
      )}
      {receipts.isError && receipts.fetchStatus === "idle" && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>Could not load receipts. Please try again.</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void receipts.refetch({ cancelRefetch: false })}
          >
            Retry receipts
          </Button>
        </div>
      )}
      {receiptInvalidated && receipts.isSuccess && receipts.fetchStatus === "idle" && (
        <div className="space-y-2 text-sm">
          <p role="status">Refresh receipts to view this snapshot.</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void receipts.refetch({ cancelRefetch: false })}
          >
            Refresh receipts
          </Button>
        </div>
      )}
      {data && !data.receipts.length && (
        <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">
          No receipts are visible in this snapshot. Upload a receipt or enter purchases manually.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Button
          size="sm"
          variant="outline"
          disabled={page === 0}
          onClick={() => changePage(pageIntent.current - 1)}
        >
          Previous receipts
        </Button>
        <span>
          Receipt page {page + 1}
          {data ? ` · ${data.totalCount} visible receipts at read time` : ""}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={!data?.hasNext || page >= 1_000_000}
          onClick={() => {
            if (canUseReceiptRead() && data?.hasNext) changePage(pageIntent.current + 1);
          }}
        >
          Next receipts
        </Button>
      </div>
      {data?.receipts.length ? (
        <div>
          <Label htmlFor={`receipt-category-filter-${vehicleId || shopVehicleId}`}>
            Filter parts by section
          </Label>
          <select
            id={`receipt-category-filter-${vehicleId || shopVehicleId}`}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={categoryFilter}
            onChange={(e) => {
              if (canUseReceiptRead()) setCategoryFilter(e.target.value);
            }}
          >
            <option value="">All categories</option>
            {Object.entries(PART_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Filters apply to displayed lines on this page. Pages can change as records are added or
            removed.
          </p>
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
                  {r.total !== null ? ` · ${r.currency} ${String(r.total)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {r.file_path && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === r.id || openingReceiptId !== null}
                    onClick={() => {
                      if (canUseReceiptRead()) void openPrivateReceipt(r.id);
                    }}
                  >
                    <FileText className="mr-1 h-3 w-3" /> Receipt
                  </Button>
                )}
                {shopVehicleId &&
                  data?.canRecordExpense === true &&
                  r.shop_vehicle_id?.toLowerCase() === shopVehicleId.toLowerCase() &&
                  r.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id || expensePending || expenseUnknown}
                      onClick={() => void requestReceiptExpense(r)}
                    >
                      Record shop expense
                    </Button>
                  )}
                {r.status === "draft" && r.can_write === true && (
                  <>
                    {r.edit_eligible && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (canUseReceiptRead() && r.edit_eligible === true) setEdit(r);
                        }}
                      >
                        Review
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled
                      aria-label="Discard draft"
                      aria-describedby={`receipt-discard-unavailable-${r.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            {r.status === "draft" && r.can_write === true && (
              <p
                id={`receipt-discard-unavailable-${r.id}`}
                role="status"
                className="text-sm text-muted-foreground"
              >
                {RECEIPT_DISCARD_UNAVAILABLE}
              </p>
            )}
            {!r.items_complete && (
              <p role="status" className="text-sm text-muted-foreground">
                Showing {r.items.length} of {r.item_count} lines. This partial receipt cannot be
                reviewed or change summary sharing.
              </p>
            )}
            {r.status === "draft" && r.items_complete && !r.edit_eligible && (
              <p role="status" className="text-sm text-muted-foreground">
                This retained receipt contains values the current editor cannot preserve. Review is
                unavailable; the original data is unchanged.
              </p>
            )}
            {r.items
              .filter((i) => !categoryFilter || i.category === categoryFilter)
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
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
                  {r.status === "confirmed" &&
                    r.can_write === true &&
                    i.reviewed === true &&
                    i.installed_on === null &&
                    matchesInstallationTarget(r) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={installationPending}
                        onClick={() => launchInstallation(r, i)}
                      >
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
                    disabled={busy === r.id || !r.items_complete || hasMixedPublicChoices(r.items)}
                    onChange={(e) =>
                      r.items_complete &&
                      !hasMixedPublicChoices(r.items) &&
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
                    disabled={busy === r.id || !r.items_complete || hasMixedPublicChoices(r.items)}
                    onChange={(e) =>
                      r.items_complete &&
                      !hasMixedPublicChoices(r.items) &&
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
                {r.items_complete && hasMixedPublicChoices(r.items) && (
                  <p role="status" className="w-full text-muted-foreground">
                    These items have different public-sharing choices, which are preserved.
                    Receipt-level sharing is temporarily unavailable. A separate control is needed
                    to change shop access without changing individual public choices.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      {edit && (
        <ReceiptEditor
          key={edit === "new" ? "new" : edit.id}
          userId={userId}
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
          key={install.session}
          selection={install}
          pending={installationPending}
          held={installationUnknown}
          witnessReady={Boolean(installationWitness(install, data))}
          onSubmit={(date, km) => void requestInstallation(install, date, km)}
          onClose={() => closeInstallation(install)}
          onSessionCleanup={() => endInstallationSession(install)}
        />
      )}
    </section>
  );
}

function ReceiptEditor({
  userId,
  target,
  receipt,
  onClose,
}: {
  userId: string;
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
  const [unknown, setUnknown] = useState(false);
  const localScan = useRef<AbortController | null>(null);
  const [localProgress, setLocalProgress] = useState<ReceiptOcrProgress | null>(null);
  type Attempt = {
    lifetime: number;
    lost: boolean;
    pending: "start" | "upload" | "save" | null;
  };
  const editor = useRef({
    active: false,
    lifetime: 0,
    held: false,
    attempt: null as Attempt | null,
    id: receipt?.id ?? null,
    path: receipt?.file_path ?? null,
    attached: Boolean(receipt?.attachment_uploaded ?? receipt?.file_path),
  });
  const uncertain =
    "Receipt change could not be confirmed. Your entries are kept while this editor is open. Close and check existing receipts before trying again; do not create a duplicate.";
  const frozen = busy || unknown;
  useLayoutEffect(() => {
    const scope = editor.current;
    scope.active = true;
    scope.lifetime += 1;
    scope.attempt = null;
    setBusy(false);
    setUnknown(scope.held);
    if (scope.held) setError(uncertain);
    return () => {
      scope.active = false;
      scope.lifetime += 1;
      if (scope.attempt) {
        scope.attempt.lost = true;
        if (scope.attempt.pending) scope.held = true;
      }
      localScan.current?.abort();
    };
  }, []);
  function current(attempt: Attempt) {
    const scope = editor.current;
    return (
      scope.active &&
      scope.lifetime === attempt.lifetime &&
      scope.attempt === attempt &&
      !attempt.lost
    );
  }
  function assertCurrent(attempt: Attempt) {
    if (!current(attempt)) {
      attempt.lost = true;
      throw new Error(uncertain);
    }
  }
  function checkFile(selected: File | null) {
    if (!selected) return;
    validateReceiptFile(selected);
    z.string().trim().max(200).parse(selected.name);
    if (receipt?.media_type && receipt.media_type !== selected.type)
      throw new Error("Use the original file type for this draft.");
  }
  async function ensureReceipt(attempt: Attempt, selected: File | null) {
    assertCurrent(attempt);
    const scope = editor.current;
    let currentId = scope.id;
    if (!currentId) {
      attempt.pending = "start";
      const row = await start({
        data: {
          ...target,
          ...(selected
            ? {
                fileName: selected.name,
                mediaType: selected.type as
                  | "image/jpeg"
                  | "image/png"
                  | "image/webp"
                  | "application/pdf",
                fileSize: selected.size,
              }
            : {}),
        },
      });
      assertCurrent(attempt);
      const ack = z
        .object({ id: z.string().uuid(), file_path: z.string().nullable() })
        .strict()
        .parse(row);
      const ext = selected
        ? (
            {
              "image/jpeg": "jpg",
              "image/png": "png",
              "image/webp": "webp",
              "application/pdf": "pdf",
            } as Record<string, string>
          )[selected.type]
        : null;
      const expectedPath = selected ? `${userId}/${ack.id}/original.${ext}` : null;
      if (ack.file_path !== expectedPath) throw new Error(uncertain);
      currentId = ack.id;
      scope.id = currentId;
      scope.path = ack.file_path;
      attempt.pending = null;
      setId(currentId);
    }
    if (selected && !scope.attached) {
      assertCurrent(attempt);
      if (!scope.path) throw new Error(uncertain);
      attempt.pending = "upload";
      const uploaded = await supabase.storage
        .from("vehicle-receipts")
        .upload(scope.path, selected, { upsert: false, contentType: selected.type });
      assertCurrent(attempt);
      if (
        uploaded.error !== null ||
        uploaded.data?.path !== scope.path ||
        uploaded.data?.fullPath !== `vehicle-receipts/${scope.path}`
      )
        throw new Error(uncertain);
      scope.attached = true;
      attempt.pending = null;
      setAttached(true);
    }
    return currentId;
  }
  async function run(fn: (attempt: Attempt) => Promise<void>, message: string) {
    const scope = editor.current;
    if (!scope.active || scope.held || scope.attempt) return;
    const attempt: Attempt = { lifetime: scope.lifetime, lost: false, pending: null };
    scope.attempt = attempt;
    setBusy(true);
    setError("");
    try {
      await fn(attempt);
    } catch {
      if (current(attempt)) {
        if (attempt.pending) {
          scope.held = true;
          setUnknown(true);
          setError(uncertain);
        } else setError(message);
      }
    } finally {
      if (current(attempt)) {
        scope.attempt = null;
        setBusy(false);
        setLocalProgress(null);
      }
    }
  }
  function change(i: number, patch: Partial<ReceiptLine>) {
    setItems(items.map((x, j) => (j === i ? { ...x, ...patch, reviewed: false } : x)));
  }
  async function extract() {
    const selected = file;
    const allowed = consent;
    await run(async (attempt) => {
      if (!allowed || (!selected && !editor.current.attached))
        throw new Error("Receipt consent required.");
      checkFile(selected);
      const currentId = await ensureReceipt(attempt, selected);
      assertCurrent(attempt);
      const result = await scan({ data: { id: currentId, consent: true } });
      assertCurrent(attempt);
      setVendor(result.vendor || "");
      setDate(result.purchased_on || "");
      setCurrency(result.currency || "PHP");
      setTotal(result.total?.toString() || "");
      setItems(result.items.length ? result.items : [blankLine()]);
      toast.message("Scan complete. Check every item and fill any missing fields.");
    }, "Could not scan with AI. You can enter the receipt manually.");
  }
  async function extractLocal() {
    const selected = file;
    if (!selected) return;
    await run(async (attempt) => {
      const controller = new AbortController();
      localScan.current = controller;
      setLocalProgress({ stage: "Preparing scanner", progress: 0 });
      try {
        if (controller.signal.aborted) return;
        const result = await scanReceiptOnDevice(selected, {
          signal: controller.signal,
          onProgress: (progress) => {
            if (current(attempt) && !controller.signal.aborted) setLocalProgress(progress);
          },
        });
        if (!current(attempt) || controller.signal.aborted) return;
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
        if (current(attempt) && !controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not scan this photo. You can enter the receipt manually.",
          );
        }
      } finally {
        if (localScan.current === controller) localScan.current = null;
      }
    }, "Could not scan this photo. You can enter the receipt manually.");
  }
  async function persist(confirm: boolean) {
    const selected = file;
    const fields = {
      vendor: vendor || null,
      purchasedOn: date || null,
      currency,
      total: num(total),
      items,
      confirm,
    };
    await run(async (attempt) => {
      const entry = receiptEntrySchema.parse(fields);
      checkFile(selected);
      if (editor.current.id) receiptSaveSchema.parse({ ...entry, id: editor.current.id });
      const currentId = await ensureReceipt(attempt, selected);
      assertCurrent(attempt);
      const payload = receiptSaveSchema.parse({ ...entry, id: currentId });
      attempt.pending = "save";
      const ack = await save({ data: payload });
      assertCurrent(attempt);
      if (ack !== null) throw new Error(uncertain);
      attempt.pending = null;
      toast.success(confirm ? "Purchase history saved" : "Draft saved");
      onClose();
    }, "Check the receipt details and review every required item before saving.");
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !editor.current.attempt && !editor.current.held) onClose();
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
                disabled={frozen || Boolean(id && attached)}
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
            <Button
              type="button"
              variant="outline"
              disabled={frozen || !file}
              onClick={extractLocal}
            >
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
                disabled={frozen}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />{" "}
              Allow this receipt to be sent to the configured AI provider for extraction.
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={frozen || !consent || (!file && !attached)}
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
          <fieldset disabled={frozen} className="grid gap-3 sm:grid-cols-4">
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
          <fieldset disabled={frozen} className="space-y-3">
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
                    disabled={frozen || items.length === 1}
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
                    disabled={
                      frozen || !item.description.trim() || !item.category || !item.quantity
                    }
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
            disabled={frozen || items.length >= 100}
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
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (!editor.current.attempt) onClose();
            }}
          >
            {unknown ? "Close and check receipts" : "Close"}
          </Button>
          <Button variant="outline" disabled={frozen} onClick={() => persist(false)}>
            Save draft
          </Button>
          <Button
            disabled={frozen || !date || items.some((i) => !i.reviewed)}
            onClick={() => persist(true)}
          >
            Confirm purchases
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function InstallationSessionBoundary({ onCleanup }: { onCleanup: () => void }) {
  // Radix mounts portal content after its dialog wrapper. Fence the committed
  // content lifetime itself, including its real StrictMode cleanup/replay.
  const cleanup = useRef(onCleanup);
  useLayoutEffect(() => () => cleanup.current(), []);
  return null;
}
function InstallReceiptDialog({
  selection,
  pending,
  held,
  witnessReady,
  onSubmit,
  onClose,
  onSessionCleanup,
}: {
  selection: InstallationSelection;
  pending: boolean;
  held: boolean;
  witnessReady: boolean;
  onSubmit: (date: string, km: number | null) => void;
  onClose: () => void;
  onSessionCleanup: () => void;
}) {
  const [date, setDate] = useState(localReceiptDate()),
    [km, setKm] = useState(""),
    [error, setError] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <InstallationSessionBoundary onCleanup={onSessionCleanup} />
        <DialogHeader>
          <DialogTitle>Record installation: {selection.description}</DialogTitle>
          <DialogDescription>
            Review the actual fitting date and vehicle odometer before submitting.
          </DialogDescription>
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
            disabled={pending || held}
            onChange={(e) => setDate(e.target.value)}
          />
          <Label htmlFor="installed-km">Odometer (km, optional)</Label>
          <Input
            id="installed-km"
            type="number"
            min={0}
            max={2_000_000}
            step={1}
            value={km}
            disabled={pending || held}
            onChange={(e) => setKm(e.target.value)}
          />
          {!witnessReady && !held && (
            <p role="status" className="text-sm text-muted-foreground">
              Refresh receipts and find this matching uninstalled item before submitting.
            </p>
          )}
          {pending && (
            <p role="status" className="text-sm">
              Checking installation request…
            </p>
          )}
          {(held || error) && (
            <p role="alert" className="text-sm text-destructive">
              {held ? RECEIPT_INSTALLATION_FAILURE : error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={pending || held || !witnessReady || !date}
            onClick={() => {
              if (pending || held || !witnessReady) return;
              const odometerKm = km === "" ? null : /^\d+$/.test(km) ? Number(km) : NaN;
              const parsed = receiptInstallationRequestSchema.safeParse({
                expectedAccountId: selection.expectedAccountId,
                receiptId: selection.receiptId,
                itemId: selection.itemId,
                expectedVehicleId: selection.expectedVehicleId,
                expectedShopVehicleId: selection.expectedShopVehicleId,
                installedOn: date,
                odometerKm,
              });
              if (!parsed.success || parsed.data.installedOn > localReceiptDate()) {
                setError(
                  "Check the installation date and enter whole kilometres from 0 to 2,000,000, or leave the odometer blank.",
                );
                return;
              }
              setError("");
              onSubmit(parsed.data.installedOn, parsed.data.odometerKm);
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
  receiptReady,
  canUseReceiptRead,
}: ReceiptTarget & {
  userId: string;
  onChanged: () => void;
  receiptReady: boolean;
  canUseReceiptRead: () => boolean;
}) {
  const request = useServerFn(requestShopVehicleLink),
    approve = useServerFn(approveShopVehicleLink),
    list = useServerFn(listVehicleShopLinks),
    revoke = useServerFn(revokeShopVehicleLink);
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const qc = useQueryClient();
  const readLifetime = useId();
  const [page, setPage] = useState(0);
  const pageIntent = useRef(0);
  const linkKey = ["vehicle-shop-links", userId, vehicleId, readLifetime, page] as const;
  const linksEnabled = Boolean(userId && vehicleId);
  const links = useQuery({
    queryKey: linkKey,
    enabled: linksEnabled,
    queryFn: ({ signal }) =>
      list({ data: { vehicleId: vehicleId!, expectedAccountId: userId, page }, signal }),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    retry: false,
    placeholderData: undefined,
  });
  const linksInvalidated = useReadInvalidation(qc, linkKey);
  const data =
    linksEnabled &&
    links.isSuccess &&
    links.fetchStatus === "idle" &&
    !linksInvalidated &&
    links.data.page === page
      ? links.data
      : undefined;
  function canUseLinkRead() {
    const current = qc.getQueryState(linkKey);
    return Boolean(
      data &&
      data.page === pageIntent.current &&
      current?.status === "success" &&
      current.fetchStatus === "idle" &&
      !current.isInvalidated &&
      current.data === data,
    );
  }
  async function run(fn: () => Promise<unknown>, scope: "links" | "receipt" = "links") {
    if (scope === "receipt" ? !canUseReceiptRead() : !canUseLinkRead()) return;
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
              disabled={busy || !receiptReady}
              onClick={() =>
                run(async () => setCode(await request({ data: { shopVehicleId } })), "receipt")
              }
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
              disabled={busy || !code || !data}
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
            {(links.isPending || links.fetchStatus !== "idle") && linksEnabled && (
              <p role="status">Loading shop connections…</p>
            )}
            {links.isError && links.fetchStatus === "idle" && linksEnabled && (
              <div role="alert" className="space-y-2 text-destructive">
                <p>Could not load shop connections. Please try again.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void links.refetch({ cancelRefetch: false })}
                >
                  Retry shop connections
                </Button>
              </div>
            )}
            {linksInvalidated &&
              links.isSuccess &&
              links.fetchStatus === "idle" &&
              linksEnabled && (
                <div className="space-y-2">
                  <p role="status">Refresh shop connections to view this snapshot.</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void links.refetch({ cancelRefetch: false })}
                  >
                    Refresh shop connections
                  </Button>
                </div>
              )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => {
                  pageIntent.current = Math.max(0, pageIntent.current - 1);
                  setPage(pageIntent.current);
                }}
              >
                Previous connections
              </Button>
              <span>
                Connection page {page + 1}
                {data ? ` · ${data.totalCount} visible connections at read time` : ""}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!data?.hasNext || page >= 1_000_000}
                onClick={() => {
                  if (!canUseLinkRead() || !data?.hasNext) return;
                  pageIntent.current += 1;
                  setPage(pageIntent.current);
                }}
              >
                Next connections
              </Button>
            </div>
            {data && !data.links.some((link) => link.active) && (
              <p className="text-muted-foreground">No active shop connections in this snapshot.</p>
            )}
            {data?.links
              .filter((l) => l.active)
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
