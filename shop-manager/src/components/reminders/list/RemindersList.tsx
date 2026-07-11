
import { memo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReminderListItem } from "./ReminderListItem";
import { EmptyRemindersList } from "./EmptyRemindersList";
import { RemindersLoading } from "./RemindersLoading";
import { useReminders } from "./useReminders";
import { ServiceReminder } from "@/types/reminder";
import { DateRange } from "react-day-picker";
import { updateReminder } from "@/services/reminders/reminderMutations";

interface RemindersListProps {
  customerId?: string;
  vehicleId?: string;
  limit?: number;
  statusFilter?: string;
  priorityFilter?: string;
  categoryId?: string;
  assignedTo?: string;
  isRecurring?: boolean;
  dateRange?: DateRange;
  tagIds?: string[];
  search?: string;
}

// Use memo to prevent unnecessary re-renders
export const RemindersList = memo(function RemindersList({ 
  customerId, 
  vehicleId, 
  limit, 
  statusFilter,
  priorityFilter,
  categoryId,
  assignedTo,
  isRecurring,
  dateRange,
  tagIds,
  search
}: RemindersListProps) {
  const { reminders, loading, refetch } = useReminders({ 
    customerId, 
    vehicleId, 
    limit,
    statusFilter,
    priorityFilter,
    categoryId,
    assignedTo,
    isRecurring,
    dateRange,
    tagIds,
    search
  });

  // Memoize the callback to prevent recreation on every render
  const handleReminderUpdate = useCallback(async (reminderId: string, updatedReminder: ServiceReminder) => {
    try {
      await updateReminder({ 
        id: reminderId, 
        status: updatedReminder.status as 'pending' | 'completed' | 'overdue' | 'cancelled', 
        notes: updatedReminder.notes 
      });
      refetch(); // Refresh the list after an update
    } catch (error) {
      console.error("Error updating reminder:", error);
    }
  }, [refetch]);

  if (loading) {
    return <RemindersLoading />;
  }

  if (!reminders.length) {
    return <EmptyRemindersList />;
  }

  return (
    <div className="divide-y">
      {reminders.map((reminder) => (
        <ReminderListItem 
          key={reminder.id} 
          reminder={reminder}
          onStatusUpdate={handleReminderUpdate}
        />
      ))}
    </div>
  );
});
