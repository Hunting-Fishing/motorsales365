
import { Badge } from "@/components/ui/badge";
import { Calendar, Car, Bell } from "lucide-react";
import { ServiceReminder } from "@/types/reminder";
import { format, parseISO } from "date-fns";
import { ReminderStatusBadge } from "./ReminderStatusBadge";

interface ReminderDetailsProps {
  reminder: ServiceReminder;
}

export function ReminderDetails({ reminder }: ReminderDetailsProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline">{reminder.type}</Badge>
        <ReminderStatusBadge status={reminder.status} dueDate={reminder.dueDate} />
      </div>
      <h4 className="font-medium">{reminder.title}</h4>
      <p className="text-sm text-slate-600 mt-1">{reminder.description}</p>
      <div className="flex flex-wrap gap-x-4 mt-2 text-sm text-slate-500">
        <div className="flex items-center">
          <Calendar className="h-3.5 w-3.5 mr-1" />
          <span>Due: {format(parseISO(reminder.dueDate), "MMM d, yyyy")}</span>
        </div>
        {reminder.vehicleId && (
          <div className="flex items-center">
            <Car className="h-3.5 w-3.5 mr-1" />
            <span>Vehicle ID: {reminder.vehicleId}</span>
          </div>
        )}
        {reminder.notificationSent && reminder.notificationDate && (
          <div className="flex items-center">
            <Bell className="h-3.5 w-3.5 mr-1" />
            <span>Notified: {format(parseISO(reminder.notificationDate), "MMM d, yyyy")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
