
import React from "react";
import { formatTimeInHoursAndMinutes } from "@/utils/dateUtils";

interface TimeTrackingSummaryProps {
  totalBillableTime: number;
  totalNonBillableTime: number;
}

export function TimeTrackingSummary({ 
  totalBillableTime, 
  totalNonBillableTime 
}: TimeTrackingSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className="p-4 bg-slate-50 rounded-lg border">
        <p className="text-sm text-slate-500">Total Billable Time</p>
        <p className="text-2xl font-bold">{formatTimeInHoursAndMinutes(totalBillableTime)}</p>
      </div>
      <div className="p-4 bg-slate-50 rounded-lg border">
        <p className="text-sm text-slate-500">Total Non-Billable Time</p>
        <p className="text-2xl font-bold">{formatTimeInHoursAndMinutes(totalNonBillableTime)}</p>
      </div>
    </div>
  );
}
