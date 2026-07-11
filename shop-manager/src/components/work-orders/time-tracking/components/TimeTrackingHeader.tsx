
import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, PlusCircle, Play, Pause } from "lucide-react";
import { TimeEntry } from "@/types/workOrder";

interface TimeTrackingHeaderProps {
  activeTimer: TimeEntry | null;
  onStartTimer: (employeeId: string, employeeName: string) => void;
  onStopTimer: () => void;
  onAddTimeEntry: () => void;
}

export function TimeTrackingHeader({ 
  activeTimer, 
  onStartTimer, 
  onStopTimer, 
  onAddTimeEntry 
}: TimeTrackingHeaderProps) {
  return (
    <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
      <div className="flex items-center">
        <Clock className="h-5 w-5 mr-2 text-slate-500" />
        <CardTitle className="text-lg">Time Tracking</CardTitle>
      </div>
      <div className="flex gap-2">
        {activeTimer ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-500" 
            onClick={onStopTimer}
          >
            <Pause className="mr-1 h-4 w-4" />
            Stop Timer
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-green-500" 
            onClick={() => onStartTimer("EMP-001", "Michael Brown")}
          >
            <Play className="mr-1 h-4 w-4" />
            Start Timer
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAddTimeEntry}
        >
          <PlusCircle className="mr-1 h-4 w-4" />
          Add Time Entry
        </Button>
      </div>
    </CardHeader>
  );
}
