import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  planName?: string | null;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Shown on listing cards / detail page when the seller has an active
 * paid dealer/business subscription.
 */
export function DealerSubscriptionBadge({ planName, size = "sm", className }: Props) {
  if (!planName) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              "bg-emerald-600 text-white hover:bg-emerald-600",
              size === "sm" ? "text-[10px]" : "text-xs",
              className,
            )}
          >
            <Store className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
            Active Dealer
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          Subscribed dealer — {planName} plan on 365 MotorSales Philippines.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
