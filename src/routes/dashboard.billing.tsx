import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { formatPHP, formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/billing")({
  component: BillingPage,
});

function BillingPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setPayments(data ?? []));
  }, [user]);

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-bold">Billing</h1>
      <p className="mb-6 text-sm text-muted-foreground">Live payment processing is coming soon. For now, payments are confirmed manually by our team.</p>
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
    </div>
  );
}
