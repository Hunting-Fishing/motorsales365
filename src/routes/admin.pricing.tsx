import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, AlertTriangle, Minus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatPHP } from "@/lib/format";
import { verifyStripePlans, setStripeTaxCodes } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

type VerifyRow = {
  planId: string;
  name: string;
  lookupKey: string | null;
  status: "ok" | "missing" | "inactive" | "no_key";
  stripePriceId?: string;
  stripeAmount?: number;
  stripeCurrency?: string;
};

export const Route = createFileRoute("/admin/pricing")({
  component: AdminPricing,
});

function AdminPricing() {
  const [settings, setSettings] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [newPromo, setNewPromo] = useState({ code: "", percent_off: 10 });
  const [subs, setSubs] = useState<any[]>([]);
  const [subFilter, setSubFilter] = useState<string>("pending");
  const [verifyRows, setVerifyRows] = useState<VerifyRow[] | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyAllOk, setVerifyAllOk] = useState<boolean | null>(null);
  const verifyFn = useServerFn(verifyStripePlans);

  const runVerify = async () => {
    setVerifying(true);
    try {
      const res = await verifyFn({ data: { environment: getStripeEnvironment() } });
      setVerifyRows(res.results as VerifyRow[]);
      setVerifyAllOk(res.ok);
      if (res.ok) toast.success("All paid plans resolve to active Stripe prices.");
      else toast.error("Some plans are missing or inactive in Stripe — checkout will fail for those.");
    } catch (e: any) {
      toast.error(e?.message ?? "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const load = async () => {
    const [{ data: s }, { data: p }, { data: pr }] = await Promise.all([
      supabase.from("pricing_settings").select("*").order("key"),
      supabase.from("subscription_plans").select("*").order("sort_order"),
      supabase.from("promotions").select("*").order("created_at", { ascending: false }),
    ]);
    setSettings(s ?? []); setPlans(p ?? []); setPromos(pr ?? []);
  };

  const loadSubs = async () => {
    let q = supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(100);
    if (subFilter !== "all") q = q.eq("status", subFilter);
    const { data: rows, error } = await q;
    if (error) { toast.error(error.message); return; }
    const list = rows ?? [];
    const userIds = Array.from(new Set(list.map((r: any) => r.user_id)));
    const planIds = Array.from(new Set(list.map((r: any) => r.plan_id)));
    const [{ data: profs }, { data: pls }] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
      planIds.length ? supabase.from("subscription_plans").select("id, name, price_php").in("id", planIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const profMap: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { profMap[p.id] = p; });
    const planMap: Record<string, any> = {};
    (pls ?? []).forEach((p: any) => { planMap[p.id] = p; });
    setSubs(list.map((r: any) => ({ ...r, profiles: profMap[r.user_id], subscription_plans: planMap[r.plan_id] })));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadSubs(); /* eslint-disable-next-line */ }, [subFilter]);

  const updateSub = async (id: string, patch: any) => {
    const { error } = await supabase.from("subscriptions").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Subscription updated"); loadSubs(); }
  };

  const saveSetting = async (key: string, value: number) => {
    const { error } = await supabase.from("pricing_settings").update({ value }).eq("key", key);
    if (error) toast.error(error.message); else toast.success("Saved");
  };
  const savePlan = async (id: string, patch: any) => {
    const { error } = await supabase.from("subscription_plans").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Plan updated"); load(); }
  };
  const addPromo = async () => {
    if (!newPromo.code) return;
    const { error } = await supabase.from("promotions").insert({ code: newPromo.code, percent_off: newPromo.percent_off, applies_to: "any" });
    if (error) toast.error(error.message); else { toast.success("Promo added"); setNewPromo({ code: "", percent_off: 10 }); load(); }
  };
  const togglePromo = async (id: string, active: boolean) => {
    await supabase.from("promotions").update({ active }).eq("id", id); load();
  };

  const runPendingCleanup = async () => {
    const { data, error } = await supabase.rpc("expire_stale_pending_sales");
    if (error) toast.error(error.message);
    else toast.success(`Restored ${data ?? 0} stale Pending Sale listing(s) to Active.`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 font-display text-2xl font-bold">Pricing & plans</h1>
        <p className="text-sm text-muted-foreground">Adjust fees, durations, plans, and promo codes — changes apply instantly.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Listing fees & rules</h2>
          <Button variant="outline" size="sm" onClick={runPendingCleanup}>
            Run pending-sale cleanup
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {settings.map((s) => (
            <div key={s.key}>
              <Label>{s.label}</Label>
              <div className="flex gap-2">
                <Input type="number" defaultValue={s.value}
                  onBlur={(e) => saveSetting(s.key, Number(e.target.value))} />
              </div>
              {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Subscription plans</h2>
        <div className="space-y-3">
          {plans.map((p) => (
            <div key={p.id} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_120px_140px_100px_auto] sm:items-end">
              <div>
                <Label>Name</Label>
                <Input defaultValue={p.name} onBlur={(e) => savePlan(p.id, { name: e.target.value })} />
              </div>
              <div>
                <Label>Listings/mo</Label>
                <Input type="number" defaultValue={p.listings_per_month ?? ""}
                  placeholder="∞"
                  onBlur={(e) => savePlan(p.id, { listings_per_month: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Price (₱)</Label>
                <Input type="number" defaultValue={p.price_php}
                  onBlur={(e) => savePlan(p.id, { price_php: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={p.active} onCheckedChange={(v) => savePlan(p.id, { active: v })} />
                <span className="text-xs">{p.active ? "Active" : "Off"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Stripe price verification</h2>
            <p className="text-sm text-muted-foreground">
              Confirms every paid plan's lookup key resolves to an active price in Stripe ({getStripeEnvironment()}).
              Run this before announcing pricing changes — missing keys cause checkout to fail.
            </p>
          </div>
          <Button onClick={runVerify} disabled={verifying}>
            {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</> : "Verify Stripe prices"}
          </Button>
        </div>
        {verifyRows && (
          <div className="space-y-2">
            <div className={`rounded-md border p-2 text-sm ${verifyAllOk ? "border-emerald-500/40 bg-emerald-500/10" : "border-destructive/40 bg-destructive/10"}`}>
              {verifyAllOk
                ? "All paid plans are wired up correctly."
                : "One or more paid plans cannot be charged. Fix Stripe before allowing checkouts."}
            </div>
            {verifyRows.map((r) => {
              const Icon = r.status === "ok" ? CheckCircle2 : r.status === "no_key" ? Minus : r.status === "inactive" ? AlertTriangle : XCircle;
              const color = r.status === "ok" ? "text-emerald-600" : r.status === "no_key" ? "text-muted-foreground" : r.status === "inactive" ? "text-amber-600" : "text-destructive";
              const label =
                r.status === "ok" ? "OK" :
                r.status === "no_key" ? "No key (free plan)" :
                r.status === "inactive" ? "Inactive in Stripe" :
                "Missing in Stripe";
              return (
                <div key={r.planId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                    <span className="font-semibold">{r.name}</span>
                    {r.lookupKey && <code className="text-xs text-muted-foreground">{r.lookupKey}</code>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {r.stripeAmount != null && r.stripeCurrency && (
                      <span className="text-muted-foreground">
                        {(r.stripeAmount / 100).toFixed(2)} {r.stripeCurrency.toUpperCase()}
                      </span>
                    )}
                    <Badge variant={r.status === "ok" ? "secondary" : r.status === "no_key" ? "outline" : "destructive"}>{label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>



      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Promo codes</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div><Label>Code</Label><Input value={newPromo.code} onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })} /></div>
          <div><Label>% off</Label><Input type="number" value={newPromo.percent_off} onChange={(e) => setNewPromo({ ...newPromo, percent_off: Number(e.target.value) })} className="w-24" /></div>
          <Button onClick={addPromo}>Add promo</Button>
        </div>
        <div className="mt-4 space-y-2">
          {promos.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <div><span className="font-mono font-semibold">{p.code}</span> — {p.percent_off}% off</div>
              <Switch checked={p.active} onCheckedChange={(v) => togglePromo(p.id, v)} />
            </div>
          ))}
          {promos.length === 0 && <div className="text-sm text-muted-foreground">No promo codes yet.</div>}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Subscription requests</h2>
          <Select value={subFilter} onValueChange={setSubFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {subs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No subscriptions in this state.
          </div>
        ) : (
          <div className="space-y-2">
            {subs.map((s: any) => {
              const plan = s.subscription_plans;
              const prof = s.profiles;
              return (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{prof?.full_name || s.user_id.slice(0, 8)}</span>
                      <Badge variant="outline" className="uppercase">{s.status}</Badge>
                      {s.complimentary && <Badge variant="secondary">comp</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {plan?.name ?? "Plan"} · {plan ? formatPHP(plan.price_php) + "/mo" : ""} · requested {formatDate(s.created_at)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {s.status === "pending" && (
                      <Button size="sm" onClick={() => updateSub(s.id, { status: "active", current_period_end: new Date(Date.now() + 31 * 86400000).toISOString() })}>
                        Approve
                      </Button>
                    )}
                    {s.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => updateSub(s.id, { status: "paused", paused_at: new Date().toISOString() })}>
                        Pause
                      </Button>
                    )}
                    {s.status === "paused" && (
                      <Button size="sm" onClick={() => updateSub(s.id, { status: "active", paused_at: null })}>
                        Resume
                      </Button>
                    )}
                    {s.status !== "cancelled" && (
                      <Button size="sm" variant="ghost" onClick={() => updateSub(s.id, { status: "cancelled" })}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
