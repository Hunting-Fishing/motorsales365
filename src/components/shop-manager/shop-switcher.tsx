import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
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
  listSelectableShops,
  changeSelectedShop,
  inspectShopSelection,
} from "@/lib/shop-selection.functions";
import {
  parseShopSelectionRequest,
  parseShopSelectionOutcome,
  loadSelectionPending,
  saveSelectionPending,
  clearSelectionPending,
  hasPendingStock,
  selectionChangedKey,
  type ShopSelectionRequest,
  type ShopSelectionOutcome,
  type SelectionBlocker,
} from "@/lib/shop-selection";
const messages: Record<SelectionBlocker, string> = {
  conflict: "Your selected shop changed. Reload before choosing again.",
  active_shift: "Clock out of your current shift before switching shops.",
  open_register: "Close and reconcile your register before switching shops.",
  role_review:
    "Your account has additional native roles. A manager must review them before switching.",
};
type Props = { children: ReactNode; onReload?: () => void };
/** Switching unmounts old workspace forms; confirmed changes start a fresh page. */
export function WorkspaceShopSwitcher({ children, onReload }: Props) {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return (
    <ScopedSwitcher key={user.id} account={user.id} onReload={onReload}>
      {children}
    </ScopedSwitcher>
  );
}
function ScopedSwitcher({ account, children, onReload }: Props & { account: string }) {
  const client = useQueryClient();
  const read = useServerFn(listSelectableShops),
    change = useServerFn(changeSelectedShop),
    inspect = useServerFn(inspectShopSelection);
  const lifetime = useId(),
    generation = useRef(0),
    inFlight = useRef(false),
    lastSelection = useRef<string | null>(null);
  const [open, setOpen] = useState(false),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ShopSelectionRequest | null>(null),
    [outcome, setOutcome] = useState<ShopSelectionOutcome | null>(null);
  const [storageError, setStorageError] = useState(false),
    [externalChange, setExternalChange] = useState(false);
  const [target, setTarget] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["shop-selection", account, lifetime],
    queryFn: () => read({ data: { expectedAccountId: account } }),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    placeholderData: undefined,
  });
  const view =
    query.isSuccess && !query.isFetching && query.data.accountId === account ? query.data : null;
  const current = view?.shops.find((s) => s.shopId === view.selectedShopId);
  useLayoutEffect(() => {
    generation.current += 1;
    try {
      const saved = loadSelectionPending(window.sessionStorage, account);
      setPending(saved);
      if (saved) setOpen(true);
    } catch {
      setStorageError(true);
      setMessage(
        "The saved selection request cannot be read. Contact your manager before changing shops.",
      );
    }
    setReady(true);
    return () => {
      generation.current += 1;
    };
  }, [account]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === selectionChangedKey(account) && event.newValue !== null) {
        setExternalChange(true);
        void client.cancelQueries();
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [account, client]);
  useEffect(() => {
    if (!view) return;
    const selected = `${view.selectedShopId ?? "none"}:${view.shops.find((s) => s.shopId === view.selectedShopId)?.role ?? "no-access"}`;
    if (lastSelection.current !== null && lastSelection.current !== selected)
      setExternalChange(true);
    lastSelection.current = selected;
  }, [view]);
  const completed = outcome?.status === "completed";
  const blocked =
    ready && (busy || pending !== null || storageError || externalChange || completed);
  const reload = () => {
    client.clear();
    if (onReload) onReload();
    else window.location.assign("/workspace");
  };
  async function run(check: boolean) {
    if (!ready || inFlight.current || storageError) return;
    let request: ShopSelectionRequest;
    try {
      const saved = loadSelectionPending(window.sessionStorage, account);
      if (pending) request = pending;
      else if (saved) {
        setPending(saved);
        return;
      } else {
        if (
          check ||
          !view ||
          !confirmed ||
          view.blocker ||
          externalChange ||
          !view.shops.some((s) => s.shopId === target)
        )
          throw Error("Review the selected shop first.");
        if (client.isMutating() > 0 || hasPendingStock(window.sessionStorage, account)) {
          setMessage(
            "Finish pending work and recover outstanding stock requests before switching.",
          );
          return;
        }
        request = parseShopSelectionRequest({
          version: 1,
          expectedAccountId: account,
          operationId: crypto.randomUUID(),
          profileId: view.profileId,
          expectedShopId: view.selectedShopId,
          expectedUpdatedAt: view.profileUpdatedAt,
          targetShopId: target,
        });
      }
      saveSelectionPending(window.sessionStorage, request);
    } catch {
      setMessage("Nothing was sent. Reload the shop list and check this tab’s recovery storage.");
      return;
    }
    const live = generation.current;
    inFlight.current = true;
    setBusy(true);
    setPending(request);
    setOutcome(null);
    setMessage("");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let result: ShopSelectionOutcome;
    try {
      await client.cancelQueries();
      if (live !== generation.current) return;
      const value = await Promise.race([
        (check ? inspect : change)({ data: request }),
        new Promise<ShopSelectionOutcome>((resolve) => {
          timer = setTimeout(() => resolve({ version: 1, status: "unknown" }), 20000);
        }),
      ]);
      result = parseShopSelectionOutcome(value, request);
    } catch {
      result = { version: 1, status: "unknown" };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
    if (live !== generation.current) return;
    inFlight.current = false;
    setBusy(false);
    setOutcome(result);
    if (result.status === "completed" || result.status === "rejected") {
      try {
        clearSelectionPending(window.sessionStorage, request);
        setPending(null);
      } catch {
        setMessage(
          "The result is confirmed, but its recovery record cannot be cleared. Check this same result again.",
        );
        return;
      }
      if (result.status === "completed") {
        try {
          window.localStorage.setItem(selectionChangedKey(account), request.operationId);
        } catch {
          setMessage("Selection recorded. Reload every other workspace tab before continuing.");
        }
        reload(); // Never reuse cached customer, role or stock data from the former shop.
      } else if (result.code === "conflict") setExternalChange(true);
    }
  }
  return (
    <>
      <div className="border-b bg-background px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
        <span>{current ? `Shop: ${current.name}` : "Shop Manager workspace"}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setOpen(true);
            if (!pending && !completed && !externalChange) {
              setOutcome(null);
              setConfirmed(false);
              setTarget("");
            }
            void query.refetch();
          }}
        >
          {pending ? "Review shop switch" : "Switch shop"}
        </Button>
      </div>
      {blocked ? (
        <div role="status" className="mx-auto max-w-3xl p-6 space-y-3">
          <p>
            {externalChange || completed
              ? "Shop context changed. Reload the workspace before continuing."
              : "Workspace actions are paused until this shop-selection request is resolved."}
          </p>
          {externalChange || completed ? (
            <Button onClick={reload}>Reload workspace</Button>
          ) : (
            <Button onClick={() => setOpen(true)}>Review shop switch</Button>
          )}
        </div>
      ) : ready ? (
        children
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch shop</DialogTitle>
            <DialogDescription>
              Select a business you currently own or work for. This changes the selected shop for
              your account across devices. Finish current work first.
            </DialogDescription>
          </DialogHeader>
          {query.isError && !pending ? (
            <p role="alert">
              Shop selection is unavailable. The database update or employee profile may need
              attention.
            </p>
          ) : null}
          {!view && !query.isError && !pending ? (
            <p role="status">Loading authorized shops…</p>
          ) : null}
          {view && !pending && !completed ? (
            <>
              <Label htmlFor="selection-shop">Destination shop</Label>
              <select
                id="selection-shop"
                className="w-full rounded-md border bg-background p-2"
                value={target}
                disabled={busy || storageError || externalChange || !!view.blocker}
                onChange={(e) => {
                  setTarget(e.target.value);
                  setConfirmed(false);
                }}
              >
                <option value="">Choose a shop</option>
                {view.shops.map((s) => (
                  <option
                    key={s.shopId}
                    value={s.shopId}
                    disabled={s.shopId === view.selectedShopId}
                  >
                    {s.name} — {s.role.replaceAll("_", " ")}
                    {s.shopId === view.selectedShopId ? " (current)" : ""}
                  </option>
                ))}
              </select>
              {view.blocker ? <p role="alert">{messages[view.blocker]}</p> : null}
              {view.shops.length < 2 ? (
                <p>
                  Only one accessible shop is available. Another shop’s owner must add you to its
                  staff first.
                </p>
              ) : null}
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy || !!view.blocker || externalChange}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  I have saved my work and closed other workspace tabs or devices. I understand my
                  permissions may differ in the destination shop.
                </span>
              </label>
            </>
          ) : null}
          {pending ? (
            <p className="break-all text-xs">
              Saved switch request: {pending.operationId}. Its destination and original version are
              locked for recovery.
            </p>
          ) : null}
          {busy ? <p role="status">Checking the selection request…</p> : null}
          {message ? <p role="alert">{message}</p> : null}
          {outcome?.status === "unknown" || outcome?.status === "unavailable" ? (
            <p role="alert">
              The result is unconfirmed. It may have completed. Check the saved result or retry this
              same request; do not create a replacement.
            </p>
          ) : null}
          {outcome?.status === "not_observed" ? (
            <p role="alert">
              No committed result is visible yet. This is not cancellation. Retry only the saved
              request.
            </p>
          ) : null}
          {outcome?.status === "rejected" ? (
            <p role="alert">No selection change was made. {messages[outcome.code]}</p>
          ) : null}
          {completed ? (
            <p role="status">
              Shop selection recorded. Reload to read the current shop and permissions.
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            {pending ? (
              <>
                <Button
                  disabled={busy || storageError}
                  variant="outline"
                  onClick={() => void run(true)}
                >
                  Check result
                </Button>
                {!completed && outcome?.status !== "rejected" ? (
                  <Button disabled={busy || storageError} onClick={() => void run(false)}>
                    Retry same request
                  </Button>
                ) : null}
              </>
            ) : completed || externalChange ? (
              <Button onClick={reload}>Reload workspace</Button>
            ) : (
              <Button
                disabled={
                  busy ||
                  !ready ||
                  storageError ||
                  !view ||
                  !!view.blocker ||
                  !confirmed ||
                  !target ||
                  outcome?.status === "rejected"
                }
                onClick={() => void run(false)}
              >
                Confirm switch
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
