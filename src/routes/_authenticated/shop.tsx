import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Wrench,
  BarChart3,
  ClipboardList,
  Users2,
  Boxes,
  Receipt,
  FileText,
  Calendar as CalendarIcon,
  Car,
  PackageSearch,
  Truck,
  Loader2,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({
    meta: [
      { title: "Shop Manager — 365 Motor Sales" },
      { name: "description", content: "Live KPIs, recent work orders, and low-stock alerts for your shop." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShopHome,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Shop Manager</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

async function fetchDashboard() {
  const sm = smSupabase as any;
  const [wo, cust, inv, invc, lowStock, recent] = await Promise.all([
    sm.from("work_orders").select("id,status", { count: "exact" }).limit(1000),
    sm.from("customers").select("id", { count: "exact", head: true }),
    sm.from("inventory_items").select("id", { count: "exact", head: true }),
    sm.from("invoices").select("id,total,status").limit(1000),
    sm.from("inventory_items").select("id,name,sku,quantity,reorder_point").order("quantity", { ascending: true }).limit(6),
    sm.from("work_orders")
      .select("id,work_order_number,status,created_at,total_cost,customers(first_name,last_name)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const openWO = (wo.data ?? []).filter((w: any) =>
    !["completed", "closed", "cancelled", "canceled"].includes(String(w.status ?? "").toLowerCase()),
  ).length;
  const invoiceTotal = (invc.data ?? []).reduce((sum: number, i: any) => sum + Number(i.total ?? 0), 0);
  const outstandingInvoices = (invc.data ?? []).filter((i: any) =>
    !["paid", "void", "cancelled"].includes(String(i.status ?? "").toLowerCase()),
  ).length;
  const low = (lowStock.data ?? []).filter((i: any) => (i.quantity ?? 0) <= (i.reorder_point ?? 0));

  return {
    counts: {
      workOrders: wo.count ?? (wo.data?.length ?? 0),
      openWO,
      customers: cust.count ?? 0,
      inventory: inv.count ?? 0,
      invoiceTotal,
      outstandingInvoices,
    },
    lowStock: low,
    recent: recent.data ?? [],
  };
}

const QUICK_LINKS = [
  { title: "Work Orders", icon: ClipboardList, to: "/shop/work-orders" as const },
  { title: "Customers", icon: Users2, to: "/shop/customers" as const },
  { title: "Vehicles", icon: Car, to: "/shop/vehicles" as const },
  { title: "Inventory", icon: Boxes, to: "/shop/inventory" as const },
  { title: "Purchase Orders", icon: PackageSearch, to: "/shop/purchase-orders" as const },
  { title: "Invoices", icon: Receipt, to: "/shop/invoices" as const },
  { title: "Quotes", icon: FileText, to: "/shop/quotes" as const },
  { title: "Calendar", icon: CalendarIcon, to: "/shop/appointments" as const },
  { title: "Vendors", icon: Truck, to: "/shop/vendors" as const },
  { title: "Vendor Bills", icon: Receipt, to: "/shop/vendor-bills" as const },
  { title: "Reports", icon: BarChart3, to: "/shop/reports" as const },
];

function ShopHome() {
  const { data, isLoading } = useQuery({ queryKey: ["shop-manager", "dashboard"], queryFn: fetchDashboard });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Wrench className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Shop Manager</h1>
            <p className="text-muted-foreground">Run your shop. Win every job.</p>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…</div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard icon={ClipboardList} label="Open Work Orders" value={data.counts.openWO} to="/shop/work-orders" sub={`${data.counts.workOrders} total`} />
              <KpiCard icon={Users2} label="Customers" value={data.counts.customers} to="/shop/customers" />
              <KpiCard icon={Boxes} label="Inventory Items" value={data.counts.inventory} to="/shop/inventory" sub={data.lowStock.length ? `${data.lowStock.length} low-stock` : "healthy"} />
              <KpiCard icon={Receipt} label="Invoiced" value={`₱${data.counts.invoiceTotal.toLocaleString()}`} to="/shop/invoices" sub={`${data.counts.outstandingInvoices} outstanding`} />
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Recent Work Orders</CardTitle>
                  <Button asChild size="sm" variant="ghost"><Link to="/shop/work-orders">View all</Link></Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No work orders yet.</p>
                  ) : data.recent.map((w: any) => (
                    <Link
                      key={w.id}
                      to="/shop/work-orders/$id"
                      params={{ id: w.id }}
                      className="flex items-center justify-between rounded border p-2 text-sm hover:bg-muted/50"
                    >
                      <span className="font-mono">{w.work_order_number ?? w.id.slice(0, 8)}</span>
                      <span className="text-muted-foreground truncate mx-3">
                        {w.customers ? `${w.customers.first_name ?? ""} ${w.customers.last_name ?? ""}`.trim() : "—"}
                      </span>
                      <Badge variant="outline">{w.status ?? "—"}</Badge>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Low Stock</CardTitle>
                  <Button asChild size="sm" variant="ghost"><Link to="/shop/inventory">Inventory</Link></Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.lowStock.length === 0 ? (
                    <p className="text-sm text-muted-foreground">All items above reorder point.</p>
                  ) : data.lowStock.map((i: any) => (
                    <div key={i.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <span className="truncate">{i.name ?? i.sku ?? "—"}</span>
                      <Badge variant="destructive">{i.quantity ?? 0} left</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Modules</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((m) => (
            <Link key={m.title} to={m.to as any} className="block">
              <Card className="transition hover:border-primary/50 hover:shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <m.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{m.title}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-sm text-muted-foreground">
          Looking for pricing?{" "}
          <Link to="/shop-manager" className="underline hover:text-foreground">See Shop Manager plans</Link>.
        </div>
      </div>
    </SiteLayout>
  );
}

function KpiCard({ icon: Icon, label, value, sub, to }: { icon: any; label: string; value: React.ReactNode; sub?: string; to: any }) {
  return (
    <Link to={to} className="block">
      <Card className="transition hover:border-primary/50 hover:shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Icon className="h-4 w-4" /> {label}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
          {sub ? <div className="text-xs text-muted-foreground mt-1">{sub}</div> : null}
        </CardContent>
      </Card>
    </Link>
  );
}
