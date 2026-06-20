import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Check, X, Loader2, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  listPendingCreatives,
  approveCreative,
  rejectCreative,
  listCreativeAuditAdmin,
} from "@/lib/advertise-slots.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { History as HistoryIcon } from "lucide-react";

export const Route = createFileRoute("/admin/advertisements/approvals")({
  component: AdminApprovalsPage,
  head: () => ({
    meta: [{ title: "Ad approvals — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});

function AdminApprovalsPage() {
  const { isAdmin, canManageAds } = useAuth();
  const hasAccess = isAdmin || canManageAds;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await listPendingCreatives();
      setItems(res.creatives);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) load();
  }, [hasAccess]);

  if (!hasAccess) {
    return <div className="p-6 text-sm text-muted-foreground">Ads manager role required.</div>;
  }

  const approve = async (id: string) => {
    setBusy(id);
    try {
      await approveCreative({ data: { id } });
      toast.success("Approved — now live");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Approve failed");
    } finally {
      setBusy(null);
    }
  };

  const submitReject = async () => {
    if (!rejecting) return;
    if (reason.trim().length < 3) {
      toast.error("Rejection reason required");
      return;
    }
    setBusy(rejecting.id);
    try {
      await rejectCreative({ data: { id: rejecting.id, reason: reason.trim() } });
      toast.success("Rejected");
      setRejecting(null);
      setReason("");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Reject failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Pending approvals
          {items.length > 0 && <Badge variant="destructive">{items.length}</Badge>}
        </h2>
        <p className="text-sm text-muted-foreground">
          Uploaded creatives stay inactive until approved. Reject with a reason if they violate spec or content rules.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          <Check className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
          Nothing waiting for review.
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((cr) => (
            <div key={cr.id} className="rounded-md border bg-card p-4 flex flex-col md:flex-row gap-4">
              <img
                src={cr.image_url}
                alt={cr.alt_text ?? ""}
                className="h-32 w-48 object-cover rounded border bg-muted"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{cr.headline || "(no headline)"}</span>
                  <Badge variant="outline">{cr.kind}</Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" /> pending
                  </Badge>
                  {!cr.spec_ok && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" /> spec issues
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {cr.image_width}×{cr.image_height}px ·{" "}
                  {(cr.file_size_bytes / 1024).toFixed(0)}KB · {cr.mime_type} ·{" "}
                  uploaded {new Date(cr.created_at).toLocaleString()}
                </p>
                {cr.alt_text && <p className="text-xs text-muted-foreground">alt: {cr.alt_text}</p>}
                {cr.target_url && (
                  <p className="text-xs">
                    Target:{" "}
                    <a href={cr.target_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {cr.target_url}
                    </a>
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  Slots:{" "}
                  {(cr.assignments ?? []).map((a: any, i: number) => (
                    <span key={a.id} className="font-mono">
                      {i > 0 && ", "}
                      {a.slot?.slot_key ?? "?"}
                    </span>
                  ))}
                </div>
                {!cr.spec_ok && (cr.spec_errors ?? []).length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-destructive">
                    {cr.spec_errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
              <div className="flex md:flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => approve(cr.id)}
                  disabled={busy === cr.id}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="h-3 w-3 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setRejecting(cr); setReason(""); }}
                  disabled={busy === cr.id}
                >
                  <X className="h-3 w-3 mr-1" /> Reject
                </Button>
                <CreativeAuditButton creativeId={cr.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!rejecting} onOpenChange={(v) => { if (!v) { setRejecting(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject creative</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The uploader sees this reason. Be specific (e.g. "Image is 720px wide, slot requires 1600px").
          </p>
          <Textarea
            rows={4}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejecting(null); setReason(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitReject} disabled={busy === rejecting?.id}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ACTION_TONE: Record<string, string> = {
  approved: "bg-emerald-500 text-white",
  rejected: "bg-destructive text-destructive-foreground",
  revoked: "bg-amber-500 text-white",
  resubmitted: "bg-blue-500 text-white",
};

function CreativeAuditButton({ creativeId }: { creativeId: string }) {
  const [open, setOpen] = useState(false);
  const fetcher = useServerFn(listCreativeAuditAdmin);
  const { data, isLoading } = useQuery({
    queryKey: ["creative-audit", creativeId],
    queryFn: () => fetcher({ data: { creativeId } }),
    enabled: open,
  });
  const rows = (data as any)?.rows ?? [];
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <HistoryIcon className="h-3 w-3 mr-1" /> History
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review history</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No review actions yet.</p>
          ) : (
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              {rows.map((r: any) => (
                <li key={r.id} className="rounded border p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={ACTION_TONE[r.action] ?? "bg-muted text-foreground"}>
                      {r.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    by {r.actor?.name || r.actor?.email || r.actor_id || "system"}
                    {r.previous_status ? ` · ${r.previous_status} → ${r.new_status}` : null}
                  </div>
                  {r.reason && <div className="text-sm"><strong>Reason:</strong> {r.reason}</div>}
                  {r.notes && <div className="text-sm"><strong>Notes:</strong> {r.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
