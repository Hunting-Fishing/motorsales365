import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Scale, ChevronRight } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { listMyDisputes } from "@/lib/disputes.functions";

export const Route = createFileRoute("/_authenticated/account/disputes")({
  component: MyDisputesPage,
  head: () => ({ meta: [{ title: "My disputes — 365 MotorSales" }] }),
});

function MyDisputesPage() {
  const fn = useServerFn(listMyDisputes);
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    fn().then((r) => setRows(r.disputes)).catch(() => setRows([]));
  }, []);

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6 flex items-center gap-2">
          <Scale className="h-5 w-5 text-amber-600" />
          <h1 className="font-display text-2xl font-bold">My disputes</h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Track disputes you have filed against moderation actions on your listings. Disputes must be filed within 14 days of a decision.
        </p>

        {rows === null ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            You haven't filed any disputes.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((d) => {
              const listingTitle = d?.reports?.listings?.title ?? "Listing";
              const reportId = d.report_id;
              const tone =
                d.status === "open"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : d.status === "overturned"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border bg-muted text-muted-foreground";
              return (
                <Link
                  key={d.id}
                  to="/dispute/$reportId"
                  params={{ reportId }}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`border uppercase ${tone}`}>{d.status}</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        Filed {formatDate(d.created_at)}
                      </span>
                      {d.score_refund > 0 && (
                        <Badge variant="outline" className="text-[10px]">+{d.score_refund} pts refund</Badge>
                      )}
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold">{listingTitle}</div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.message}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
