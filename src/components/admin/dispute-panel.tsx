import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Scale, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { getDisputeForReport, resolveDispute } from "@/lib/disputes.functions";

export function DisputePanel({
  reportId,
  onResolved,
}: {
  reportId: string;
  onResolved: () => void;
}) {
  const fetchFn = useServerFn(getDisputeForReport);
  const resolveFn = useServerFn(resolveDispute);
  const [decision, setDecision] = useState<"uphold" | "overturn" | null>(null);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dispute-for-report", reportId],
    queryFn: () => fetchFn({ data: { reportId } }),
    staleTime: 30_000,
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  const dispute = data?.dispute;
  if (!dispute) return null;

  const submit = async () => {
    if (!decision) return;
    if (response.trim().length < 10) {
      toast.error("Response must be at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await resolveFn({ data: { disputeId: dispute.id, decision, response: response.trim() } });
      toast.success(decision === "overturn" ? "Dispute overturned — action reversed and score refunded." : "Dispute upheld.");
      setDecision(null);
      setResponse("");
      await refetch();
      onResolved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to resolve");
    } finally {
      setSubmitting(false);
    }
  };

  const statusTone =
    dispute.status === "open"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : dispute.status === "overturned"
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : "border-border bg-muted text-muted-foreground";

  return (
    <section className="rounded-lg border-2 border-amber-500/30 bg-amber-500/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Poster dispute
          </span>
          <Badge className={`border uppercase ${statusTone}`}>{dispute.status}</Badge>
          <span className="text-xs text-muted-foreground">filed {formatDate(dispute.created_at)}</span>
        </div>
        {dispute.score_refund > 0 && (
          <Badge variant="outline" className="text-[10px]">
            Refund +{dispute.score_refund} pts
          </Badge>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap rounded border border-border bg-background/60 p-3 text-sm">
        {dispute.message}
      </p>

      {(dispute.evidence_urls?.length ?? 0) > 0 && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          {dispute.evidence_urls.length} evidence file(s) attached — view in storage.
        </div>
      )}

      {dispute.status === "open" ? (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={decision === "overturn" ? "default" : "outline"}
              onClick={() => setDecision("overturn")}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" /> Overturn (reverse action, refund score)
            </Button>
            <Button
              size="sm"
              variant={decision === "uphold" ? "destructive" : "outline"}
              onClick={() => setDecision("uphold")}
            >
              <XCircle className="mr-1 h-4 w-4" /> Uphold original decision
            </Button>
          </div>
          {decision && (
            <>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Response to the poster (≥10 chars). This is sent to them via email."
                className="min-h-20 text-sm"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  {decision === "overturn"
                    ? "Listing will be restored and trust score refunded."
                    : "Original moderation stands; this closes the dispute."}
                </p>
                <Button size="sm" onClick={submit} disabled={submitting}>
                  {submitting ? "Submitting…" : `Confirm ${decision}`}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded border border-border bg-background/40 p-3 text-xs">
          <div className="font-semibold text-foreground">Admin response</div>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
            {dispute.admin_response ?? "—"}
          </p>
          {dispute.resolved_at && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Resolved {formatDate(dispute.resolved_at)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
