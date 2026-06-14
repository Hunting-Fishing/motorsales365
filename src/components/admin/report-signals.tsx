import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, AlertTriangle, ImageIcon, Copy, UserX, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { getReportSignals } from "@/lib/admin-reports.functions";

export function ReportSignals({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  const fetcher = useServerFn(getReportSignals);
  const q = useQuery({
    queryKey: ["report-signals", reportId],
    queryFn: () => fetcher({ data: { reportId } }),
    enabled: open,
    staleTime: 60_000,
  });

  return (
    <div className="mt-3 rounded-md border border-border bg-background/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-semibold"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Fraud & duplicate signals
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="border-t border-border px-3 py-3 text-xs">
          {q.isLoading && <p className="text-muted-foreground">Scanning…</p>}
          {q.error && <p className="text-destructive">Failed to load signals.</p>}
          {q.data && (
            <div className="space-y-3">
              {q.data.scamKeywords.length > 0 && (
                <Row icon={<Tag className="h-3.5 w-3.5 text-red-500" />} label="Scam keywords">
                  <div className="flex flex-wrap gap-1">
                    {q.data.scamKeywords.map((k) => (
                      <Badge key={k} variant="destructive">
                        {k}
                      </Badge>
                    ))}
                  </div>
                </Row>
              )}
              {q.data.duplicatePhotos.length > 0 && (
                <Row icon={<ImageIcon className="h-3.5 w-3.5 text-amber-500" />} label={`Duplicate photos (${q.data.duplicatePhotos.length})`}>
                  <ul className="space-y-1">
                    {q.data.duplicatePhotos.map((d) => (
                      <li key={d.listing_id}>
                        <Link
                          to="/listing/$id"
                          params={{ id: d.listing_id }}
                          className="hover:underline"
                        >
                          {d.title ?? d.listing_id}
                        </Link>{" "}
                        <span className="text-muted-foreground">— {d.via}</span>
                      </li>
                    ))}
                  </ul>
                </Row>
              )}
              {q.data.duplicatePosts.length > 0 && (
                <Row icon={<Copy className="h-3.5 w-3.5 text-amber-500" />} label={`Duplicate posts (${q.data.duplicatePosts.length})`}>
                  <ul className="space-y-1">
                    {q.data.duplicatePosts.map((d) => (
                      <li key={d.listing_id}>
                        <Link
                          to="/listing/$id"
                          params={{ id: d.listing_id }}
                          className="hover:underline"
                        >
                          {d.title ?? d.listing_id}
                        </Link>{" "}
                        <span className="text-muted-foreground">— different seller</span>
                      </li>
                    ))}
                  </ul>
                </Row>
              )}
              <Row icon={<UserX className="h-3.5 w-3.5 text-muted-foreground" />} label="Seller history">
                <span>
                  {q.data.sellerPriorReports.total} prior reports ·{" "}
                  <span className={q.data.sellerPriorReports.accepted > 0 ? "text-red-500 font-semibold" : ""}>
                    {q.data.sellerPriorReports.accepted} accepted
                  </span>
                </span>
              </Row>
              <Row icon={<UserX className="h-3.5 w-3.5 text-muted-foreground" />} label="Reporter history">
                <span>
                  {q.data.reporterHistory.total} total · {q.data.reporterHistory.accepted} accepted ·{" "}
                  {q.data.reporterHistory.dismissed} dismissed
                  {q.data.reporterHistory.total >= 5 &&
                    q.data.reporterHistory.accepted / Math.max(q.data.reporterHistory.total, 1) < 0.2 && (
                      <Badge variant="destructive" className="ml-2">
                        possible abuse
                      </Badge>
                    )}
                </span>
              </Row>
              {q.data.duplicatePhotos.length === 0 &&
                q.data.duplicatePosts.length === 0 &&
                q.data.scamKeywords.length === 0 &&
                q.data.sellerPriorReports.total === 0 && (
                  <p className="text-muted-foreground">No notable signals.</p>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5">{icon}</span>
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}
