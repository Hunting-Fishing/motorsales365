import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listServiceSuggestions,
  approveServiceSuggestion,
  rejectServiceSuggestion,
} from "@/lib/admin-service-suggestions.functions";

export const Route = createFileRoute("/admin/service-suggestions")({
  component: ServiceSuggestionsAdmin,
});

type Suggestion = {
  id: string;
  business_type_slug: string;
  proposed_title: string;
  proposed_unit: string | null;
  proposed_description: string | null;
  sample_price_php: number | null;
  submitter_id: string | null;
  submitter_business_id: string | null;
  status: "pending" | "approved" | "rejected" | "merged";
  admin_note: string | null;
  created_at: string;
  business?: { id: string; name: string; slug: string } | null;
};

function ServiceSuggestionsAdmin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const listFn = useServerFn(listServiceSuggestions);
  const approveFn = useServerFn(approveServiceSuggestion);
  const rejectFn = useServerFn(rejectServiceSuggestion);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "merged" | "all">("pending");
  const [action, setAction] = useState<null | { kind: "approve" | "reject"; row: Suggestion }>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listFn({ data: filter === "all" ? {} : { status: filter } });
      setItems(rows as Suggestion[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [listFn, filter]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const openApprove = (row: Suggestion) => {
    setAction({ kind: "approve", row });
    setTitle(row.proposed_title);
    setDesc(row.proposed_description ?? "");
    setUnit(row.proposed_unit ?? "");
  };
  const openReject = (row: Suggestion) => {
    setAction({ kind: "reject", row });
    setNote("");
  };

  const submit = async () => {
    if (!action) return;
    setSubmitting(true);
    try {
      if (action.kind === "approve") {
        await approveFn({
          data: {
            id: action.row.id,
            title: title.trim(),
            description: desc.trim() || null,
            unit: unit.trim() || null,
            adminNote: note.trim() || null,
          },
        });
        toast.success("Approved and added to catalog");
      } else {
        await rejectFn({ data: { id: action.row.id, note: note.trim() || undefined } });
        toast.success("Rejected");
      }
      setAction(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!isAdmin)
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="font-display text-xl font-semibold">Service suggestions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only admins can review suggestions.</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Service catalog suggestions</h1>
        <p className="text-sm text-muted-foreground">
          Approve user-submitted services into the public catalog so they appear in the +Add menu for everyone.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "merged", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm capitalize transition-colors ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-secondary"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No {filter === "all" ? "" : filter} suggestions.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{s.proposed_title}</h3>
                    <Badge variant="outline" className="text-xs">{s.business_type_slug}</Badge>
                    {s.proposed_unit && <Badge variant="secondary" className="text-xs">/{s.proposed_unit}</Badge>}
                    {s.sample_price_php != null && (
                      <Badge variant="outline" className="text-xs">fee ₱{s.sample_price_php}</Badge>
                    )}
                    <Badge className="text-xs capitalize">{s.status}</Badge>
                  </div>
                  {s.proposed_description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{s.proposed_description}</p>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Provider:{" "}
                    {s.business ? (
                      <a
                        href={`/businesses/${s.business.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {s.business.name}
                      </a>
                    ) : (
                      <span>— (no business linked)</span>
                    )}
                    {" · "}Submitted {new Date(s.created_at).toLocaleString()}
                  </div>
                  {s.admin_note && (
                    <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
                      <span className="font-medium">Admin note:</span> {s.admin_note}
                    </div>
                  )}
                </div>
                {s.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openApprove(s)}>
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openReject(s)}>
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!action} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          {action && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {action.kind === "approve" ? "Approve service" : "Reject service"}
                </DialogTitle>
              </DialogHeader>
              {action.kind === "approve" ? (
                <div className="space-y-3">
                  <div>
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Unit</Label>
                      <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Reason (optional)</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
                </div>
              )}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAction(null)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Confirm
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
