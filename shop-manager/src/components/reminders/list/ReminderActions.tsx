
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, ChevronRight } from "lucide-react";
import { ServiceReminder } from "@/types/reminder";
import { updateReminder } from "@/services/reminders/reminderMutations";
import { sendReminderNotifications } from "@/services/reminders/reminderNotifications";
import { toast } from "@/hooks/use-toast";

interface ReminderActionsProps {
  reminder: ServiceReminder;
  onStatusUpdate: (reminderId: string, updatedReminder: ServiceReminder) => Promise<void>;
}

export function ReminderActions({ reminder, onStatusUpdate }: ReminderActionsProps) {
  const handleStatusUpdate = async (reminderId: string, newStatus: 'pending' | 'completed' | 'overdue' | 'cancelled') => {
    try {
      const updatedReminder = await updateReminder({ 
        id: reminderId, 
        status: newStatus 
      });
      
      onStatusUpdate(reminderId, updatedReminder);
      
      toast({
        title: "Reminder Updated",
        description: `Reminder has been marked as ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating reminder:", error);
      toast({
        title: "Error",
        description: "Failed to update reminder status.",
        variant: "destructive",
      });
    }
  };

  const handleSendNotification = async (reminderId: string) => {
    try {
      await sendReminderNotifications();
      
      // After sending the notification, fetch the updated reminder
      const updatedReminder = await updateReminder({
        id: reminderId,
        status: reminder.status === 'sent' ? 'pending' : reminder.status
      });
      
      onStatusUpdate(reminderId, updatedReminder);
      
      toast({
        title: "Notification Sent",
        description: "The service reminder notification has been sent.",
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      toast({
        title: "Error",
        description: "Failed to send reminder notification.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {reminder.status === "pending" && (
        <>
          {!reminder.notificationSent && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleSendNotification(reminder.id)}
            >
              <Bell className="h-4 w-4 mr-1" />
              Notify
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleStatusUpdate(reminder.id, "completed")}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Mark Complete
          </Button>
        </>
      )}
      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
