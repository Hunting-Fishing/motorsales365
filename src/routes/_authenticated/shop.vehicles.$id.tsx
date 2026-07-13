import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Wrench, Car } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

type Vehicle = {
  id: string;
  customer_id: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  trim: string | null;
  vin: string | null;
  license_plate: string | null;
  color: string | null;
  engine: string | null;
  transmission: string | null;
  drive_type: string | null;
  fuel_type: string | null;
  body_style: string | null;
  country: string | null;
  gvwr: string | null;
  owner_type: string | null;
  asset_category: string | null;
  asset_status: string | null;
  current_location: string | null;
  last_service_date: string | null;
  notes: string | null;
  created_at: string | null;
  customers?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

type WorkOrder = {
  id: string;
  work_order_number: string | null;
  status: string | null;
  description: string | null;
  total_cost: number | null;
  created_at: string | null;
};

async function fetchVehicle(id: string): Promise<Vehicle | null> {
  const { data, error } = await (smSupabase as any)
    .from("vehicles")
    .select(
      "id, customer_id, make, model, year, trim, vin, license_plate, color, engine, transmission, drive_type, fuel_type, body_style, country, gvwr, owner_type, asset_category, asset_status, current_location, last_service_date, notes, created_at, customers(first_name,last_name,email,phone)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Vehicle | null;
}

async function fetchWorkOrders(vehicleId: string): Promise<WorkOrder[]> {
  const { data, error } = await (smSupabase as any)
    .from("work_orders")
    .select("id, work_order_number, status, description, total_cost, created_at")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as WorkOrder[];
}

export const Route = createFileRoute("/_authenticated/shop/vehicles/$id")({
  head: () => ({
    meta: [
      { title: "Vehicle — Shop Manager" },
      { name: "description", content: "Vehicle detail with service history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VehicleDetail,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-bold">Vehicle</h1>
          <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
          <Button
            className="mt-4"
            onClick={() => {
              reset();
              router.invalidate();
            }}
          >
            Retry
          </Button>
        </div>
      </SiteLayout>
    );
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">Vehicle not found.</div>
    </SiteLayout>
  ),
});

function fmtCurrency(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
}

function Spec({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between gap-4 py-1 text-sm border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function VehicleDetail() {
  const { id } = Route.useParams();
  const vehicleQ = useQuery({
    queryKey: ["shop-manager", "vehicle", id],
    queryFn: () => fetchVehicle(id),
  });
  const workOrdersQ = useQuery({
    queryKey: ["shop-manager", "vehicle", id, "work-orders"],
    queryFn: () => fetchWorkOrders(id),
    enabled: !!vehicleQ.data,
  });

  if (vehicleQ.isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-5xl px-4 py-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicle…
        </div>
      </SiteLayout>
    );
  }

  const v = vehicleQ.data;
  if (!v) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/shop/customers">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <p>Vehicle not found.</p>
        </div>
      </SiteLayout>
    );
  }

  const title = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") || "Vehicle";
  const customerName = v.customers
    ? `${v.customers.first_name ?? ""} ${v.customers.last_name ?? ""}`.trim() || "Unnamed customer"
    : null;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm">
            {v.customer_id ? (
              <Link to="/shop/customers/$id" params={{ id: v.customer_id }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Customer
              </Link>
            ) : (
              <Link to="/shop/customers">
                <ArrowLeft className="h-4 w-4 mr-1" /> Customers
              </Link>
            )}
          </Button>
          <Button asChild size="sm">
            <Link
              to="/shop/work-orders/new"
              search={{ customerId: v.customer_id ?? undefined, vehicleId: v.id } as any}
            >
              <Wrench className="h-4 w-4 mr-1" /> New work order
            </Link>
          </Button>
        </div>

        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <Car className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold">{title}</h1>
            {v.color ? <Badge variant="outline">{v.color}</Badge> : null}
            {v.asset_status ? <Badge variant="secondary">{v.asset_status}</Badge> : null}
          </div>
          {customerName && v.customer_id ? (
            <p className="text-sm text-muted-foreground mt-1">
              Owner:{" "}
              <Link
                to="/shop/customers/$id"
                params={{ id: v.customer_id }}
                className="text-primary hover:underline"
              >
                {customerName}
              </Link>
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identification</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <Spec label="VIN" value={v.vin} />
              <Spec label="License plate" value={v.license_plate} />
              <Spec label="Year" value={v.year ?? undefined} />
              <Spec label="Make" value={v.make} />
              <Spec label="Model" value={v.model} />
              <Spec label="Trim" value={v.trim} />
              <Spec label="Color" value={v.color} />
              <Spec label="Country" value={v.country} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Powertrain & body</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <Spec label="Engine" value={v.engine} />
              <Spec label="Transmission" value={v.transmission} />
              <Spec label="Drive type" value={v.drive_type} />
              <Spec label="Fuel type" value={v.fuel_type} />
              <Spec label="Body style" value={v.body_style} />
              <Spec label="GVWR" value={v.gvwr} />
              <Spec label="Asset category" value={v.asset_category} />
              <Spec label="Current location" value={v.current_location} />
              <Spec label="Last serviced" value={fmtDate(v.last_service_date)} />
            </CardContent>
          </Card>
        </div>

        {v.notes ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{v.notes}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Service history ({workOrdersQ.data?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workOrdersQ.isLoading ? (
              <div className="text-muted-foreground text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
              </div>
            ) : (workOrdersQ.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No work orders yet for this vehicle.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrdersQ.data!.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <Link
                          to="/shop/work-orders/$id"
                          params={{ id: w.id }}
                          className="text-primary hover:underline font-medium"
                        >
                          {w.work_order_number || w.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>{fmtDate(w.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{w.status || "—"}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {w.description || "—"}
                      </TableCell>
                      <TableCell className="text-right">{fmtCurrency(w.total_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
