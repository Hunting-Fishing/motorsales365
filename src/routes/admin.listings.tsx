import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPHP, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/listings")({
  component: AdminListings,
});

function AdminListings() {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("listings")
      .select("id,title,price_php,status,created_at,user_id,payments(id,status,amount_php,kind)")
      .order("created_at", { ascending: false }).limit(100);
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    await supabase.from("listings").update({ status, published_at: status === "active" ? new Date().toISOString() : null }).eq("id", id);
    toast.success(`Listing ${status}`); load();
  };
  const markPaid = async (paymentId: string, listingId: string) => {
    await supabase.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", paymentId);
    await supabase.from("listings").update({ status: "active", published_at: new Date().toISOString() }).eq("id", listingId);
    toast.success("Payment confirmed, listing active"); load();
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Listings moderation</h1>
      <div className="space-y-2">
        {items.map((l) => {
          const pendingPayment = (l.payments ?? []).find((p: any) => p.status === "pending");
          return (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
              <div>
                <Link to="/listing/$id" params={{ id: l.id }} className="font-medium hover:text-primary">{l.title}</Link>
                <div className="text-xs text-muted-foreground">{formatPHP(l.price_php)} · {formatDate(l.created_at)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{l.status}</Badge>
                {pendingPayment && (
                  <Button size="sm" onClick={() => markPaid(pendingPayment.id, l.id)}>
                    Mark paid ({formatPHP(pendingPayment.amount_php)})
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setStatus(l.id, "hidden")}>Hide</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(l.id, "active")}>Activate</Button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">No listings.</div>}
      </div>
    </div>
  );
}
