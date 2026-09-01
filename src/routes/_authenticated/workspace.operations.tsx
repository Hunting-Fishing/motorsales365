import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  Banknote,
  Boxes,
  Clock3,
  Coffee,
  LogIn,
  LogOut,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/operations")({
  head: () => ({
    meta: [
      { title: "Employee Operations — Shop Manager" },
      {
        name: "description",
        content: "Shift, approvals, register activity, and employee accountability.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmployeeOperations,
});

type Context = {
  shop_id: string;
  profile_id: string;
  employee_name: string;
  job_title: string | null;
  department: string | null;
  roles: string[];
  locations: Array<{ id: string; name: string; location_type: string }>;
  allowed_modules: string[];
  can_manage: boolean;
  active_shift: null | {
    id: string;
    status: "on_shift" | "on_break";
    clocked_in_at: string;
    location_id: string | null;
  };
};

const APPROVAL_TYPES = [
  ["discount", "Discount"],
  ["price_override", "Price override"],
  ["return", "Return"],
  ["refund", "Refund"],
  ["void_payment", "Void payment"],
  ["stock_adjustment", "Stock adjustment"],
  ["credit", "Customer credit"],
  ["other", "Other"],
] as const;

const CATEGORY_META: Record<string, { label: string; className: string }> = {
  sale: { label: "Sale", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  payment: { label: "Payment", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  inventory: {
    label: "Inventory",
    className: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  receiving: {
    label: "Receiving",
    className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  },
  transfer: { label: "Transfer", className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
  return: { label: "Return", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  pricing: { label: "Pricing", className: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  shift: { label: "Shift", className: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
};

function money(value: unknown) {
  return `₱${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function durationSince(iso: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function EmployeeOperations({ embedded = false }: { embedded?: boolean } = {}) {
  const qc = useQueryClient();
  const [approvalType, setApprovalType] = useState("discount");
  const [reason, setReason] = useState("");
  const [entityId, setEntityId] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [requestedValue, setRequestedValue] = useState("");
  const [workLocation, setWorkLocation] = useState("");

  const context = useQuery({
    queryKey: ["shop-manager", "employee-operations", "context"],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any).rpc("employee_operating_context");
      if (error) throw error;
      return data as Context;
    },
    refetchInterval: 60_000,
  });

  const activity = useQuery({
    queryKey: ["shop-manager", "employee-operations", "activity", context.data?.shop_id],
    enabled: !!context.data,
    queryFn: async () => {
      let query = (smSupabase as any)
        .from("employee_operational_events")
        .select(
          "id,event_category,action,entity_type,entity_id,amount,quantity,reason,occurred_at,profile_id",
        )
        .eq("shop_id", context.data!.shop_id)
        .order("occurred_at", { ascending: false })
        .limit(100);
      if (!context.data!.can_manage) query = query.eq("profile_id", context.data!.profile_id);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const approvals = useQuery({
    queryKey: ["shop-manager", "employee-operations", "approvals", context.data?.shop_id],
    enabled: !!context.data,
    queryFn: async () => {
      let query = (smSupabase as any)
        .from("employee_approval_requests")
        .select("*")
        .eq("shop_id", context.data!.shop_id)
        .order("requested_at", { ascending: false })
        .limit(100);
      if (!context.data!.can_manage)
        query = query.eq("requested_by_profile_id", context.data!.profile_id);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const shift = useMutation({
    mutationFn: async (action: "clock_in" | "break_start" | "break_end" | "clock_out") => {
      const { data, error } = await (smSupabase as any).rpc("employee_shift_action", {
        _action: action,
        _note: null,
        _location_id:
          action === "clock_in" ? workLocation || context.data?.locations?.[0]?.id || null : null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Shift status updated");
      qc.invalidateQueries({ queryKey: ["shop-manager", "employee-operations"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "Could not update shift"),
  });

  const requestApproval = useMutation({
    mutationFn: async () => {
      const { data, error } = await (smSupabase as any).rpc("request_employee_approval", {
        _request_type: approvalType,
        _reason: reason,
        _entity_type: entityId ? "shop_transaction" : null,
        _entity_id: entityId || null,
        _requested_value: requestedValue ? Number(requestedValue) : null,
        _original_value: originalValue ? Number(originalValue) : null,
        _metadata: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Manager approval requested");
      setReason("");
      setEntityId("");
      setOriginalValue("");
      setRequestedValue("");
      qc.invalidateQueries({ queryKey: ["shop-manager", "employee-operations"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "Approval request failed"),
  });

  const decide = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => {
      const { data, error } = await (smSupabase as any).rpc("decide_employee_approval", {
        _request_id: id,
        _decision: decision,
        _note: null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Approval decision recorded");
      qc.invalidateQueries({ queryKey: ["shop-manager", "employee-operations"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "Decision failed"),
  });

  const today = useMemo(() => {
    const rows = activity.data ?? [];
    const localDay = new Date().toDateString();
    const todays = rows.filter((r: any) => new Date(r.occurred_at).toDateString() === localDay);
    return {
      actions: todays.length,
      payments: todays
        .filter((r: any) => r.event_category === "payment" && r.action.startsWith("insert_"))
        .reduce((sum: number, r: any) => sum + Number(r.amount ?? 0), 0),
      sales: todays.filter((r: any) => r.event_category === "sale").length,
      inventory: todays.filter((r: any) =>
        ["inventory", "receiving", "transfer"].includes(r.event_category),
      ).length,
    };
  }, [activity.data]);

  if (context.isLoading)
    return (
      <OperationsShell embedded={embedded}>
        <div className="mx-auto max-w-6xl px-4 py-10">Loading employee workspace…</div>
      </OperationsShell>
    );
  if (context.error || !context.data)
    return (
      <OperationsShell embedded={embedded}>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-bold">Employee Operations</h1>
          <p className="mt-2 text-destructive">
            {String(
              (context.error as any)?.message ?? "No Shop Manager employee profile is connected.",
            )}
          </p>
        </div>
      </OperationsShell>
    );

  const ctx = context.data;
  const openApprovals = (approvals.data ?? []).filter((a: any) => a.status === "pending");
  return (
    <OperationsShell embedded={embedded}>
      <div className="mx-auto max-w-7xl space-y-6 px-1 py-2 md:px-4 md:py-6">
        <header className="overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                <ShieldCheck className="h-4 w-4" /> 365 Associate Operations
              </div>
              <h1 className="text-3xl font-bold">Welcome, {ctx.employee_name}</h1>
              <p className="mt-1 text-sm text-slate-300">
                {[ctx.job_title, ctx.department].filter(Boolean).join(" · ") || "Shop employee"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ctx.roles.map((role) => (
                  <Badge
                    key={role}
                    className="border-white/15 bg-white/10 text-white hover:bg-white/10"
                  >
                    {role.replaceAll("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
            <ShiftControl
              context={ctx}
              busy={shift.isPending}
              selectedLocation={workLocation || ctx.locations[0]?.id || ""}
              onLocationChange={setWorkLocation}
              onAction={(a) => shift.mutate(a)}
            />
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={Activity}
            label="My actions today"
            value={today.actions}
            detail="audited events"
          />
          <Metric
            icon={Banknote}
            label="Payments recorded"
            value={money(today.payments)}
            detail="today"
          />
          <Metric
            icon={ShoppingCart}
            label="Sales activity"
            value={today.sales}
            detail="invoice actions"
          />
          <Metric
            icon={Boxes}
            label="Stock activity"
            value={today.inventory}
            detail="receiving · transfer · adjustment"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Operations feed
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => activity.refetch()}>
                <RefreshCw className="mr-1 h-4 w-4" /> Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(activity.data ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Actions from sales, payments, customers, work orders, inventory, receiving, and
                  transfers will appear here.
                </p>
              ) : (
                (activity.data ?? []).slice(0, 30).map((row: any) => {
                  const meta = CATEGORY_META[row.event_category] ?? {
                    label: row.event_category,
                    className: "bg-muted text-muted-foreground",
                  };
                  return (
                    <div
                      key={row.id}
                      className="flex items-start justify-between gap-3 rounded-xl border p-3 hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={meta.className}>{meta.label}</Badge>
                          <span className="text-sm font-medium capitalize">
                            {String(row.action).replaceAll("_", " ")}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {[row.entity_type, row.entity_id].filter(Boolean).join(" · ") ||
                            row.reason ||
                            "Recorded automatically"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {row.amount != null && (
                          <p className="font-mono text-sm font-semibold">{money(row.amount)}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(row.occurred_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-500" /> Request manager approval
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Request</Label>
                  <Select value={approvalType} onValueChange={setApprovalType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPROVAL_TYPES.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transaction / invoice / item ID</Label>
                  <Input
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="Optional reference"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Original ₱</Label>
                    <Input
                      type="number"
                      value={originalValue}
                      onChange={(e) => setOriginalValue(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Requested ₱</Label>
                    <Input
                      type="number"
                      value={requestedValue}
                      onChange={(e) => setRequestedValue(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why this override is needed…"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={requestApproval.isPending || reason.trim().length < 3}
                  onClick={() => requestApproval.mutate()}
                >
                  <BadgeCheck className="mr-2 h-4 w-4" /> Send for approval
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRoundCheck className="h-5 w-5 text-primary" />{" "}
                  {ctx.can_manage ? "Approval queue" : "My approvals"}
                  <Badge variant="outline">{openApprovals.length} open</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(approvals.data ?? []).slice(0, 12).map((a: any) => (
                  <div key={a.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold capitalize">
                        {a.request_type.replaceAll("_", " ")}
                      </span>
                      <Badge
                        variant={
                          a.status === "approved"
                            ? "default"
                            : a.status === "rejected"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {a.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.reason}</p>
                    {a.requested_value != null && (
                      <p className="mt-1 font-mono text-sm">
                        {money(a.original_value)} → {money(a.requested_value)}
                      </p>
                    )}
                    {ctx.can_manage && a.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => decide.mutate({ id: a.id, decision: "approved" })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => decide.mutate({ id: a.id, decision: "rejected" })}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {(approvals.data ?? []).length === 0 && (
                  <p className="py-5 text-center text-sm text-muted-foreground">
                    No approval requests yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <span className="mr-2 text-sm font-medium">Continue working:</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/workspace/customers">Customers</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/workspace/work-orders">Work orders</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/workspace/inventory">Inventory</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/workspace/purchase-orders">Receiving</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/workspace/invoices">Invoices</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/workspace/reports">Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </OperationsShell>
  );
}

function OperationsShell({ embedded, children }: { embedded: boolean; children: ReactNode }) {
  return embedded ? <>{children}</> : <SiteLayout>{children}</SiteLayout>;
}

function ShiftControl({
  context,
  busy,
  selectedLocation,
  onLocationChange,
  onAction,
}: {
  context: Context;
  busy: boolean;
  selectedLocation: string;
  onLocationChange: (id: string) => void;
  onAction: (action: "clock_in" | "break_start" | "break_end" | "clock_out") => void;
}) {
  const active = context.active_shift;
  if (!active)
    return (
      <div className="min-w-72 rounded-xl border border-amber-300/30 bg-white/10 p-4">
        <p className="mb-2 text-xs text-slate-300">You are off shift</p>
        <Select value={selectedLocation} onValueChange={onLocationChange}>
          <SelectTrigger className="mb-3 border-white/20 bg-white/10 text-white">
            <SelectValue placeholder="Work location" />
          </SelectTrigger>
          <SelectContent>
            {context.locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={busy}
          className="bg-amber-400 text-slate-950 hover:bg-amber-300"
          onClick={() => onAction("clock_in")}
        >
          <LogIn className="mr-2 h-4 w-4" /> Clock in
        </Button>
      </div>
    );
  return (
    <div className="min-w-72 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
            {active.status === "on_break" ? "On break" : "On shift"}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            <Clock3 className="mr-1 inline h-3 w-3" /> {durationSince(active.clocked_in_at)} · since{" "}
            {new Date(active.clocked_in_at).toLocaleTimeString()}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {active.status === "on_break" ? (
          <Button size="sm" disabled={busy} onClick={() => onAction("break_end")}>
            <Coffee className="mr-1 h-4 w-4" /> End break
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => onAction("break_start")}
          >
            <Coffee className="mr-1 h-4 w-4" /> Start break
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => onAction("clock_out")}
        >
          <LogOut className="mr-1 h-4 w-4" /> Clock out
        </Button>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: any;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-xl bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
