import { toast } from "sonner";

const LABELS: Record<string, string> = {
  staff: "staff seats",
  assets: "assets",
  inventory_skus: "inventory items",
  listings: "listings",
  tow_jobs_month: "monthly tow jobs",
};

export function handlePlanLimitResult(
  result: any,
  ctx: { businessId: string; fallbackMessage?: string },
): boolean {
  if (result && typeof result === "object" && result.error === "plan_limit") {
    const label = LABELS[result.limitKey] || result.limitKey;
    toast.error(`Plan limit reached — ${label}`, {
      description: `${result.current}/${result.cap} on your ${result.tier} plan. Upgrade or enable auto-upgrade.`,
      action: {
        label: "Open billing",
        onClick: () => {
          window.location.href = `/dashboard/business/${ctx.businessId}/billing`;
        },
      },
    });
    return true;
  }
  return false;
}
