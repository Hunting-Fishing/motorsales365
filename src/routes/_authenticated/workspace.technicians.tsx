import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Loader2, Search } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/technicians")({
  head: () => ({
    meta: [
      { title: "Technicians — Shop Manager" },
      { name: "description", content: "Shop roster and technician performance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TechniciansPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Technicians</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

function TechniciansPage() {
  const [q, setQ] = useState("");

  const { data: techs = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "technicians"],
    queryFn: async () => {
      const { data: shopId } = await (smSupabase as any).rpc("get_current_user_shop_id");
      if (!shopId) return [];
      const { data, error } = await (smSupabase as any)
        .from("profiles")
        .select("id,full_name,first_name,last_name,job_title,department,email,phone")
        .eq("shop_id", shopId)
        .order("full_name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  // last-30d hours per technician for quick performance view
  const { data: hoursByTech = {} } = useQuery({
    queryKey: ["shop-manager", "technicians", "hours-30d"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await (smSupabase as any)
        .from("work_order_time_entries")
        .select("employee_id,duration,billable,start_time")
        .gte("start_time", since)
        .limit(5000);
      if (error) throw error;
      const map: Record<string, { total: number; billable: number }> = {};
      for (const row of data ?? []) {
        if (!row.employee_id) continue;
        if (!map[row.employee_id]) map[row.employee_id] = { total: 0, billable: 0 };
        map[row.employee_id].total += Number(row.duration ?? 0);
        if (row.billable) map[row.employee_id].billable += Number(row.duration ?? 0);
      }
      return map;
    },
  });

  const filtered = q
    ? techs.filter((t: any) =>
        `${t.full_name ?? ""} ${t.first_name ?? ""} ${t.last_name ?? ""} ${t.job_title ?? ""} ${t.department ?? ""} ${t.email ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : techs;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Technicians</h1>
              <p className="text-muted-foreground">Roster and last 30 days of logged time.</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/workspace">Back to Shop</Link></Button>
        </div>

        <div className="mb-4 relative max-w-sm">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search technicians…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No technicians in your shop yet.</CardContent></Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {filtered.map((t: any) => {
              const name = t.full_name || `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() || t.email || t.id.slice(0, 8);
              const h = hoursByTech[t.id];
              return (
                <Link key={t.id} to="/workspace/technicians/$id" params={{ id: t.id }} className="block">
                  <Card className="transition hover:border-primary/50 hover:shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                      <div>
                        <CardTitle className="text-base">{name}</CardTitle>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t.job_title ?? "—"}{t.department ? ` · ${t.department}` : ""}
                          {t.email ? <> · {t.email}</> : null}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <Badge variant="outline">30d</Badge>
                        <div className="font-mono mt-1">{(h?.total ?? 0).toFixed(1)}h</div>
                        <div className="text-muted-foreground">{(h?.billable ?? 0).toFixed(1)}h billable</div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
