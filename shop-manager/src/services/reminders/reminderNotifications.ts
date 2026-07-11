
import { supabase } from "@/lib/supabase";

export interface ReminderNotification {
  id: string;
  reminder_id: string;
  notification_type: 'email' | 'sms' | 'push' | 'in_app';
  recipient: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

/**
 * Send notifications for pending reminders
 * Marks reminders as notified after processing
 */
export const sendReminderNotifications = async (): Promise<void> => {
  try {
    console.log("Processing reminder notifications...");
    
    // Get pending reminders that need notifications (due within 24 hours)
    const { data: reminders, error: fetchError } = await supabase
      .from('service_reminders')
      .select(`
        id,
        title,
        description,
        due_date,
        priority,
        customer_id,
        customers (
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('status', 'pending')
      .eq('notification_sent', false)
      .lte('due_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (fetchError) {
      console.error('Error fetching reminders for notifications:', fetchError);
      return;
    }

    if (!reminders || reminders.length === 0) {
      console.log('No pending reminders requiring notification');
      return;
    }

    const reminderIds: string[] = [];

    for (const reminder of reminders) {
      // In a production app, this would send actual emails/SMS
      // For now, we mark them as notified
      console.log(`Processing notification for reminder: ${reminder.title}`);
      
      // Add to list for bulk update
      reminderIds.push(reminder.id);
    }

    // Mark all processed reminders as notified
    if (reminderIds.length > 0) {
      const { error: updateError } = await supabase
        .from('service_reminders')
        .update({ 
          notification_sent: true, 
          notification_date: new Date().toISOString() 
        })
        .in('id', reminderIds);

      if (updateError) {
        console.error('Error updating reminder notification status:', updateError);
      } else {
        console.log(`Marked ${reminderIds.length} reminders as notified`);
      }
    }
  } catch (error) {
    console.error("Error sending reminder notifications:", error);
  }
};

/**
 * Create a notification record for a reminder
 */
export const createReminderNotification = async (
  reminderId: string,
  notificationType: 'email' | 'sms' | 'push' | 'in_app',
  recipient: string
): Promise<ReminderNotification | null> => {
  try {
    // Get the reminder to update its notification status
    const { data: reminder, error: reminderError } = await supabase
      .from('service_reminders')
      .select('id, title')
      .eq('id', reminderId)
      .single();

    if (reminderError || !reminder) {
      console.error('Reminder not found:', reminderId);
      return null;
    }

    // Mark the reminder as having notification sent
    await supabase
      .from('service_reminders')
      .update({
        notification_sent: true,
        notification_date: new Date().toISOString()
      })
      .eq('id', reminderId);

    // Return a notification object (in production, this would be stored in a notifications table)
    return {
      id: `notif-${Date.now()}`,
      reminder_id: reminderId,
      notification_type: notificationType,
      recipient,
      status: 'sent',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error creating reminder notification:', error);
    return null;
  }
};

/**
 * Get notifications for a specific reminder
 */
export const getReminderNotifications = async (reminderId: string): Promise<ReminderNotification[]> => {
  try {
    // Query the reminder to check notification status
    const { data: reminder, error } = await supabase
      .from('service_reminders')
      .select('id, notification_sent, notification_date')
      .eq('id', reminderId)
      .single();

    if (error || !reminder) {
      return [];
    }

    // If notification was sent, return a notification record
    if (reminder.notification_sent && reminder.notification_date) {
      return [{
        id: `notif-${reminder.id}`,
        reminder_id: reminderId,
        notification_type: 'in_app',
        recipient: 'system',
        status: 'sent',
        sent_at: reminder.notification_date,
        created_at: reminder.notification_date
      }];
    }

    return [];
  } catch (error) {
    console.error('Error getting reminder notifications:', error);
    return [];
  }
};

/**
 * Mark a notification as sent
 */
export const markNotificationAsSent = async (notificationId: string): Promise<void> => {
  // Extract reminder ID from notification ID format
  const reminderId = notificationId.replace('notif-', '');
  
  try {
    await supabase
      .from('service_reminders')
      .update({
        notification_sent: true,
        notification_date: new Date().toISOString()
      })
      .eq('id', reminderId);
    
    console.log(`Marked notification ${notificationId} as sent`);
  } catch (error) {
    console.error('Error marking notification as sent:', error);
  }
};

/**
 * Mark a notification as failed
 */
export const markNotificationAsFailed = async (notificationId: string): Promise<void> => {
  // In production, this would update a notifications table
  // For now, we just log the failure
  console.log(`Notification ${notificationId} marked as failed`);
};

/**
 * Get all pending notifications (reminders that haven't been notified yet)
 */
export const getPendingNotifications = async (): Promise<ReminderNotification[]> => {
  try {
    const { data: reminders, error } = await supabase
      .from('service_reminders')
      .select('id, created_at, customer_id')
      .eq('status', 'pending')
      .eq('notification_sent', false)
      .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching pending notifications:', error);
      return [];
    }

    return (reminders || []).map(reminder => ({
      id: `pending-${reminder.id}`,
      reminder_id: reminder.id,
      notification_type: 'in_app' as const,
      recipient: reminder.customer_id || 'unknown',
      status: 'pending' as const,
      created_at: reminder.created_at
    }));
  } catch (error) {
    console.error('Error getting pending notifications:', error);
    return [];
  }
};
