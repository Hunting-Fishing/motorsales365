import { createFileRoute } from "@tanstack/react-router";
import { confirm } from "@/components/ui/confirm-dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency, type Currency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/currencies")({
  component: AdminCurrencies,
});

const sb = supabase as any;

function AdminCurrencies() {
  const { refresh: refreshCtx } = useCurrency();
  const [rows, setRows] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    code: "",
    name: "",
    symbol: "",
    rate_to_php: 1,
    decimals: 2,
    sort_order: 99,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("currencies").select("*").order("sort_order");
    setRows((data || []) as Currency[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveRow = async (row: Currency) => {
    const { error } = await sb
      .from("currencies")
      .update({
        name: row.name,
        symbol: row.symbol,
        rate_to_php: row.rate_to_php,
        decimals: row.decimals,
        active: row.active,
        sort_order: row.sort_order,
        auto_update: row.auto_update,
      })
      .eq("code", row.code);
    if (error) toast.error(error.message);
    else {
      toast.success(`${row.code} saved`);
      refreshCtx();
    }
  };

  const removeRow = async (code: string) => {
    if (code === "PHP") return toast.error("PHP cannot be removed");
    if (!(await confirm({ title: `Remove ${code}?`, destructive: true }))) return;
    const { error } = await sb.from("currencies").delete().eq("code", code);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      load();
      refreshCtx();
    }
  };

  const addRow = async () => {
    const code = draft.code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return toast.error("Code must be 3 letters");
    if (!draft.name || !draft.symbol) return toast.error("Name and symbol required");
    if (draft.rate_to_php <= 0) return toast.error("Rate must be > 0");
    const { error } = await sb.from("currencies").insert({
      code,
      name: draft.name.trim(),
      symbol: draft.symbol.trim(),
      rate_to_php: draft.rate_to_php,
      decimals: draft.decimals,
      sort_order: draft.sort_order,
      active: true,
      auto_update: true,
    });
    if (error) return toast.error(error.message);
    toast.success(`${code} added`);
    setAdding(false);
    setDraft({ code: "", name: "", symbol: "", rate_to_php: 1, decimals: 2, sort_order: 99 });
    load();
    refreshCtx();
  };

  const refreshFx = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/public/fx/refresh", { method: "POST" });
      const json = await res.json();
      if (json.ok) toast.success(`Updated ${json.updated} rate${json.updated === 1 ? "" : "s"}`);
      else toast.error(json.error || "Refresh failed");
      await load();
      refreshCtx();
    } catch (e: any) {
      toast.error(e?.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Currencies</h1>
          <p className="text-sm text-muted-foreground">
            Manage display currencies and exchange rates. Billing remains in PHP.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshFx} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh from FX API
          </Button>
          <Button onClick={() => setAdding((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" /> Add currency
          </Button>
        </div>
      </header>

      {adding && (
        <section className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-6">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Code</label>
            <Input
              value={draft.code}
              maxLength={3}
              onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
              placeholder="CAD"
              className="mt-1 font-mono"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Name</label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Canadian Dollar"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Symbol</label>
            <Input
              value={draft.symbol}
              onChange={(e) => setDraft({ ...draft, symbol: e.target.value })}
              placeholder="C$"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">PHP / 1</label>
            <Input
              type="number"
              step="0.0001"
              value={draft.rate_to_php}
              onChange={(e) => setDraft({ ...draft, rate_to_php: Number(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={addRow}>
              <Save className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2 text-right">PHP per 1</th>
                <th className="px-3 py-2 text-right">Decimals</th>
                <th className="px-3 py-2 text-right">Order</th>
                <th className="px-3 py-2 text-center">Auto</th>
                <th className="px-3 py-2 text-center">Active</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">No currencies.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.code} className="border-t border-border">
                  <td className="px-3 py-2 font-mono font-semibold">{r.code}</td>
                  <td className="px-3 py-2">
                    <Input
                      value={r.name}
                      onChange={(e) => {
                        const next = [...rows]; next[i] = { ...r, name: e.target.value }; setRows(next);
                      }}
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={r.symbol}
                      onChange={(e) => {
                        const next = [...rows]; next[i] = { ...r, symbol: e.target.value }; setRows(next);
                      }}
                      className="h-8 w-16 font-mono"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      step="0.0001"
                      value={r.rate_to_php}
                      disabled={r.code === "PHP"}
                      onChange={(e) => {
                        const next = [...rows]; next[i] = { ...r, rate_to_php: Number(e.target.value) }; setRows(next);
                      }}
                      className="h-8 w-28 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      value={r.decimals}
                      min={0}
                      max={4}
                      onChange={(e) => {
                        const next = [...rows]; next[i] = { ...r, decimals: Number(e.target.value) }; setRows(next);
                      }}
                      className="h-8 w-16 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      value={r.sort_order}
                      onChange={(e) => {
                        const next = [...rows]; next[i] = { ...r, sort_order: Number(e.target.value) }; setRows(next);
                      }}
                      className="h-8 w-16 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Switch
                      checked={r.auto_update}
                      onCheckedChange={(v) => {
                        const next = [...rows]; next[i] = { ...r, auto_update: v }; setRows(next);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Switch
                      checked={r.active}
                      onCheckedChange={(v) => {
                        const next = [...rows]; next[i] = { ...r, active: v }; setRows(next);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.last_updated_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => saveRow(r)}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      {r.code !== "PHP" && (
                        <Button size="sm" variant="ghost" onClick={() => removeRow(r.code)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
