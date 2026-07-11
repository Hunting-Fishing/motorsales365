
import { CalendarClock } from "lucide-react";

export function EmptyRemindersList() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <CalendarClock className="h-12 w-12 text-muted-foreground/60 mb-3" />
      <h3 className="text-lg font-medium">No reminders found</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        No service reminders match your current filters. Try adjusting your filter criteria or add a new reminder.
      </p>
    </div>
  );
}
