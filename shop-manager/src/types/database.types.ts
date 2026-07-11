
/**
 * Custom database type definitions to complement Supabase generated types
 */

export interface NotificationDB {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'error';
  link?: string;
  sender?: string;
  recipient?: string;
  category?: 'system' | 'invoice' | 'workOrder' | 'inventory' | 'customer' | 'team' | 'chat';
  priority?: 'low' | 'medium' | 'high';
  expires_at?: string;
}
