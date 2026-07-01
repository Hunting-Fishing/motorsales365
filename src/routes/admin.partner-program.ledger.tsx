import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  adminListCommissionEvents,
  adminApproveCommissionEvent,
  adminClawbackCommissionEvent,
  adminListPayouts,
  adminListPayoutCandidates,
  adminCreatePayoutForApproved,
  adminUpdatePayoutStatus,
} from "@/lib/partner-program.functions";
import { formatPHP } from "@/lib/format";

export const Route = createFileRoute("/admin/partner-program/ledger")({
  component: LedgerPage,
});

function LedgerPage() {
  return (
    <SiteLayout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Partner commission ledger</h1>
            <p className="text-sm text-muted-foreground">
              Approve commissions, handle refunds/chargebacks, and process payouts.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/partner-program">Applications</Link>
          </Button>
        </div>

        <Tabs defaultValue="events" className="mt-6">
          <TabsList>
            <TabsTrigger value="events">Commission events</TabsTrigger>
            <TabsTrigger value="candidates">Ready to pay</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>
          <TabsContent value="events"><EventsTab /></TabsContent>
          <TabsContent value="candidates"><CandidatesTab /></TabsContent>
          <TabsContent value="payouts"><PayoutsTab /></TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}

/* ---------- Events tab ---------- */

function EventsTab() {
  const [status, setStatus] = useState<string>("pending");
  const listFn = useServerFn(adminListCommissionEvents);
  const approveFn = useServerFn(adminApproveCommissionEvent);
  const clawbackFn = useServerFn(adminClawbackCommissionEvent);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin-pp-events", status],
    queryFn: () => listFn({ data: { status: status as any } }),
  });
  const [clawback, setClawback] = useState<{ id: string; reason: string } | null>(null);

  const approve = async (id: string) => {
    try {
      await approveFn({ data: { id } });
      toast.success("Approved");
      refetch();
    } catch (e: any) { toast.error(e?.message); }
  };
  const submitClawback = async () => {
    if (!clawback) return;
    try {
      await clawbackFn({ data: { id: clawback.id, reason: clawback.reason.trim() || "Refund/chargeback" } });
      toast.success("Clawed back");
      setClawback(null);
      refetch();
    } catch (e: any) { toast.error(e?.message); }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="clawed_back">Clawed back</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p>Loading…</p> : (data ?? []).length === 0 ? (
        <p className="text-muted-foreground">No events.</p>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {(data ?? []).map((e: any) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {e.partner?.display_name ?? "—"}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {e.partner?.referral_code}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.event_type.replace(/_/g, " ")} · {new Date(e.event_at).toLocaleString()}
                    {e.source_ref ? ` · ref ${e.source_ref}` : ""}
                  </p>
                  {e.clawed_back_reason && (
                    <p className="mt-1 text-xs text-destructive">Reason: {e.clawed_back_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold">{formatPHP(Number(e.commission_php))}</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {String(e.status).replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {e.status === "pending" && (
                    <Button size="sm" onClick={() => approve(e.id)}>Approve</Button>
                  )}
                  {(e.status === "pending" || e.status === "approved") && (
                    <Button size="sm" variant="outline" onClick={() => setClawback({ id: e.id, reason: "" })}>
                      Claw back
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={!!clawback} onOpenChange={(v) => !v && setClawback(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Claw back commission</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Reverses this commission. If it was already attached to a payout batch, the batch total is recomputed.
          </p>
          <Textarea
            placeholder="Reason (refund, chargeback, fraud, etc.)"
            value={clawback?.reason ?? ""}
            onChange={(e) => setClawback((c) => c && { ...c, reason: e.target.value })}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setClawback(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitClawback}>Claw back</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Candidates tab (create payouts) ---------- */

function CandidatesTab() {
  const listFn = useServerFn(adminListPayoutCandidates);
  const createFn = useServerFn(adminCreatePayoutForApproved);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin-pp-candidates"],
    queryFn: () => listFn({}),
  });
  const [busy, setBusy] = useState<string | null>(null);

  const createPayout = async (partnerId: string) => {
    setBusy(partnerId);
    try {
      const res = await createFn({ data: { partner_id: partnerId, method: "manual" } });
      toast.success(`Payout created: ${res.count} events, ${formatPHP(res.total)}`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4">
      {isLoading ? <p>Loading…</p> : (data ?? []).length === 0 ? (
        <p className="text-muted-foreground">
          No approved un-batched commissions. Approve pending events first.
        </p>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {(data ?? []).map((c: any) => (
              <div key={c.partner_id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-medium">{c.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.referral_code} · {c.count} event(s)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold">{formatPHP(c.total)}</p>
                  <Button size="sm" disabled={busy === c.partner_id} onClick={() => createPayout(c.partner_id)}>
                    {busy === c.partner_id ? "Creating…" : "Create payout"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Payouts tab ---------- */

function PayoutsTab() {
  const listFn = useServerFn(adminListPayouts);
  const updateFn = useServerFn(adminUpdatePayoutStatus);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin-pp-payouts"],
    queryFn: () => listFn({}),
  });
  const [editing, setEditing] = useState<any | null>(null);

  const setStatus = async (id: string, status: any) => {
    try {
      await updateFn({ data: { id, status } });
      toast.success("Updated");
      refetch();
    } catch (e: any) { toast.error(e?.message); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await updateFn({
        data: {
          id: editing.id,
          status: editing.status,
          reference: editing.reference || null,
          notes: editing.notes || null,
        },
      });
      toast.success("Saved");
      setEditing(null);
      refetch();
    } catch (e: any) { toast.error(e?.message); }
  };

  return (
    <div className="mt-4">
      {isLoading ? <p>Loading…</p> : (data ?? []).length === 0 ? (
        <p className="text-muted-foreground">No payouts yet.</p>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {(data ?? []).map((p: any) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{p.partner?.display_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.method}{p.reference ? ` · ${p.reference}` : ""} · {new Date(p.created_at).toLocaleDateString()}
                    {p.paid_at ? ` · paid ${new Date(p.paid_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold">{formatPHP(Number(p.amount_php))}</p>
                  <Badge variant="outline" className="capitalize">{p.status}</Badge>
                  {p.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "processing")}>
                        Mark processing
                      </Button>
                      <Button size="sm" onClick={() => setStatus(p.id, "paid")}>
                        Mark paid
                      </Button>
                    </>
                  )}
                  {p.status === "processing" && (
                    <Button size="sm" onClick={() => setStatus(p.id, "paid")}>Mark paid</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ ...p })}>Edit</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit payout</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Status</label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pending", "processing", "paid", "failed", "cancelled"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Reference (transaction id, receipt #)</label>
                <Input
                  value={editing.reference ?? ""}
                  onChange={(e) => setEditing({ ...editing, reference: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Notes</label>
                <Textarea
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
              <p className="rounded-md border border-amber-500/40 bg-amber-50/40 p-2 text-xs text-muted-foreground dark:bg-amber-950/20">
                Marking a payout <strong>cancelled</strong> or <strong>failed</strong> releases its events back to <em>approved</em> so they can be batched again.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
