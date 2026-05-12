import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPHP, formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/billing")({
  component: BillingPage,
});

function BillingPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [plans, setPlans] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setPayments(data ?? []));
    supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setSubs(data ?? []));
    supabase.from("subscription_plans").select("*").then(({ data }) => {
      const m: Record<string, any> = {};
      (data ?? []).forEach((p: any) => { m[p.id] = p; });
      setPlans(m);
    });
  }, [user]);

  const subTone = (s: string) =>
    s === "active" ? "default" : s === "pending" ? "secondary" : s === "paused" ? "outline" : "secondary";

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-bold">Billing</h1>
      <p className="mb-6 text-sm text-muted-foreground">Live payment processing is coming soon. For now, payments and subscriptions are confirmed manually by our team.</p>

      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Subscriptions</h2>
          <Button asChild size="sm" variant="outline"><Link to="/pricing">Browse plans</Link></Button>
        </div>
        {subs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No subscription yet. <Link to="/pricing" className="text-primary underline">View plans</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {subs.map((s) => {
              const plan = plans[s.plan_id];
              return (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                  <div>
                    <div className="font-medium">{plan?.name ?? "Plan"}</div>
                    <div className="text-xs text-muted-foreground">
                      {plan ? formatPHP(plan.price_php) + "/mo · " : ""}requested {formatDate(s.created_at)}
                      {s.current_period_end ? ` · renews ${formatDate(s.current_period_end)}` : ""}
                    </div>
                  </div>
                  <Badge variant={subTone(s.status) as any} className="uppercase">{s.status}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Payments</h2>
        {payments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">No payments yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">{formatDate(p.created_at)}</td>
                    <td className="p-3 capitalize">{p.kind}</td>
                    <td className="p-3 font-medium">{formatPHP(p.amount_php)}</td>
                    <td className="p-3"><Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
