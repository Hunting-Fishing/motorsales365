import { formatDate } from "@/lib/format";
import { CheckCircle2, XCircle, RefreshCw, Pencil, FileText, UserCog, StickyNote, Circle } from "lucide-react";

export type AuditEntry = {
  id: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  created: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  resubmitted: "Resubmitted for review",
  status_changed: "Status changed",
  edited: "Edited",
  assigned: "Assignment changed",
  notes_updated: "Internal note updated",
};

const ACTION_ICON: Record<string, any> = {
  created: FileText,
  approved: CheckCircle2,
  rejected: XCircle,
  resubmitted: RefreshCw,
  edited: Pencil,
  assigned: UserCog,
  notes_updated: StickyNote,
};

const ACTION_TONE: Record<string, string> = {
  created: "text-primary",
  approved: "text-emerald-600",
  rejected: "text-destructive",
  resubmitted: "text-blue-600",
  edited: "text-amber-600",
};

const FIELD_LABEL: Record<string, string> = {
  contact_name: "Contact name",
  company: "Company",
  phone: "Phone",
  placement: "Placement",
  budget_range: "Budget",
  start_date: "Start date",
  message: "Message",
};

const fmtVal = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
};

export function InquiryTimeline({
  entries,
  showInternal = false,
}: {
  entries: AuditEntry[];
  showInternal?: boolean;
}) {
  const filtered = showInternal
    ? entries
    : entries.filter((e) => e.action !== "notes_updated" && e.action !== "assigned");

  if (filtered.length === 0) {
    return <p className="text-xs text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className="relative border-l border-border pl-5 space-y-4">
      {filtered.map((e) => {
        const Icon = ACTION_ICON[e.action] ?? Circle;
        const tone = ACTION_TONE[e.action] ?? "text-muted-foreground";
        const label = ACTION_LABEL[e.action] ?? e.action.replace(/_/g, " ");
        const reason = e.metadata?.reason as string | undefined;
        const fields = e.metadata?.fields as string[] | undefined;
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[27px] top-0.5 grid h-5 w-5 place-items-center rounded-full bg-background border border-border">
              <Icon className={`h-3 w-3 ${tone}`} />
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className={`text-sm font-semibold ${tone}`}>{label}</span>
              <span className="text-[11px] text-muted-foreground">
                {formatDate(e.created_at)}
              </span>
            </div>
            {e.action === "status_changed" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {e.from_value} → <span className="text-foreground">{e.to_value}</span>
              </p>
            )}
            {reason && (
              <p className="mt-1 rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1 text-xs text-foreground">
                <span className="font-semibold">Reason: </span>
                {reason}
              </p>
            )}
            {fields && fields.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Updated: {fields.map((f) => f.replace(/_/g, " ")).join(", ")}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
