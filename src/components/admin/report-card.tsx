import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  XCircle,
  Megaphone,
  EyeOff,
  FileText,
  ExternalLink,
  User,
  Mail,
  Phone,
  Filter,
  History,
  Undo2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { ReportSignals } from "./report-signals";
import { PostingUserPanel } from "./posting-user-panel";
import { getReportEvidenceUrls } from "@/lib/admin-reports.functions";
import { ReportActionDialog, type ActionKind } from "./report-action-dialog";
import { ReportActionInfo } from "./report-action-info";
import { ReportHistory } from "./report-history";
import { DisputePanel } from "./dispute-panel";

type ReporterCounts = {
  total: number;
  open: number;
  resolved: number;
  accepted: number;
  dismissed: number;
};

export type ReportRow = {
  id: string;
  reason: string;
  category: string | null;
  details: string | null;
  status: string;
  created_at: string;
  reporter_id: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  reporter_member_number?: number | null;
  reporter_full_name?: string | null;
  reporter_business_name?: string | null;
  listing_id: string | null;
  target_type: string;
  target_url: string | null;
  evidence_urls: string[] | null;
  public_summary: string | null;
  made_public_at: string | null;
  resolution: string | null;
  listings?: {
    title: string | null;
    status: string | null;
    user_id: string | null;
    listing_media?: { url: string | null; sort_order: number | null }[] | null;
  } | null;
};


export function ReportCard({
  report,
  reporterCounts,
  currentUserId,
  onChanged,
  onFilterReporter,
  expanded: expandedProp,
  defaultExpanded = true,
  onToggleExpanded,
}: {
  report: ReportRow;
  reporterCounts?: ReporterCounts;
  currentUserId: string | null;
  onChanged: () => void;
  onFilterReporter: (reporterId: string) => void;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onToggleExpanded?: (next: boolean) => void;
}) {
  const [draft, setDraft] = useState(report.public_summary ?? "");
  const evidenceFn = useServerFn(getReportEvidenceUrls);
  const [evidence, setEvidence] = useState<{ path: string; url: string | null }[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expanded = expandedProp ?? internalExpanded;
  const toggleExpanded = () => {
    const next = !expanded;
    if (onToggleExpanded) onToggleExpanded(next);
    else setInternalExpanded(next);
  };
  const articleRef = useRef<HTMLElement>(null);
  const [dialog, setDialog] = useState<{
    action: ActionKind;
    reversesActionId?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const paths = report.evidence_urls ?? [];
    if (paths.length === 0) return;
    let cancelled = false;
    evidenceFn({ data: { paths } })
      .then((r) => {
        if (!cancelled) setEvidence(r.urls);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [report.id, expanded]);


  const refresh = () => {
    setHistoryKey((k) => k + 1);
    onChanged();
  };

  const publishSummary = async () => {
    const text = draft.trim();
    if (!text) {
      toast.error("Enter a public summary first.");
      return;
    }
    const { error } = await supabase
      .from("reports")
      .update({
        public_summary: text,
        made_public_at: new Date().toISOString(),
        made_public_by: currentUserId,
      })
      .eq("id", report.id);
    if (error) return toast.error(error.message);
    toast.success("Public summary published.");
    onChanged();
  };

  const unpublishSummary = async () => {
    const { error } = await supabase
      .from("reports")
      .update({ public_summary: null, made_public_at: null, made_public_by: null })
      .eq("id", report.id);
    if (error) return toast.error(error.message);
    toast.success("Public summary removed.");
    onChanged();
  };

  const displayName =
    report.reporter_full_name ||
    report.reporter_name ||
    (report.reporter_email ? report.reporter_email.split("@")[0] : null) ||
    (report.reporter_id ? "Registered user" : "Anonymous");
  const memberLabel =
    report.reporter_member_number != null
      ? `User #${report.reporter_member_number.toLocaleString()}`
      : null;
  const isAnonymous = !report.reporter_id;

  const statusTone =
    report.status === "resolved"
      ? report.resolution === "accepted"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-border bg-muted text-muted-foreground"
      : "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300";

  return (
    <article
      ref={articleRef}
      id={`report-${report.id}`}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >

      {/* ── Header bar ───────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge className={`border uppercase tracking-wide ${statusTone}`}>
            {report.status}
            {report.resolution ? ` · ${report.resolution}` : ""}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {report.target_type}
          </Badge>
          {report.category && (
            <Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300">
              {report.category}
            </Badge>
          )}
          {report.listings?.status && (
            <Badge variant="outline">listing: {report.listings.status}</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            Reported {formatDate(report.created_at)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            #{report.id.slice(0, 8)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            aria-controls={`report-${report.id}-body`}
          >
            {expanded ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" /> View details
              </>
            )}
          </Button>
          {expanded && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => setHistoryOpen((v) => !v)}
            >
              <History className="mr-1 h-4 w-4" /> History
            </Button>
          )}

          {report.status !== "resolved" ? (
            <>
              <div className="flex items-center gap-0.5">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDialog({ action: "accept" })}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Accept
                </Button>
                <ReportActionInfo
                  title="Accept report"
                  effect="Marks the report as a confirmed violation. You can optionally hide or delete the listing in the next step."
                  scoreEffect="−25 pts to the poster (additional −10 hide / −30 delete)."
                  reversible={true}
                  disputable={true}
                />
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDialog({ action: "dismiss" })}
                >
                  <XCircle className="mr-1 h-4 w-4" /> Dismiss
                </Button>
                <ReportActionInfo
                  title="Dismiss report"
                  effect="Marks the report as not a violation. The listing is unchanged."
                  scoreEffect="No change to poster's trust score."
                  reversible={true}
                  disputable={false}
                />
              </div>
            </>
          ) : (
            <>
              {report.listings?.status === "hidden" && (
                <div className="flex items-center gap-0.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialog({ action: "restore_listing" })}
                  >
                    <RotateCcw className="mr-1 h-4 w-4" /> Restore listing
                  </Button>
                  <ReportActionInfo
                    title="Restore listing"
                    effect="Sets the listing back to active status."
                    scoreEffect="+10 pts to poster."
                    reversible={true}
                    disputable={false}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {!expanded && (() => {
        const media = report.listings?.listing_media ?? [];
        const sorted = [...media].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
        );
        const thumb = sorted.find((m) => m.url)?.url ?? null;
        return (
          <button
            type="button"
            onClick={toggleExpanded}
            className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/30"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
              {thumb ? (
                <img
                  src={thumb}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-muted-foreground">
                  <FileText className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {report.listing_id ? (
                  <span className="truncate text-sm font-semibold text-foreground">
                    {report.listings?.title ?? "Listing"}
                  </span>
                ) : report.target_url ? (
                  <span className="truncate text-sm font-semibold text-foreground">
                    {report.target_url}
                  </span>
                ) : (
                  <span className="truncate text-sm font-semibold italic text-muted-foreground">
                    No target link
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {report.reason}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span>By {displayName}</span>
                {memberLabel && <span className="font-mono">{memberLabel}</span>}
                {report.resolution && (
                  <span className="capitalize">→ {report.resolution}</span>
                )}
              </div>
            </div>
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        );
      })()}


      {expanded && historyOpen && (

        <div className="border-b border-border bg-background/40 p-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Action history
          </div>
          <ReportHistory
            reportId={report.id}
            refreshKey={historyKey}
            onReverse={(actionId) =>
              setDialog({ action: "reverse", reversesActionId: actionId })
            }
          />
        </div>
      )}

      {expanded && (
      <div id={`report-${report.id}-body`} className="space-y-5 p-5">

        {/* ── Target + Reason ─────────────────────────────────── */}
        <section>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Reported {report.target_type}
          </div>
          {report.listing_id ? (
            <Link
              to="/listing/$id"
              params={{ id: report.listing_id }}
              className="mt-1 inline-flex items-center gap-1.5 text-lg font-semibold text-foreground hover:text-primary"
            >
              {report.listings?.title ?? "Listing"}
              <ExternalLink className="h-4 w-4 opacity-60" />
            </Link>
          ) : report.target_url ? (
            <a
              href={report.target_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 break-all text-base font-semibold hover:text-primary"
            >
              {report.target_url}
              <ExternalLink className="h-4 w-4 opacity-60" />
            </a>
          ) : (
            <p className="mt-1 text-sm italic text-muted-foreground">No target link provided</p>
          )}

          <div className="mt-4 rounded-lg border-l-4 border-destructive/60 bg-destructive/5 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-destructive">
              Reason for report
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">{report.reason}</p>
            {report.details && (
              <p className="mt-2 whitespace-pre-wrap border-t border-destructive/15 pt-2 text-sm text-muted-foreground">
                {report.details}
              </p>
            )}
          </div>
        </section>

        {/* ── Posting user dossier ───────────────────────────── */}
        {report.listings?.user_id && <PostingUserPanel userId={report.listings.user_id} />}

        {/* ── Dispute (if filed by poster) ─────────────────────── */}
        <DisputePanel reportId={report.id} onResolved={refresh} />



        {/* ── Reporter + Evidence ─────────────────────────────── */}
        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                Reporter
              </div>
              {report.reporter_id && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => onFilterReporter(report.reporter_id!)}
                >
                  <Filter className="mr-1 h-3 w-3" /> Filter
                </Button>
              )}
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {displayName}
                  </span>
                  {memberLabel && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {memberLabel}
                    </Badge>
                  )}
                  {isAnonymous && (
                    <Badge variant="outline" className="text-[10px]">
                      anonymous
                    </Badge>
                  )}
                </div>
                {report.reporter_business_name && (
                  <div className="truncate text-xs font-medium text-muted-foreground">
                    {report.reporter_business_name}
                  </div>
                )}
                {report.reporter_email && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <a href={`mailto:${report.reporter_email}`} className="truncate hover:underline">
                      {report.reporter_email}
                    </a>
                  </div>
                )}
                {report.reporter_phone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {report.reporter_phone}
                  </div>
                )}
              </div>
            </div>
            {reporterCounts && (
              <div className="mt-3 flex flex-wrap gap-1 border-t border-border pt-3">
                <Badge variant="secondary" className="text-[10px]">
                  Total {reporterCounts.total}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Open {reporterCounts.open}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Resolved {reporterCounts.resolved}
                </Badge>
                <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-[10px] text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
                  Accepted {reporterCounts.accepted}
                </Badge>
                <Badge className="border border-border bg-muted-foreground/10 text-[10px]">
                  Dismissed {reporterCounts.dismissed}
                </Badge>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-4">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Evidence ({(report.evidence_urls ?? []).length})
            </div>
            {(report.evidence_urls ?? []).length === 0 ? (
              <p className="text-xs italic text-muted-foreground">None attached.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {evidence.map((e) =>
                  e.url ? (
                    /\.(png|jpe?g|webp|gif|heic)$/i.test(e.path) ? (
                      <a
                        key={e.path}
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-16 w-16 overflow-hidden rounded border border-border"
                      >
                        <img src={e.url} alt="" className="h-full w-full object-cover" />
                      </a>
                    ) : (
                      <a
                        key={e.path}
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs hover:bg-secondary"
                      >
                        <FileText className="h-3 w-3" />
                        {e.path.split("/").pop()}
                      </a>
                    )
                  ) : null,
                )}
              </div>
            )}
          </div>
        </section>

        {/* Signals */}
        <ReportSignals reportId={report.id} />

        {/* ── Public summary ──────────────────────────────────── */}
        <section className="rounded-lg border border-dashed border-border bg-background/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Megaphone className="h-3.5 w-3.5" />
              Public summary
              {report.public_summary && (
                <Badge variant="secondary" className="ml-1 normal-case tracking-normal">
                  Published{report.made_public_at ? ` · ${formatDate(report.made_public_at)}` : ""}
                </Badge>
              )}
            </div>
            {report.public_summary && (
              <Button size="sm" variant="ghost" onClick={unpublishSummary}>
                <EyeOff className="mr-1 h-3.5 w-3.5" /> Unpublish
              </Button>
            )}
          </div>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Short, neutral summary visible to all visitors. Don't include reporter names or unverified claims."
            className="mt-2 min-h-20 text-sm"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Reporter identity and raw details are never shown publicly — only this summary.
            </p>
            <Button size="sm" onClick={publishSummary}>
              {report.public_summary ? "Update summary" : "Publish public summary"}
            </Button>
          </div>
        </section>
      </div>
      )}



      {dialog && (
        <ReportActionDialog
          open={!!dialog}
          onOpenChange={(o) => !o && setDialog(null)}
          reportId={report.id}
          action={dialog.action}
          listingId={report.listing_id}
          listingTitle={report.listings?.title ?? null}
          reversesActionId={dialog.reversesActionId ?? null}
          onDone={refresh}
        />
      )}
    </article>
  );
}
