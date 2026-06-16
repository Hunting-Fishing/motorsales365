import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getBusinessPlanUsage,
  setBusinessAutoUpgrade,
  listBusinessPlanHistory,
  type PlanLimits,
  type PlanUsage,
} from "@/lib/business-plan-usage.functions";

import { getWorkspaceBusiness } from "@/lib/business-workspace.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessPlanDialog } from "@/components/business-plan-dialog";
import { CreditCard, ArrowUpRight, AlertTriangle, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/business/$businessId/billing")({
  component: BillingPage,
  head: () => ({
    meta: [
      { title: "Billing & Plan — Workspace" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type MeterKey = keyof PlanUsage;
const METER_LABELS: Record<MeterKey, string> = {
  staff: "Staff seats",
  assets: "Trucks & assets",
  listings: "Active listings",
  inventory_skus: "Inventory items",
  tow_jobs_month: "Tow jobs this month",
  storage_mb: "Storage (MB)",
};
const METER_LINKS: Partial<Record<MeterKey, "staff" | "fleet" | "inventory" | "dispatch">> = {
  staff: "staff",
  assets: "fleet",
  inventory_skus: "inventory",
  tow_jobs_month: "dispatch",
};

function BillingPage() {
  const { businessId } = useParams({ from: "/dashboard/business/$businessId/billing" });
  const qc = useQueryClient();
  const loadUsage = useServerFn(getBusinessPlanUsage);
  const loadBiz = useServerFn(getWorkspaceBusiness);
  const loadHistory = useServerFn(listBusinessPlanHistory);
  const setAuto = useServerFn(setBusinessAutoUpgrade);
  const [planOpen, setPlanOpen] = useState(false);

  const bizQ = useQuery({
    queryKey: ["workspace-business", businessId],
    queryFn: () => loadBiz({ data: { businessId } }),
  });
  const usageQ = useQuery({
    queryKey: ["business-plan-usage", businessId],
    queryFn: () => loadUsage({ data: { businessId } }),
  });
  const historyQ = useQuery({
    queryKey: ["business-plan-history", businessId],
    queryFn: () => loadHistory({ data: { businessId } }),
  });


  const autoMut = useMutation({
    mutationFn: (enabled: boolean) => setAuto({ data: { businessId, enabled } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-plan-usage", businessId] });
      toast.success("Auto-upgrade preference saved");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  if (usageQ.isLoading || bizQ.isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (usageQ.error || !usageQ.data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Unable to load plan information.
        </CardContent>
      </Card>
    );
  }

  const u = usageQ.data;
  const business = bizQ.data?.business;
  const typeSlug = u.typeSlug || business?.type_slug || "";
  const statusTone =
    u.status === "active" || u.status === "trialing"
      ? "default"
      : u.status === "past_due"
      ? "destructive"
      : "secondary";

  const meterKeys = (Object.keys(METER_LABELS) as MeterKey[]).filter(
    (k) => typeof u.limits[k as keyof PlanLimits] === "number",
  );

  const overage = meterKeys.some((k) => {
    const lim = Number(u.limits[k as keyof PlanLimits] ?? 0);
    return lim > 0 && u.usage[k] >= lim;
  });

  return (
    <div className="space-y-4">
      {u.status === "past_due" && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <div className="font-semibold text-destructive">Payment past due</div>
            <div className="text-muted-foreground">
              Update your payment method to keep access to your workspace.
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5" /> Current plan
          </CardTitle>
          <Badge variant={statusTone as any} className="uppercase">
            {u.status === "none" ? "Free" : u.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <div className="text-2xl font-bold capitalize">{u.tier}</div>
            {u.pricePhp != null && (
              <div className="text-sm text-muted-foreground">
                ₱{u.pricePhp.toLocaleString()} / {u.interval || "mo"}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {u.cancelAtPeriodEnd ? "Ends in" : "Renews in"}
              </div>
              <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
                <Calendar className="h-4 w-4" />
                {u.daysRemaining != null ? `${u.daysRemaining} days` : "—"}
              </div>
              {u.currentPeriodEnd && (
                <div className="text-xs text-muted-foreground">
                  {new Date(u.currentPeriodEnd).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setPlanOpen(true)} className="gap-2">
                <ArrowUpRight className="h-4 w-4" /> Change plan
              </Button>
              <Button variant="outline" asChild>
                <Link
                  to="/dashboard/business/$businessId"
                  params={{ businessId }}
                >
                  Back to overview
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Plan usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meterKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No usage limits on this plan.
            </p>
          ) : (
            meterKeys.map((k) => {
              const limit = Number(u.limits[k as keyof PlanLimits] ?? 0);
              const used = u.usage[k];
              const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
              const tone = pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "";
              const moduleLink = METER_LINKS[k];
              return (
                <div key={k} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{METER_LABELS[k]}</span>
                    <span
                      className={
                        pct >= 100
                          ? "text-destructive font-semibold"
                          : pct >= 80
                          ? "text-amber-600 font-semibold"
                          : "text-muted-foreground"
                      }
                    >
                      {used} / {limit}
                      {moduleLink && (
                        <a
                          href={`/dashboard/business/${businessId}/${moduleLink}`}
                          className="ml-2 text-xs underline"
                        >
                          Manage
                        </a>
                      )}
                    </span>
                  </div>
                  <Progress value={pct} className={tone ? `[&>div]:${tone}` : ""} />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" /> Auto-upgrade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              When any usage meter hits its limit, automatically move this business to the
              next tier so operations don't stop. You'll get an email receipt for any
              proration charge.
            </div>
            <Switch
              checked={u.autoUpgrade}
              disabled={autoMut.isPending || u.status === "none"}
              onCheckedChange={(v) => autoMut.mutate(v)}
            />
          </div>
          {overage && !u.autoUpgrade && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              You've reached one or more plan limits. Enable auto-upgrade or change plan to
              keep adding more.
            </div>
          )}
          {u.status === "none" && (
            <p className="text-xs text-muted-foreground">
              Choose a paid plan first to enable auto-upgrade.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Plan history</CardTitle>
        </CardHeader>
        <CardContent>
          {historyQ.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !historyQ.data?.length ? (
            <p className="text-sm text-muted-foreground">No plan changes yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {historyQ.data.map((h: any) => (
                <li key={h.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="capitalize font-medium">{h.from_tier || "—"}</span>
                    <span className="mx-2 text-muted-foreground">→</span>
                    <span className="capitalize font-medium">{h.to_tier || "—"}</span>
                    <Badge variant="outline" className="ml-2 capitalize">
                      {String(h.reason).replace("_", " ")}
                    </Badge>
                    {h.triggered_by === "system" && (
                      <Badge variant="secondary" className="ml-1">auto</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>


      {business && typeSlug && (
        <BusinessPlanDialog
          open={planOpen}
          onOpenChange={setPlanOpen}
          businessId={businessId}
          businessName={business.name}
          typeSlug={typeSlug}
          currentTier={u.tier as any}
        />
      )}
    </div>
  );
}
