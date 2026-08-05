import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Award, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShopRealtime } from "@/hooks/use-shop-realtime";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/loyalty")({
  head: () => ({ meta: [{ title: "Customer Loyalty — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: LoyaltyPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Loyalty</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
});

const TIERS = ["bronze", "silver", "gold", "platinum"];

async function fetchLoyalty() {
  const sm = smSupabase as any;
  const { data, error } = await sm.from("customer_loyalty")
    .select("id, customer_id, current_points, lifetime_points, lifetime_value, tier, customers(first_name,last_name,email)")
    .order("lifetime_value", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

async function fetchCustomers() {
  const { data } = await (smSupabase as any).from("customers").select("id, first_name, last_name").order("last_name").limit(500);
  return data ?? [];
}

function tierColor(t: string) {
  return { bronze: "bg-amber-700", silver: "bg-slate-400", gold: "bg-yellow-500", platinum: "bg-indigo-500" }[t] ?? "bg-muted";
}

function LoyaltyPage() {
  useShopRealtime();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [adjust, setAdjust] = useState<any>(null);
  const [form, setForm] = useState({ customer_id: "", tier: "bronze", current_points: 0 });
  const [delta, setDelta] = useState({ points: 0, value: 0, tier: "" });

  const q = useQuery({ queryKey: ["sm", "loyalty"], queryFn: fetchLoyalty });
  const custs = useQuery({ queryKey: ["sm", "customers-lite"], queryFn: fetchCustomers });

  const enroll = useMutation({
    mutationFn: async () => {
      if (!form.customer_id) throw new Error("Pick a customer");
      const { error } = await (smSupabase as any).from("customer_loyalty").insert({
        customer_id: form.customer_id, tier: form.tier, current_points: form.current_points, lifetime_points: form.current_points, lifetime_value: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enrolled"); setEnrolling(false); setForm({ customer_id: "", tier: "bronze", current_points: 0 });
      qc.invalidateQueries({ queryKey: ["sm", "loyalty"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!adjust) return;
      const patch: any = {};
      if (delta.points) {
        patch.current_points = Math.max(0, (adjust.current_points ?? 0) + delta.points);
        if (delta.points > 0) patch.lifetime_points = (adjust.lifetime_points ?? 0) + delta.points;
      }
      if (delta.value) patch.lifetime_value = (Number(adjust.lifetime_value) || 0) + delta.value;
      if (delta.tier) patch.tier = delta.tier;
      const { error } = await (smSupabase as any).from("customer_loyalty").update(patch).eq("id", adjust.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated"); setAdjust(null); setDelta({ points: 0, value: 0, tier: "" });
      qc.invalidateQueries({ queryKey: ["sm", "loyalty"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const rows = q.data ?? [];
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r: any) => {
      const c = r.customers;
      const name = `${c?.first_name ?? ""} ${c?.last_name ?? ""} ${c?.email ?? ""}`.toLowerCase();
      return name.includes(s);
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    const totalPts = rows.reduce((s: number, r: any) => s + (r.current_points ?? 0), 0);
    const totalVal = rows.reduce((s: number, r: any) => s + Number(r.lifetime_value ?? 0), 0);
    const byTier: Record<string, number> = {};
    for (const r of rows) byTier[r.tier ?? "bronze"] = (byTier[r.tier ?? "bronze"] ?? 0) + 1;
    return { totalPts, totalVal, byTier };
  }, [rows]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="h-6 w-6 text-primary" /> Customer Loyalty</h1>
            <p className="text-sm text-muted-foreground">Points, tiers, and lifetime value.</p>
          </div>
          <Dialog open={enrolling} onOpenChange={setEnrolling}>
            <DialogTrigger asChild><Button size="sm">Enroll customer</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Enroll into loyalty</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Customer</Label>
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick customer" /></SelectTrigger>
                    <SelectContent>
                      {(custs.data ?? []).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.id.slice(0, 8)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Starting tier</Label>
                    <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Starting points</Label>
                    <Input type="number" value={form.current_points} onChange={(e) => setForm({ ...form, current_points: Number(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEnrolling(false)}>Cancel</Button>
                <Button onClick={() => enroll.mutate()} disabled={enroll.isPending}>Enroll</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Members</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
          <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Points outstanding</div><div className="text-2xl font-bold">{stats.totalPts.toLocaleString()}</div></CardContent></Card>
          <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Lifetime value</div><div className="text-2xl font-bold">₱{stats.totalVal.toLocaleString()}</div></CardContent></Card>
          <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Tiers</div>
            <div className="mt-1 flex flex-wrap gap-1">{TIERS.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}: {stats.byTier[t] ?? 0}</Badge>)}</div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Members</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" placeholder="Search…" />
            </div>
          </CardHeader>
          <CardContent>
            {q.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members.</p>
            ) : (
              <div className="space-y-1">
                {filtered.map((r: any) => {
                  const c = r.customers;
                  const name = c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email : r.customer_id.slice(0, 8);
                  return (
                    <div key={r.id} className="flex flex-wrap items-center gap-3 rounded border p-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <Link to="/workspace/customers/$id" params={{ id: r.customer_id }} className="font-medium hover:underline">{name}</Link>
                      </div>
                      <Badge className={`${tierColor(r.tier)} text-white`}>{r.tier ?? "bronze"}</Badge>
                      <div className="text-xs text-muted-foreground">{(r.current_points ?? 0).toLocaleString()} pts</div>
                      <div className="text-xs text-muted-foreground">LTV ₱{Number(r.lifetime_value ?? 0).toLocaleString()}</div>
                      <Button size="sm" variant="outline" onClick={() => setAdjust(r)}>Adjust</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Adjust loyalty</DialogTitle></DialogHeader>
            {adjust ? (
              <div className="space-y-3 text-sm">
                <div className="text-muted-foreground">
                  Current: {adjust.current_points ?? 0} pts • {adjust.tier ?? "bronze"} • LTV ₱{Number(adjust.lifetime_value ?? 0).toLocaleString()}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Points +/-</Label><Input type="number" value={delta.points} onChange={(e) => setDelta({ ...delta, points: Number(e.target.value) || 0 })} /></div>
                  <div><Label>LTV +/-</Label><Input type="number" value={delta.value} onChange={(e) => setDelta({ ...delta, value: Number(e.target.value) || 0 })} /></div>
                </div>
                <div>
                  <Label>Change tier</Label>
                  <Select value={delta.tier} onValueChange={(v) => setDelta({ ...delta, tier: v })}>
                    <SelectTrigger><SelectValue placeholder="Keep current" /></SelectTrigger>
                    <SelectContent>{TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjust(null)}>Cancel</Button>
              <Button onClick={() => update.mutate()} disabled={update.isPending}>Apply</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SiteLayout>
  );
}
