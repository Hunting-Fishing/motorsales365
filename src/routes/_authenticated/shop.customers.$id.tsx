import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Car, Wrench, Mail, Phone, MapPin, Building2 } from "lucide-react";
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

type Customer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  company: string | null;
  notes: string | null;
  is_fleet: boolean | null;
  fleet_company: string | null;
  business_type: string | null;
  business_email: string | null;
  business_phone: string | null;
  communication_preference: string | null;
  referral_source: string | null;
  created_at: string | null;
};

type Vehicle = {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  license_plate: string | null;
  color: string | null;
  last_service_date: string | null;
};

type WorkOrder = {
  id: string;
  work_order_number: string | null;
  status: string | null;
  description: string | null;
  total_cost: number | null;
  created_at: string | null;
  vehicle_id: string | null;
};

async function fetchCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await (smSupabase as any)
    .from("customers")
    .select(
      "id, first_name, last_name, email, phone, address, city, state, postal_code, country, company, notes, is_fleet, fleet_company, business_type, business_email, business_phone, communication_preference, referral_source, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Customer | null;
}

async function fetchVehicles(customerId: string): Promise<Vehicle[]> {
  const { data, error } = await (smSupabase as any)
    .from("vehicles")
    .select("id, make, model, year, vin, license_plate, color, last_service_date")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Vehicle[];
}

async function fetchWorkOrders(customerId: string): Promise<WorkOrder[]> {
  const { data, error } = await (smSupabase as any)
    .from("work_orders")
    .select("id, work_order_number, status, description, total_cost, created_at, vehicle_id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as WorkOrder[];
}

export const Route = createFileRoute("/_authenticated/shop/customers/$id")({
  head: () => ({
    meta: [
      { title: "Customer — Shop Manager" },
      { name: "description", content: "Customer profile with vehicles and service history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomerDetail,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-bold">Customer</h1>
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
      <div className="mx-auto max-w-4xl px-4 py-10">Customer not found.</div>
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

function CustomerDetail() {
  const { id } = Route.useParams();
  const customerQ = useQuery({
    queryKey: ["shop-manager", "customer", id],
    queryFn: () => fetchCustomer(id),
  });
  const vehiclesQ = useQuery({
    queryKey: ["shop-manager", "customer", id, "vehicles"],
    queryFn: () => fetchVehicles(id),
    enabled: !!customerQ.data,
  });
  const workOrdersQ = useQuery({
    queryKey: ["shop-manager", "customer", id, "work-orders"],
    queryFn: () => fetchWorkOrders(id),
    enabled: !!customerQ.data,
  });

  if (customerQ.isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-5xl px-4 py-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading customer…
        </div>
      </SiteLayout>
    );
  }

  const c = customerQ.data;
  if (!c) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/shop/customers">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to customers
            </Link>
          </Button>
          <p>Customer not found.</p>
        </div>
      </SiteLayout>
    );
  }

  const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed customer";
  const addressLine = [c.address, c.city, c.state, c.postal_code, c.country].filter(Boolean).join(", ");

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/shop/customers">
              <ArrowLeft className="h-4 w-4 mr-1" /> Customers
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link
              to="/shop/work-orders/new"
              search={{ customerId: c.id } as any}
            >
              <Wrench className="h-4 w-4 mr-1" /> New work order
            </Link>
          </Button>
        </div>

        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{fullName}</h1>
            {c.is_fleet ? <Badge variant="secondary">Fleet</Badge> : null}
            {c.business_type ? <Badge variant="outline">{c.business_type}</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Customer since {fmtDate(c.created_at)}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{c.email || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{c.phone || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{addressLine || "—"}</span>
              </div>
              {c.communication_preference ? (
                <div className="text-muted-foreground">
                  Prefers: {c.communication_preference}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{c.company || c.fleet_company || "—"}</span>
              </div>
              {c.business_email ? (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{c.business_email}</span>
                </div>
              ) : null}
              {c.business_phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{c.business_phone}</span>
                </div>
              ) : null}
              {c.referral_source ? (
                <div className="text-muted-foreground">Referred by: {c.referral_source}</div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {c.notes ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{c.notes}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4" /> Vehicles ({vehiclesQ.data?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehiclesQ.isLoading ? (
              <div className="text-muted-foreground text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicles…
              </div>
            ) : (vehiclesQ.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicles on file.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>VIN</TableHead>
                    <TableHead>Last service</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehiclesQ.data!.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        {[v.year, v.make, v.model].filter(Boolean).join(" ") || "—"}
                        {v.color ? (
                          <span className="text-muted-foreground"> · {v.color}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{v.license_plate || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{v.vin || "—"}</TableCell>
                      <TableCell>{fmtDate(v.last_service_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Work order history ({workOrdersQ.data?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workOrdersQ.isLoading ? (
              <div className="text-muted-foreground text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
              </div>
            ) : (workOrdersQ.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No work orders yet.</p>
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
