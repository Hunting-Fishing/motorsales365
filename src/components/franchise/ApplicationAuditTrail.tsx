import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listApplicationAudit } from "@/lib/franchise.functions";
import { Badge } from "@/components/ui/badge";

const ACTION_LABEL: Record<string, string> = {
  approve: "Approved",
  reject: "Rejected",
  request_info: "Requested info",
  in_review: "Marked in review",
  bulk_approve: "Bulk approved",
  tier_change: "Changed tier",
  note_update: "Updated notes",
};

const ACTION_STYLES: Record<string, string> = {
  approve: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
  bulk_approve: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
  reject: "border-red-300 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300",
  request_info: "border-purple-300 bg-purple-50 text-purple-800 dark:bg-purple-500/10 dark:text-purple-300",
  in_review: "border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300",
  tier_change: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  note_update: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
};

export function ApplicationAuditTrail({
  applicationId,
  showActor = true,
}: {
  applicationId: string;
  showActor?: boolean;
}) {
  const fn = useServerFn(listApplicationAudit);
  const { data, isLoading, error } = useQuery({
    queryKey: ["franchise", "audit", applicationId],
    queryFn: () => fn({ data: { applicationId } }),
    enabled: !!applicationId,
  });

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading history…</p>;
  }
  if (error) {
    return <p className="text-xs text-destructive">Could not load history.</p>;
  }
  const entries = data?.entries ?? [];
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">No admin actions yet.</p>;
  }

  return (
    <ol className="space-y-3 border-l border-border pl-4">
      {entries.map((e) => {
        const cls = ACTION_STYLES[e.action] ?? "";
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border border-border bg-background" />
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
              >
                {ACTION_LABEL[e.action] ?? e.action}
              </span>
              {e.from_status && e.to_status && e.from_status !== e.to_status ? (
                <Badge variant="outline" className="text-[10px]">
                  {e.from_status} → {e.to_status}
                </Badge>
              ) : null}
              {e.to_tier && e.from_tier !== e.to_tier ? (
                <Badge variant="outline" className="text-[10px]">
                  tier: {e.from_tier ?? "—"} → {e.to_tier}
                </Badge>
              ) : null}
              <span className="ml-auto text-[11px] text-muted-foreground">
                {new Date(e.created_at).toLocaleString()}
              </span>
            </div>
            {showActor && e.actor_name ? (
              <p className="mt-1 text-xs text-muted-foreground">by {e.actor_name}</p>
            ) : null}
            {e.reviewer_notes ? (
              <div className="mt-1 rounded-md border border-border/60 bg-secondary/30 p-2 text-xs">
                <span className="font-medium">Reviewer note: </span>
                <span className="whitespace-pre-wrap text-muted-foreground">{e.reviewer_notes}</span>
              </div>
            ) : null}
            {e.message_to_applicant ? (
              <div className="mt-1 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
                <span className="font-medium">Message to applicant: </span>
                <span className="whitespace-pre-wrap">{e.message_to_applicant}</span>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
