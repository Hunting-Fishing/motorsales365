import { useLayoutEffect, useRef, useState } from "react";
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
  submitShopStockAdjustment,
  inspectShopStockAdjustment,
} from "@/lib/shop-stock-operation.functions";
import {
  parseShopStockRequest,
  parseShopStockOutcome,
  loadShopStockPending,
  saveShopStockPending,
  clearShopStockPending,
  shopStockQuantity,
  type ShopStockRequest,
  type ShopStockOutcome,
} from "@/lib/shop-stock-operation";
export type ShopStockSnapshot = {
  id: string;
  shop_id: string;
  name: string | null;
  quantity: number | null;
  updated_at: string | null;
};
type Props = {
  accountId: string;
  shopId: string;
  selected: ShopStockSnapshot | null;
  canAdjust: boolean;
  onClose: () => void;
  onChanged: () => void;
};
/** Per-account/shop lifetime and persistent same-operation recovery. No direct SDK writes. */
export function ShopStockAdjustment(props: Props) {
  const { user, loading } = useAuth();
  if (loading || !user || user.id !== props.accountId) return null;
  return (
    <ScopedAdjustment
      key={`${user.id}:${props.shopId}`}
      {...props}
      selected={props.selected?.shop_id === props.shopId ? props.selected : null}
    />
  );
}
function ScopedAdjustment({ accountId, shopId, selected, canAdjust, onClose, onChanged }: Props) {
  const submit = useServerFn(submitShopStockAdjustment),
    inspect = useServerFn(inspectShopStockAdjustment);
  const generation = useRef(0),
    inFlight = useRef(false);
  const [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ShopStockRequest | null>(null);
  const [recover, setRecover] = useState(false),
    [storageError, setStorageError] = useState(false);
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [quantity, setQuantity] = useState("1"),
    [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [outcome, setOutcome] = useState<ShopStockOutcome | null>(null);
  const selection = useRef(selected);
  useLayoutEffect(() => {
    generation.current += 1;
    inFlight.current = false;
    setBusy(false);
    try {
      const saved = loadShopStockPending(window.sessionStorage, accountId, shopId);
      setPending(saved);
      setRecover(saved !== null);
    } catch {
      setStorageError(true);
      setMessage(
        "The recovery record cannot be read. No new stock request will be sent from this tab.",
      );
    }
    setLoaded(true);
    return () => {
      generation.current += 1;
    };
  }, [accountId, shopId]);
  useLayoutEffect(() => {
    if (selection.current === selected) return;
    selection.current = selected;
    if (!pending && !inFlight.current) {
      setQuantity("1");
      setMode("add");
      setReason("");
      setOutcome(null);
      if (!storageError) setMessage("");
    }
  }, [selected, pending, storageError]);
  const resolved = outcome?.status === "completed" || outcome?.status === "rejected";
  const open = selected !== null || recover;
  const close = () => {
    setRecover(false);
    onClose();
  };
  async function run(check: boolean) {
    if (!loaded || busy || inFlight.current || storageError) return;
    let request: ShopStockRequest;
    try {
      const saved = loadShopStockPending(window.sessionStorage, accountId, shopId);
      if (pending) request = pending;
      else if (saved) {
        setPending(saved);
        setRecover(true);
        return;
      } else {
        if (
          check ||
          !canAdjust ||
          !selected ||
          selected.shop_id !== shopId ||
          !Number.isSafeInteger(selected.quantity) ||
          selected.quantity! < 0
        )
          throw new Error("Reload stock.");
        const count = BigInt(shopStockQuantity(quantity));
        const opening = BigInt(selected.quantity!);
        const delta = mode === "set" ? count - opening : mode === "remove" ? -count : count;
        request = parseShopStockRequest({
          version: 1,
          operationId: crypto.randomUUID(),
          expectedAccountId: accountId,
          shopId,
          itemId: selected.id,
          expectedUpdatedAt: selected.updated_at,
          expectedQuantity: opening.toString(),
          delta: delta.toString(),
          reason,
        });
      }
      saveShopStockPending(window.sessionStorage, request);
    } catch {
      setMessage(
        "Nothing was sent. Enter a whole-number quantity and reason, and check this tab’s recovery storage.",
      );
      return;
    }
    const current = generation.current;
    inFlight.current = true;
    setBusy(true);
    setPending(request);
    setOutcome(null);
    setMessage("");
    let result: ShopStockOutcome;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Deadline means UNKNOWN, not cancellation. A late backend commit remains
      // recoverable under the original request ID, never a replacement ID.
      const response = await Promise.race([
        (check ? inspect : submit)({ data: request }),
        new Promise<ShopStockOutcome>((resolve) => {
          timer = setTimeout(() => resolve({ version: 1, status: "unknown" }), 20000);
        }),
      ]);
      result = parseShopStockOutcome(response, request);
    } catch {
      result = { version: 1, status: "unknown" };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
    if (current !== generation.current) return;
    inFlight.current = false;
    setBusy(false);
    setOutcome(result);
    if (result.status === "completed" || result.status === "rejected") {
      try {
        clearShopStockPending(window.sessionStorage, request);
        setPending(null);
      } catch {
        setMessage(
          "The result is confirmed, but its recovery record could not be cleared. Check the same result again before a new adjustment.",
        );
      }
      onChanged();
    }
  }
  const locked = !loaded || busy || storageError || pending !== null || resolved;
  return (
    <>
      {pending && !open ? (
        <div role="status" className="rounded-md border p-3 text-sm">
          A Shop Manager stock request needs review.{" "}
          <Button variant="outline" onClick={() => setRecover(true)}>
            Review stock request
          </Button>
        </div>
      ) : null}
      {storageError && !open ? <p role="alert">{message}</p> : null}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Shop Manager stock</DialogTitle>
            <DialogDescription>
              A manual correction records quantity and its audit entry together. Purchases, sales
              and returns use their own workflows.
            </DialogDescription>
          </DialogHeader>
          <p className="font-medium">
            {selected?.id === (pending?.itemId ?? selected?.id)
              ? selected?.name
              : `Item ${pending?.itemId ?? "unavailable"}`}
          </p>
          <p>Opening on-hand: {pending?.expectedQuantity ?? selected?.quantity ?? "unavailable"}</p>
          {!pending ? (
            <div className="flex gap-2">
              {(["add", "remove", "set"] as const).map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={mode === v ? "default" : "outline"}
                  disabled={locked}
                  onClick={() => setMode(v)}
                >
                  {v === "set" ? "Set exact" : v === "add" ? "Add" : "Remove"}
                </Button>
              ))}
            </div>
          ) : null}
          <Label htmlFor="shop-stock-quantity">
            {pending ? "Recorded quantity change" : mode === "set" ? "New quantity" : "Quantity"}
          </Label>
          <Input
            id="shop-stock-quantity"
            inputMode="numeric"
            value={pending?.delta ?? quantity}
            disabled={locked}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Whole units only. Set exact accepts zero; the server checks reserved stock and the
            original record version.
          </p>
          <Label htmlFor="shop-stock-reason">Reason</Label>
          <Input
            id="shop-stock-reason"
            maxLength={500}
            value={pending?.reason ?? reason}
            disabled={locked}
            onChange={(e) => setReason(e.target.value)}
          />
          {pending ? <p className="break-all text-xs">Request ID: {pending.operationId}</p> : null}
          {busy ? <p role="status">Checking the request. Do not create a replacement.</p> : null}
          {message ? <p role="alert">{message}</p> : null}
          {outcome?.status === "completed" ? (
            <p role="status">
              Stock adjustment recorded: {outcome.quantityBefore} → {outcome.quantityAfter}. This is
              the saved result, not a live stock count.
            </p>
          ) : null}
          {outcome?.status === "rejected" ? (
            <p role="alert">
              No stock change was made.{" "}
              {outcome.code === "conflict"
                ? "The record changed. Close and reload before a new adjustment."
                : outcome.code === "reserved_stock"
                  ? "The requested change would use reserved stock or go below zero."
                  : "Stock quantities need review."}
            </p>
          ) : null}
          {outcome?.status === "not_observed" ? (
            <p role="alert">
              No committed result was found. The original request may still be running. Retry only
              this same request.
            </p>
          ) : null}
          {outcome?.status === "unknown" ? (
            <p role="alert">
              The result is unconfirmed and may have completed. Check the result or retry this same
              request, not a replacement.
            </p>
          ) : null}
          {outcome?.status === "unavailable" ? (
            <p role="alert">
              Shop access or the database update is unavailable. This request is retained for
              recovery.
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              {resolved ? "Done" : "Close"}
            </Button>
            {pending ? (
              <>
                <Button
                  variant="outline"
                  disabled={busy || storageError}
                  onClick={() => void run(true)}
                >
                  Check result
                </Button>
                {!resolved ? (
                  <Button disabled={busy || storageError} onClick={() => void run(false)}>
                    Retry same request
                  </Button>
                ) : null}
              </>
            ) : !resolved ? (
              <Button disabled={locked || !selected || !canAdjust} onClick={() => void run(false)}>
                Record adjustment
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
