
// Re-export notification service from the new files
export { supabaseNotificationService as notificationService } from './notifications/SupabaseNotificationService';
export { SupabaseNotificationService as NotificationService } from './notifications/SupabaseNotificationService';
export type { INotificationService } from './notifications/types';
