
import { CalendarX } from "lucide-react";

interface EmptyMaintenanceStateProps {
  message: string;
}

export function EmptyMaintenanceState({ message }: EmptyMaintenanceStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <CalendarX className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <h3 className="text-lg font-medium">No maintenance tasks</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {message}
      </p>
    </div>
  );
}
