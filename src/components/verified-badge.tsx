import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const SIZE = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function VerifiedBadge({ size = "md", showLabel = false, className }: VerifiedBadgeProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 font-semibold text-primary",
              showLabel ? "text-xs" : "text-[0]",
              className,
            )}
            aria-label="Verified by 365 MotorSales Philippines"
          >
            <BadgeCheck className={cn(SIZE[size], "fill-primary text-primary-foreground")} />
            {showLabel && <span>Verified</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          Identity & business verified by 365 MotorSales Philippines.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
