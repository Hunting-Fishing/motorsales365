
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO } from "date-fns";

interface ActivityItemProps {
  activity: {
    id: string;
    type: string;
    date: string;
    description: string;
    flagged: boolean;
    flagReason?: string;
  };
  onFlagActivity: (activity: any) => void;
}

export function ActivityItem({ activity, onFlagActivity }: ActivityItemProps) {
  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case "workOrder":
        return <Badge className="bg-blue-500">Work Order</Badge>;
      case "communication":
        return <Badge className="bg-green-500">Communication</Badge>;
      case "parts":
        return <Badge className="bg-purple-500">Parts</Badge>;
      case "invoice":
        return <Badge className="bg-amber-500">Invoice</Badge>;
      default:
        return <Badge className="bg-slate-500">{type}</Badge>;
    }
  };

  return (
    <div 
      className={`border rounded-lg p-4 relative hover:bg-slate-50 transition-colors ${
        activity.flagged ? "border-red-300 bg-red-50" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {getActivityTypeIcon(activity.type)}
            <span className="text-muted-foreground text-xs">
              {format(parseISO(activity.date), "PPP p")}
            </span>
          </div>
          
          <p className="text-sm text-slate-600 whitespace-pre-wrap mt-1">
            {activity.description}
          </p>
          
          {activity.flagged && (
            <div className="mt-2 flex items-center text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span>Flagged: {activity.flagReason}</span>
            </div>
          )}
        </div>
        
        <div className="ml-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => onFlagActivity(activity)}
                  disabled={activity.flagged}
                >
                  <Flag className={`h-4 w-4 ${activity.flagged ? "text-red-500" : "text-slate-400"}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {activity.flagged ? "Already flagged" : "Flag this activity"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
