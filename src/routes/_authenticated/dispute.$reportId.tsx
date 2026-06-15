import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Scale, Upload, Clock, AlertTriangle, ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/format";
import { getReportForDispute, fileDispute } from "@/lib/disputes.functions";

export const Route = createFileRoute("/_authenticated/dispute/$reportId")({
  component: DisputePage,
  head: () => ({ meta: [{ title: "File a dispute — 365 MotorSales" }] }),
});

function DisputePage() {
  const { reportId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchFn = useServerFn(getReportForDispute);
  const submitFn = useServerFn(fileDispute);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchFn>> | null>(null);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFn({ data: { reportId } })
      .then(setData)
      .catch((e) => toast.error(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <Skeleton className="h-64 w-full" />
        </div>
      </SiteLayout>
    );
  }
  if (!data) return null;

  const { report, deadline, windowOpen, existingDispute } = data;

  const submit = async () => {
    if (message.trim().length < 20) {
      toast.error("Please write at least 20 characters.");
      return;
    }
    if (files.length > 5) {
      toast.error("Maximum 5 evidence files.");
      return;
    }
    setSubmitting(true);
    try {
      const urls: string[] = [];
      const folder = `${user!.id}/disputes/${reportId}`;
      for (const f of files) {
        const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
        const path = `${folder}/${Date.now()}-${safe}`;
        const { error } = await supabase.storage
          .from("report-evidence")
          .upload(path, f, { upsert: false, contentType: f.type || undefined });
        if (error) throw error;
        urls.push(path);
      }
      await submitFn({ data: { reportId, message: message.trim(), evidenceUrls: urls } });
      toast.success("Dispute filed. We'll review within 5 business days.");
      navigate({ to: "/account/disputes" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const daysLeft = deadline
    ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400_000))
    : 0;

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link to="/account/disputes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> My disputes
        </Link>

        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <Scale className="h-3.5 w-3.5" /> File a dispute
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold">Dispute this decision</h1>
        <p className="mt-2 text-muted-foreground">
          If you believe the moderation action on your listing was incorrect, you can file one dispute per report within 14 days of the decision. An admin will respond by email.
        </p>

        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">{report.category ?? report.reason}</Badge>
            <Badge>{report.status}{report.resolution ? ` · ${report.resolution}` : ""}</Badge>
          </div>
          <div className="mt-2 text-sm font-semibold">{report.listing_title ?? "Listing"}</div>
          {report.public_summary && (
            <p className="mt-2 rounded border border-dashed border-border bg-background/60 p-3 text-sm text-muted-foreground">
              <strong>Public summary:</strong> {report.public_summary}
            </p>
          )}
          {report.resolved_at && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Resolved {formatDate(report.resolved_at)} · Deadline {deadline ? formatDate(deadline) : "—"}
            </p>
          )}
        </div>

        {existingDispute ? (
          <div className="mt-6 rounded-lg border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Scale className="h-4 w-4" /> Dispute on file
              <Badge variant="outline" className="capitalize">{existingDispute.status}</Badge>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{existingDispute.message}</p>
            {existingDispute.admin_response && (
              <div className="mt-3 rounded border border-border bg-card p-3 text-sm">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Admin response</div>
                <p className="mt-1 whitespace-pre-wrap">{existingDispute.admin_response}</p>
              </div>
            )}
          </div>
        ) : !windowOpen ? (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <div>
              <p className="font-semibold">Dispute window closed</p>
              <p className="text-muted-foreground">Disputes must be filed within 14 days of the resolution. If you have a serious concern, contact support directly.</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> {daysLeft} day{daysLeft === 1 ? "" : "s"} remaining
            </div>
            <div>
              <label className="text-sm font-semibold">Why was the decision incorrect?</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain calmly with facts. Reference policies if relevant. (20–4000 characters)"
                className="mt-1 min-h-32"
                maxLength={4000}
              />
              <div className="mt-1 text-[11px] text-muted-foreground">{message.length} / 4000</div>
            </div>
            <div>
              <label className="text-sm font-semibold">Evidence (optional, max 5 files)</label>
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
                className="mt-1 block w-full text-sm"
              />
              {files.length > 0 && (
                <ul className="mt-2 text-xs text-muted-foreground">
                  {files.map((f, i) => <li key={i}>• {f.name} ({Math.round(f.size / 1024)} KB)</li>)}
                </ul>
              )}
            </div>
            <Button onClick={submit} disabled={submitting} className="w-full sm:w-auto">
              <Upload className="mr-2 h-4 w-4" />
              {submitting ? "Submitting…" : "File dispute"}
            </Button>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
