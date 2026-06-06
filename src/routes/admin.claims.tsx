import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  listPendingClaims,
  reviewBusinessClaim,
} from "@/lib/business-claims.functions";

export const Route = createFileRoute("/admin/claims")({
  component: ClaimsPage,
  head: () => ({
    meta: [
      { title: "Business Claims — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function ClaimsPage() {
  const list = useServerFn(listPendingClaims);
  const review = useServerFn(reviewBusinessClaim);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-claims"],
    queryFn: () => list(),
  });
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function act(id: string, decision: "approve" | "reject") {
    try {
      await review({ data: { id, decision, notes: notes[id] || undefined } });
      toast.success(`Claim ${decision}d`);
      qc.invalidateQueries({ queryKey: ["admin-claims"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Business Claim Requests</h1>
        <p className="text-sm text-muted-foreground">
          Approve transfers ownership to the claimant. Reject sends the listing back to unclaimed.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !data?.claims?.length ? (
        <Card className="p-6 text-sm text-muted-foreground">No pending claims.</Card>
      ) : (
        <div className="space-y-3">
          {data.claims.map((c: any) => (
            <Card key={c.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    to="/businesses/$slug"
                    params={{ slug: c.businesses?.slug ?? "" }}
                    className="font-semibold underline"
                  >
                    {c.businesses?.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {[c.businesses?.city, c.businesses?.region].filter(Boolean).join(", ")}
                  </div>
                </div>
                <Badge variant="outline">{c.contact_method}</Badge>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Claim contact value
                  </div>
                  <div>{c.contact_value || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    On-file (Google import)
                  </div>
                  <div>
                    {c.businesses?.email ?? "—"} / {c.businesses?.phone ?? "—"}
                  </div>
                </div>
                {c.evidence_url && (
                  <div className="sm:col-span-2">
                    <div className="text-xs font-medium text-muted-foreground">Evidence</div>
                    <a
                      href={c.evidence_url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-primary underline"
                    >
                      {c.evidence_url}
                    </a>
                  </div>
                )}
                {c.notes && (
                  <div className="sm:col-span-2">
                    <div className="text-xs font-medium text-muted-foreground">Claimant notes</div>
                    <div>{c.notes}</div>
                  </div>
                )}
              </div>
              <Textarea
                placeholder="Internal review notes (optional)"
                value={notes[c.id] ?? ""}
                onChange={(e) => setNotes((s) => ({ ...s, [c.id]: e.target.value }))}
                rows={2}
              />
              <div className="flex gap-2">
                <Button onClick={() => act(c.id, "approve")}>Approve & transfer</Button>
                <Button variant="outline" onClick={() => act(c.id, "reject")}>
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
