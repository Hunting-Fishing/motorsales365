import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Inbox, Send, ShieldCheck, Clock, Check, X, RotateCcw, History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listStaffContactRequests,
  decideStaffContactRequest,
  revokeStaffContactRequest,
  getStaffContactRequestAudit,
  type StaffContactRequestRow,
  type StaffContactAuditRow,
} from "@/lib/staff-contact-requests.functions";

export const Route = createFileRoute("/_authenticated/dashboard/staff-requests")({
  component: StaffRequestsPage,
  head: () => ({
    meta: [
      { title: "Client Contact Requests — 365 Staff" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function statusBadge(s: StaffContactRequestRow["status"]) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    denied: { label: "Denied", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
    revoked: { label: "Revoked", cls: "bg-muted text-muted-foreground" },
    expired: { label: "Expired", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[s] ?? map.pending;
  return <Badge className={v.cls} variant="secondary">{v.label}</Badge>;
}

function StaffRequestsPage() {
  const qc = useQueryClient();
  const fetchInbox = useServerFn(listStaffContactRequests);
  const decide = useServerFn(decideStaffContactRequest);
  const revoke = useServerFn(revokeStaffContactRequest);

  const inbox = useQuery({
    queryKey: ["scc-requests", "inbox"],
    queryFn: () => fetchInbox({ data: { box: "inbox" } }),
  });
  const outbox = useQuery({
    queryKey: ["scc-requests", "outbox"],
    queryFn: () => fetchInbox({ data: { box: "outbox" } }),
  });

  const [auditFor, setAuditFor] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  async function onDecide(id: string, decision: "approved" | "denied") {
    setActingId(id);
    try {
      await decide({ data: { request_id: id, decision, note: decisionNote || undefined } });
      toast.success(decision === "approved" ? "Approved" : "Denied");
      setDecisionNote("");
      qc.invalidateQueries({ queryKey: ["scc-requests"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setActingId(null);
    }
  }

  async function onRevoke(id: string) {
    if (!confirm("Revoke this approval? The requester will lose access.")) return;
    setActingId(id);
    try {
      await revoke({ data: { request_id: id } });
      toast.success("Revoked");
      qc.invalidateQueries({ queryKey: ["scc-requests"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Client Contact Requests</h1>
          <p className="text-sm text-muted-foreground">
            Peer-approval workflow for reaching another staff member's clients or leads.
          </p>
        </div>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox" className="gap-2">
            <Inbox className="h-4 w-4" /> Inbox
            {inbox.data?.rows?.filter((r) => r.status === "pending").length ? (
              <Badge variant="secondary" className="ml-1">
                {inbox.data.rows.filter((r) => r.status === "pending").length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="outbox" className="gap-2">
            <Send className="h-4 w-4" /> Sent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-3 mt-4">
          {inbox.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {inbox.data?.rows?.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">No requests yet.</Card>
          )}
          {inbox.data?.rows?.map((r) => (
            <RequestCard
              key={r.id}
              row={r}
              role="owner"
              acting={actingId === r.id}
              decisionNote={decisionNote}
              setDecisionNote={setDecisionNote}
              onApprove={() => onDecide(r.id, "approved")}
              onDeny={() => onDecide(r.id, "denied")}
              onRevoke={() => onRevoke(r.id)}
              onHistory={() => setAuditFor(r.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="outbox" className="space-y-3 mt-4">
          {outbox.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {outbox.data?.rows?.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">
              You haven't requested contact access yet.
            </Card>
          )}
          {outbox.data?.rows?.map((r) => (
            <RequestCard
              key={r.id}
              row={r}
              role="requester"
              acting={actingId === r.id}
              decisionNote=""
              setDecisionNote={() => {}}
              onApprove={() => {}}
              onDeny={() => {}}
              onRevoke={() => onRevoke(r.id)}
              onHistory={() => setAuditFor(r.id)}
            />
          ))}
        </TabsContent>
      </Tabs>

      <AuditDialog requestId={auditFor} onClose={() => setAuditFor(null)} />
    </div>
  );
}

function RequestCard({
  row,
  role,
  acting,
  decisionNote,
  setDecisionNote,
  onApprove,
  onDeny,
  onRevoke,
  onHistory,
}: {
  row: StaffContactRequestRow;
  role: "owner" | "requester";
  acting: boolean;
  decisionNote: string;
  setDecisionNote: (v: string) => void;
  onApprove: () => void;
  onDeny: () => void;
  onRevoke: () => void;
  onHistory: () => void;
}) {
  const counterparty =
    role === "owner"
      ? row.requester_name || row.requester_email || row.requester_id
      : row.owner_name || row.owner_email || row.owner_id;
  const expiresSoon =
    row.status === "approved" && row.expires_at && new Date(row.expires_at) > new Date();

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {statusBadge(row.status)}
            <span className="text-sm font-medium">
              {role === "owner" ? "From" : "To"} {counterparty}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleString()}
            {row.client_name ? ` · Client: ${row.client_name}` : null}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onHistory} className="gap-1">
          <History className="h-4 w-4" /> History
        </Button>
      </div>

      <p className="text-sm whitespace-pre-wrap">{row.reason}</p>

      {expiresSoon && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Access expires {new Date(row.expires_at!).toLocaleString()}
        </p>
      )}

      {row.decision_note && (
        <p className="text-xs text-muted-foreground italic">Note: {row.decision_note}</p>
      )}

      {role === "owner" && row.status === "pending" && (
        <div className="space-y-2 pt-2 border-t">
          <Textarea
            placeholder="Optional note for the requester…"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onApprove} disabled={acting} className="gap-1">
              <Check className="h-4 w-4" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={onDeny} disabled={acting} className="gap-1">
              <X className="h-4 w-4" /> Deny
            </Button>
          </div>
        </div>
      )}

      {role === "owner" && row.status === "approved" && (
        <Button size="sm" variant="outline" onClick={onRevoke} disabled={acting} className="gap-1">
          <RotateCcw className="h-4 w-4" /> Revoke access
        </Button>
      )}

      {role === "requester" && row.status === "pending" && (
        <Button size="sm" variant="outline" onClick={onRevoke} disabled={acting}>
          Cancel request
        </Button>
      )}
    </Card>
  );
}

function AuditDialog({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const fetchAudit = useServerFn(getStaffContactRequestAudit);
  const { data } = useQuery({
    queryKey: ["scc-audit", requestId],
    queryFn: () => fetchAudit({ data: { request_id: requestId! } }),
    enabled: !!requestId,
  });

  return (
    <Dialog open={!!requestId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request history</DialogTitle>
          <DialogDescription>
            Append-only audit log for this contact request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {(data?.rows ?? []).map((a: StaffContactAuditRow) => (
            <div key={a.id} className="text-sm border-l-2 border-muted pl-3 py-1">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">{a.action}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
              {a.note && <p className="text-xs text-muted-foreground mt-1">{a.note}</p>}
            </div>
          ))}
          {data?.rows?.length === 0 && (
            <p className="text-sm text-muted-foreground">No events.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
