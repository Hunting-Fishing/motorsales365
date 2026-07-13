
import React from "react";
import { TimeEntry } from "@/types/workOrder";
import { TimeTrackingSection } from "./TimeTrackingSection";

export interface TimeTrackingProps {
  workOrderId: string;
  timeEntries: TimeEntry[];
  onUpdateTimeEntries: (entries: TimeEntry[]) => void;
}

export const TimeTracking: React.FC<TimeTrackingProps> = ({
  workOrderId,
  timeEntries,
  onUpdateTimeEntries,
}) => {
  return (
    <TimeTrackingSection
      workOrderId={workOrderId}
      timeEntries={timeEntries}
      onUpdateTimeEntries={onUpdateTimeEntries}
      isEditMode={false}
    />
  );
};
