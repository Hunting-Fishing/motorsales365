
// Define the types for Supabase responses
export interface DatabaseChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'work_order';
  work_order_id?: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  metadata?: Record<string, any>;
  retention_period?: number;
  retention_type?: string;
}

export interface DatabaseChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  is_read?: boolean;
  message_type?: string;
  file_url?: string;
  reply_to_id?: string;
  is_flagged?: boolean;
  flag_reason?: string;
  metadata?: Record<string, any>;
  is_edited?: boolean;
  edited_at?: string;
  original_content?: string;
  thread_parent_id?: string;
  thread_count?: number;
}

export interface DatabaseChatParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
}

import { supabase } from '@/integrations/supabase/client';
export { supabase };

// Re-export the uploadChatFile from the proper upload service that uses Supabase Storage
export { uploadChatFile } from './file/uploadService';
