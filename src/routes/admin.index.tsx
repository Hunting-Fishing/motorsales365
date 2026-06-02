import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPHP } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const [stats, setStats] = useState({
    active: 0,
    pending: 0,
    users: 0,
    revenue: 0,
    pendingVerifications: 0,
  });

  useEffect(() => {
    const load = async () => {
      const [
        { count: active },
        { count: pending },
        { count: users },
        { data: paid },
        { count: pendingVerifications },
      ] = await Promise.all([
        supabase
          .from("listings")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("listings")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending_payment"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("payments").select("amount_php").eq("status", "paid"),
        supabase
          .from("verification_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      const revenue = (paid ?? []).reduce((s, p: any) => s + Number(p.amount_php), 0);
      setStats({
        active: active ?? 0,
        pending: pending ?? 0,
        users: users ?? 0,
        revenue,
        pendingVerifications: pendingVerifications ?? 0,
      });
    };
    load();
  }, []);

  const cards = [
    { label: "Active listings", value: stats.active.toString() },
    { label: "Pending payment", value: stats.pending.toString() },
    { label: "Registered users", value: stats.users.toString() },
    { label: "Total revenue", value: formatPHP(stats.revenue) },
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">{c.label}</div>
            <div className="mt-2 font-display text-2xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      {stats.pendingVerifications > 0 && (
        <Link
          to="/admin/verifications"
          className="mt-6 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Pending verifications</div>
              <div className="text-sm text-muted-foreground">
                {stats.pendingVerifications} business{stats.pendingVerifications === 1 ? "" : "es"}{" "}
                waiting for review
              </div>
            </div>
          </div>
          <span className="text-sm font-medium text-primary">Review →</span>
        </Link>
      )}
    </div>
  );
}
