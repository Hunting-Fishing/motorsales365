import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  submitBusinessStockAdjustment,
  inspectBusinessStockAdjustment,
} from "@/lib/business-stock-operation.functions";
import {
  clearPendingStock,
  loadPendingStock,
  parseStockOutcome,
  parseStockRequest,
  persistPendingStock,
  type StockOutcome,
  type StockRequest,
} from "@/lib/business-stock-operation";

export type StockItemSnapshot = {
  id: string;
  business_id: string;
  name: string;
  qty_on_hand: number | string;
  updated_at: string;
};
type Props = {
  accountId: string;
  businessId: string;
  selected: StockItemSnapshot | null;
  onClose: () => void;
  onChanged: () => void;
};
export function BusinessStockAdjustment(props: Props) {
  const { user, loading } = useAuth();
  if (loading || !user || user.id !== props.accountId) return null;
  return (
    <ScopedStockAdjustment
      key={`${user.id}:${props.businessId}`}
      {...props}
      selected={props.selected?.business_id === props.businessId ? props.selected : null}
    />
  );
}
function ScopedStockAdjustment({ accountId, businessId, selected, onClose, onChanged }: Props) {
  const submit = useServerFn(submitBusinessStockAdjustment);
  const inspect = useServerFn(inspectBusinessStockAdjustment);
  const active = useRef(false);
  const inFlight = useRef(false);
  const previousSelection = useRef(selected);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<StockRequest | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [delta, setDelta] = useState("1");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<StockOutcome | null>(null);
  useLayoutEffect(() => {
    active.current = true;
    try {
      const saved = loadPendingStock(window.sessionStorage, accountId, businessId);
      setPending(saved);
      setRecoveryOpen(saved !== null);
    } catch {
      setStorageError(true);
      setMessage(
        "The stock recovery record could not be read. No new adjustment can be sent from this tab until that record is recovered.",
      );
    }
    setLoaded(true);
    return () => {
      active.current = false;
    };
  }, [accountId, businessId]);
  useEffect(() => {
    if (previousSelection.current === selected) return;
    previousSelection.current = selected;
    if (!pending && !inFlight.current) {
      setDelta("1");
      setReason("");
      setResult(null);
      if (!storageError) setMessage("");
    }
  }, [selected, pending, storageError]);

  function close() {
    setRecoveryOpen(false);
    onClose();
  }
  async function run(mode: "submit" | "inspect") {
    if (!active.current || inFlight.current || !loaded || storageError) return;
    let request: StockRequest;
    try {
      const stored = loadPendingStock(window.sessionStorage, accountId, businessId);
      if (pending) request = pending;
      else if (stored) {
        setPending(stored);
        setRecoveryOpen(true);
        return;
      } else {
        if (mode === "inspect" || !selected || selected.business_id !== businessId)
          throw new Error("Reload the selected stock item.");
        request = parseStockRequest({
          version: 1,
          operationId: crypto.randomUUID(),
          expectedAccountId: accountId,
          businessId,
          itemId: selected.id,
          expectedUpdatedAt: selected.updated_at,
          expectedQuantity: String(selected.qty_on_hand),
          delta,
          reason,
        });
      }
      persistPendingStock(window.sessionStorage, request);
    } catch {
      setMessage(
        "Nothing was sent. Check the quantity, reason, selected item, and this tab’s recovery storage.",
      );
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setPending(request);
    setMessage("");
    setResult(null);
    let outcome: StockOutcome;
    try {
      outcome = parseStockOutcome(
        await (mode === "inspect" ? inspect : submit)({ data: request }),
        request,
      );
    } catch {
      outcome = { version: 1, status: "unknown" };
    }
    if (!active.current) return;
    inFlight.current = false;
    setBusy(false);
    setResult(outcome);
    if (outcome.status === "completed" || outcome.status === "rejected") {
      try {
        clearPendingStock(window.sessionStorage, request);
        setPending(null);
      } catch {
        setMessage(
          "The result is confirmed, but the recovery record could not be cleared. Check the result again before starting another adjustment.",
        );
      }
      onChanged();
    }
  }
  const resolved = result?.status === "completed" || result?.status === "rejected";
  const target = pending?.itemId ?? selected?.id;
  const title =
    selected && selected.id === target ? selected.name : `Item ${target ?? "unavailable"}`;
  const open = selected !== null || recoveryOpen;
  return (
    <>
      {pending && !open ? (
        <div role="status" className="rounded-md border p-3 text-sm">
          A stock adjustment needs review. Start no replacement request.
          <Button variant="outline" onClick={() => setRecoveryOpen(true)}>
            Review stock request
          </Button>
        </div>
      ) : null}
      {storageError ? <p role="alert">{message}</p> : null}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              Record a manual correction for this business. Receiving, sales and returns use their
              own workflows.
            </DialogDescription>
          </DialogHeader>
          <p className="font-medium">{title}</p>
          <p>
            Opening on-hand:{" "}
            {pending?.expectedQuantity ?? String(selected?.qty_on_hand ?? "unavailable")}
          </p>
          <Label htmlFor="stock-delta">Quantity change</Label>
          <Input
            id="stock-delta"
            inputMode="decimal"
            value={pending?.delta ?? delta}
            disabled={busy || pending !== null || resolved || !loaded || storageError}
            onChange={(event) => setDelta(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Use a positive number to add or a negative number to remove. Maximum two decimal places.
          </p>
          <Label htmlFor="stock-reason">Reason</Label>
          <Input
            id="stock-reason"
            value={pending?.reason ?? reason}
            maxLength={500}
            disabled={busy || pending !== null || resolved || !loaded || storageError}
            onChange={(event) => setReason(event.target.value)}
          />
          {pending ? <p className="break-all text-xs">Request ID: {pending.operationId}</p> : null}
          {busy ? (
            <p role="status">Checking the stock request. Do not submit a replacement.</p>
          ) : null}
          {message && !storageError ? <p role="alert">{message}</p> : null}
          {result?.status === "completed" ? (
            <p role="status">
              Stock adjustment recorded: {result.quantityBefore} → {result.quantityAfter}. This is
              the saved result, not a live stock reading.
            </p>
          ) : null}
          {result?.status === "rejected" ? (
            <p role="alert">
              No stock change was made for this request.{" "}
              {result.code === "conflict"
                ? "The item changed after this screen opened. Close and refresh inventory before reviewing a new adjustment."
                : result.code === "reserved_stock"
                  ? "The requested quantity would use reserved stock or fall below zero."
                  : "Stock or reservation data needs review."}
            </p>
          ) : null}
          {result?.status === "not_observed" ? (
            <p role="alert">
              No committed result was found. The original request may still be in progress. Retry
              only this same request.
            </p>
          ) : null}
          {result?.status === "unknown" ? (
            <p role="alert">
              The result is not confirmed. The adjustment may have completed. Check its result or
              retry the same request; do not create a new one.
            </p>
          ) : null}
          {result?.status === "unavailable" ? (
            <p role="alert">
              Stock access or the database update is unavailable. This request is retained for
              recovery; no replacement is permitted.
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              {resolved ? "Done" : "Close and keep request"}
            </Button>
            {pending ? (
              <>
                <Button
                  variant="outline"
                  disabled={busy || storageError}
                  onClick={() => void run("inspect")}
                >
                  Check result
                </Button>
                {!resolved ? (
                  <Button disabled={busy || storageError} onClick={() => void run("submit")}>
                    Retry same request
                  </Button>
                ) : null}
              </>
            ) : !resolved ? (
              <Button
                disabled={busy || !loaded || storageError || !selected}
                onClick={() => void run("submit")}
              >
                Record adjustment
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
