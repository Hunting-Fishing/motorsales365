import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Wrench, Package, ListChecks, Plus, Trash2, Receipt, ClipboardCheck } from "lucide-react";
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
    .select("id,name,category,description,estimated_hours,labor_rate,total_amount,status,display_order")
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
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["shop-manager", "work-orders", "detail", id],
    queryFn: () => fetchWorkOrder(id),
  });
  const { data: jobLines = [] } = useQuery({
    queryKey: ["shop-manager", "work-orders", "job-lines", id],
    queryFn: () => fetchJobLines(id),
  });
  const { data: parts = [] } = useQuery({
    queryKey: ["shop-manager", "work-orders", "parts", id],
    queryFn: () => fetchWorkOrderParts(id),
  });
  const partsTotal = parts.reduce(
    (s, p) => s + (Number(p.customer_price ?? 0) * Number(p.quantity ?? 0)),
    0,
  );
  const laborTotal = jobLines.reduce((s, j) => s + Number(j.total_amount ?? 0), 0);

  const generateInvoice = useMutation({
    mutationFn: async () => {
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
        const { error: itErr } = await (smSupabase as any)
          .from("invoice_items")
          .insert(items);
        if (itErr) throw itErr;
      }
      return invoiceId;
    },
    onSuccess: (invoiceId) => {
      toast.success("Invoice created");
      qc.invalidateQueries({ queryKey: ["shop-manager", "invoices"] });
      navigate({ to: "/shop/invoices/$id", params: { id: invoiceId } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to generate invoice"),
  });


  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await (smSupabase as any)
        .from("work_orders")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["shop-manager", "work-orders"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });

  const deleteJobLine = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await (smSupabase as any)
        .from("work_order_job_lines")
        .delete()
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job line removed");
      qc.invalidateQueries({ queryKey: ["shop-manager", "work-orders", "job-lines", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const deletePart = useMutation({
    mutationFn: async (partId: string) => {
      const { error } = await (smSupabase as any)
        .from("work_order_parts")
        .delete()
        .eq("id", partId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Part removed");
      qc.invalidateQueries({ queryKey: ["shop-manager", "work-orders", "parts", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
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
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(data.status)}>
                  {data.status ?? "unknown"}
                </Badge>
                <Select
                  value={data.status ?? undefined}
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
                {data.priority ? (
                  <Badge variant="outline">Priority: {data.priority}</Badge>
                ) : null}
                <Button
                  size="sm"
                  variant="default"
                  disabled={generateInvoice.isPending || (jobLines.length === 0 && parts.length === 0)}
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
                  {data.vehicles && data.vehicle_id ? (
                    <>
                      <div className="font-medium">
                        <Link
                          to="/shop/vehicles/$id"
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
                    label="Labor"
                    value={laborTotal ? `₱${laborTotal.toLocaleString()}` : null}
                  />
                  <Field
                    label="Parts"
                    value={partsTotal ? `₱${partsTotal.toLocaleString()}` : null}
                  />
                  <Field
                    label="Total cost"
                    value={
                      data.total_cost != null
                        ? `₱${Number(data.total_cost).toLocaleString()}`
                        : `₱${(laborTotal + partsTotal).toLocaleString()}`
                    }
                  />
                </CardContent>
              </Card>

              <div className="md:col-span-2">
                <WorkOrderInspectionsCard workOrderId={id} />
              </div>



              <Card className="md:col-span-2">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListChecks className="h-4 w-4" /> Job lines ({jobLines.length})
                  </CardTitle>
                  <AddJobLineDialog workOrderId={id} nextOrder={jobLines.length} />
                </CardHeader>
                <CardContent className="p-0">
                  {jobLines.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-muted-foreground">
                      No job lines yet.
                    </div>
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
                              {j.labor_rate != null ? Number(j.labor_rate).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {j.total_amount != null ? Number(j.total_amount).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{j.status ?? "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
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
                    <Package className="h-4 w-4" /> Parts ({parts.length})
                  </CardTitle>
                  <AddPartDialog workOrderId={id} />
                </CardHeader>
                <CardContent className="p-0">
                  {parts.length === 0 ? (
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
                              <TableCell className="font-mono text-xs">{p.part_number ?? "—"}</TableCell>
                              <TableCell>{p.supplier_name ?? "—"}</TableCell>
                              <TableCell className="text-right">{qty}</TableCell>
                              <TableCell className="text-right">{price.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{(qty * price).toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{p.status ?? "—"}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
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

              <WorkOrderTimeEntries workOrderId={id} />
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

function AddJobLineDialog({
  workOrderId,
  nextOrder,
}: {
  workOrderId: string;
  nextOrder: number;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");

  const total =
    (Number(hours) || 0) * (Number(rate) || 0);

  const create = useMutation({
    mutationFn: async () => {
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
      const { error } = await (smSupabase as any)
        .from("work_order_job_lines")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job line added");
      qc.invalidateQueries({ queryKey: ["shop-manager", "work-orders", "job-lines", workOrderId] });
      setOpen(false);
      setName("");
      setCategory("");
      setDescription("");
      setHours("");
      setRate("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to add job line"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
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
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Oil change" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <Label>Est. hours</Label>
              <Input type="number" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Labor rate ₱/hr</Label>
              <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
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
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPartDialog({ workOrderId }: { workOrderId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [partType, setPartType] = useState("new");

  const create = useMutation({
    mutationFn: async () => {
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
      const { error } = await (smSupabase as any)
        .from("work_order_parts")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Part added");
      qc.invalidateQueries({ queryKey: ["shop-manager", "work-orders", "parts", workOrderId] });
      setOpen(false);
      setPartName("");
      setPartNumber("");
      setSupplier("");
      setQty("1");
      setPrice("");
      setPartType("new");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to add part"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
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
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
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
            disabled={!partName.trim() || !price || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
