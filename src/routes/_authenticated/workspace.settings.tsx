import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Settings, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/settings")({
  head: () => ({
    meta: [
      { title: "Shop Settings — Shop Manager" },
      { name: "description", content: "Shop identity, hours, and labor rates." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Shop Settings</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function SettingsPage() {
  const qc = useQueryClient();
  const sm = smSupabase as any;

  const { data: settings, isLoading: sLoad } = useQuery({
    queryKey: ["shop-manager", "shop_settings"],
    queryFn: async () => {
      const { data, error } = await sm.from("shop_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: rates, isLoading: rLoad } = useQuery({
    queryKey: ["shop-manager", "labor_rates"],
    queryFn: async () => {
      const { data, error } = await sm.from("labor_rates").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: hours = [], isLoading: hLoad } = useQuery({
    queryKey: ["shop-manager", "shop_hours"],
    queryFn: async () => {
      const { data, error } = await sm.from("shop_hours").select("*").order("day_of_week");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [id, setId] = useState<any>({ name: "", address: "", phone: "", email: "" });
  const [lr, setLr] = useState<any>({ standard_rate: 0, diagnostic_rate: 0, emergency_rate: 0, warranty_rate: 0, internal_rate: 0, diy_rate: 0 });
  const [hrs, setHrs] = useState<Record<number, { open_time: string; close_time: string; is_closed: boolean }>>({});

  useEffect(() => {
    if (settings) setId({ name: settings.name ?? "", address: settings.address ?? "", phone: settings.phone ?? "", email: settings.email ?? "" });
  }, [settings]);
  useEffect(() => { if (rates) setLr(rates); }, [rates]);
  useEffect(() => {
    const map: any = {};
    for (let i = 0; i < 7; i++) {
      const row = hours.find((h: any) => h.day_of_week === i);
      map[i] = { open_time: row?.open_time?.slice(0, 5) ?? "09:00", close_time: row?.close_time?.slice(0, 5) ?? "17:00", is_closed: row?.is_closed ?? false };
    }
    setHrs(map);
  }, [hours]);

  const saveIdentity = useMutation({
    mutationFn: async () => {
      if (!settings?.id) throw new Error("No shop settings row for this shop yet.");
      const { error } = await sm.from("shop_settings").update(id).eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Shop identity saved"); qc.invalidateQueries({ queryKey: ["shop-manager", "shop_settings"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const saveRates = useMutation({
    mutationFn: async () => {
      if (!rates?.id) throw new Error("No labor rates row for this shop yet.");
      const payload: any = {
        standard_rate: Number(lr.standard_rate) || 0,
        diagnostic_rate: Number(lr.diagnostic_rate) || 0,
        emergency_rate: Number(lr.emergency_rate) || 0,
        warranty_rate: Number(lr.warranty_rate) || 0,
        internal_rate: Number(lr.internal_rate) || 0,
        diy_rate: Number(lr.diy_rate) || 0,
      };
      const { error } = await sm.from("labor_rates").update(payload).eq("id", rates.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Labor rates saved"); qc.invalidateQueries({ queryKey: ["shop-manager", "labor_rates"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const saveHours = useMutation({
    mutationFn: async () => {
      for (let i = 0; i < 7; i++) {
        const h = hrs[i];
        if (!h) continue;
        const existing = hours.find((r: any) => r.day_of_week === i);
        const payload: any = { day_of_week: i, open_time: h.open_time, close_time: h.close_time, is_closed: h.is_closed };
        if (existing) {
          const { error } = await sm.from("shop_hours").update(payload).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await sm.from("shop_hours").insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => { toast.success("Hours saved"); qc.invalidateQueries({ queryKey: ["shop-manager", "shop_hours"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const loading = sLoad || rLoad || hLoad;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Settings className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Shop Settings</h1>
            <p className="text-sm text-muted-foreground">Identity, operating hours, and labor pricing.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Shop Identity</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Name</Label><Input value={id.name} onChange={(e) => setId({ ...id, name: e.target.value })} /></div>
                <div><Label>Address</Label><Input value={id.address} onChange={(e) => setId({ ...id, address: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Phone</Label><Input value={id.phone} onChange={(e) => setId({ ...id, phone: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={id.email} onChange={(e) => setId({ ...id, email: e.target.value })} /></div>
                </div>
                <Button onClick={() => saveIdentity.mutate()} disabled={saveIdentity.isPending || !settings}>
                  {saveIdentity.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save identity
                </Button>
                {!settings && <p className="text-xs text-muted-foreground">Shop settings row not initialized. Contact support to seed one.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Labor Rates (₱/hr)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {["standard_rate", "diagnostic_rate", "emergency_rate", "warranty_rate", "internal_rate", "diy_rate"].map((k) => (
                    <div key={k}>
                      <Label className="capitalize">{k.replace(/_/g, " ")}</Label>
                      <Input type="number" step="0.01" value={lr?.[k] ?? 0} onChange={(e) => setLr({ ...lr, [k]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <Button onClick={() => saveRates.mutate()} disabled={saveRates.isPending || !rates}>
                  {saveRates.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save rates
                </Button>
                {!rates && <p className="text-xs text-muted-foreground">Labor rates row not initialized for this shop.</p>}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Operating Hours</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {DAYS.map((day, i) => {
                  const h = hrs[i] ?? { open_time: "09:00", close_time: "17:00", is_closed: false };
                  return (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 rounded border p-2">
                      <div className="font-medium">{day}</div>
                      <div className="flex items-center gap-2">
                        <Switch checked={!h.is_closed} onCheckedChange={(v) => setHrs({ ...hrs, [i]: { ...h, is_closed: !v } })} />
                        <span className="text-sm text-muted-foreground">{h.is_closed ? "Closed" : "Open"}</span>
                      </div>
                      <Input type="time" disabled={h.is_closed} value={h.open_time} onChange={(e) => setHrs({ ...hrs, [i]: { ...h, open_time: e.target.value } })} />
                      <Input type="time" disabled={h.is_closed} value={h.close_time} onChange={(e) => setHrs({ ...hrs, [i]: { ...h, close_time: e.target.value } })} />
                    </div>
                  );
                })}
                <div className="pt-2">
                  <Button onClick={() => saveHours.mutate()} disabled={saveHours.isPending}>
                    {saveHours.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save hours
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
