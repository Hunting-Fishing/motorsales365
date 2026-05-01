import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/pricing")({
  component: AdminPricing,
});

function AdminPricing() {
  const [settings, setSettings] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [newPromo, setNewPromo] = useState({ code: "", percent_off: 10 });

  const load = async () => {
    const [{ data: s }, { data: p }, { data: pr }] = await Promise.all([
      supabase.from("pricing_settings").select("*").order("key"),
      supabase.from("subscription_plans").select("*").order("sort_order"),
      supabase.from("promotions").select("*").order("created_at", { ascending: false }),
    ]);
    setSettings(s ?? []); setPlans(p ?? []); setPromos(pr ?? []);
  };
  useEffect(() => { load(); }, []);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 font-display text-2xl font-bold">Pricing & plans</h1>
        <p className="text-sm text-muted-foreground">Adjust fees, durations, plans, and promo codes — changes apply instantly.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Listing fees</h2>
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
    </div>
  );
}
