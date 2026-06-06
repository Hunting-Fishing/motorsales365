import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Upload,
  Trash2,
  ShieldCheck,
  MessageSquare,
  FileText,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getClaimAuditLog, type AuditEntry } from "@/lib/business-claims.functions";
import {
  EVIDENCE_TYPE_LABELS,
  formatBytes,
} from "./evidence-uploader";

const ACTION_META: Record<
  AuditEntry["action"],
  { icon: typeof Clock; label: string; color: string; bg: string }
> = {
  submitted: { icon: FileText, label: "Submitted", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  resubmitted: { icon: RotateCcw, label: "Resubmitted", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  approved: { icon: CheckCircle2, label: "Approved", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  auto_approved: { icon: ShieldCheck, label: "Auto-approved", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  rejected: { icon: XCircle, label: "Rejected", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  evidence_added: { icon: Upload, label: "Evidence added", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  evidence_removed: { icon: Trash2, label: "Evidence removed", color: "text-muted-foreground", bg: "bg-muted/40 border-border" },
  reviewer_note: { icon: MessageSquare, label: "Reviewer note", color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
};

function actorLabel(
  id: string | null,
  actorById: Record<string, { id: string; name: string | null; email: string | null }>,
): string {
  if (!id) return "System";
  const a = actorById[id];
  if (!a) return id.slice(0, 8) + "…";
  return a.name || a.email || id.slice(0, 8) + "…";
}

function EvidenceDetails({ d }: { d: Record<string, any> }) {
  const type = d.evidence_type as string | undefined;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
      {type && (
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
          {EVIDENCE_TYPE_LABELS[type] ?? type}
        </Badge>
      )}
      {d.file_name && <span className="font-medium text-foreground">{d.file_name}</span>}
      {typeof d.file_size === "number" && <span>{formatBytes(d.file_size)}</span>}
      {d.mime_type && <span className="font-mono opacity-70">{d.mime_type}</span>}
    </div>
  );
}

export function ClaimAuditPanel({ claimId }: { claimId: string }) {
  const fetchLog = useServerFn(getClaimAuditLog);
  const { data, isLoading } = useQuery({
    queryKey: ["claim-audit", claimId],
    queryFn: () => fetchLog({ data: { claimId } }),
  });

  const entries = data?.entries ?? [];
  const actorById = data?.actorById ?? {};

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        Audit log
        <span className="ml-auto text-[10px] font-normal normal-case">
          {entries.length} event{entries.length === 1 ? "" : "s"}
        </span>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-xs text-muted-foreground">No activity yet.</div>
      ) : (
        <ol className="space-y-2">
          {entries.map((e) => {
            const meta = ACTION_META[e.action];
            const Icon = meta.icon;
            const ts = new Date(e.created_at).toLocaleString();
            return (
              <li
                key={e.id}
                className={`flex gap-2 rounded-md border p-2 text-xs ${meta.bg}`}
              >
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${meta.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
                    <span className="text-muted-foreground">by</span>
                    <span className="font-medium text-foreground">
                      {actorLabel(e.actor_user_id, actorById)}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{ts}</span>
                  </div>

                  {(e.action === "evidence_added" || e.action === "evidence_removed") && (
                    <EvidenceDetails d={e.details ?? {}} />
                  )}

                  {(e.action === "approved" ||
                    e.action === "rejected" ||
                    e.action === "auto_approved" ||
                    e.action === "resubmitted") &&
                    e.details?.from &&
                    e.details?.to && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {String(e.details.from)} → {String(e.details.to)}
                      </div>
                    )}

                  {e.notes && (
                    <div className="mt-1 rounded border border-border/60 bg-background/70 p-1.5 text-[11px] text-foreground">
                      {e.notes}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
