import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Download, TrendingUp, ShoppingCart, AlertCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAffiliateAnalytics,
  type AffiliateAnalytics,
} from "@/lib/affiliate-analytics.functions";
import {
  getPartsFilterAnalytics,
  getMerchantDrilldown,
  type PartsFilterAnalytics,
  type FilterCtrRow,
  type MerchantDrilldown,
} from "@/lib/parts-analytics.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/parts/analytics")({
  head: () => ({ meta: [{ title: "Parts click analytics — Admin" }] }),
  component: PartsAnalyticsPage,
});

function PartsAnalyticsPage() {
  const fetchStats = useServerFn(getAffiliateAnalytics);
  const fetchFilters = useServerFn(getPartsFilterAnalytics);
  const fetchDrill = useServerFn(getMerchantDrilldown);
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<AffiliateAnalytics | null>(null);
  const [filters, setFilters] = useState<PartsFilterAnalytics | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drillSlug, setDrillSlug] = useState<string | null>(null);
  const [drill, setDrill] = useState<MerchantDrilldown | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    if (!drillSlug) { setDrill(null); return; }
    setDrill(null);
    setDrillLoading(true);
    fetchDrill({ data: { supplier_slug: drillSlug, rangeDays: days } })
      .then(setDrill)
      .catch((e) => setErr(e?.message ?? "Drilldown failed"))
      .finally(() => setDrillLoading(false));
  }, [drillSlug, days, fetchDrill]);

  useEffect(() => {
    setStats(null);
    setFilters(null);
    setErr(null);
    fetchStats({ data: { rangeDays: days } })
      .then(setStats)
      .catch((e) => setErr(e?.message ?? "Failed"));
    fetchFilters({ data: { rangeDays: days } })
      .then(setFilters)
      .catch(() => {});
  }, [days, fetchStats, fetchFilters]);


  function exportCsv() {
    if (!stats) return;
    const rows = [
      ["created_at", "supplier_slug", "query", "listing_id", "make", "model", "year"],
      ...stats.recent.map((r) => [
        r.created_at,
        r.supplier_slug,
        r.query ?? "",
        r.listing_id ?? "",
        r.vehicle_make ?? "",
        r.vehicle_model ?? "",
        r.vehicle_year ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `affiliate-clicks-${days}d.csv`;
    a.click();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Parts click analytics</h1>
          <p className="text-sm text-muted-foreground">
            Outbound affiliate clicks across all merchants & partner storefronts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button variant="outline" onClick={exportCsv} disabled={!stats}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {err && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}
      {!stats ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Total clicks" value={stats.total_clicks.toLocaleString()} icon={<TrendingUp className="h-4 w-4" />} />
            <Stat
              label="Top merchant"
              value={stats.by_supplier[0]?.supplier_slug ?? "—"}
              sub={stats.by_supplier[0] ? `${stats.by_supplier[0].clicks} clicks` : undefined}
              icon={<ShoppingCart className="h-4 w-4" />}
            />
            <Stat
              label="Active merchants"
              value={String(stats.by_supplier.length)}
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </div>

          <Card title="Clicks by merchant">
            {stats.by_supplier.length === 0 ? (
              <Empty>No clicks yet.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-1">Merchant</th><th className="py-1 text-right">Clicks</th><th className="py-1 text-right">Share</th></tr>
                </thead>
                <tbody>
                  {stats.by_supplier.map((r) => (
                    <tr key={r.supplier_slug} className="border-t border-border">
                      <td className="py-1.5 font-mono text-xs">{r.supplier_slug}</td>
                      <td className="py-1.5 text-right">{r.clicks}</td>
                      <td className="py-1.5 text-right text-muted-foreground">
                        {((r.clicks / stats.total_clicks) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card title="Top listings">
              {stats.top_listings.length === 0 ? (
                <Empty>No listing-attributed clicks.</Empty>
              ) : (
                <ul className="space-y-1 text-sm">
                  {stats.top_listings.map((r) => (
                    <li key={r.listing_id} className="flex items-center justify-between gap-2 border-b border-border py-1 last:border-0">
                      <a href={`/listing/${r.listing_id}`} className="truncate font-mono text-xs text-primary hover:underline">
                        {r.listing_id}
                      </a>
                      <span>{r.clicks}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Top make / model">
              {stats.top_make_model.length === 0 ? (
                <Empty>No vehicle data captured.</Empty>
              ) : (
                <ul className="space-y-1 text-sm">
                  {stats.top_make_model.map((r) => (
                    <li key={r.key} className="flex items-center justify-between gap-2 border-b border-border py-1 last:border-0">
                      <span className="truncate">{r.key}</span>
                      <span>{r.clicks}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Conversions (postback)">
            <div className="flex items-start gap-3 rounded-md border border-amber-200/40 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Postbacks not yet wired.</p>
                <p className="mt-1">
                  Once you enable conversion postbacks in each network's console (Involve Asia, Amazon
                  Associates, eBay Partner Network), confirmed orders & commissions will appear here
                  alongside clicks. Endpoint stub: <code>/api/public/postback/:network</code>.
                </p>
              </div>
            </div>
          </Card>

          <div className="mt-2 flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-bold">Wizard filter usage & CTR</h2>
            <span className="text-xs text-muted-foreground">
              {filters ? `${filters.total_events.toLocaleString()} filter events` : "loading…"}
            </span>
          </div>

          {filters && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Filter events" value={filters.total_events.toLocaleString()} icon={<Filter className="h-4 w-4" />} />
              <Stat
                label="Clicks w/ filters"
                value={filters.total_clicks_with_filters.toLocaleString()}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <Stat
                label="Overall CTR"
                value={`${(filters.overall_ctr * 100).toFixed(1)}%`}
                sub="clicks ÷ filter events"
                icon={<BarChart3 className="h-4 w-4" />}
              />
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-3">
            <CtrCard title="Top makes" rows={filters?.top_makes} />
            <CtrCard title="Top make / model" rows={filters?.top_make_models} />
            <CtrCard title="Top years" rows={filters?.top_years} />
          </div>

          <Card title="Merchant / feed conversion">
            {!filters || filters.top_merchants.length === 0 ? (
              <Empty>No merchant clicks yet.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1">Merchant</th>
                    <th className="py-1 text-right">Clicks</th>
                    <th className="py-1 text-right">Filtered</th>
                    <th className="py-1 text-right">Unfiltered</th>
                    <th className="py-1 text-right">Share</th>
                    <th className="py-1 text-right">CTR*</th>
                  </tr>
                </thead>
                <tbody>
                  {filters.top_merchants.map((r) => (
                    <tr
                      key={r.supplier_slug}
                      className="cursor-pointer border-t border-border hover:bg-muted/40"
                      onClick={() => setDrillSlug(r.supplier_slug)}
                      title="Click to drill down"
                    >
                      <td className="py-1.5 font-mono text-xs text-primary underline-offset-2 hover:underline">{r.supplier_slug}</td>
                      <td className="py-1.5 text-right">{r.clicks}</td>
                      <td className="py-1.5 text-right">{r.filtered_clicks}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{r.unfiltered_clicks}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{(r.share * 100).toFixed(1)}%</td>
                      <td className="py-1.5 text-right">{(r.ctr * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              *CTR = filtered clicks for this merchant ÷ total wizard filter events in range.
            </p>
          </Card>

          <Card title="Top clicked products">
            {!filters || filters.top_products.length === 0 ? (
              <Empty>No product-attributed clicks yet. Clicks from /parts tiles now log SKU + title.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1">Merchant</th>
                    <th className="py-1">SKU</th>
                    <th className="py-1">Title</th>
                    <th className="py-1 text-right">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {filters.top_products.map((r) => (
                    <tr key={`${r.supplier_slug}:${r.sku}`} className="border-t border-border">
                      <td className="py-1.5 font-mono text-xs">{r.supplier_slug}</td>
                      <td className="py-1.5 font-mono text-xs">{r.sku}</td>
                      <td className="py-1.5 truncate max-w-[420px]">{r.title ?? "—"}</td>
                      <td className="py-1.5 text-right">{r.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}


function Stat({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function CtrCard({ title, rows }: { title: string; rows: FilterCtrRow[] | undefined }) {
  return (
    <Card title={title}>
      {!rows || rows.length === 0 ? (
        <Empty>No filter data yet.</Empty>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-1">Key</th>
              <th className="py-1 text-right">Events</th>
              <th className="py-1 text-right">Clicks</th>
              <th className="py-1 text-right">CTR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-border">
                <td className="py-1.5 truncate max-w-[160px]">{r.key}</td>
                <td className="py-1.5 text-right">{r.events}</td>
                <td className="py-1.5 text-right">{r.clicks}</td>
                <td className="py-1.5 text-right text-muted-foreground">
                  {r.events > 0 ? `${(r.ctr * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded border border-dashed border-border p-4 text-center text-xs text-muted-foreground">{children}</p>;
}
