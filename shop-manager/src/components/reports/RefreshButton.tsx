
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface RefreshButtonProps {
  onClick: () => void;
  lastUpdated: Date;
  isLoading: boolean;
}

export function RefreshButton({ onClick, lastUpdated, isLoading }: RefreshButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClick}
            disabled={isLoading}
            className="relative"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
            {!isLoading && (
              <span className="sr-only">
                Last updated: {format(lastUpdated, "PPpp")}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Last updated: {format(lastUpdated, "PPp")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
