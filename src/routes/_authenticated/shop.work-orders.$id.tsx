import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Wrench } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { smSupabase } from "@/lib/shop-manager/db";

type WorkOrderDetail = {
  id: string;
  work_order_number: string | null;
  status: string | null;
  priority: string | null;
  service_type: string | null;
  description: string | null;
  customer_complaint: string | null;
  diagnostic_notes: string | null;
  additional_info: string | null;
  urgency_level: string | null;
  estimated_hours: number | null;
  total_cost: number | null;
  initial_mileage: number | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string | null;
  updated_at: string | null;
  customer_id: string | null;
  vehicle_id: string | null;
  customers?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  vehicles?: {
    year: number | null;
    make: string | null;
    model: string | null;
    license_plate?: string | null;
    vin?: string | null;
  } | null;
};

async function fetchWorkOrder(id: string): Promise<WorkOrderDetail | null> {
  const { data, error } = await (smSupabase as any)
    .from("work_orders")
    .select(
      "id, work_order_number, status, priority, service_type, description, customer_complaint, diagnostic_notes, additional_info, urgency_level, estimated_hours, total_cost, initial_mileage, start_time, end_time, created_at, updated_at, customer_id, vehicle_id, customers(first_name,last_name,email,phone), vehicles(year,make,model,license_plate,vin)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as WorkOrderDetail) ?? null;
}

export const Route = createFileRoute("/_authenticated/shop/work-orders/$id")({
  head: () => ({
    meta: [
      { title: "Work Order — Shop Manager" },
      { name: "description", content: "Repair job details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkOrderDetailPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-bold">Work Order</h1>
          <p className="mt-2 text-destructive">
            {String((error as any)?.message ?? error)}
          </p>
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
      <div className="mx-auto max-w-4xl px-4 py-10">Work order not found.</div>
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

function WorkOrderDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["shop-manager", "work-orders", "detail", id],
    queryFn: () => fetchWorkOrder(id),
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/shop/work-orders">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to work orders
          </Link>
        </Button>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !data ? (
          <Card>
            <CardHeader>
              <CardTitle>Work order not found</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This job may have been deleted or your shop no longer has access.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Wrench className="h-7 w-7 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">
                    WO #{data.work_order_number ?? data.id.slice(0, 8)}
                  </h1>
                  <p className="text-muted-foreground">
                    {data.service_type ?? "Service"} ·{" "}
                    {data.created_at
                      ? new Date(data.created_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant={statusVariant(data.status)}>
                  {data.status ?? "unknown"}
                </Badge>
                {data.priority ? (
                  <Badge variant="outline">Priority: {data.priority}</Badge>
                ) : null}
                {data.urgency_level ? (
                  <Badge variant="outline">Urgency: {data.urgency_level}</Badge>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Customer</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {data.customers && data.customer_id ? (
                    <>
                      <div className="font-medium">
                        <Link
                          to="/shop/customers/$id"
                          params={{ id: data.customer_id }}
                          className="text-primary hover:underline"
                        >
                          {`${data.customers.first_name ?? ""} ${data.customers.last_name ?? ""}`.trim() ||
                            "—"}
                        </Link>
                      </div>
                      <div className="text-muted-foreground">
                        {data.customers.email ?? "no email"}
                      </div>
                      <div className="text-muted-foreground">
                        {data.customers.phone ?? "no phone"}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      No customer attached.
                    </span>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vehicle</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {data.vehicles ? (
                    <>
                      <div className="font-medium">
                        {`${data.vehicles.year ?? ""} ${data.vehicles.make ?? ""} ${data.vehicles.model ?? ""}`.trim() ||
                          "—"}
                      </div>
                      <div className="text-muted-foreground">
                        Plate: {data.vehicles.license_plate ?? "—"}
                      </div>
                      <div className="text-muted-foreground">
                        VIN: {data.vehicles.vin ?? "—"}
                      </div>
                      <div className="text-muted-foreground">
                        Mileage in:{" "}
                        {data.initial_mileage != null
                          ? data.initial_mileage.toLocaleString()
                          : "—"}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      No vehicle attached.
                    </span>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Complaint & scope</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Field label="Description" value={data.description} />
                  <Field
                    label="Customer complaint"
                    value={data.customer_complaint}
                  />
                  <Field
                    label="Diagnostic notes"
                    value={data.diagnostic_notes}
                  />
                  <Field label="Additional info" value={data.additional_info} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Field
                    label="Start"
                    value={
                      data.start_time
                        ? new Date(data.start_time).toLocaleString()
                        : null
                    }
                  />
                  <Field
                    label="End"
                    value={
                      data.end_time
                        ? new Date(data.end_time).toLocaleString()
                        : null
                    }
                  />
                  <Field
                    label="Estimated hours"
                    value={
                      data.estimated_hours != null
                        ? String(data.estimated_hours)
                        : null
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Totals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Field
                    label="Total cost"
                    value={
                      data.total_cost != null
                        ? `₱${Number(data.total_cost).toLocaleString()}`
                        : null
                    }
                  />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </SiteLayout>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="whitespace-pre-wrap">
        {value && value.length > 0 ? (
          value
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}
