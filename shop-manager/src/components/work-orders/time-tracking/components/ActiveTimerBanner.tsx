import React from "react";
import { Clock, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeEntry } from "@/types/workOrder";
import { formatTimeInHoursAndMinutes } from "@/utils/workOrders";

interface ActiveTimerBannerProps {
  timer: TimeEntry;
  onStopTimer: () => void;
  currentDuration: number;
}

export const ActiveTimerBanner: React.FC<ActiveTimerBannerProps> = ({
  timer,
  onStopTimer,
  currentDuration,
}) => {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 flex justify-between items-center">
      <div className="flex items-center">
        <Clock className="h-5 w-5 text-blue-500 mr-2" />
        <div>
          <p className="font-medium">Active timer for {timer.employee_name}</p>
          <p className="text-sm text-gray-600">Started {new Date(timer.start_time).toLocaleTimeString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-medium text-xl">{formatTimeInHoursAndMinutes(currentDuration)}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onStopTimer}
          className="flex items-center"
        >
          <Pause className="h-4 w-4 mr-1" />
          Stop
        </Button>
      </div>
    </div>
  );
};
