import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
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
import { useAuth } from "@/hooks/use-auth";

const DISPLAY_LIMIT = 100;
// Presentation/resource limit only, never an accounting precision or DB limit.
const MAX_AMOUNT_DISPLAY_LENGTH = 512;
type Numeric = number | string | null;
type ListResult = { data: unknown; error: unknown; count?: unknown };
type ListQuery = PromiseLike<ListResult> & {
  select(columns: string, options: { count: "exact" }): ListQuery;
  order(column: string, options: { ascending: boolean }): ListQuery;
  limit(value: number): ListQuery;
  abortSignal(signal: AbortSignal): ListQuery;
  retry(enabled: boolean): ListQuery;
};
const listDb = smSupabase as unknown as { from(table: "work_orders"): ListQuery };

type WorkOrderRow = {
  id: string;
  work_order_number: string | null;
  status: string | null;
  created_at: string | null;
  total_cost: Numeric;
  customer_id: string | null;
  vehicle_id: string | null;
  customers: { id: string; first_name: string; last_name: string } | null;
  vehicles: { id: string; year: number | null; make: string; model: string } | null;
};

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function recordId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}
function nullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}
function numeric(value: unknown): value is Numeric {
  return (
    value === null ||
    (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" &&
      (value.length > MAX_AMOUNT_DISPLAY_LENGTH ||
        /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) ||
        ["NaN", "Infinity", "-Infinity"].includes(value)))
  );
}
function readRow(value: unknown): WorkOrderRow {
  if (
    !object(value) ||
    !recordId(value.id) ||
    !nullableText(value.work_order_number) ||
    !nullableText(value.status) ||
    !nullableText(value.created_at) ||
    !numeric(value.total_cost) ||
    !(value.customer_id === null || recordId(value.customer_id)) ||
    !(value.vehicle_id === null || recordId(value.vehicle_id))
  )
    throw new Error("Work orders unavailable");
  const customer = value.customers;
  if (
    customer !== null &&
    (!object(customer) ||
      !recordId(customer.id) ||
      customer.id.toLowerCase() !== value.customer_id?.toLowerCase() ||
      typeof customer.first_name !== "string" ||
      typeof customer.last_name !== "string")
  )
    throw new Error("Work orders unavailable");
  const vehicle = value.vehicles;
  if (
    vehicle !== null &&
    (!object(vehicle) ||
      !recordId(vehicle.id) ||
      vehicle.id.toLowerCase() !== value.vehicle_id?.toLowerCase() ||
      typeof vehicle.make !== "string" ||
      typeof vehicle.model !== "string" ||
      !(
        vehicle.year === null ||
        (typeof vehicle.year === "number" &&
          Number.isInteger(vehicle.year) &&
          vehicle.year >= -2_147_483_648 &&
          vehicle.year <= 2_147_483_647)
      ))
  )
    throw new Error("Work orders unavailable");
  return {
    id: value.id.toLowerCase(),
    work_order_number: value.work_order_number,
    status: value.status,
    created_at: value.created_at,
    total_cost: value.total_cost,
    customer_id: value.customer_id?.toLowerCase() ?? null,
    vehicle_id: value.vehicle_id?.toLowerCase() ?? null,
    customers:
      customer === null
        ? null
        : {
            id: ((customer as Record<string, unknown>).id as string).toLowerCase(),
            first_name: (customer as Record<string, unknown>).first_name as string,
            last_name: (customer as Record<string, unknown>).last_name as string,
          },
    vehicles:
      vehicle === null
        ? null
        : {
            id: ((vehicle as Record<string, unknown>).id as string).toLowerCase(),
            year: (vehicle as Record<string, unknown>).year as number | null,
            make: (vehicle as Record<string, unknown>).make as string,
            model: (vehicle as Record<string, unknown>).model as string,
          },
  };
}
async function fetchWorkOrders(
  signal: AbortSignal,
): Promise<{ rows: WorkOrderRow[]; complete: boolean; total: number | null }> {
  const { data, error, count } = await listDb
    .from("work_orders")
    .select(
      "id,work_order_number,status,created_at,total_cost,customer_id,vehicle_id,customers!fk_work_orders_customer(id,first_name,last_name),vehicles!fk_work_orders_vehicle(id,year,make,model)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(DISPLAY_LIMIT + 1)
    .abortSignal(signal)
    .retry(false);
  if (error || signal.aborted || !Array.isArray(data) || data.length > DISPLAY_LIMIT + 1)
    throw new Error("Work orders unavailable");
  const rows = data.map(readRow);
  if (new Set(rows.map((entry) => entry.id)).size !== rows.length)
    throw new Error("Work orders unavailable");
  const total = count === null || count === undefined ? null : count;
  if (
    total !== null &&
    (typeof total !== "number" || !Number.isSafeInteger(total) || total < rows.length)
  )
    throw new Error("Work orders unavailable");
  return { rows, total, complete: total === rows.length && rows.length <= DISPLAY_LIMIT };
}

function displayAmount(value: Numeric): string {
  if (value === null) return "Unavailable";
  if (typeof value === "string" && value.length > MAX_AMOUNT_DISPLAY_LENGTH)
    return "Amount unavailable — outside display limit";
  if (["NaN", "Infinity", "-Infinity"].includes(String(value)))
    return `${value} (amount not usable)`;
  return `₱${value}`;
}

export const Route = createFileRoute("/_authenticated/workspace/work-orders")({
  head: () => ({
    meta: [
      { title: "Work Orders — Shop Manager" },
      {
        name: "description",
        content: "Create, dispatch, and close repair jobs from inside 365 Motor Sales.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkOrdersList,
  errorComponent: ({ reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <p className="mt-2 text-destructive">Could not load work orders.</p>
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
  const { user, loading } = useAuth();
  if (loading || !user?.id) return null;
  return <AuthenticatedWorkOrders key={user.id} userId={user.id} />;
}

function AuthenticatedWorkOrders({ userId }: { userId: string }) {
  const readLifetime = useId();
  const query = useQuery({
    queryKey: ["shop-manager", userId, "work-orders", "list", readLifetime],
    queryFn: ({ signal }) => fetchWorkOrders(signal),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    placeholderData: undefined,
    refetchOnMount: "always",
  });
  const visible = query.isSuccess && !query.isFetching;
  const data = visible ? query.data.rows.slice(0, DISPLAY_LIMIT) : [];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Wrench className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Work Orders</h1>
              <p className="text-muted-foreground">Repair jobs for your shop, newest first.</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/workspace/work-orders/new">
              <Plus className="mr-2 h-4 w-4" /> New Work Order
            </Link>
          </Button>
        </div>

        {query.isFetching || query.isPending ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : query.isError ? (
          <div role="alert" className="text-sm text-destructive">
            Could not load work orders.{" "}
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry work orders
            </Button>
          </div>
        ) : visible && data.length === 0 && query.data.complete ? (
          <Card>
            <CardHeader>
              <CardTitle>No work orders in this view</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Only records available to this account are shown. Use New Work Order to open the
              existing form.
            </CardContent>
          </Card>
        ) : visible && data.length > 0 ? (
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
                  {data.map((w: WorkOrderRow) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono">
                        <Link
                          to="/workspace/work-orders/$id"
                          params={{ id: w.id }}
                          className="hover:underline"
                        >
                          {w.work_order_number ?? w.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {w.customers ? (
                          <Link to="/workspace/customers/$id" params={{ id: w.customers.id }}>
                            {`${w.customers.first_name} ${w.customers.last_name}`.trim() ||
                              "Customer record"}
                          </Link>
                        ) : (
                          "Customer details unavailable"
                        )}
                      </TableCell>
                      <TableCell>
                        {w.vehicles ? (
                          <Link to="/workspace/vehicles/$id" params={{ id: w.vehicles.id }}>
                            {`${w.vehicles.year ?? ""} ${w.vehicles.make} ${w.vehicles.model}`.trim() ||
                              "Vehicle record"}
                          </Link>
                        ) : (
                          "Vehicle details unavailable"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(w.status)}>
                          {w.status?.trim() ? w.status : "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{displayAmount(w.total_cost)}</TableCell>
                      <TableCell>{w.created_at || "Unavailable"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : visible ? (
          <p>Work-order results are unconfirmed.</p>
        ) : null}
        {visible && !query.data.complete ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {query.data.rows.length > DISPLAY_LIMIT
              ? "Showing first 100 work orders."
              : "List completeness is unconfirmed; showing received records only."}
          </p>
        ) : null}
        {visible ? (
          <p className="mt-4 text-xs text-muted-foreground">
            This view reflects records visible to this account, not a verified shop-wide record
            count or financial reconciliation.
          </p>
        ) : null}
      </div>
    </SiteLayout>
  );
}
