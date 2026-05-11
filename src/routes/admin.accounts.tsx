import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Pause, Play, Sparkles, Percent, ArrowUpDown, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { formatDate, formatPHP } from "@/lib/format";

export const Route = createFileRoute("/admin/accounts")({
  component: AccountsConsole,
});

type Plan = { id: string; name: string; price_php: number };
type Sub = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  complimentary: boolean;
  discount_percent: number;
  paused_at: string | null;
  notes: string | null;
};
type Profile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  seller_type: string;
  account_status: "active" | "paused" | "banned";
  is_founding_member: boolean;
  founding_member_number: number | null;
  business_kind: string | null;
  business_region: string | null;
  created_at: string;
};
type Row = Profile & {
  plan: Plan | null;
  subscription: Sub | null;
  lifetimeSpend: number;
  listings: number;
};

const tierColors: Record<string, string> = {
  Free: "bg-muted text-muted-foreground",
  Bronze: "bg-amber-700/20 text-amber-700 dark:text-amber-300",
  Silver: "bg-slate-400/20 text-slate-600 dark:text-slate-300",
  Gold: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  Platinum: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
  Business: "bg-primary/20 text-primary",
};

function AccountsConsole() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [foundingFilter, setFoundingFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"joined" | "spend" | "tier">("joined");
  const [editing, setEditing] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: plansData }, { data: subs }, { data: pays }, { data: listingsCount }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("subscription_plans").select("id,name,price_php").eq("active", true).order("sort_order"),
      supabase.from("subscriptions").select("*"),
      supabase.from("payments").select("user_id, amount_php, status"),
      supabase.from("listings").select("user_id"),
    ]);
    setPlans((plansData ?? []) as Plan[]);
    const subByUser = new Map<string, Sub>();
    (subs ?? []).forEach((s: any) => {
      if (s.status === "active") subByUser.set(s.user_id, s);
    });
    const planById = new Map<string, Plan>();
    (plansData ?? []).forEach((p: any) => planById.set(p.id, p));
    const spendByUser = new Map<string, number>();
    (pays ?? []).forEach((p: any) => {
      if (p.status === "paid") spendByUser.set(p.user_id, (spendByUser.get(p.user_id) ?? 0) + Number(p.amount_php));
    });
    const listingsByUser = new Map<string, number>();
    (listingsCount ?? []).forEach((l: any) => {
      listingsByUser.set(l.user_id, (listingsByUser.get(l.user_id) ?? 0) + 1);
    });
    setRows(
      (profs ?? []).map((p: any) => {
        const sub = subByUser.get(p.id) ?? null;
        return {
          ...p,
          subscription: sub,
          plan: sub ? planById.get(sub.plan_id) ?? null : null,
          lifetimeSpend: spendByUser.get(p.id) ?? 0,
          listings: listingsByUser.get(p.id) ?? 0,
        };
      }),
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((x) =>
        (x.full_name ?? "").toLowerCase().includes(q) ||
        (x.business_name ?? "").toLowerCase().includes(q) ||
        x.id.toLowerCase().includes(q),
      );
    }
    if (tierFilter !== "all") r = r.filter((x) => (x.plan?.name ?? "Free") === tierFilter);
    if (statusFilter !== "all") r = r.filter((x) => x.account_status === statusFilter);
    if (foundingFilter === "yes") r = r.filter((x) => x.is_founding_member);
    if (foundingFilter === "no") r = r.filter((x) => !x.is_founding_member);
    if (sortBy === "spend") r = [...r].sort((a, b) => b.lifetimeSpend - a.lifetimeSpend);
    else if (sortBy === "tier") r = [...r].sort((a, b) => (b.plan?.price_php ?? 0) - (a.plan?.price_php ?? 0));
    return r;
  }, [rows, search, tierFilter, statusFilter, foundingFilter, sortBy]);

  const togglePause = async (row: Row) => {
    const next = row.account_status === "paused" ? "active" : "paused";
    const { error } = await supabase.from("profiles").update({ account_status: next }).eq("id", row.id);
    if (error) toast.error(error.message);
    else { toast.success(next === "paused" ? "Account paused" : "Account reactivated"); load(); }
  };

  const exportCsv = () => {
    const header = ["Name", "Business", "Plan", "Status", "Founding #", "Joined", "Listings", "Lifetime spend", "Discount %"];
    const lines = filtered.map((r) => [
      r.full_name ?? "",
      r.business_name ?? "",
      r.plan?.name ?? "Free",
      r.account_status,
      r.founding_member_number ?? "",
      r.created_at,
      r.listings,
      r.lifetimeSpend,
      r.subscription?.discount_percent ?? 0,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "accounts.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const founding = rows.filter((r) => r.is_founding_member).length;
    const paying = rows.filter((r) => (r.plan?.price_php ?? 0) > 0 && !r.subscription?.complimentary).length;
    const paused = rows.filter((r) => r.account_status === "paused").length;
    return { total: rows.length, founding, paying, paused };
  }, [rows]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Customer accounts</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} accounts · {stats.founding}/1000 founding members · {stats.paying} paying · {stats.paused} paused
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, business, ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="Free">Free</SelectItem>
            {plans.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={foundingFilter} onValueChange={setFoundingFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Founding" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            <SelectItem value="yes">Founding only</SelectItem>
            <SelectItem value="no">Non-founding</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-[140px]"><ArrowUpDown className="mr-1 h-4 w-4" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="joined">Recently joined</SelectItem>
            <SelectItem value="spend">Lifetime spend</SelectItem>
            <SelectItem value="tier">Plan tier</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="p-3">Account</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Status</th>
                <th className="p-3">Listings</th>
                <th className="p-3">Spend</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const tierName = r.plan?.name ?? "Free";
                return (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-3">
                      <div className="font-medium">{r.full_name ?? "(no name)"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.business_name ? `${r.business_name} · ` : ""}{r.seller_type}
                        {r.business_region ? ` · ${r.business_region}` : ""}
                      </div>
                      {r.is_founding_member && (
                        <Badge variant="outline" className="mt-1 gap-1 border-amber-500/50 text-amber-600 dark:text-amber-300">
                          <Sparkles className="h-3 w-3" />Founding #{r.founding_member_number}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[tierName] ?? tierColors.Free}`}>
                        {tierName}
                      </span>
                      {r.subscription?.complimentary && <div className="mt-1 text-[10px] uppercase text-muted-foreground">Complimentary</div>}
                      {(r.subscription?.discount_percent ?? 0) > 0 && (
                        <div className="mt-1 text-xs text-emerald-600">-{r.subscription!.discount_percent}% discount</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant={r.account_status === "active" ? "default" : "destructive"}>{r.account_status}</Badge>
                    </td>
                    <td className="p-3">{r.listings}</td>
                    <td className="p-3">{formatPHP(r.lifetimeSpend)}</td>
                    <td className="p-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing(r)}><Percent className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => togglePause(r)}>
                          {r.account_status === "paused" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No accounts match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditAccountDialog
          row={editing}
          plans={plans}
          isAdmin={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function EditAccountDialog({
  row, plans, isAdmin, onClose, onSaved,
}: { row: Row; plans: Plan[]; isAdmin: boolean; onClose: () => void; onSaved: () => void }) {
  const [planId, setPlanId] = useState<string>(row.plan?.id ?? "");
  const [discount, setDiscount] = useState<number>(row.subscription?.discount_percent ?? 0);
  const [complimentary, setComplimentary] = useState<boolean>(row.subscription?.complimentary ?? false);
  const [notes, setNotes] = useState<string>(row.subscription?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (row.subscription) {
        const { error } = await supabase.from("subscriptions").update({
          plan_id: planId || row.subscription.plan_id,
          discount_percent: discount,
          complimentary,
          notes,
        }).eq("id", row.subscription.id);
        if (error) throw error;
      } else if (planId) {
        const { error } = await supabase.from("subscriptions").insert({
          user_id: row.id,
          plan_id: planId,
          status: "active",
          complimentary,
          discount_percent: discount,
          notes,
        });
        if (error) throw error;
      }
      toast.success("Account updated");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row.full_name ?? "Account"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Plan tier</label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {formatPHP(p.price_php)}/mo</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Discount % (0–100)</label>
            <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={complimentary} onChange={(e) => setComplimentary(e.target.checked)} />
            Complimentary (no charge)
          </label>
          <div>
            <label className="mb-1 block text-sm font-medium">Notes (internal)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for discount, etc." />
          </div>
          {!isAdmin && <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">Sales role: changes are logged.</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
