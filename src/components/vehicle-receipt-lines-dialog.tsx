import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { hashKey, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PART_CATEGORIES } from "@/lib/vehicle-receipts";
import {
  parseReceiptLinesPage,
  receiptLinesRequestSchema,
  RECEIPT_LINES_FAILURE,
  type ReceiptLinesRequest,
} from "@/lib/vehicle-receipt-lines-contract";
import { getVehicleReceiptItemPage } from "@/lib/vehicle-receipts.functions";

type Props = {
  intent: Omit<ReceiptLinesRequest, "page">;
  currency: string;
  parentQueryKey: readonly unknown[];
  isParentCurrent: () => boolean;
  onClose: () => void;
};

export function VehicleReceiptLinesDialog(props: Props) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Receipt lines</DialogTitle>
          <DialogDescription>
            Read-only pages of retained lines. Each page is a separate read-time window; records can
            change between pages. Viewing more lines does not enable editing or sharing.
          </DialogDescription>
        </DialogHeader>
        {/* This reader mounts inside the actual Radix portal content, so its
            cleanup also fences that content's StrictMode replay. */}
        <ReceiptLinesContent {...props} />
      </DialogContent>
    </Dialog>
  );
}

function ReceiptLinesContent({ intent, currency, parentQueryKey, isParentCurrent }: Props) {
  const qc = useQueryClient();
  const fetchLines = useServerFn(getVehicleReceiptItemPage);
  const readLifetime = useId();
  const [window, setWindow] = useState({ page: 0, generation: 0 });
  const pageIntent = useRef(window);
  const scope = useRef({
    active: false,
    lifetime: 0,
    attempt: null as { controller: AbortController } | null,
  });
  const queryKey = [
    "vehicle-receipt-lines",
    intent.expectedAccountId,
    intent.vehicleId,
    intent.shopVehicleId,
    intent.receiptId,
    readLifetime,
    window.page,
    window.generation,
  ] as const;
  const queryHash = hashKey(queryKey);
  const parentHash = hashKey(parentQueryKey);
  // QueryObserver need not notify on invalidation when staleTime is already
  // zero. Observe only these exact two query states, never another account.
  useSyncExternalStore(
    (notify) =>
      qc.getQueryCache().subscribe((event) => {
        if (event.query.queryHash === parentHash) notify();
      }),
    () => qc.getQueryCache().get(parentHash)?.state,
    () => undefined,
  );
  const exactState = useSyncExternalStore(
    (notify) =>
      qc.getQueryCache().subscribe((event) => {
        if (event.query.queryHash === queryHash) notify();
      }),
    () => qc.getQueryCache().get(queryHash)?.state,
    () => undefined,
  );
  useLayoutEffect(() => {
    const current = scope.current;
    current.active = true;
    current.lifetime += 1;
    return () => {
      current.active = false;
      current.lifetime += 1;
      current.attempt?.controller.abort();
      current.attempt = null;
    };
  }, []);
  function admitted() {
    return scope.current.active && pageIntent.current === window && isParentCurrent();
  }
  const lines = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      if (!admitted() || signal.aborted) throw new Error(RECEIPT_LINES_FAILURE);
      const request = Object.freeze(
        receiptLinesRequestSchema.parse({ ...intent, page: window.page }),
      );
      const current = scope.current;
      const lifetime = current.lifetime;
      const attempt = { controller: new AbortController() };
      const abort = () => attempt.controller.abort();
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
      current.attempt = attempt;
      const ready = () =>
        admitted() &&
        current.lifetime === lifetime &&
        current.attempt === attempt &&
        !attempt.controller.signal.aborted;
      try {
        if (!ready()) throw new Error(RECEIPT_LINES_FAILURE);
        const result = await fetchLines({ data: request, signal: attempt.controller.signal });
        if (!ready()) throw new Error(RECEIPT_LINES_FAILURE);
        const parsed = parseReceiptLinesPage(result, request);
        if (!ready()) throw new Error(RECEIPT_LINES_FAILURE);
        return parsed;
      } finally {
        signal.removeEventListener("abort", abort);
        if (current.attempt === attempt) current.attempt = null;
      }
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    placeholderData: undefined,
    retry: false,
  });
  const data =
    admitted() &&
    lines.isSuccess &&
    exactState?.status === "success" &&
    exactState.fetchStatus === "idle" &&
    !exactState.isInvalidated &&
    exactState.data === lines.data &&
    lines.data.page === window.page
      ? lines.data
      : undefined;
  function currentData() {
    const state = qc.getQueryState(queryKey);
    return (
      admitted() &&
      data &&
      state?.status === "success" &&
      state.fetchStatus === "idle" &&
      !state.isInvalidated &&
      state.data === data
    );
  }
  function changePage(next: number) {
    if (!admitted() || !Number.isSafeInteger(next) || next < 0 || next > 1_000_000) return;
    scope.current.attempt?.controller.abort();
    const nextWindow = { page: next, generation: window.generation + 1 };
    pageIntent.current = nextWindow;
    setWindow(nextWindow);
  }
  function retry() {
    if (admitted()) void lines.refetch({ cancelRefetch: false });
  }
  if (!isParentCurrent()) return null;
  return (
    <div className="space-y-4">
      {(lines.isPending || exactState?.fetchStatus !== "idle") && (
        <p role="status" className="text-sm">
          Loading receipt lines…
        </p>
      )}
      {lines.isError && exactState?.fetchStatus === "idle" && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{RECEIPT_LINES_FAILURE}</p>
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            Retry receipt lines
          </Button>
        </div>
      )}
      {lines.isSuccess && exactState?.fetchStatus === "idle" && exactState.isInvalidated && (
        <div className="space-y-2 text-sm">
          <p role="status">Refresh receipt lines to view this window.</p>
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            Refresh receipt lines
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={window.page === 0}
          onClick={() => changePage(window.page - 1)}
        >
          Previous lines
        </Button>
        <span>
          Line page {window.page + 1}
          {data ? ` · ${data.totalCount} visible lines at read time` : ""}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!data?.hasNext || window.page >= 1_000_000}
          onClick={() => {
            if (currentData() && data?.hasNext) changePage(window.page + 1);
          }}
        >
          Next lines
        </Button>
      </div>
      {data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No lines are visible in this read-time window.
        </p>
      )}
      {data && (
        <ol className="space-y-2" aria-label="Receipt line window">
          {data.items.map((item) => (
            <li key={item.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{item.description}</p>
              <p className="text-muted-foreground">
                {item.category ? PART_CATEGORIES[item.category] : "Category not recorded"}
              </p>
              <p>
                {item.brand}
                {item.brand && item.part_number ? " · " : ""}
                {item.part_number}
              </p>
              <p>
                Quantity: {item.quantity === null ? "Not recorded" : String(item.quantity)} ·{" "}
                {item.total === null ? "Amount unavailable" : `${currency} ${String(item.total)}`}
              </p>
              <p>
                {item.reviewed ? "Reviewed" : "Not reviewed"} ·{" "}
                {item.public_summary_allowed ? "Public summary allowed" : "Private summary"}
              </p>
              <p>
                {item.installed_on === null
                  ? "Not recorded as installed"
                  : `Installed ${item.installed_on}`}
                {item.odometer_km === null ? "" : ` · ${item.odometer_km} km`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
