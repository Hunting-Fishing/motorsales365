import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Wrench,
  Package,
  ListChecks,
  Plus,
  Trash2,
  Receipt,
  ClipboardCheck,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { smSupabase } from "@/lib/shop-manager/db";
import { WorkOrderTimeEntries } from "@/components/shop-manager/work-order-time-entries";
import { WorkOrderInspectionsCard } from "@/components/shop-manager/work-order-inspections-card";
import { useAuth } from "@/hooks/use-auth";

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

type JobLine = {
  id: string;
  name: string | null;
  category: string | null;
  description: string | null;
  estimated_hours: number | null;
  labor_rate: number | null;
  total_amount: number | null;
  status: string | null;
  display_order: number | null;
};

type WorkOrderPart = {
  id: string;
  part_name: string | null;
  part_number: string | null;
  supplier_name: string | null;
  quantity: number | null;
  customer_price: number | null;
  status: string | null;
  category: string | null;
};

async function fetchJobLines(id: string): Promise<JobLine[]> {
  const { data, error } = await (smSupabase as any)
    .from("work_order_job_lines")
    .select(
      "id,name,category,description,estimated_hours,labor_rate,total_amount,status,display_order",
    )
    .eq("work_order_id", id)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as JobLine[];
}

async function fetchWorkOrderParts(id: string): Promise<WorkOrderPart[]> {
  const { data, error } = await (smSupabase as any)
    .from("work_order_parts")
    .select("id,part_name,part_number,supplier_name,quantity,customer_price,status,category")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkOrderPart[];
}

export const Route = createFileRoute("/_authenticated/workspace/work-orders/$id")({
  head: () => ({
    meta: [
      { title: "Work Order — Shop Manager" },
      { name: "description", content: "Repair job details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkOrderDetailPage,
  errorComponent: function WorkOrderRouteError({ reset }) {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-bold">Work Order</h1>
          <p className="mt-2 text-destructive">Could not load this work order.</p>
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

const WO_STATUSES = [
  "pending",
  "in_progress",
  "on_hold",
  "waiting_parts",
  "completed",
  "cancelled",
] as const;

function WorkOrderDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  if (!user) return null;
  // Remount local editors and mutation observers across account/target changes.
  return <AuthenticatedWorkOrderDetail key={`${user.id}:${id}`} userId={user.id} id={id} />;
}

function useActiveScope() {
  const active = useRef(false);
  useLayoutEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return useCallback(() => active.current, []);
}

const php = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const money = (value: number) => php.format(value);

function AuthenticatedWorkOrderDetail({ userId, id }: { userId: string; id: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isCurrent = useActiveScope();
  const detailQ = useQuery({
    queryKey: ["shop-manager", userId, "work-orders", "detail", id],
    queryFn: () => fetchWorkOrder(id),
  });
  const { data, isLoading } = detailQ;
  const jobLinesQ = useQuery({
    queryKey: ["shop-manager", userId, "work-orders", "job-lines", id],
    queryFn: () => fetchJobLines(id),
    enabled: detailQ.isSuccess && !!data,
  });
  const partsQ = useQuery({
    queryKey: ["shop-manager", userId, "work-orders", "parts", id],
    queryFn: () => fetchWorkOrderParts(id),
    enabled: detailQ.isSuccess && !!data,
  });
  const jobLines = jobLinesQ.data ?? [];
  const parts = partsQ.data ?? [];
  const writesReady =
    detailQ.isSuccess &&
    !!data &&
    jobLinesQ.isSuccess &&
    partsQ.isSuccess &&
    !detailQ.isFetching &&
    !jobLinesQ.isFetching &&
    !partsQ.isFetching;
  const ready = useRef(false);
  useLayoutEffect(() => {
    ready.current = writesReady;
  }, [writesReady]);
  const assertCanWrite = () => {
    if (!isCurrent() || !ready.current) throw new Error("Work order data is not ready");
  };
  const refreshWorkOrder = () => {
    if (!isCurrent()) return;
    void qc.invalidateQueries({
      queryKey: ["shop-manager", userId, "work-orders", "detail", id],
      exact: true,
    });
    // Keep the existing list producer compatible until that route is scoped.
    void qc.invalidateQueries({
      queryKey: ["shop-manager", "work-orders", "list"],
      exact: true,
    });
    if (data?.customer_id) {
      void qc.invalidateQueries({
        queryKey: ["shop-manager", userId, "customer", data.customer_id, "work-orders"],
        exact: true,
      });
    }
    if (data?.vehicle_id) {
      void qc.invalidateQueries({
        queryKey: ["shop-manager", userId, "vehicle", data.vehicle_id, "work-orders"],
        exact: true,
      });
    }
  };
  const partsTotal = parts.reduce(
    (s, p) => s + Number(p.customer_price ?? 0) * Number(p.quantity ?? 0),
    0,
  );
  const laborTotal = jobLines.reduce((s, j) => s + Number(j.total_amount ?? 0), 0);

  const generateInvoice = useMutation({
    mutationFn: async () => {
      assertCanWrite();
      if (!data) throw new Error("Work order not loaded");
      if (!data.customer_id) throw new Error("Work order has no customer");
      if (jobLines.length === 0 && parts.length === 0) {
        throw new Error("Add job lines or parts before invoicing");
      }
      const subtotal = laborTotal + partsTotal;
      const invoiceId = `INV-${Date.now().toString(36).toUpperCase()}`;
      const customerName = data.customers
        ? `${(data.customers as any).first_name ?? ""} ${(data.customers as any).last_name ?? ""}`.trim()
        : null;

      const { error: invErr } = await (smSupabase as any).from("invoices").insert({
        id: invoiceId,
        customer: customerName,
        customer_id: data.customer_id,
        customer_email: (data.customers as any)?.email ?? null,
        work_order_id: data.id,
        description: data.description ?? data.service_type ?? null,
        date: new Date().toISOString(),
        status: "draft",
        subtotal,
        tax: 0,
        total: subtotal,
      });
      if (invErr) throw invErr;
      // An already-dispatched insert cannot be undone here. Never dispatch its
      // follow-up using a different account's current session after a remount.
      assertCanWrite();

      const items = [
        ...jobLines.map((j: any) => ({
          invoice_id: invoiceId,
          name: j.name ?? "Labor",
          description: j.description ?? null,
          quantity: Number(j.hours ?? 1),
          price: Number(j.labor_rate ?? j.total_amount ?? 0),
          total: Number(j.total_amount ?? 0),
          hours: true,
        })),
        ...parts.map((p: any) => ({
          invoice_id: invoiceId,
          name: p.name ?? p.part_number ?? "Part",
          description: p.description ?? p.part_number ?? null,
          quantity: Number(p.quantity ?? 1),
          price: Number(p.customer_price ?? p.unit_price ?? 0),
          total: Number(p.customer_price ?? 0) * Number(p.quantity ?? 0),
          hours: false,
        })),
      ];
      if (items.length > 0) {
        const { error: itErr } = await (smSupabase as any).from("invoice_items").insert(items);
        if (itErr) throw itErr;
      }
      return invoiceId;
    },
    onSuccess: (invoiceId) => {
      if (!isCurrent()) return;
      toast.success("Invoice created");
      qc.invalidateQueries({ queryKey: ["shop-manager", userId, "invoices"] });
      qc.invalidateQueries({
        queryKey: ["shop-manager", "invoices", "list"],
        exact: true,
      });
      qc.invalidateQueries({
        queryKey: ["shop-manager", userId, "customer", data?.customer_id, "invoices"],
      });
      navigate({ to: "/workspace/invoices/$id", params: { id: invoiceId } });
    },
    onError: () => {
      if (!isCurrent()) return;
      // Header/item writes are not atomic yet; refresh to reveal any partial
      // header, and never encourage an uninspected duplicate retry.
      void qc.invalidateQueries({ queryKey: ["shop-manager", "invoices", "list"], exact: true });
      void qc.invalidateQueries({ queryKey: ["shop-manager", userId, "invoices"] });
      void qc.invalidateQueries({
        queryKey: ["shop-manager", userId, "customer", data?.customer_id, "invoices"],
      });
      toast.error(
        "Could not finish creating this invoice. Check existing invoices before trying again.",
      );
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      assertCanWrite();
      const { error } = await (smSupabase as any)
        .from("work_orders")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (!isCurrent()) return;
      toast.success("Status updated");
      refreshWorkOrder();
    },
    onError: () => {
      if (isCurrent()) toast.error("Could not update this work order. Please retry.");
    },
  });

  const deleteJobLine = useMutation({
    mutationFn: async (jobId: string) => {
      assertCanWrite();
      const { error } = await (smSupabase as any)
        .from("work_order_job_lines")
        .delete()
        .eq("id", jobId)
        .eq("work_order_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (!isCurrent()) return;
      toast.success("Job line removed");
      qc.invalidateQueries({ queryKey: ["shop-manager", userId, "work-orders", "job-lines", id] });
      refreshWorkOrder();
    },
    onError: () => {
      if (isCurrent()) toast.error("Could not remove this job line. Please retry.");
    },
  });

  const deletePart = useMutation({
    mutationFn: async (partId: string) => {
      assertCanWrite();
      const { error } = await (smSupabase as any)
        .from("work_order_parts")
        .delete()
        .eq("id", partId)
        .eq("work_order_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (!isCurrent()) return;
      toast.success("Part removed");
      qc.invalidateQueries({ queryKey: ["shop-manager", userId, "work-orders", "parts", id] });
      refreshWorkOrder();
    },
    onError: () => {
      if (isCurrent()) toast.error("Could not remove this part. Please retry.");
    },
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/workspace/work-orders">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to work orders
          </Link>
        </Button>

        {detailQ.isError ? (
          <div role="alert" className="space-y-3">
            <p>Could not load this work order.</p>
            <Button variant="outline" onClick={() => void detailQ.refetch()}>
              Retry work order
            </Button>
          </div>
        ) : isLoading ? (
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
                    {data.created_at ? new Date(data.created_at).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(data.status)}>{data.status ?? "unknown"}</Badge>
                <Select
                  value={data.status ?? undefined}
                  disabled={!writesReady || updateStatus.isPending}
                  onValueChange={(v) => updateStatus.mutate(v)}
                >
                  <SelectTrigger className="h-8 w-[170px]">
                    <SelectValue placeholder="Change status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {WO_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {data.priority ? <Badge variant="outline">Priority: {data.priority}</Badge> : null}
                <Button
                  size="sm"
                  variant="default"
                  disabled={
                    !writesReady ||
                    generateInvoice.isPending ||
                    (jobLines.length === 0 && parts.length === 0)
                  }
                  onClick={() => generateInvoice.mutate()}
                >
                  {generateInvoice.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Receipt className="mr-1 h-4 w-4" />
                  )}
                  Generate invoice
                </Button>
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
                          to="/workspace/customers/$id"
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
                    <span className="text-muted-foreground">No customer attached.</span>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vehicle</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {data.vehicles && data.vehicle_id ? (
                    <>
                      <div className="font-medium">
                        <Link
                          to="/workspace/vehicles/$id"
                          params={{ id: data.vehicle_id }}
                          className="text-primary hover:underline"
                        >
                          {`${data.vehicles.year ?? ""} ${data.vehicles.make ?? ""} ${data.vehicles.model ?? ""}`.trim() ||
                            "Vehicle"}
                        </Link>
                      </div>
                      <div className="text-muted-foreground">
                        Plate: {data.vehicles.license_plate ?? "—"}
                      </div>
                      <div className="text-muted-foreground">VIN: {data.vehicles.vin ?? "—"}</div>
                      <div className="text-muted-foreground">
                        Mileage in:{" "}
                        {data.initial_mileage != null ? data.initial_mileage.toLocaleString() : "—"}
                      </div>
                      <Button asChild size="sm" variant="outline" className="mt-3">
                        <Link
                          to="/parts/network"
                          search={{
                            q: "",
                            category: "",
                            brand: "",
                            make: data.vehicles.make ?? "",
                            model: data.vehicles.model ?? "",
                            year: data.vehicles.year ?? 0,
                            province: "",
                            vin: data.vehicles.vin ?? "",
                            workOrderId: data.id,
                          }}
                        >
                          <Package className="mr-1.5 h-3.5 w-3.5" /> Find parts for this work order
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No vehicle attached.</span>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Complaint & scope</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Field label="Description" value={data.description} />
                  <Field label="Customer complaint" value={data.customer_complaint} />
                  <Field label="Diagnostic notes" value={data.diagnostic_notes} />
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
                    value={data.start_time ? new Date(data.start_time).toLocaleString() : null}
                  />
                  <Field
                    label="End"
                    value={data.end_time ? new Date(data.end_time).toLocaleString() : null}
                  />
                  <Field
                    label="Estimated hours"
                    value={data.estimated_hours != null ? String(data.estimated_hours) : null}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Totals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Field
                    label="Labor"
                    value={jobLinesQ.isSuccess ? money(laborTotal) : "Unavailable"}
                  />
                  <Field
                    label="Parts"
                    value={partsQ.isSuccess ? money(partsTotal) : "Unavailable"}
                  />
                  <Field
                    label="Total cost"
                    value={
                      data.total_cost != null
                        ? money(Number(data.total_cost))
                        : jobLinesQ.isSuccess && partsQ.isSuccess
                          ? money(laborTotal + partsTotal)
                          : "Unavailable"
                    }
                  />
                </CardContent>
              </Card>

              <div className="md:col-span-2">
                <WorkOrderInspectionsCard key={`${userId}:${id}`} workOrderId={id} />
              </div>

              <Card className="md:col-span-2">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListChecks className="h-4 w-4" /> Job lines
                    {jobLinesQ.isSuccess ? ` (${jobLines.length})` : ""}
                  </CardTitle>
                  <AddJobLineDialog
                    userId={userId}
                    workOrderId={id}
                    nextOrder={jobLines.length}
                    canWrite={writesReady}
                    isScopeCurrent={isCurrent}
                    assertCanWrite={assertCanWrite}
                    onWritten={refreshWorkOrder}
                  />
                </CardHeader>
                <CardContent className="p-0">
                  {jobLinesQ.isError ? (
                    <div role="alert" className="space-y-2 px-6 pb-6 text-sm">
                      <p>Could not load job lines.</p>
                      <Button variant="outline" size="sm" onClick={() => void jobLinesQ.refetch()}>
                        Retry job lines
                      </Button>
                    </div>
                  ) : jobLinesQ.isPending ? (
                    <p role="status" className="px-6 pb-6 text-sm">
                      Loading job lines…
                    </p>
                  ) : jobLines.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-muted-foreground">No job lines yet.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Hrs</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Total ₱</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobLines.map((j) => (
                          <TableRow key={j.id}>
                            <TableCell className="font-medium">{j.name ?? "—"}</TableCell>
                            <TableCell>{j.category ?? "—"}</TableCell>
                            <TableCell className="text-right">{j.estimated_hours ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              {j.labor_rate != null ? money(Number(j.labor_rate)) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {j.total_amount != null ? money(Number(j.total_amount)) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{j.status ?? "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove ${j.name ?? "job line"}`}
                                disabled={!writesReady || deleteJobLine.isPending}
                                onClick={() => {
                                  if (confirm("Remove this job line?")) deleteJobLine.mutate(j.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" /> Parts
                    {partsQ.isSuccess ? ` (${parts.length})` : ""}
                  </CardTitle>
                  <AddPartDialog
                    userId={userId}
                    workOrderId={id}
                    canWrite={writesReady}
                    isScopeCurrent={isCurrent}
                    assertCanWrite={assertCanWrite}
                    onWritten={refreshWorkOrder}
                  />
                </CardHeader>
                <CardContent className="p-0">
                  {partsQ.isError ? (
                    <div role="alert" className="space-y-2 px-6 pb-6 text-sm">
                      <p>Could not load parts.</p>
                      <Button variant="outline" size="sm" onClick={() => void partsQ.refetch()}>
                        Retry parts
                      </Button>
                    </div>
                  ) : partsQ.isPending ? (
                    <p role="status" className="px-6 pb-6 text-sm">
                      Loading parts…
                    </p>
                  ) : parts.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-muted-foreground">
                      No parts attached.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Part</TableHead>
                          <TableHead>Part #</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price ₱</TableHead>
                          <TableHead className="text-right">Total ₱</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parts.map((p) => {
                          const qty = Number(p.quantity ?? 0);
                          const price = Number(p.customer_price ?? 0);
                          return (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">{p.part_name ?? "—"}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {p.part_number ?? "—"}
                              </TableCell>
                              <TableCell>{p.supplier_name ?? "—"}</TableCell>
                              <TableCell className="text-right">{qty}</TableCell>
                              <TableCell className="text-right">{money(price)}</TableCell>
                              <TableCell className="text-right">{money(qty * price)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{p.status ?? "—"}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Remove ${p.part_name ?? "part"}`}
                                  disabled={!writesReady || deletePart.isPending}
                                  onClick={() => {
                                    if (confirm("Remove this part?")) deletePart.mutate(p.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <WorkOrderTimeEntries key={`${userId}:${id}`} workOrderId={id} />
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
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">
        {value && value.length > 0 ? value : <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

type EditorScope = {
  userId: string;
  workOrderId: string;
  canWrite: boolean;
  isScopeCurrent: () => boolean;
  assertCanWrite: () => void;
  onWritten: () => void;
};

function AddJobLineDialog({
  userId,
  workOrderId,
  nextOrder,
  canWrite,
  isScopeCurrent,
  assertCanWrite,
  onWritten,
}: EditorScope & { nextOrder: number }) {
  const qc = useQueryClient();
  const isMounted = useActiveScope();
  const isCurrent = () => isMounted() && isScopeCurrent();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");

  const total = (Number(hours) || 0) * (Number(rate) || 0);

  const create = useMutation({
    mutationFn: async () => {
      if (!isCurrent()) throw new Error("Editor is no longer active");
      assertCanWrite();
      const payload = {
        work_order_id: workOrderId,
        name: name.trim(),
        category: category.trim() || null,
        description: description.trim() || null,
        estimated_hours: hours ? Number(hours) : null,
        labor_rate: rate ? Number(rate) : null,
        total_amount: total || null,
        display_order: nextOrder,
        status: "pending",
      };
      const { error } = await (smSupabase as any).from("work_order_job_lines").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      if (!isCurrent()) return;
      toast.success("Job line added");
      qc.invalidateQueries({
        queryKey: ["shop-manager", userId, "work-orders", "job-lines", workOrderId],
      });
      onWritten();
      setOpen(false);
      setName("");
      setCategory("");
      setDescription("");
      setHours("");
      setRate("");
    },
    onError: () => {
      if (isCurrent()) toast.error("Could not add this job line. Please retry.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!canWrite}>
          <Plus className="mr-1 h-4 w-4" /> Add job line
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add job line</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Job name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Oil change"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <Label>Est. hours</Label>
              <Input
                type="number"
                step="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Labor rate ₱/hr</Label>
              <Input
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            <div>
              <Label>Total ₱</Label>
              <Input value={total ? total.toLocaleString() : ""} readOnly />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canWrite || !name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPartDialog({
  userId,
  workOrderId,
  canWrite,
  isScopeCurrent,
  assertCanWrite,
  onWritten,
}: EditorScope) {
  const qc = useQueryClient();
  const isMounted = useActiveScope();
  const isCurrent = () => isMounted() && isScopeCurrent();
  const [open, setOpen] = useState(false);
  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [partType, setPartType] = useState("new");

  const create = useMutation({
    mutationFn: async () => {
      if (!isCurrent()) throw new Error("Editor is no longer active");
      assertCanWrite();
      const payload = {
        work_order_id: workOrderId,
        part_name: partName.trim(),
        part_number: partNumber.trim() || null,
        supplier_name: supplier.trim() || null,
        quantity: Number(qty) || 1,
        customer_price: Number(price) || 0,
        part_type: partType,
        status: "pending",
      };
      const { error } = await (smSupabase as any).from("work_order_parts").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      if (!isCurrent()) return;
      toast.success("Part added");
      qc.invalidateQueries({
        queryKey: ["shop-manager", userId, "work-orders", "parts", workOrderId],
      });
      onWritten();
      setOpen(false);
      setPartName("");
      setPartNumber("");
      setSupplier("");
      setQty("1");
      setPrice("");
      setPartType("new");
    },
    onError: () => {
      if (isCurrent()) toast.error("Could not add this part. Please retry.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!canWrite}>
          <Plus className="mr-1 h-4 w-4" /> Add part
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add part</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Part name *</Label>
            <Input value={partName} onChange={(e) => setPartName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Part #</Label>
              <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
            </div>
            <div>
              <Label>Supplier</Label>
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Qty *</Label>
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <Label>Price ₱ *</Label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={partType} onValueChange={setPartType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="oem">OEM</SelectItem>
                  <SelectItem value="aftermarket">Aftermarket</SelectItem>
                  <SelectItem value="refurbished">Refurbished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canWrite || !partName.trim() || !price || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
