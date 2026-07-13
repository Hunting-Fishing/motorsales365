import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Wrench, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { smSupabase } from "@/lib/shop-manager/db";

type WorkOrderRow = {
  id: string;
  wo_number: string | null;
  status: string | null;
  created_at: string | null;
  total_amount: number | null;
  customer_id: string | null;
  customers?: { first_name: string | null; last_name: string | null } | null;
  vehicles?: { year: number | null; make: string | null; model: string | null } | null;
};

async function fetchWorkOrders(): Promise<WorkOrderRow[]> {
  const { data, error } = await (smSupabase as any)
    .from("work_orders")
    .select(
      "id, wo_number, status, created_at, total_amount, customer_id, customers(first_name,last_name), vehicles(year,make,model)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as WorkOrderRow[];
}

export const Route = createFileRoute("/_authenticated/shop/work-orders")({
  head: () => ({
    meta: [
      { title: "Work Orders — Shop Manager" },
      {
        name: "description",
        content:
          "Create, dispatch, and close repair jobs from inside 365 Motor Sales.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkOrdersList,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>
          Retry
        </Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">Not found.</div>
    </SiteLayout>
  ),
});

function statusVariant(status: string | null) {
  switch ((status ?? "").toLowerCase()) {
    case "completed":
    case "closed":
      return "secondary" as const;
    case "in_progress":
    case "in-progress":
    case "working":
      return "default" as const;
    case "cancelled":
    case "canceled":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function WorkOrdersList() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "work-orders", "list"],
    queryFn: fetchWorkOrders,
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Wrench className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Work Orders</h1>
              <p className="text-muted-foreground">
                Repair jobs for your shop, newest first.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to="/shop">
              <Plus className="mr-2 h-4 w-4" /> New Work Order
            </Link>
          </Button>
        </div>

        {data.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No work orders yet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Once your shop starts logging repair jobs they'll appear here.
              The "New Work Order" form is next on the porting list — for now,
              use the legacy screens under{" "}
              <code className="rounded bg-muted px-1">src/shop-manager/pages</code>.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>WO #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono">
                        {w.wo_number ?? w.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {w.customers
                          ? `${w.customers.first_name ?? ""} ${w.customers.last_name ?? ""}`.trim()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {w.vehicles
                          ? `${w.vehicles.year ?? ""} ${w.vehicles.make ?? ""} ${w.vehicles.model ?? ""}`.trim()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(w.status)}>
                          {w.status ?? "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof w.total_amount === "number"
                          ? `₱${w.total_amount.toLocaleString()}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {w.created_at
                          ? new Date(w.created_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </SiteLayout>
  );
}
