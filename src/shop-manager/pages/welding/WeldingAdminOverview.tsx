import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import WeldingAdminLayout from "@/components/welding/WeldingAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, DollarSign, Warehouse, Inbox, AlertTriangle } from "lucide-react";

const WeldingAdminOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ quotes: 0, newQuotes: 0, invoices: 0, unpaidTotal: 0, inventoryLow: 0, messages: 0 });

  useEffect(() => {
    const load = async () => {
      const [q, nq, inv, lowInv, msgs] = await Promise.all([
        supabase.from("welding_quotes" as any).select("id", { count: "exact", head: true }),
        supabase.from("welding_quotes" as any).select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("welding_invoices" as any).select("total, amount_paid, status"),
        supabase.from("welding_inventory" as any).select("id", { count: "exact", head: true }).lt("quantity", 10),
        supabase.from("welding_contact_messages" as any).select("id", { count: "exact", head: true }).eq("is_read", false),
      ]);
      const unpaid = (inv.data || []).filter((i: any) => i.status !== "paid").reduce((sum: number, i: any) => sum + Number(i.total) - Number(i.amount_paid), 0);
      setStats({ quotes: q.count || 0, newQuotes: nq.count || 0, invoices: (inv.data || []).length, unpaidTotal: unpaid, inventoryLow: lowInv.count || 0, messages: msgs.count || 0 });
    };
    load();
  }, []);

  const cards = [
    { label: "Total Quotes", value: stats.quotes, sub: `${stats.newQuotes} new`, icon: FileText, color: "text-primary", to: "/welding/quotes" },
    { label: "Unpaid Balance", value: `$${stats.unpaidTotal.toFixed(2)}`, sub: `${stats.invoices} invoices`, icon: DollarSign, color: "text-accent", to: "/welding/payments-due" },
    { label: "Low Stock Items", value: stats.inventoryLow, sub: "below threshold", icon: stats.inventoryLow > 0 ? AlertTriangle : Warehouse, color: stats.inventoryLow > 0 ? "text-destructive" : "text-primary", to: "/welding/inventory" },
    { label: "Unread Messages", value: stats.messages, sub: "from contact form", icon: Inbox, color: "text-primary", to: "/welding/messages" },
  ];

  return (
    <WeldingAdminLayout>
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-6">Welding Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => navigate(c.to)}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </WeldingAdminLayout>
  );
};

export default WeldingAdminOverview;
