import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Check, GitMerge, X, Sparkles, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/type-suggestions")({
  component: TypeSuggestionsAdmin,
});

type Status = "pending" | "approved" | "merged" | "rejected";

type Suggestion = {
  id: string;
  proposed_label: string;
  notes: string | null;
  submitter_id: string | null;
  submitter_email: string | null;
  status: Status;
  admin_note: string | null;
  merged_into_slug: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
};

type BusinessType = { slug: string; label: string };
type DeciderProfile = { id: string; full_name: string | null };

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function TypeSuggestionsAdmin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [types, setTypes] = useState<BusinessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Action dialog state
  const [action, setAction] = useState<null | {
    kind: "approve" | "merge" | "reject";
    suggestion: Suggestion;
  }>(null);
  const [adminNote, setAdminNote] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [mergeSlug, setMergeSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, t] = await Promise.all([
      supabase
        .from("business_type_suggestions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("business_types").select("slug,label").order("label"),
    ]);
    if (s.error) toast.error(s.error.message);
    if (t.error) toast.error(t.error.message);
    setItems((s.data ?? []) as Suggestion[]);
    setTypes((t.data ?? []) as BusinessType[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const base = filter === "all" ? items : items.filter((i) => i.status === filter);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (i) =>
        i.proposed_label.toLowerCase().includes(q) ||
        (i.submitter_email ?? "").toLowerCase().includes(q) ||
        (i.notes ?? "").toLowerCase().includes(q) ||
        (i.merged_into_slug ?? "").toLowerCase().includes(q),
    );
  }, [items, filter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage],
  );

  useEffect(() => { setPage(1); }, [filter, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, pending: 0, approved: 0, merged: 0, rejected: 0 };
    for (const i of items) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [items]);

  const openAction = (kind: "approve" | "merge" | "reject", s: Suggestion) => {
    setAction({ kind, suggestion: s });
    setAdminNote(s.admin_note ?? "");
    setNewLabel(s.proposed_label);
    setNewSlug(slugify(s.proposed_label));
    setMergeSlug("");
  };

  const closeAction = () => {
    setAction(null);
    setAdminNote("");
    setNewSlug("");
    setNewLabel("");
    setMergeSlug("");
    setSubmitting(false);
  };

  const submit = async () => {
    if (!action || !user) return;
    const { kind, suggestion } = action;
    setSubmitting(true);
    try {
      if (kind === "approve") {
        const slug = slugify(newSlug);
        const label = newLabel.trim();
        if (!slug || !label) { toast.error("Slug and label are required"); setSubmitting(false); return; }
        const { error: insErr } = await supabase
          .from("business_types")
          .upsert({ slug, label }, { onConflict: "slug" });
        if (insErr) throw insErr;
        const { error: updErr } = await supabase
          .from("business_type_suggestions")
          .update({
            status: "approved",
            admin_note: adminNote || null,
            merged_into_slug: slug,
            decided_by: user.id,
            decided_at: new Date().toISOString(),
          })
          .eq("id", suggestion.id);
        if (updErr) throw updErr;
        toast.success(`Added business type "${label}"`);
      } else if (kind === "merge") {
        if (!mergeSlug) { toast.error("Pick a type to merge into"); setSubmitting(false); return; }
        const { error } = await supabase
          .from("business_type_suggestions")
          .update({
            status: "merged",
            admin_note: adminNote || null,
            merged_into_slug: mergeSlug,
            decided_by: user.id,
            decided_at: new Date().toISOString(),
          })
          .eq("id", suggestion.id);
        if (error) throw error;
        toast.success("Suggestion merged");
      } else {
        const { error } = await supabase
          .from("business_type_suggestions")
          .update({
            status: "rejected",
            admin_note: adminNote || null,
            merged_into_slug: null,
            decided_by: user.id,
            decided_at: new Date().toISOString(),
          })
          .eq("id", suggestion.id);
        if (error) throw error;
        toast.success("Suggestion rejected");
      }
      closeAction();
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
      setSubmitting(false);
    }
  };

  if (authLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="font-display text-xl font-semibold">Business type suggestions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only admins can review suggestions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Business type suggestions</h1>
          <p className="text-sm text-muted-foreground">
            Approve as a new type, merge into an existing one, or reject.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["pending", "approved", "merged", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-sm capitalize transition-colors ${
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-secondary"
              }`}
            >
              {f} <span className="opacity-70">({counts[f] ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by proposed label, submitter email, notes, or merged slug…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading suggestions…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          {query ? `No suggestions match "${query}".` : `No ${filter === "all" ? "" : filter} suggestions.`}
        </div>
      ) : (
        <>
        <div className="text-xs text-muted-foreground">
          Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
        </div>
        <ul className="space-y-3">
          {paged.map((s) => (
            <li key={s.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{s.proposed_label}</h3>
                    <StatusBadge status={s.status} />
                    {s.merged_into_slug && (
                      <Badge variant="outline" className="text-xs">→ {s.merged_into_slug}</Badge>
                    )}
                  </div>
                  {s.notes && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{s.notes}</p>}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Submitted by {s.submitter_email ?? "unknown"} ·{" "}
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                  {s.admin_note && (
                    <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
                      <span className="font-medium">Admin note:</span> {s.admin_note}
                    </div>
                  )}
                </div>
                {s.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => openAction("approve", s)}>
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openAction("merge", s)}>
                      <GitMerge className="mr-1 h-4 w-4" /> Merge
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openAction("reject", s)}>
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        </>
      )}

      <Dialog open={!!action} onOpenChange={(o) => { if (!o) closeAction(); }}>
        <DialogContent>
          {action && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {action.kind === "approve" && "Approve as new business type"}
                  {action.kind === "merge" && "Merge into existing type"}
                  {action.kind === "reject" && "Reject suggestion"}
                </DialogTitle>
                <DialogDescription>"{action.suggestion.proposed_label}"</DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {action.kind === "approve" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="lbl">Label</Label>
                      <Input id="lbl" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="slg">Slug</Label>
                      <Input
                        id="slg"
                        value={newSlug}
                        onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                      />
                      <p className="text-xs text-muted-foreground">Lowercase, underscores only. Used in URLs.</p>
                    </div>
                  </>
                )}

                {action.kind === "merge" && (
                  <div className="space-y-1.5">
                    <Label>Merge into</Label>
                    <Select value={mergeSlug} onValueChange={setMergeSlug}>
                      <SelectTrigger><SelectValue placeholder="Pick an existing type" /></SelectTrigger>
                      <SelectContent>
                        {types.map((t) => (
                          <SelectItem key={t.slug} value={t.slug}>{t.label} ({t.slug})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="note">Admin note {action.kind === "reject" ? "" : "(optional)"}</Label>
                  <Textarea
                    id="note"
                    rows={3}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Reason or context shown to the submitter"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={closeAction} disabled={submitting}>Cancel</Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    merged: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    rejected: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${map[status]}`}>
      {status}
    </span>
  );
}
