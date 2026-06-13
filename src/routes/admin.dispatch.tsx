import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Truck, AlertTriangle, MapPin, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, formatPHP } from "@/lib/format";
import {
  adminListDispatchSubscriptions,
  adminListTowRequests,
  adminListDispatchProviders,
  adminRunDispatchExpand,
} from "@/lib/admin-dispatch.functions";

export const Route = createFileRoute("/admin/dispatch")({
  component: AdminDispatchPage,
  head: () => ({
    meta: [
      { title: "365 Dispatch — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  dispatch_starter: { label: "Starter", color: "bg-secondary" },
  dispatch_pro: { label: "Pro", color: "bg-primary text-primary-foreground" },
  dispatch_fleet: { label: "Fleet", color: "bg-amber-500 text-white" },
};

const SUB_STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-600 text-white",
  trialing: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  past_due: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  canceled: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  incomplete: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  incomplete_expired: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  unpaid: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

function providerName(p: any): string {
  if (!p) return "Unknown";
  if (p.business_name) return p.business_name;
  if (p.full_name) return p.full_name;
  const n = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return n || `User ${String(p.id ?? "").slice(0, 8)}`;
}

function providerLocation(p: any): string {
  if (!p) return "—";
  return [p.business_city, p.business_region].filter(Boolean).join(", ") || "—";
}

function ageLabel(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function AdminDispatchPage() {
  const [tab, setTab] = useState("subscriptions");
  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="font-display text-2xl font-bold">
          <Truck className="mr-2 inline h-6 w-6" />
          365 Dispatch
        </h1>
        <p className="text-sm text-muted-foreground">
          Subscriptions, the live tow-job queue, and provider performance for the Dispatch
          product.
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions" className="mt-4">
          <SubscriptionsTab />
        </TabsContent>
        <TabsContent value="jobs" className="mt-4">
          <ActiveJobsTab />
        </TabsContent>
        <TabsContent value="providers" className="mt-4">
          <ProvidersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubscriptionsTab() {
  const list = useServerFn(adminListDispatchSubscriptions);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dispatch-subscriptions"],
    queryFn: () => list({ data: {} }),
  });

  const rows = data?.subscriptions ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Sorted by renewal/expiry date (soonest first). {rows.length} subscription(s).
      </p>
      {isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No dispatch subscriptions yet.
        </Card>
      ) : (
        rows.map((s: any) => {
          const plan = PLAN_LABELS[s.plan_slug] ?? { label: s.plan_slug, color: "bg-muted" };
          const statusStyle = SUB_STATUS_STYLES[s.status] ?? "bg-muted text-muted-foreground";
          return (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{providerName(s.provider)}</span>
                  <Badge className={plan.color}>{plan.label}</Badge>
                  <Badge className={statusStyle}>{s.status}</Badge>
                  {s.environment && s.environment !== "live" && (
                    <Badge variant="outline" className="text-muted-foreground">
                      {s.environment}
                    </Badge>
                  )}
                  {s.cancel_at_period_end && (
                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                      Cancels {s.current_period_end ? formatDate(s.current_period_end) : "—"}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {providerLocation(s.provider)} · <code>{String(s.user_id).slice(0, 8)}…</code>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {s.cancel_at_period_end ? "Ends" : "Renews"}
                <div className="font-medium text-foreground">
                  {s.current_period_end ? formatDate(s.current_period_end) : "—"}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

function ActiveJobsTab() {
  const list = useServerFn(adminListTowRequests);
  const runExpand = useServerFn(adminRunDispatchExpand);
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"active" | "open" | "all">("active");
  const [running, setRunning] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dispatch-requests", statusFilter],
    queryFn: () => list({ data: { status: statusFilter } }),
  });

  const rows = data?.requests ?? [];
  const stuckCount = rows.filter((r: any) => r.stuck).length;

  const handleExpand = async () => {
    setRunning(true);
    try {
      const res = await runExpand();
      toast.success(`Expand run complete — processed ${res.processed} stale job(s)`);
      qc.invalidateQueries({ queryKey: ["admin-dispatch-requests"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to run expand");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="open">Open only</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          {stuckCount > 0 && (
            <Badge className="bg-rose-600 text-white">
              <AlertTriangle className="mr-1 h-3 w-3" /> {stuckCount} stuck
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={handleExpand} disabled={running}>
            <RefreshCw className={`mr-1 h-4 w-4 ${running ? "animate-spin" : ""}`} />
            Run expand now
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No jobs match this filter.
        </Card>
      ) : (
        rows.map((r: any) => (
          <Card
            key={r.id}
            className={`flex flex-wrap items-center justify-between gap-3 p-4 ${
              r.stuck ? "border-rose-300 bg-rose-50/60 dark:bg-rose-950/20" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {r.vehicle_summary ||
                    [r.vehicle_make, r.vehicle_model].filter(Boolean).join(" ") ||
                    "Vehicle"}
                </span>
                <Badge variant="outline" className="capitalize">
                  {r.status}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {r.dispatch_status}
                </Badge>
                {r.stuck && (
                  <Badge className="bg-rose-600 text-white">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Stuck
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {[r.pickup_city, r.pickup_province].filter(Boolean).join(", ") || "—"}
                  {r.dropoff_city && <> → {r.dropoff_city}</>}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Requester: {providerName(r.requester)} · Matched: {r.matchedCount} provider(s)
                {r.provider && <> · Accepted by {providerName(r.provider)}</>}
                {r.requestedProvider && (
                  <> · Direct request to {providerName(r.requestedProvider)}</>
                )}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>{ageLabel(r.ageMinutes)} ago</div>
              <div>Expansions: {r.dispatch_expansions}</div>
              {r.final_price_php != null && (
                <div className="font-semibold text-foreground">
                  {formatPHP(Number(r.final_price_php))}
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function ProvidersTab() {
  const list = useServerFn(adminListDispatchProviders);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dispatch-providers"],
    queryFn: () => list({ data: {} }),
  });

  const rows = data?.providers ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {rows.length} provider(s) with Dispatch rates configured, ranked by accepted jobs.
      </p>
      {isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No providers have configured Dispatch yet.
        </Card>
      ) : (
        rows.map((p: any) => {
          const plan = p.subscription ? PLAN_LABELS[p.subscription.plan_slug] : null;
          return (
            <Card
              key={p.user_id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{providerName(p.provider)}</span>
                  <Badge
                    className={
                      p.dispatch_enabled
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {p.dispatch_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {plan && <Badge className={plan.color}>{plan.label}</Badge>}
                  {p.available_24_7 && <Badge variant="outline">24/7</Badge>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {providerLocation(p.provider)} · Regions:{" "}
                  {(p.dispatch_regions ?? []).join(", ") || "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Rating: {p.avg_rating != null ? Number(p.avg_rating).toFixed(1) : "—"} · Avg
                  response:{" "}
                  {p.avg_response_sec != null
                    ? `${Math.round(p.avg_response_sec / 60)}m`
                    : "—"}
                </div>
              </div>
              <div className="flex gap-4 text-center text-xs">
                <div>
                  <div className="text-lg font-bold text-emerald-600">{p.acceptedCount}</div>
                  <div className="text-muted-foreground">Accepted</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-muted-foreground">
                    {p.declinedCount}
                  </div>
                  <div className="text-muted-foreground">Declined</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-700">{p.completedCount}</div>
                  <div className="text-muted-foreground">Completed</div>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
