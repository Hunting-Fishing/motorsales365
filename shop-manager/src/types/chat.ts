
export interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'work_order';
  work_order_id?: string;
  created_at: string;
  updated_at: string;
  last_message?: ChatMessage;
  unread_count?: number;
  participants?: ChatParticipant[];
  description?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  metadata?: ChatRoomMetadata;
  retention_period?: number;
  retention_type?: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  is_read: boolean;
  message_type?: 'text' | 'audio' | 'image' | 'video' | 'file' | 'system' | 'work_order' | 'thread';
  file_url?: string;
  reply_to_id?: string;
  reply_to_message?: ChatMessage;
  is_flagged?: boolean;
  flag_reason?: string;
  metadata?: ChatMessageMetadata;
  is_edited?: boolean;
  edited_at?: string;
  original_content?: string;
  thread_parent_id?: string;
  thread_count?: number;
}

export interface ChatParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  user_name?: string;
  user_avatar?: string;
  is_online?: boolean;
  last_seen_at?: string;
  role?: string;
}

export interface VoiceCallInfo {
  id: string;
  room_id: string;
  caller_id: string;
  caller_name: string;
  recipient_id: string;
  recipient_name: string;
  status: 'ringing' | 'ongoing' | 'ended' | 'missed';
  started_at: string;
  ended_at?: string;
  duration?: number;
}

export interface ChatRoomMetadata {
  work_order?: {
    id: string;
    number: string;
    status: string;
    customer_name: string;
    vehicle?: string;
  };
  team?: string;
  shop_id?: string;
  is_shift_chat?: boolean;
  shift_date?: string;
  shift_name?: string;
  shift_time?: {
    start: string;
    end: string;
  };
  shift_participants?: string[];
  purpose?: string;
  tags?: string[];
}

export interface ChatMessageMetadata {
  work_order_id?: string;
  work_order_number?: string;
  part_id?: string;
  part_number?: string;
  vehicle_id?: string;
  warranty_id?: string;
  tagged_users?: string[];
  taggedItems?: {
    workOrderIds: string[];
    partIds: string[];
    warrantyIds: string[];
    jobIds: string[];
  };
  saved_to?: {
    work_order?: string;
    vehicle?: string;
    saved_at?: string;
  };
  important?: boolean;
  needs_attention?: boolean;
  needs_customer_approval?: boolean;
  repair_status_update?: boolean;
  location_data?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface ChatSearchQuery {
  text?: string;
  work_order_id?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  has_files?: boolean;
  is_flagged?: boolean;
}

export type MentionType = 'user' | 'role' | 'team' | 'all';

export interface MentionData {
  type: MentionType;
  id: string;
  name: string;
}
