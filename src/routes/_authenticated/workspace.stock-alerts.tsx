import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { AlertTriangle, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useShopRealtime } from "@/hooks/use-shop-realtime";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/shop/stock-alerts")({
  head: () => ({ meta: [{ title: "Stock Alerts — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: StockAlertsPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Stock Alerts</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
});

async function fetchAlerts() {
  const [alertsRes, itemsRes] = await Promise.all([
    (smSupabase as any).from("stock_alerts").select("*").order("created_at", { ascending: false }).limit(500),
    (smSupabase as any).from("inventory_items").select("id, name, sku, quantity, reorder_point"),
  ]);
  if (alertsRes.error) throw alertsRes.error;
  if (itemsRes.error) throw itemsRes.error;

  // Derived low-stock from live inventory (in addition to explicit stock_alerts rows)
  const derived = (itemsRes.data ?? [])
    .filter((i: any) => Number(i.quantity ?? 0) <= Number(i.reorder_point ?? 0))
    .map((i: any) => ({
      id: `derived-${i.id}`,
      product_id: i.id,
      product_name: i.name ?? i.sku,
      alert_type: Number(i.quantity ?? 0) === 0 ? "out_of_stock" : "low_stock",
      threshold_quantity: i.reorder_point ?? 0,
      current_quantity: i.quantity ?? 0,
      is_resolved: false,
      source: "derived",
    }));
  return { explicit: alertsRes.data ?? [], derived };
}

function StockAlertsPage() {
  useShopRealtime();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["sm", "stock-alerts"], queryFn: fetchAlerts });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (smSupabase as any).from("stock_alerts")
        .update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Resolved"); qc.invalidateQueries({ queryKey: ["sm", "stock-alerts"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const data = q.data ?? { explicit: [], derived: [] };
  const open = useMemo(() => [
    ...data.derived,
    ...data.explicit.filter((a: any) => !a.is_resolved),
  ], [data]);
  const resolved = useMemo(() => data.explicit.filter((a: any) => a.is_resolved), [data]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-primary" /> Stock Alerts</h1>
          <p className="text-sm text-muted-foreground">Items at or below reorder point.</p>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Open alerts</div><div className="text-2xl font-bold text-destructive">{open.length}</div></CardContent></Card>
          <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Out of stock</div><div className="text-2xl font-bold">{open.filter((a: any) => (a.current_quantity ?? 0) === 0).length}</div></CardContent></Card>
          <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Resolved (log)</div><div className="text-2xl font-bold text-emerald-600">{resolved.length}</div></CardContent></Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Open</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/shop/purchase-orders">Create PO</Link></Button>
          </CardHeader>
          <CardContent>
            {q.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : open.length === 0 ? (
              <p className="text-sm text-emerald-600">All inventory above reorder point.</p>
            ) : (
              <div className="space-y-1">
                {open.map((a: any) => (
                  <div key={a.id} className={`flex flex-wrap items-center gap-3 rounded border p-2 text-sm ${(a.current_quantity ?? 0) === 0 ? "border-destructive/50 bg-destructive/5" : ""}`}>
                    <div className="flex-1 min-w-0">
                      {a.source === "derived" ? (
                        <Link to="/shop/inventory/$id" params={{ id: a.product_id }} className="font-medium hover:underline">{a.product_name ?? a.product_id}</Link>
                      ) : (
                        <span className="font-mono text-xs">{a.product_id}</span>
                      )}
                    </div>
                    <Badge variant={(a.current_quantity ?? 0) === 0 ? "destructive" : "secondary"}>
                      {a.current_quantity ?? 0} / {a.threshold_quantity ?? 0} threshold
                    </Badge>
                    <Badge variant="outline">{a.alert_type ?? "low"}</Badge>
                    {a.source !== "derived" ? (
                      <Button size="sm" variant="outline" onClick={() => resolve.mutate(a.id)}>
                        <Check className="h-4 w-4 mr-1" /> Resolve
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {resolved.length ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Recently resolved</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {resolved.slice(0, 20).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 rounded border p-2 text-xs text-muted-foreground">
                    <span className="font-mono">{a.product_id}</span>
                    <span>{a.alert_type}</span>
                    <span className="flex-1" />
                    <span>{a.resolved_at ? new Date(a.resolved_at).toLocaleDateString() : ""}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </SiteLayout>
  );
}
