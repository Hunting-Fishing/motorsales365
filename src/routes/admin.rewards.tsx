import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Gift, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { adminListRewards, adminGrantReward } from "@/lib/rewards.functions";

export const Route = createFileRoute("/admin/rewards")({
  component: AdminRewardsPage,
  head: () => ({ meta: [{ title: "Admin · Rewards" }] }),
});

function AdminRewardsPage() {
  const listFn = useServerFn(adminListRewards);
  const grantFn = useServerFn(adminGrantReward);
  const [rows, setRows] = useState<any[] | null>(null);
  const [form, setForm] = useState({
    userId: "",
    kind: "boost_credit" as const,
    amount: 1,
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => listFn().then((r) => setRows(r.rewards)).catch(() => setRows([]));
  useEffect(() => {
    refresh();
  }, []);

  const grant = async () => {
    if (!form.userId || form.note.length < 5) {
      toast.error("User ID and note (≥5 chars) required");
      return;
    }
    setSubmitting(true);
    try {
      await grantFn({
        data: {
          userId: form.userId,
          kind: form.kind,
          amount: form.amount,
          note: form.note,
        },
      });
      toast.success("Reward granted");
      setForm({ userId: "", kind: "boost_credit", amount: 1, note: "" });
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Gift className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-bold">Member rewards</h1>
      </div>

      <div className="mb-8 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Grant reward</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label className="text-xs">User ID (UUID)</Label>
            <Input value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="font-mono text-xs" />
          </div>
          <div>
            <Label className="text-xs">Kind</Label>
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as any })}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="boost_credit">Boost credit</option>
              <option value="featured_badge">Featured badge</option>
              <option value="spotlight">Spotlight</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Amount</Label>
            <Input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div className="sm:col-span-4">
            <Label className="text-xs">Note (required, ≥5 chars)</Label>
            <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="min-h-16 text-sm" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={grant} disabled={submitting}>
            <Plus className="mr-1 h-4 w-4" /> {submitting ? "Granting…" : "Grant reward"}
          </Button>
        </div>
      </div>

      <h2 className="mb-3 font-semibold">Recent grants</h2>
      {rows === null ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const p = r.profiles ?? {};
            const name = p.display_name || p.full_name || r.user_id.slice(0, 8);
            return (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm">
                <div>
                  <div className="font-semibold">{name} · {r.kind} × {r.amount}</div>
                  <div className="text-[11px] text-muted-foreground">{formatDate(r.created_at)} · {r.note ?? "—"}</div>
                </div>
                <Badge variant="outline" className="capitalize">{r.status}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
