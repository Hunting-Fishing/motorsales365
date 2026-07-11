
import { useState } from "react";
import { ServiceReminder } from "@/types/reminder";
import { ReminderDetails } from "./ReminderDetails";
import { ReminderActions } from "./ReminderActions";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tag, Calendar, RotateCw } from "lucide-react";
import { format, parseISO, isAfter } from "date-fns";

interface ReminderListItemProps {
  reminder: ServiceReminder;
  onStatusUpdate: (reminderId: string, updatedReminder: ServiceReminder) => Promise<void>;
}

export function ReminderListItem({ reminder, onStatusUpdate }: ReminderListItemProps) {
  return (
    <div className="py-4 px-4 sm:px-6 hover:bg-slate-50">
      <div className="flex flex-col sm:flex-row justify-between">
        <ReminderDetails reminder={reminder} />
        <div className="mt-3 sm:mt-0 flex flex-col sm:items-end gap-2">
          <div className="flex flex-wrap gap-2">
            {reminder.isRecurring && (
              <Badge variant="outline" className="flex items-center gap-1 border-blue-500 text-blue-500">
                <RotateCw className="h-3 w-3" />
                <span>
                  {reminder.recurrenceInterval} {reminder.recurrenceUnit}
                </span>
              </Badge>
            )}

            {reminder.assignedTo && (
              <div className="flex items-center gap-1 text-sm">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-slate-200">
                    {reminder.assignedToName
                      ? reminder.assignedToName.split(' ').map(word => word[0]).join('')
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-slate-600">
                  {reminder.assignedToName || "Assigned"}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {reminder.tags && reminder.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-slate-500" />
                <div className="flex flex-wrap gap-1">
                  {reminder.tags.map(tag => (
                    <Badge 
                      key={tag.id} 
                      variant="outline" 
                      className="text-xs" 
                      style={{ borderColor: tag.color, color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <ReminderActions reminder={reminder} onStatusUpdate={onStatusUpdate} />
        </div>
      </div>
      
      {reminder.nextOccurrenceDate && (
        <div className="mt-2 text-xs flex items-center text-slate-500">
          <Calendar className="h-3.5 w-3.5 mr-1" />
          <span>Next recurrence: {format(parseISO(reminder.nextOccurrenceDate), "MMM d, yyyy")}</span>
        </div>
      )}
    </div>
  );
}
