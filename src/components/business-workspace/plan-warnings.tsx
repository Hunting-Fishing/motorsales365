import { useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, AlertCircle } from "lucide-react";
import type { PlanLimits, PlanUsage, PlanUsageResult } from "@/lib/business-plan-usage.functions";

type MeterKey = keyof PlanUsage;

const LABELS: Record<MeterKey, string> = {
  staff: "Staff seats",
  assets: "Trucks & assets",
  listings: "Active listings",
  inventory_skus: "Inventory items",
  tow_jobs_month: "Tow jobs this month",
  storage_mb: "Storage",
};

const BLOCKED_NEXT: Record<MeterKey, string> = {
  staff: "Adding new employees will be blocked.",
  assets: "Adding new vehicles or equipment will be blocked.",
  listings: "Publishing new listings will be blocked.",
  inventory_skus: "Adding new inventory items will be blocked.",
  tow_jobs_month: "Accepting new tow jobs will be blocked until next month.",
  storage_mb: "New uploads will be blocked.",
};

type Warning = {
  key: MeterKey;
  used: number;
  cap: number;
  pct: number;
  severity: "warn" | "critical";
};

export function WorkspacePlanWarnings({
  businessId,
  usage,
}: {
  businessId: string;
  usage: PlanUsageResult | undefined;
}) {
  const warnings = useMemo<Warning[]>(() => {
    if (!usage) return [];
    const out: Warning[] = [];
    (Object.keys(LABELS) as MeterKey[]).forEach((k) => {
      const cap = usage.limits[k as keyof PlanLimits];
      if (cap == null) return;
      const used = usage.usage[k];
      const numCap = Number(cap);
      if (numCap <= 0) return;
      const pct = Math.round((used / numCap) * 100);
      if (pct >= 100) out.push({ key: k, used, cap: numCap, pct, severity: "critical" });
      else if (pct >= 80) out.push({ key: k, used, cap: numCap, pct, severity: "warn" });
    });
    return out;
  }, [usage]);

  // One-shot toast per session per (business, limit, bucket)
  useEffect(() => {
    if (!usage || typeof window === "undefined") return;
    for (const w of warnings) {
      const bucket = w.severity === "critical" ? "100" : "80";
      const sentinel = `plan-warn:${businessId}:${w.key}:${bucket}`;
      if (sessionStorage.getItem(sentinel)) continue;
      sessionStorage.setItem(sentinel, "1");
      const fn = w.severity === "critical" ? toast.error : toast.warning;
      fn(
        w.severity === "critical"
          ? `${LABELS[w.key]} limit reached`
          : `${LABELS[w.key]} at ${w.pct}% of plan`,
        {
          description: `${w.used}/${w.cap} on your ${usage.tier} plan. ${BLOCKED_NEXT[w.key]}${
            usage.autoUpgrade ? " Auto-upgrade is on and will try to bump your plan." : ""
          }`,
          action: {
            label: "Billing",
            onClick: () => {
              window.location.href = `/dashboard/business/${businessId}/billing`;
            },
          },
          duration: 8000,
        },
      );
    }
  }, [warnings, businessId, usage]);

  if (!warnings.length) return null;

  const critical = warnings.some((w) => w.severity === "critical");

  return (
    <div
      className={`mb-3 rounded-lg border p-3 text-sm ${
        critical
          ? "border-destructive/40 bg-destructive/10"
          : "border-amber-500/40 bg-amber-500/10"
      }`}
    >
      <div className="flex items-start gap-2">
        {critical ? (
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div className="flex-1">
          <div className={`font-semibold ${critical ? "text-destructive" : "text-amber-700"}`}>
            {critical ? "Plan limit reached" : "Approaching plan limit"}
          </div>
          <ul className="mt-1 space-y-1 text-foreground/90">
            {warnings.map((w) => (
              <li key={w.key}>
                <span className="font-medium">{LABELS[w.key]}:</span>{" "}
                {w.used}/{w.cap} ({w.pct}%) —{" "}
                <span className="text-muted-foreground">{BLOCKED_NEXT[w.key]}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <Link
              to="/dashboard/business/$businessId/billing"
              params={{ businessId }}
              className="font-medium underline"
            >
              Manage plan
            </Link>
            {!usage?.autoUpgrade && (
              <Link
                to="/dashboard/business/$businessId/billing"
                params={{ businessId }}
                className="text-muted-foreground underline"
              >
                Enable auto-upgrade
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
