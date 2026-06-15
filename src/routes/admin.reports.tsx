import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminGroupTabs, ACTIVITY_TABS } from "@/components/admin/admin-group-tabs";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { useAuth } from "@/hooks/use-auth";
import { ReportCard, type ReportRow } from "@/components/admin/report-card";
import { getReporterCounts } from "@/lib/admin-reports.functions";

const searchSchema = z.object({
  filter: z.enum(["open", "resolved", "all"]).optional(),
  reporter: z.string().uuid().optional(),
  expanded: z.string().uuid().optional(),
});


export const Route = createFileRoute("/admin/reports")({
  validateSearch: (s) => searchSchema.parse(s ?? {}),
  component: AdminReports,
  errorComponent: RouteError,
  notFoundComponent: () => <RouteNotFound />,
  head: () => ({
    meta: [
      { title: "Reports — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminReports() {
  const { user } = useAuth();
  const navigate = useNavigate({ from: "/admin/reports" });
  const search = Route.useSearch();
  const filter = search.filter ?? "open";
  const reporterFilter = search.reporter ?? null;
  const expandedId = search.expanded ?? null;
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [counts, setCounts] = useState<Record<string, any>>({});
  const countsFn = useServerFn(getReporterCounts);


  const load = useCallback(async () => {
    let q = supabase
      .from("reports")
      .select(
        "id, reason, category, details, status, created_at, reporter_id, reporter_name, reporter_email, reporter_phone, listing_id, target_type, target_url, evidence_urls, public_summary, made_public_at, resolution, listings:listing_id(title, status, user_id)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    if (reporterFilter) q = q.eq("reporter_id", reporterFilter);
    const { data } = await q;
    let rows = (data ?? []) as unknown as ReportRow[];

    const reporterIds = Array.from(
      new Set(rows.map((r) => r.reporter_id).filter((x): x is string => !!x)),
    );

    if (reporterIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, member_number, full_name, first_name, last_name, business_name")
        .in("id", reporterIds);
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      rows = rows.map((r) => {
        const p = r.reporter_id ? byId.get(r.reporter_id) : null;
        return p
          ? {
              ...r,
              reporter_member_number: p.member_number ?? null,
              reporter_full_name:
                p.full_name ||
                [p.first_name, p.last_name].filter(Boolean).join(" ") ||
                null,
              reporter_business_name: p.business_name ?? null,
            }
          : r;
      });
    }
    setReports(rows);

    if (reporterIds.length) {
      try {
        const res = await countsFn({ data: { reporterIds } });
        setCounts(res.counts);
      } catch {
        setCounts({});
      }
    } else {
      setCounts({});
    }
  }, [filter, reporterFilter, countsFn]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (f: "open" | "resolved" | "all") =>
    navigate({ search: (s: any) => ({ ...s, filter: f }) });
  const setReporter = (id: string | null) =>
    navigate({ search: (s: any) => ({ ...s, reporter: id ?? undefined }) });

  return (
    <div>
      <AdminGroupTabs title="Activity" tabs={ACTIVITY_TABS} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <div className="flex flex-wrap items-center gap-2">
          {reporterFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReporter(null)}
              className="text-xs"
            >
              <X className="mr-1 h-3 w-3" /> Clear reporter filter
            </Button>
          )}
          <div className="flex gap-1 rounded-md border border-border bg-card p-1">
            {(["open", "resolved", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded px-3 py-1 text-xs font-medium capitalize ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          No reports.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              reporterCounts={r.reporter_id ? counts[r.reporter_id] : undefined}
              currentUserId={user?.id ?? null}
              onChanged={load}
              onFilterReporter={(id) => setReporter(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
