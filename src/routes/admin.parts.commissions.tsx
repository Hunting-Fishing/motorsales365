import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DollarSign, RefreshCw, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getCommissionsSummary,
  listCommissionRules,
  listRecentConversions,
  recomputeAllCommissions,
  updateConversionStatus,
  upsertCommissionRule,
  type CommissionRule,
  type CommissionsSummary,
} from "@/lib/affiliate-commissions.functions";

export const Route = createFileRoute("/admin/parts/commissions")({
  head: () => ({ meta: [{ title: "Partner commissions — Admin" }] }),
  component: CommissionsPage,
});

function fmt(cents: number, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency }).format((cents ?? 0) / 100);
}

function CommissionsPage() {
  const fetchSummary = useServerFn(getCommissionsSummary);
  const fetchRules = useServerFn(listCommissionRules);
  const saveRule = useServerFn(upsertCommissionRule);
  const fetchConvs = useServerFn(listRecentConversions);
  const setStatus = useServerFn(updateConversionStatus);
  const recompute = useServerFn(recomputeAllCommissions);

  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<CommissionsSummary | null>(null);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [convs, setConvs] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = async () => {
    setErr(null);
    try {
      const [s, r, c] = await Promise.all([
        fetchSummary({ data: { rangeDays: days } }),
        fetchRules(),
        fetchConvs({ data: { limit: 50 } }),
      ]);
      setSummary(s); setRules(r); setConvs(c);
    } catch (e: any) { setErr(e?.message ?? "Failed"); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [days]);

  const ruleBySlug = useMemo(() => new Map(rules.map((r) => [r.supplier_slug, r])), [rules]);

  async function saveRow(slug: string, patch: Partial<CommissionRule>) {
    setBusy(true); setMsg(null);
    try {
      const current = ruleBySlug.get(slug);
      await saveRule({ data: { supplier_slug: slug, ...(current ?? {}), ...patch } as any });
      setMsg(`Saved ${slug}`);
      await reload();
    } catch (e: any) { setErr(e?.message ?? "Save failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Partner commissions</h1>
          <p className="text-sm text-muted-foreground">
            Per-partner payout calculated from conversion postbacks + commission rules + boost multipliers.
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
            <option value={365}>Last 365 days</option>
          </select>
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true); setMsg(null);
              try { const r = await recompute(); setMsg(`Recomputed ${r.updated} conversions`); await reload(); }
              catch (e: any) { setErr(e?.message ?? "Failed"); } finally { setBusy(false); }
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Recompute
          </Button>
        </div>
      </div>

      {err && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}
      {msg && <p className="rounded-md border border-emerald-300/40 bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{msg}</p>}

      {!summary ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Clicks" value={summary.totals.clicks.toLocaleString()} />
            <Stat label="Conversions" value={summary.totals.conversions.toLocaleString()} />
            <Stat label="Gross revenue" value={fmt(summary.totals.gross_revenue_cents)} icon={<DollarSign className="h-4 w-4" />} />
            <Stat label="Our commission (computed)" value={fmt(summary.totals.computed_commission_cents)} icon={<DollarSign className="h-4 w-4" />} />
          </div>

          <Card title="By partner">
            {summary.by_partner.length === 0 ? (
              <Empty>No clicks or conversions in this window.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-1">Partner</th>
                      <th className="py-1 text-right">Clicks</th>
                      <th className="py-1 text-right">Conv.</th>
                      <th className="py-1 text-right">Pending</th>
                      <th className="py-1 text-right">Confirmed</th>
                      <th className="py-1 text-right">Reversed</th>
                      <th className="py-1 text-right">Revenue</th>
                      <th className="py-1 text-right">Reported</th>
                      <th className="py-1 text-right">Computed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.by_partner.map((r) => (
                      <tr key={r.supplier_slug} className="border-t border-border">
                        <td className="py-1.5 font-mono text-xs">{r.supplier_slug}</td>
                        <td className="py-1.5 text-right">{r.clicks}</td>
                        <td className="py-1.5 text-right">{r.conversions}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{r.pending}</td>
                        <td className="py-1.5 text-right">{r.confirmed}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{r.reversed}</td>
                        <td className="py-1.5 text-right">{fmt(r.gross_revenue_cents, r.currency)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{fmt(r.reported_commission_cents, r.currency)}</td>
                        <td className="py-1.5 text-right font-medium">{fmt(r.computed_commission_cents, r.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={<><Settings className="mr-1 inline h-4 w-4" />Commission rules</>}>
            <p className="mb-2 text-xs text-muted-foreground">
              Per merchant: rate (basis points: 500 = 5%), flat fee per conversion, bonus when attributed to a listing,
              and boost multiplier (10000 = 1.00x; 12000 = 1.2x for boosted listings).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th>Partner</th><th>Rate (bps)</th><th>Flat (¢)</th><th>Listing bonus (¢)</th><th>Boost ×</th><th>Currency</th><th>Active</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_partner.map((r) => (
                    <RuleRow key={r.supplier_slug} slug={r.supplier_slug} rule={ruleBySlug.get(r.supplier_slug)} onSave={saveRow} busy={busy} />
                  ))}
                  {rules.filter((r) => !summary.by_partner.find((p) => p.supplier_slug === r.supplier_slug)).map((r) => (
                    <RuleRow key={r.supplier_slug} slug={r.supplier_slug} rule={r} onSave={saveRow} busy={busy} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Recent conversions">
            {convs.length === 0 ? (
              <Empty>No conversions yet. Wire merchant postbacks to <code>/api/public/postback/&lt;network&gt;</code>.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr><th>When</th><th>Partner</th><th>Network</th><th>Order</th><th>Amount</th><th>Computed</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {convs.map((c) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="py-1.5 text-xs text-muted-foreground">{new Date(c.occurred_at).toLocaleString()}</td>
                        <td className="py-1.5 font-mono text-xs">{c.supplier_slug}</td>
                        <td className="py-1.5 text-xs">{c.network ?? "—"}</td>
                        <td className="py-1.5 font-mono text-xs">{c.external_id}</td>
                        <td className="py-1.5">{fmt(c.order_amount_cents, c.currency)}</td>
                        <td className="py-1.5 font-medium">{fmt(c.computed_commission_cents, c.currency)}</td>
                        <td className="py-1.5">
                          <select
                            value={c.status}
                            disabled={busy}
                            onChange={async (e) => {
                              const next = e.target.value as any;
                              setBusy(true);
                              try { await setStatus({ data: { id: c.id, status: next } }); await reload(); }
                              finally { setBusy(false); }
                            }}
                            className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                          >
                            <option value="pending">pending</option>
                            <option value="confirmed">confirmed</option>
                            <option value="paid">paid</option>
                            <option value="reversed">reversed</option>
                          </select>
                        </td>
                        <td className="py-1.5 text-right">
                          {c.listing_id && (
                            <a className="text-xs text-primary hover:underline" href={`/listing/${c.listing_id}`}>listing</a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function RuleRow({
  slug, rule, onSave, busy,
}: { slug: string; rule?: CommissionRule; onSave: (slug: string, patch: Partial<CommissionRule>) => void; busy: boolean }) {
  const [v, setV] = useState({
    rate_bps: rule?.rate_bps ?? 500,
    flat_fee_cents: rule?.flat_fee_cents ?? 0,
    per_listing_fee_cents: rule?.per_listing_fee_cents ?? 0,
    boost_multiplier_bps: rule?.boost_multiplier_bps ?? 10000,
    currency: rule?.currency ?? "PHP",
    is_active: rule?.is_active ?? true,
  });
  useEffect(() => {
    if (rule) setV({
      rate_bps: rule.rate_bps,
      flat_fee_cents: rule.flat_fee_cents,
      per_listing_fee_cents: rule.per_listing_fee_cents,
      boost_multiplier_bps: rule.boost_multiplier_bps,
      currency: rule.currency,
      is_active: rule.is_active,
    });
  }, [rule]);
  return (
    <tr className="border-t border-border">
      <td className="py-1 font-mono text-xs">{slug}</td>
      <td><Input className="h-7 w-20" type="number" value={v.rate_bps} onChange={(e) => setV({ ...v, rate_bps: Number(e.target.value) })} /></td>
      <td><Input className="h-7 w-20" type="number" value={v.flat_fee_cents} onChange={(e) => setV({ ...v, flat_fee_cents: Number(e.target.value) })} /></td>
      <td><Input className="h-7 w-20" type="number" value={v.per_listing_fee_cents} onChange={(e) => setV({ ...v, per_listing_fee_cents: Number(e.target.value) })} /></td>
      <td><Input className="h-7 w-20" type="number" value={v.boost_multiplier_bps} onChange={(e) => setV({ ...v, boost_multiplier_bps: Number(e.target.value) })} /></td>
      <td><Input className="h-7 w-16" value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value.toUpperCase() })} /></td>
      <td><input type="checkbox" checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} /></td>
      <td>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onSave(slug, v)}>
          <Save className="mr-1 h-3 w-3" /> Save
        </Button>
      </td>
    </tr>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
function Card({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded border border-dashed border-border p-4 text-center text-xs text-muted-foreground">{children}</p>;
}
