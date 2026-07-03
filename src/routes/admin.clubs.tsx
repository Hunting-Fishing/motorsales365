import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, ShieldCheck, XCircle } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { listPendingClubs, reviewClubApplication } from "@/lib/clubs.functions";

export const Route = createFileRoute("/admin/clubs")({
  head: () => ({ meta: [{ title: "Admin — Club applications" }] }),
  component: AdminClubsPage,
});

function AdminClubsPage() {
  const listFn = useServerFn(listPendingClubs);
  const reviewFn = useServerFn(reviewClubApplication);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await listFn();
      setRows(r);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function review(club_id: string, decision: "approve" | "reject") {
    setBusy(club_id);
    try {
      await reviewFn({
        data: { club_id, decision, notes: notes[club_id] ?? null },
      });
      toast.success(decision === "approve" ? "Approved" : "Rejected");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold">Club applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review accreditation documents before approving.
        </p>

        {loading ? (
          <div className="mt-8 p-12 text-center text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            No pending applications.
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {rows.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-lg bg-muted">
                      {c.logo_url && (
                        <img src={c.logo_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">{c.type}</Badge>
                        <Badge
                          variant={c.status === "rejected" ? "destructive" : "outline"}
                          className={c.status === "pending" ? "border-amber-500 text-amber-700" : ""}
                        >
                          {c.status}
                        </Badge>
                        {(c.city || c.region) && (
                          <span>
                            {[c.city, c.region].filter(Boolean).join(", ")}
                          </span>
                        )}
                        <span>{c.contact_email}</span>
                        {c.contact_phone && <span>{c.contact_phone}</span>}
                      </div>
                      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        {c.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Documents
                  </div>
                  {c.documents.length === 0 ? (
                    <div className="mt-2 text-sm text-destructive">
                      No documents attached (applicant abandoned).
                    </div>
                  ) : (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {c.documents.map((d: any) => (
                        <li key={d.id}>
                          <a
                            href={d.signed_url ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:border-primary"
                          >
                            <FileText className="h-3 w-3" />
                            <span className="font-medium">{d.kind}</span>
                            <span className="text-muted-foreground">
                              {d.original_filename ?? d.storage_path.split("/").pop()}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Textarea
                    rows={2}
                    placeholder="Reviewer notes (visible to applicant)"
                    value={notes[c.id] ?? c.review_notes ?? ""}
                    onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <Button
                      onClick={() => review(c.id, "approve")}
                      disabled={busy === c.id || c.documents.length === 0}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => review(c.id, "reject")}
                      disabled={busy === c.id}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
}
