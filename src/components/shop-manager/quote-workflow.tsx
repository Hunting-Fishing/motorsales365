import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  readQuoteWorkflow,
  changeQuoteWorkflow,
  inspectQuoteWorkflow,
} from "@/lib/quote-workflow.functions";
import {
  clearQuoteRequest,
  loadQuoteRequest,
  saveQuoteRequest,
  makeQuoteRequest,
  parseQuoteOutcome,
  parseQuoteView,
  quoteMoney,
  quoteIssue,
  type QuoteView,
  type QuoteRequest,
  type QuoteOutcome,
  type QuoteAction,
} from "@/lib/quote-workflow";

type Props = { accountId: string; quoteId: string; onChanged: () => void };
export function QuoteWorkflowControl(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Review quote actions</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quote approval and conversion</DialogTitle>
          <DialogDescription>
            Review the complete quote before recording approval or creating a work order. This does
            not charge the customer or allocate inventory.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <QuoteWorkflowPanel key={`${props.accountId}:${props.quoteId}`} {...props} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
export function QuoteWorkflowPanel({ accountId, quoteId, onChanged }: Props) {
  const { user, loading: authLoading } = useAuth();
  const read = useServerFn(readQuoteWorkflow),
    change = useServerFn(changeQuoteWorkflow),
    inspect = useServerFn(inspectQuoteWorkflow);
  const api = useRef({ read, change, inspect });
  api.current = { read, change, inspect };
  const liveAccount = useRef<string | null>(null);
  liveAccount.current = !authLoading && user?.id === accountId ? accountId : null;
  const readEpoch = useRef(0);
  const active = useRef(false),
    latch = useRef(false);
  const [view, setView] = useState<QuoteView | null>(null),
    [pending, setPending] = useState<QuoteRequest | null>(null);
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState(""),
    [reason, setReason] = useState(""),
    [approval, setApproval] = useState(false);
  const [outcome, setOutcome] = useState<QuoteOutcome | null>(null);
  const current = useCallback(
    () => active.current && liveAccount.current === accountId,
    [accountId],
  );
  useLayoutEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const reload = useCallback(async () => {
    if (!current() || latch.current) return;
    const epoch = ++readEpoch.current;
    setLoading(true);
    setView(null);
    setOutcome(null);
    setMessage("");
    setApproval(false);
    try {
      const stored = loadQuoteRequest(window.sessionStorage, accountId, quoteId);
      if (stored) {
        setPending(stored);
        setLoading(false);
        return;
      }
      const response = await api.current.read({ data: { expectedAccountId: accountId, quoteId } });
      if (current() && readEpoch.current === epoch)
        setView(parseQuoteView(response, accountId, quoteId));
    } catch {
      if (current() && readEpoch.current === epoch) {
        setMessage(
          "Could not verify this quote or saved request. Nothing new was submitted. Reload or contact your manager.",
        );
        setBlocked(true);
      }
    } finally {
      if (current() && readEpoch.current === epoch) setLoading(false);
    }
  }, [accountId, quoteId, current]);
  useEffect(() => {
    void reload();
  }, [reload]);
  async function dispatch(r: QuoteRequest, checking: boolean) {
    if (!current() || latch.current) return;
    latch.current = true;
    setBusy(true);
    setMessage("");
    setOutcome(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const stored = loadQuoteRequest(window.sessionStorage, accountId, quoteId);
      if (!stored || JSON.stringify(stored) !== JSON.stringify(r))
        throw Error("Saved request changed. Reload before continuing.");
      const remote = checking ? api.current.inspect({ data: r }) : api.current.change({ data: r });
      const result = await Promise.race<QuoteOutcome>([
        remote,
        new Promise((resolve) => {
          timer = setTimeout(() => resolve({ version: 1, status: "unknown" }), 20000);
        }),
      ]);
      if (!current()) return;
      const parsed =
        result.status === "unknown" || result.status === "unavailable"
          ? result
          : parseQuoteOutcome(result, r);
      setOutcome(parsed);
      if (parsed.status === "completed" || parsed.status === "rejected") {
        clearQuoteRequest(window.sessionStorage, r);
        setPending(null);
        setView(null);
        setMessage(
          parsed.status === "completed"
            ? r.action === "approve"
              ? "Customer approval recorded. Reload the quote before conversion."
              : "Work order created. The original quote and conversion record are retained."
            : quoteIssue(parsed.reason ?? ""),
        );
        if (parsed.status === "completed") onChanged();
      } else {
        setMessage(
          parsed.status === "not_observed"
            ? "No committed result is visible yet. This is not cancellation. Check again or retry this same saved request."
            : "The result is unconfirmed or this service is unavailable. Keep the saved request; check its result before doing anything else.",
        );
      }
    } catch (error) {
      if (current())
        setMessage(
          error instanceof Error
            ? error.message
            : "Result unconfirmed. Keep this request for recovery.",
        );
    } finally {
      if (timer) clearTimeout(timer);
      latch.current = false;
      if (current()) setBusy(false);
    }
  }
  function begin(action: QuoteAction) {
    if (
      !current() ||
      latch.current ||
      pending ||
      !view ||
      blocked ||
      view.issue ||
      !reason.trim() ||
      (action === "approve" && !approval)
    )
      return;
    try {
      if (loadQuoteRequest(window.sessionStorage, accountId, quoteId))
        throw Error("An unresolved request is already saved. Reload to recover it.");
      const request = makeQuoteRequest(view, action, reason, crypto.randomUUID());
      saveQuoteRequest(window.sessionStorage, request);
      setPending(request);
      void dispatch(request, false);
    } catch (error) {
      setBlocked(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save the request. Nothing was submitted.",
      );
    }
  }
  if (!user || authLoading || user.id !== accountId) return null;
  const terminal =
    outcome?.status === "completed" || outcome?.status === "rejected" ? outcome : null;
  return (
    <section className="space-y-4" aria-label="Authorized quote workflow">
      {loading ? <p role="status">Checking quote and business access…</p> : null}
      {message ? (
        <p role="status" className="text-sm">
          {message}
        </p>
      ) : null}
      {pending ? (
        <div className="rounded-md border p-3 space-y-3">
          <p className="font-medium">
            Saved {pending.action === "approve" ? "approval" : "conversion"} request
          </p>
          <p className="text-xs break-all">Request ID: {pending.operationId}</p>
          <p className="text-sm whitespace-pre-wrap">{pending.reason}</p>
          <p className="text-sm">
            Closing this dialog does not cancel the request. Do not clear browser data until the
            result is confirmed.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void dispatch(pending, true)}>
              Check result
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void dispatch(pending, false)}>
              Retry same request
            </Button>
          </div>
        </div>
      ) : null}
      {!pending && view ? (
        <>
          <div className="rounded-md border p-3 text-sm space-y-1">
            <p>Quote: {view.quoteNumber ?? view.quoteId}</p>
            <p>Status: {view.quoteStatus}</p>
            <p>
              Subtotal: {quoteMoney(view.subtotal)} · Tax: {quoteMoney(view.tax)} · Total:{" "}
              <strong>{quoteMoney(view.total)}</strong>
            </p>
            <p>
              {view.items.length} items · Expiry: {view.expiryDate ?? "Not set"}
            </p>
          </div>
          <div className="max-h-64 overflow-auto rounded border">
            <table className="w-full text-sm">
              <caption className="p-2 text-left">Complete quote items for this review</caption>
              <thead>
                <tr>
                  <th scope="col" className="p-2 text-left">
                    Item
                  </th>
                  <th scope="col" className="p-2">
                    Quantity
                  </th>
                  <th scope="col" className="p-2">
                    Unit price
                  </th>
                  <th scope="col" className="p-2">
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.items.map((item) => (
                  <tr key={item.id}>
                    <td className="p-2">
                      {item.name} <span className="text-muted-foreground">({item.kind})</span>
                    </td>
                    <td className="p-2 text-center">{item.quantity}</td>
                    <td className="p-2 text-center">{quoteMoney(item.unitPrice)}</td>
                    <td className="p-2 text-center">{quoteMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {view.issue ? <p role="alert">{quoteIssue(view.issue)}</p> : null}
          {view.workOrderId ? (
            <Button asChild>
              <Link to="/workspace/work-orders/$id" params={{ id: view.workOrderId }}>
                Open Work Order →
              </Link>
            </Button>
          ) : null}
          {!view.workOrderId && ["draft", "sent", "approved"].includes(view.quoteStatus) ? (
            <>
              <label className="block text-sm">
                Approval or conversion note
                <textarea
                  aria-label="Approval or conversion note"
                  className="block w-full min-h-20 rounded border bg-background p-2 mt-1"
                  value={reason}
                  maxLength={2000}
                  disabled={busy || blocked}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              {view.quoteStatus !== "approved" ? (
                <label className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={approval}
                    disabled={busy || blocked}
                    onChange={(event) => setApproval(event.target.checked)}
                  />
                  I have obtained the customer's approval and am recording it here.
                </label>
              ) : null}
              <Button
                disabled={
                  busy ||
                  blocked ||
                  !!view.issue ||
                  !reason.trim() ||
                  (view.quoteStatus !== "approved" && !approval)
                }
                onClick={() => begin(view.quoteStatus === "approved" ? "convert" : "approve")}
              >
                {view.quoteStatus === "approved"
                  ? "Confirm conversion"
                  : "Record customer approval"}
              </Button>
            </>
          ) : null}
        </>
      ) : null}
      {terminal?.status === "completed" && terminal.workOrderId ? (
        <Button asChild>
          <Link to="/workspace/work-orders/$id" params={{ id: terminal.workOrderId }}>
            Open created work order
          </Link>
        </Button>
      ) : null}
      {!pending && !loading ? (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            setBlocked(false);
            void reload();
          }}
        >
          Reload quote review
        </Button>
      ) : null}
    </section>
  );
}
