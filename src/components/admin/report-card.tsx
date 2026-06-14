import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Trash2,
  ShieldOff,
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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { confirm } from "@/components/ui/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { ReportSignals } from "./report-signals";
import { getReportEvidenceUrls, setReportResolution } from "@/lib/admin-reports.functions";

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
  listing_id: string | null;
  target_type: string;
  target_url: string | null;
  evidence_urls: string[] | null;
  public_summary: string | null;
  made_public_at: string | null;
  resolution: string | null;
  listings?: { title: string | null; status: string | null; user_id: string | null } | null;
};

export function ReportCard({
  report,
  reporterCounts,
  currentUserId,
  onChanged,
  onFilterReporter,
}: {
  report: ReportRow;
  reporterCounts?: ReporterCounts;
  currentUserId: string | null;
  onChanged: () => void;
  onFilterReporter: (reporterId: string) => void;
}) {
  const [draft, setDraft] = useState(report.public_summary ?? "");
  const resolveFn = useServerFn(setReportResolution);
  const evidenceFn = useServerFn(getReportEvidenceUrls);
  const [evidence, setEvidence] = useState<{ path: string; url: string | null }[]>([]);

  useEffect(() => {
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
  }, [report.id]);

  const resolve = async (resolution: "accepted" | "dismissed") => {
    await resolveFn({ data: { id: report.id, resolution } });
    if (resolution === "accepted") toast.success("Resolved as accepted");
    else toast.success("Dismissed");
    onChanged();
  };

  const hideListing = async () => {
    if (!report.listing_id) return;
    await supabase.from("listings").update({ status: "hidden" }).eq("id", report.listing_id);
    await resolveFn({ data: { id: report.id, resolution: "accepted" } });
    toast.success("Listing hidden");
    onChanged();
  };

  const removeListing = async () => {
    if (!report.listing_id) return;
    if (
      !(await confirm({
        title: "Permanently delete this listing? This cannot be undone.",
        destructive: true,
      }))
    )
      return;
    await supabase.from("listings").delete().eq("id", report.listing_id);
    await resolveFn({ data: { id: report.id, resolution: "accepted" } });
    toast.success("Listing deleted");
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

  const reporterLabel =
    report.reporter_name ||
    report.reporter_email ||
    (report.reporter_id ? "Signed-in user" : "Anonymous");

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={report.status === "resolved" ? "secondary" : "destructive"}>
              {report.status}
              {report.resolution ? ` · ${report.resolution}` : ""}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {report.target_type}
            </Badge>
            {report.category && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/15">
                {report.category}
              </Badge>
            )}
            {report.listings?.status && (
              <Badge variant="outline">listing: {report.listings.status}</Badge>
            )}
            <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
          </div>

          {/* Target */}
          {report.listing_id ? (
            <Link
              to="/listing/$id"
              params={{ id: report.listing_id }}
              className="mt-1 block font-medium hover:text-primary"
            >
              {report.listings?.title ?? "Listing"}
            </Link>
          ) : report.target_url ? (
            <a
              href={report.target_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 break-all font-medium hover:text-primary"
            >
              {report.target_url}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No target link provided</p>
          )}

          {/* Details */}
          {report.details && (
            <p className="mt-2 whitespace-pre-wrap rounded border border-border bg-background/40 p-3 text-sm">
              {report.details}
            </p>
          )}
        </div>

        {/* Actions */}
        {report.status !== "resolved" && (
          <div className="flex flex-wrap gap-2">
            {report.listing_id && (
              <>
                <Button size="sm" variant="outline" onClick={hideListing}>
                  <ShieldOff className="mr-1 h-4 w-4" /> Hide
                </Button>
                <Button size="sm" variant="outline" onClick={removeListing}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </>
            )}
            <Button size="sm" variant="default" onClick={() => resolve("accepted")}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={() => resolve("dismissed")}>
              <XCircle className="mr-1 h-4 w-4" /> Dismiss
            </Button>
          </div>
        )}
      </div>

      {/* Reporter */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border bg-background/40 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold">
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
                <Filter className="mr-1 h-3 w-3" /> Filter by reporter
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <div className="font-medium">{reporterLabel}</div>
            {report.reporter_email && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Mail className="h-3 w-3" />
                <a href={`mailto:${report.reporter_email}`} className="hover:underline">
                  {report.reporter_email}
                </a>
              </div>
            )}
            {report.reporter_phone && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" />
                {report.reporter_phone}
              </div>
            )}
            {reporterCounts && (
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="secondary">Total {reporterCounts.total}</Badge>
                <Badge variant="outline">Open {reporterCounts.open}</Badge>
                <Badge variant="outline">Resolved {reporterCounts.resolved}</Badge>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/15">
                  Accepted {reporterCounts.accepted}
                </Badge>
                <Badge className="bg-muted-foreground/10 border border-border">
                  Dismissed {reporterCounts.dismissed}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Evidence */}
        <div className="rounded-md border border-border bg-background/40 p-3 text-xs">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <FileText className="h-3.5 w-3.5" />
            Evidence ({(report.evidence_urls ?? []).length})
          </div>
          {(report.evidence_urls ?? []).length === 0 ? (
            <p className="text-muted-foreground">None attached.</p>
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
                      className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 hover:bg-secondary"
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
      </div>

      {/* Signals */}
      <ReportSignals reportId={report.id} />

      {/* Public summary */}
      <div className="mt-4 rounded-md border border-dashed border-border bg-background/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Megaphone className="h-3.5 w-3.5" />
            Public summary
            {report.public_summary && (
              <Badge variant="secondary" className="ml-1">
                Published {report.made_public_at ? `· ${formatDate(report.made_public_at)}` : ""}
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
      </div>
    </div>
  );
}
