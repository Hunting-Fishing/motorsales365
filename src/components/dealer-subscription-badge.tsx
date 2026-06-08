import { Store, RefreshCw, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

interface Props {
  planName?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  size?: "sm" | "md";
  className?: string;
  /** When true, also render an inline secondary chip with the renewal / expiry date. */
  showRenewal?: boolean;
}

/**
 * Shown on listing cards / detail page when the seller has an active
 * paid dealer/business subscription. Optionally shows the plan's renewal
 * or expiration date inline so buyers know the dealer is on a current plan.
 */
export function DealerSubscriptionBadge({
  planName,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  size = "sm",
  className,
  showRenewal = false,
}: Props) {
  if (!planName) return null;

  const endLabel = currentPeriodEnd ? formatDate(currentPeriodEnd) : null;
  const willRenew = !cancelAtPeriodEnd;
  const tooltip = endLabel
    ? willRenew
      ? `Subscribed dealer — ${planName} plan. Auto-renews on ${endLabel}.`
      : `Subscribed dealer — ${planName} plan. Active until ${endLabel} (not set to renew).`
    : `Subscribed dealer — ${planName} plan on 365 MotorSales Philippines.`;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
            <Badge
              className={cn(
                "bg-emerald-600 text-white hover:bg-emerald-600",
                size === "sm" ? "text-[10px]" : "text-xs",
              )}
            >
              <Store className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
              Active Dealer
            </Badge>
            {showRenewal && endLabel && (
              <Badge
                variant="outline"
                className={cn(
                  "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
                  size === "sm" ? "text-[10px]" : "text-xs",
                )}
              >
                {willRenew ? (
                  <RefreshCw className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
                ) : (
                  <CalendarClock
                    className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")}
                  />
                )}
                {willRenew ? `Renews ${endLabel}` : `Until ${endLabel}`}
              </Badge>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
