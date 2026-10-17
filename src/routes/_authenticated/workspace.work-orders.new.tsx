import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, Loader2, Wrench } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { smSupabase } from "@/lib/shop-manager/db";

const LIMIT = 100;
const CUSTOMER_COLUMNS = "id,shop_id,first_name,last_name";
const VEHICLE_COLUMNS = "id,customer_id,year,make,model,license_plate";
const RECEIPT_COLUMNS =
  "id,shop_id,customer_id,vehicle_id,status,priority,service_type,customer_complaint,description,estimated_hours,initial_mileage";
const CUSTOMER_FAILURE = "Could not load customer options. Please try again.";
const VEHICLE_FAILURE = "Could not load vehicle options. Please try again.";
const CREATE_FAILURE =
  "Could not confirm the selected customer and vehicle. Refresh and review your selections.";
const UNKNOWN_WRITE =
  "A work-order write may have completed. Review existing work orders before attempting another creation.";
const uuid = z.string().regex(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
const customerSchema = z
  .object({ id: uuid, shop_id: uuid, first_name: z.string(), last_name: z.string() })
  .strict();
const vehicleSchema = z
  .object({
    id: uuid,
    customer_id: uuid.nullable(),
    year: z.number().int().min(-2147483648).max(2147483647).nullable(),
    make: z.string(),
    model: z.string(),
    license_plate: z.string().nullable(),
  })
  .strict();
type Customer = z.infer<typeof customerSchema>;
type Vehicle = z.infer<typeof vehicleSchema>;
type Snapshot<T> = { rows: T[]; count: number | null; version: number };
type DbResult = { data: unknown; error: unknown; count?: unknown };
type Query = PromiseLike<DbResult> & {
  select(columns: string, options?: { count: "exact" }): Query;
  eq(column: string, value: string): Query;
  order(column: string, options: { ascending: true; nullsFirst: false }): Query;
  limit(count: number): Query;
  abortSignal(signal: AbortSignal): Query;
  retry(enabled: false): Query;
  maybeSingle(): Query;
  single(): Query;
  insert(payload: Payload): Query;
};
const db = smSupabase as unknown as {
  from(table: "customers" | "vehicles" | "work_orders"): Query;
};
const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
function fields(value: unknown, projection: string): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    projection.split(",").every((key) => Object.hasOwn(value, key))
  );
}
function row<T>(value: unknown, schema: z.ZodType<T>, projection: string): T {
  if (!fields(value, projection)) throw new Error(CREATE_FAILURE);
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(CREATE_FAILURE);
  return parsed.data;
}
function snapshot<T extends { id: string }>(
  result: DbResult,
  schema: z.ZodType<T>,
  projection: string,
  bind?: (value: T) => boolean,
): Omit<Snapshot<T>, "version"> {
  const { data, error, count } = result;
  if (
    error ||
    !Array.isArray(data) ||
    data.length > LIMIT + 1 ||
    (count !== null &&
      (typeof count !== "number" || !Number.isSafeInteger(count) || count < data.length))
  )
    throw new Error(CREATE_FAILURE);
  const seen = new Set<string>();
  const rows: T[] = [];
  for (let index = 0; index < data.length; index++) {
    if (!Object.hasOwn(data, index)) throw new Error(CREATE_FAILURE);
    const value = row(data[index], schema, projection);
    if (seen.has(value.id.toLowerCase()) || (bind && !bind(value))) throw new Error(CREATE_FAILURE);
    seen.add(value.id.toLowerCase());
    rows.push(value);
  }
  return { rows: rows.slice(0, LIMIT), count: count as number | null };
}
async function customerOptions(signal: AbortSignal) {
  const result = await db
    .from("customers")
    .select(CUSTOMER_COLUMNS, { count: "exact" })
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("first_name", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true, nullsFirst: false })
    .limit(LIMIT + 1)
    .abortSignal(signal)
    .retry(false);
  if (signal.aborted) throw new Error(CUSTOMER_FAILURE);
  return snapshot(result, customerSchema, CUSTOMER_COLUMNS);
}
async function vehicleOptions(customerId: string, signal: AbortSignal) {
  const result = await db
    .from("vehicles")
    .select(VEHICLE_COLUMNS, { count: "exact" })
    .eq("customer_id", customerId)
    .order("id", { ascending: true, nullsFirst: false })
    .limit(LIMIT + 1)
    .abortSignal(signal)
    .retry(false);
  if (signal.aborted) throw new Error(VEHICLE_FAILURE);
  return snapshot(
    result,
    vehicleSchema,
    VEHICLE_COLUMNS,
    (vehicle) => vehicle.customer_id !== null && sameId(vehicle.customer_id, customerId),
  );
}

// Supported values of this existing caller, not native global enums.
const STATUS_OPTIONS = [
  "pending",
  "scheduled",
  "in_progress",
  "waiting_on_parts",
  "completed",
  "cancelled",
];
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];
type Form = {
  customer_id: string;
  vehicle_id: string;
  status: string;
  priority: string;
  service_type: string;
  customer_complaint: string;
  description: string;
  estimated_hours: string;
  initial_mileage: string;
};
type Payload = {
  id: string;
  shop_id: string;
  customer_id: string;
  vehicle_id: string | null;
  status: string;
  priority: string;
  service_type: string | null;
  customer_complaint: string | null;
  description: string | null;
  estimated_hours: string | null;
  initial_mileage: number | null;
};
// Supported non-negative caller decimal text is sent without Number coercion.
// This resource bound is not the database's unscaled NUMERIC precision policy.
function decimal(value: unknown): string | null {
  if (typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value)))
    return null;
  const text = String(value);
  if (text.length > 64 || !/^\d+(?:\.\d+)?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const tail = fraction.replace(/0+$/, "");
  return `${whole.replace(/^0+(?=\d)/, "")}${tail ? `.${tail}` : ""}`;
}
function payloadFor(form: Form, customer: Customer, vehicle: Vehicle | undefined): Payload {
  if (!STATUS_OPTIONS.includes(form.status) || !PRIORITY_OPTIONS.includes(form.priority))
    throw new Error("Choose a supported status and priority.");
  if (
    [form.service_type, form.customer_complaint, form.description].some((text) =>
      text.includes("\0"),
    ) ||
    form.service_type.length > 200 ||
    form.customer_complaint.length > 4000 ||
    form.description.length > 4000
  )
    throw new Error("Review the job text and supported length limits.");
  if (!form.customer_complaint.trim() && !form.description.trim())
    throw new Error("Add a customer complaint or description.");
  const hours = form.estimated_hours.trim();
  if (hours && decimal(hours) === null)
    throw new Error(
      "Estimated hours must be a supported non-negative decimal without separators or exponent notation.",
    );
  const mileage = form.initial_mileage.trim();
  if (mileage && !/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(mileage))
    throw new Error(
      "Mileage must be a non-negative whole number within the supported integer range.",
    );
  const mileageNumber = mileage ? Number(mileage.replace(/,/g, "")) : null;
  if (
    mileageNumber !== null &&
    (!Number.isSafeInteger(mileageNumber) || mileageNumber > 2147483647)
  )
    throw new Error(
      "Mileage must be a non-negative whole number within the supported integer range.",
    );
  let id: string | undefined;
  try {
    id = globalThis.crypto?.randomUUID?.();
  } catch {
    throw new Error("A work-order request identity is unavailable. Please try again.");
  }
  if (!uuid.safeParse(id).success)
    throw new Error("A work-order request identity is unavailable. Please try again.");
  return {
    id: id as string,
    shop_id: customer.shop_id,
    customer_id: customer.id,
    vehicle_id: vehicle?.id ?? null,
    status: form.status,
    priority: form.priority,
    service_type: form.service_type.trim() || null,
    customer_complaint: form.customer_complaint.trim() || null,
    description: form.description.trim() || null,
    estimated_hours: hours || null,
    initial_mileage: mileageNumber,
  };
}
function receipt(value: unknown, payload: Payload): string | null {
  if (
    !fields(value, RECEIPT_COLUMNS) ||
    Reflect.ownKeys(value as object).length !== RECEIPT_COLUMNS.split(",").length
  )
    return null;
  const data = value as Record<string, unknown>;
  if (!uuid.safeParse(data.id).success || !sameId(data.id as string, payload.id)) return null;
  for (const key of ["shop_id", "customer_id", "vehicle_id"] as const) {
    const expected = payload[key];
    if (
      expected === null
        ? data[key] !== null
        : typeof data[key] !== "string" || !sameId(data[key] as string, expected)
    )
      return null;
  }
  for (const key of [
    "status",
    "priority",
    "service_type",
    "customer_complaint",
    "description",
    "initial_mileage",
  ] as const)
    if (data[key] !== payload[key]) return null;
  if (
    payload.estimated_hours === null
      ? data.estimated_hours !== null
      : decimal(data.estimated_hours) !== decimal(payload.estimated_hours)
  )
    return null;
  return data.id as string;
}
function SnapshotNotice({ kind, value }: { kind: string; value: Snapshot<{ id: string }> }) {
  const complete =
    value.count !== null && value.count === value.rows.length && value.count <= LIMIT;
  return (
    <div className="mt-2 text-xs text-muted-foreground">
      <p>
        {value.count === null
          ? `Showing ${value.rows.length} returned ${kind}. Visible count unavailable.`
          : `Showing ${value.rows.length} of ${value.count} visible ${kind} in this snapshot.`}
      </p>
      {!complete && (
        <p>
          The picker is incomplete or unverified; at most 100 options are displayed. Selected
          records are checked again before creation.
        </p>
      )}
      {value.rows.length === 0 && (
        <p>
          {complete
            ? `No visible ${kind} in this returned snapshot.`
            : `No ${kind} rows were returned; an empty list is not confirmed.`}
        </p>
      )}
    </div>
  );
}
function shortLabel(text: string, fallback: string) {
  const label = text.trim() || fallback;
  return label.length > 200 ? `${label.slice(0, 200)}…` : label;
}

export const Route = createFileRoute("/_authenticated/workspace/work-orders/new")({
  head: () => ({
    meta: [
      { title: "New Work Order — Shop Manager" },
      { name: "description", content: "Open a new repair job." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewWorkOrderPage,
});
function NewWorkOrderPage() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <SiteLayout>
        <p role="status">Checking account…</p>
      </SiteLayout>
    );
  if (!user)
    return (
      <SiteLayout>
        <p role="status">Sign in to create a work order.</p>
      </SiteLayout>
    );
  return <AccountWorkOrder key={user.id} userId={user.id} />;
}
function AccountWorkOrder({ userId }: { userId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const lifetime = useId();
  const alive = useRef(false);
  const busy = useRef(false);
  const draftEpoch = useRef(0);
  const operationEpoch = useRef(0);
  const operationState = useRef<{ epoch: number; context: string; lost: boolean } | null>(null);
  const preflight = useRef<AbortController | null>(null);
  const customerVersions = useRef(0);
  const vehicleVersions = useRef(0);
  const [phase, setPhase] = useState<"idle" | "pending" | "unknown" | "recorded">("idle");
  const [recordedId, setRecordedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [choice, setChoice] = useState({ customerVersion: 0, sequence: 0, vehicleVersion: 0 });
  const [form, setForm] = useState<Form>({
    customer_id: "",
    vehicle_id: "",
    status: "pending",
    priority: "normal",
    service_type: "",
    customer_complaint: "",
    description: "",
    estimated_hours: "",
    initial_mileage: "",
  });
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (operationState.current) operationState.current.lost = true;
      preflight.current?.abort();
    };
  }, []);
  const customersQuery = useQuery({
    queryKey: ["shop-manager", userId, "work-orders", "create", "customers", lifetime],
    queryFn: async ({ signal }) => ({
      ...(await customerOptions(signal)),
      version: ++customerVersions.current,
    }),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    placeholderData: undefined,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const customers =
    customersQuery.isSuccess && !customersQuery.isFetching ? customersQuery.data : undefined;
  const selectedCustomer =
    customers && choice.customerVersion === customers.version
      ? customers.rows.find((customer) => sameId(customer.id, form.customer_id))
      : undefined;
  const vehiclesQuery = useQuery({
    queryKey: [
      "shop-manager",
      userId,
      "work-orders",
      "create",
      "vehicles",
      form.customer_id,
      lifetime,
      choice.sequence,
    ],
    queryFn: async ({ signal }) => ({
      ...(await vehicleOptions(form.customer_id, signal)),
      version: ++vehicleVersions.current,
    }),
    enabled: !!selectedCustomer,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    placeholderData: undefined,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const vehicles =
    selectedCustomer && vehiclesQuery.isSuccess && !vehiclesQuery.isFetching
      ? vehiclesQuery.data
      : undefined;
  const selectedVehicle =
    vehicles && choice.vehicleVersion === vehicles.version
      ? vehicles.rows.find((vehicle) => sameId(vehicle.id, form.vehicle_id))
      : undefined;
  const ready = !!selectedCustomer && !!vehicles && (!form.vehicle_id || !!selectedVehicle);
  const context = `${draftEpoch.current}:${customers?.version ?? "-"}:${vehicles?.version ?? "-"}:${ready}:${selectedCustomer?.id ?? "-"}:${selectedCustomer?.shop_id ?? "-"}:${selectedVehicle?.id ?? "-"}:${selectedVehicle?.customer_id ?? "-"}`;
  const currentContext = useRef(context);
  useLayoutEffect(() => {
    currentContext.current = context;
    // Once an active submit observes a different committed read/draft context,
    // it cannot regain authority if a cancelled refresh revives the old data.
    if (operationState.current && operationState.current.context !== context)
      operationState.current.lost = true;
  });
  const locked = phase !== "idle";
  const set = (key: keyof Form, value: string) => {
    if (busy.current) return;
    draftEpoch.current++;
    setNotice(null);
    setForm((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "customer_id" ? { vehicle_id: "" } : {}),
    }));
    if (key === "customer_id")
      setChoice((previous) => ({
        customerVersion: customers?.version ?? 0,
        sequence: previous.sequence + 1,
        vehicleVersion: 0,
      }));
    if (key === "vehicle_id")
      setChoice((previous) => ({ ...previous, vehicleVersion: vehicles?.version ?? 0 }));
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !alive.current) return;
    if (!ready || !selectedCustomer || (form.vehicle_id && !selectedVehicle)) {
      setNotice(
        "Choose a customer and review fresh customer/vehicle options before creating a work order.",
      );
      return;
    }
    let payload: Payload;
    try {
      payload = payloadFor(form, selectedCustomer, selectedVehicle);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Review the job details.");
      return;
    }
    const expectedContext = currentContext.current;
    const operation = ++operationEpoch.current;
    operationState.current = { epoch: operation, context: expectedContext, lost: false };
    const controller = new AbortController();
    preflight.current = controller;
    busy.current = true;
    setPhase("pending");
    setNotice(null);
    let dispatched = false;
    const current = () =>
      alive.current &&
      operationEpoch.current === operation &&
      operationState.current?.epoch === operation &&
      !operationState.current.lost &&
      currentContext.current === expectedContext;
    try {
      const customerResult = await db
        .from("customers")
        .select(CUSTOMER_COLUMNS)
        .eq("id", selectedCustomer.id)
        .abortSignal(controller.signal)
        .retry(false)
        .maybeSingle();
      if (!current() || customerResult.error || controller.signal.aborted)
        throw new Error(CREATE_FAILURE);
      const customer = row(customerResult.data, customerSchema, CUSTOMER_COLUMNS);
      if (
        !sameId(customer.id, selectedCustomer.id) ||
        !sameId(customer.shop_id, selectedCustomer.shop_id)
      )
        throw new Error(CREATE_FAILURE);
      if (selectedVehicle) {
        const vehicleResult = await db
          .from("vehicles")
          .select(VEHICLE_COLUMNS)
          .eq("id", selectedVehicle.id)
          .eq("customer_id", customer.id)
          .abortSignal(controller.signal)
          .retry(false)
          .maybeSingle();
        if (!current() || vehicleResult.error || controller.signal.aborted)
          throw new Error(CREATE_FAILURE);
        const vehicle = row(vehicleResult.data, vehicleSchema, VEHICLE_COLUMNS);
        if (
          !sameId(vehicle.id, selectedVehicle.id) ||
          vehicle.customer_id === null ||
          !sameId(vehicle.customer_id, customer.id)
        )
          throw new Error(CREATE_FAILURE);
      }
      if (!current()) throw new Error(CREATE_FAILURE);
      // Visible customer shop binding is NOT native shop authorization. The API
      // must still enforce fresh membership and relationship integrity.
      dispatched = true;
      const result = await db
        .from("work_orders")
        .insert(payload)
        .select(RECEIPT_COLUMNS)
        .retry(false)
        .single();
      const id = !result.error ? receipt(result.data, payload) : null;
      if (!id || !current()) throw new Error(UNKNOWN_WRITE);
      setPhase("recorded");
      setRecordedId(id);
      setNotice("Work order entry recorded.");
      for (const queryKey of [
        ["shop-manager", userId, "work-orders", "list"],
        ["shop-manager", userId, "customer", payload.customer_id, "work-orders"],
        ...(payload.vehicle_id
          ? [["shop-manager", userId, "vehicle", payload.vehicle_id, "work-orders"]]
          : []),
      ])
        void qc.invalidateQueries({ queryKey, exact: false }).catch(() => undefined);
      toast.success("Work order entry recorded.");
      void router
        .navigate({ to: "/workspace/work-orders/$id", params: { id } })
        .catch(() => undefined);
    } catch {
      if (!alive.current || operationEpoch.current !== operation) return;
      if (dispatched) {
        setPhase("unknown");
        setNotice(UNKNOWN_WRITE);
        if (current()) toast.warning(UNKNOWN_WRITE);
      } else {
        busy.current = false;
        setPhase("idle");
        setNotice(CREATE_FAILURE);
      }
    } finally {
      if (preflight.current === controller) preflight.current = null;
      if (operationState.current?.epoch === operation) operationState.current = null;
    }
  }
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/workspace/work-orders">
            <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
            Back to work orders
          </Link>
        </Button>
        <div className="mb-6 flex items-center gap-3">
          <Wrench aria-hidden="true" className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">New Work Order</h1>
            <p className="text-muted-foreground">Open a new repair job for a selected customer.</p>
          </div>
        </div>
        {notice && (
          <p role={phase === "recorded" ? "status" : "alert"} className="mb-4 text-sm">
            {notice}
          </p>
        )}
        {recordedId && (
          <Link to="/workspace/work-orders/$id" params={{ id: recordedId }} className="underline">
            Open recorded work order
          </Link>
        )}
        <form onSubmit={submit} className="space-y-6">
          <fieldset disabled={locked} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer &amp; vehicle</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`${lifetime}-customer`}>Customer</Label>
                  <Select
                    value={selectedCustomer?.id ?? ""}
                    onValueChange={(value) => set("customer_id", value)}
                    disabled={!customers}
                  >
                    <SelectTrigger id={`${lifetime}-customer`}>
                      <SelectValue placeholder="Select customer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.rows.map((customer) => (
                        <SelectItem key={customer.id.toLowerCase()} value={customer.id}>
                          {shortLabel(`${customer.first_name} ${customer.last_name}`, customer.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {customersQuery.isPending || customersQuery.isFetching ? (
                    <p role="status">Loading customer options…</p>
                  ) : customersQuery.isError || !customers ? (
                    <p role="alert">{CUSTOMER_FAILURE}</p>
                  ) : (
                    <SnapshotNotice kind="customers" value={customers} />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={customersQuery.isFetching}
                    onClick={() => void customersQuery.refetch()}
                  >
                    {customersQuery.isError ? "Retry customers" : "Refresh customers"}
                  </Button>
                  <div className="mt-2 text-xs">
                    <Link to="/workspace/customers/new" className="underline">
                      + Add a new customer
                    </Link>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`${lifetime}-vehicle`}>Vehicle (optional)</Label>
                  <Select
                    value={selectedVehicle?.id ?? "none"}
                    onValueChange={(value) => set("vehicle_id", value === "none" ? "" : value)}
                    disabled={!vehicles}
                  >
                    <SelectTrigger id={`${lifetime}-vehicle`}>
                      <SelectValue placeholder="Pick a customer first" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No vehicle selected</SelectItem>
                      {vehicles?.rows.map((vehicle) => (
                        <SelectItem key={vehicle.id.toLowerCase()} value={vehicle.id}>
                          {shortLabel(
                            `${vehicle.year ?? ""} ${vehicle.make} ${vehicle.model}`,
                            vehicle.license_plate || vehicle.id,
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCustomer &&
                    (vehiclesQuery.isPending || vehiclesQuery.isFetching ? (
                      <p role="status">Loading vehicle options…</p>
                    ) : vehiclesQuery.isError || !vehicles ? (
                      <p role="alert">{VEHICLE_FAILURE}</p>
                    ) : (
                      <SnapshotNotice kind="vehicles" value={vehicles} />
                    ))}
                  {selectedCustomer && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={vehiclesQuery.isFetching}
                      onClick={() => void vehiclesQuery.refetch()}
                    >
                      {vehiclesQuery.isError ? "Retry vehicles" : "Refresh vehicles"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Job details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`${lifetime}-status`}>Status</Label>
                  <Select value={form.status} onValueChange={(value) => set("status", value)}>
                    <SelectTrigger id={`${lifetime}-status`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`${lifetime}-priority`}>Priority</Label>
                  <Select value={form.priority} onValueChange={(value) => set("priority", value)}>
                    <SelectTrigger id={`${lifetime}-priority`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`${lifetime}-service`}>Service type</Label>
                  <Input
                    id={`${lifetime}-service`}
                    value={form.service_type}
                    maxLength={200}
                    onChange={(event) => set("service_type", event.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`${lifetime}-complaint`}>Customer complaint</Label>
                  <Textarea
                    id={`${lifetime}-complaint`}
                    rows={3}
                    value={form.customer_complaint}
                    maxLength={4000}
                    onChange={(event) => set("customer_complaint", event.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`${lifetime}-description`}>Description / scope</Label>
                  <Textarea
                    id={`${lifetime}-description`}
                    rows={3}
                    value={form.description}
                    maxLength={4000}
                    onChange={(event) => set("description", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`${lifetime}-hours`}>Estimated hours</Label>
                  <Input
                    id={`${lifetime}-hours`}
                    inputMode="decimal"
                    maxLength={64}
                    value={form.estimated_hours}
                    onChange={(event) => set("estimated_hours", event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional non-negative decimal; no separators or exponent notation.
                  </p>
                </div>
                <div>
                  <Label htmlFor={`${lifetime}-mileage`}>Mileage in</Label>
                  <Input
                    id={`${lifetime}-mileage`}
                    inputMode="numeric"
                    maxLength={32}
                    value={form.initial_mileage}
                    onChange={(event) => set("initial_mileage", event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional non-negative whole number, up to 2,147,483,647.
                  </p>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end gap-2">
              <Button asChild variant="ghost" type="button">
                <Link to="/workspace/work-orders">Cancel</Link>
              </Button>
              <Button type="submit" disabled={!ready || locked}>
                {phase === "pending" ? (
                  <>
                    <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                    Checking / saving…
                  </>
                ) : (
                  "Create work order"
                )}
              </Button>
            </div>
          </fieldset>
        </form>
        <p className="mt-6 text-xs text-muted-foreground">
          Visible selections and returned rows do not prove native shop authorization or an atomic
          workflow. No stock, tax or financial posting is performed here. An uncertain outcome stays
          locked in this mounted draft; leaving the page does not resolve it.
        </p>
      </div>
    </SiteLayout>
  );
}
