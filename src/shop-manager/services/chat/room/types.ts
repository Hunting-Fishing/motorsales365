
import { ChatRoom, ChatRoomMetadata } from '@/types/chat';

export interface DatabaseChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'work_order';
  work_order_id?: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  metadata?: any;
  retention_period?: number;
  retention_type?: string;
}

export interface CreateRoomParams {
  name: string;
  type: 'direct' | 'group' | 'work_order';
  participants: string[];
  workOrderId?: string;
  metadata?: ChatRoomMetadata;
  id?: string;
}

export const transformDatabaseRoom = (dbRoom: any): ChatRoom => ({
  id: dbRoom.id,
  name: dbRoom.name,
  type: dbRoom.type as 'direct' | 'group' | 'work_order',
  work_order_id: dbRoom.work_order_id,
  created_at: dbRoom.created_at,
  updated_at: dbRoom.updated_at,
  is_pinned: dbRoom.is_pinned || false,
  is_archived: dbRoom.is_archived || false,
  metadata: dbRoom.metadata as ChatRoomMetadata,
  retention_period: dbRoom.retention_period,
  retention_type: dbRoom.retention_type
});
