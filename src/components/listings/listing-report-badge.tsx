import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Small warning badge shown on a listing card when users have filed reports.
 * Tapping opens the listing page anchored to the public reports section so
 * shoppers can see what was flagged. Reporter identities are never shown.
 */
export function ListingReportBadge({
  listingId,
  openCount,
  className,
}: {
  listingId: string;
  openCount: number;
  className?: string;
}) {
  if (!openCount || openCount <= 0) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/listing/$id"
            params={{ id: listingId }}
            hash="user-reports"
            onClick={(e) => e.stopPropagation()}
            aria-label={`${openCount} user report${openCount === 1 ? "" : "s"} on this listing — tap for details`}
            className={
              "inline-flex h-7 items-center gap-1 rounded-full bg-amber-500/95 px-2 text-[11px] font-semibold text-white shadow-sm backdrop-blur transition hover:bg-amber-600 " +
              (className ?? "")
            }
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {openCount}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          {openCount} user report{openCount === 1 ? "" : "s"} on this listing — tap for details
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
