import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Copy, Loader2, Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShopRealtime } from "@/hooks/use-shop-realtime";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/discounts")({
  head: () => ({ meta: [{ title: "Discount Codes — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: DiscountsPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Discounts</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
});

async function fetchCodes() {
  const { data, error } = await (smSupabase as any).from("discount_codes").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return data ?? [];
}

function randomCode(len = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = ""; for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function DiscountsPage() {
  useShopRealtime();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: randomCode(), description: "", discount_type: "percentage", discount_value: 10,
    minimum_order_amount: 0, maximum_discount_amount: 0, usage_limit: 0, valid_until: "", is_active: true,
  });

  const q = useQuery({ queryKey: ["sm", "discount-codes"], queryFn: fetchCodes });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.code.trim()) throw new Error("Code required");
      const payload: any = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        minimum_order_amount: form.minimum_order_amount || null,
        maximum_discount_amount: form.maximum_discount_amount || null,
        usage_limit: form.usage_limit || null,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        is_active: form.is_active,
        usage_count: 0,
      };
      const { error } = await (smSupabase as any).from("discount_codes").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Code created"); setCreating(false);
      setForm({ code: randomCode(), description: "", discount_type: "percentage", discount_value: 10, minimum_order_amount: 0, maximum_discount_amount: 0, usage_limit: 0, valid_until: "", is_active: true });
      qc.invalidateQueries({ queryKey: ["sm", "discount-codes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const toggle = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await (smSupabase as any).from("discount_codes").update({ is_active: !row.is_active }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sm", "discount-codes"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (smSupabase as any).from("discount_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sm", "discount-codes"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const rows = q.data ?? [];
  const now = Date.now();
  const stats = useMemo(() => ({
    active: rows.filter((r: any) => r.is_active && (!r.valid_until || new Date(r.valid_until).getTime() > now)).length,
    expired: rows.filter((r: any) => r.valid_until && new Date(r.valid_until).getTime() < now).length,
    redemptions: rows.reduce((s: number, r: any) => s + (r.usage_count ?? 0), 0),
  }), [rows, now]);

  const copy = (code: string) => { navigator.clipboard?.writeText(code); toast.success(`Copied ${code}`); };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Ticket className="h-6 w-6 text-primary" /> Discount Codes</h1>
            <p className="text-sm text-muted-foreground">Promo codes for invoices and quotes.</p>
          </div>
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Code</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New discount code</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
                  <Button type="button" variant="outline" className="self-end" onClick={() => setForm({ ...form, code: randomCode() })}>Random</Button>
                </div>
                <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Value</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) || 0 })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Min order</Label><Input type="number" value={form.minimum_order_amount} onChange={(e) => setForm({ ...form, minimum_order_amount: Number(e.target.value) || 0 })} /></div>
                  <div><Label>Max discount</Label><Input type="number" value={form.maximum_discount_amount} onChange={(e) => setForm({ ...form, maximum_discount_amount: Number(e.target.value) || 0 })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Usage limit</Label><Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: Number(e.target.value) || 0 })} placeholder="0 = unlimited" /></div>
                  <div><Label>Valid until</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
                </div>
                <div className="flex items-center justify-between rounded border p-2">
                  <Label>Active</Label>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-bold text-emerald-600">{stats.active}</div></CardContent></Card>
          <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Expired</div><div className="text-2xl font-bold text-muted-foreground">{stats.expired}</div></CardContent></Card>
          <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Total redemptions</div><div className="text-2xl font-bold">{stats.redemptions}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">All codes</CardTitle></CardHeader>
          <CardContent>
            {q.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No codes yet.</p>
            ) : (
              <div className="space-y-1">
                {rows.map((r: any) => {
                  const expired = r.valid_until && new Date(r.valid_until).getTime() < now;
                  const exhausted = r.usage_limit && r.usage_count >= r.usage_limit;
                  return (
                    <div key={r.id} className="flex flex-wrap items-center gap-3 rounded border p-2 text-sm">
                      <button onClick={() => copy(r.code)} className="font-mono font-bold hover:underline flex items-center gap-1">
                        {r.code} <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <span className="text-xs text-muted-foreground">{r.discount_type === "percentage" ? `${r.discount_value}%` : `₱${r.discount_value}`} off</span>
                      {r.description ? <span className="text-xs text-muted-foreground flex-1 truncate">{r.description}</span> : <span className="flex-1" />}
                      <Badge variant="outline">{r.usage_count ?? 0}{r.usage_limit ? ` / ${r.usage_limit}` : ""} used</Badge>
                      {expired ? <Badge variant="secondary">expired</Badge> : exhausted ? <Badge variant="secondary">exhausted</Badge> : r.is_active ? <Badge className="bg-emerald-600 text-white">active</Badge> : <Badge variant="outline">off</Badge>}
                      <Switch checked={!!r.is_active} onCheckedChange={() => toggle.mutate(r)} />
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${r.code}?`)) del.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
