import { supabase } from '@/integrations/supabase/client';
import { ChatRoom, ChatMessage, ChatParticipant } from '@/types/chat';

export async function getChatRooms(currentUserId?: string): Promise<ChatRoom[]> {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select(`
      *,
      chat_messages!chat_messages_room_id_fkey (
        id,
        content,
        created_at,
        sender_name,
        message_type,
        is_read
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching chat rooms:', error);
    throw error;
  }

  // Calculate unread counts per room
  const roomsWithUnread = await Promise.all((data || []).map(async (room) => {
    let unreadCount = 0;
    
    if (currentUserId && room.chat_messages) {
      // Count messages not sent by current user that are unread
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)
        .neq('sender_id', currentUserId)
        .eq('is_read', false);
      
      unreadCount = count || 0;
    }

    return {
      ...room,
      type: room.type as 'direct' | 'group' | 'work_order',
      metadata: room.metadata as any,
      last_message: room.chat_messages?.[0] ? {
        ...room.chat_messages[0],
        room_id: room.id,
        sender_id: 'unknown',
        is_read: false,
        message_type: room.chat_messages[0].message_type as any,
        is_edited: false,
        is_flagged: false,
        thread_count: 0,
        edited_at: null,
        file_url: null,
        flag_reason: null,
        metadata: null,
        original_content: null,
        reply_to_id: null,
        thread_parent_id: null
      } : undefined,
      unread_count: unreadCount
    };
  }));

  return roomsWithUnread;
}

export async function getChatMessages(roomId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat messages:', error);
    throw error;
  }

  return (data || []).map(msg => ({
    ...msg,
    message_type: msg.message_type as any,
    metadata: msg.metadata as any
  }));
}

export async function sendMessage(
  roomId: string,
  content: string,
  senderId: string,
  senderName: string,
  messageType: string = 'text',
  fileUrl?: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      content,
      sender_id: senderId,
      sender_name: senderName,
      message_type: messageType,
      file_url: fileUrl,
      is_read: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }

  return {
    ...data,
    message_type: data.message_type as any,
    metadata: data.metadata as any
  };
}

export async function createChatRoom(
  name: string,
  type: 'direct' | 'group' | 'work_order',
  workOrderId?: string,
  participants?: string[]
): Promise<ChatRoom> {
  const { data, error } = await supabase
    .from('chat_rooms')
    .insert({
      name,
      type,
      work_order_id: workOrderId,
      metadata: {}
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating chat room:', error);
    throw error;
  }

  // Add participants if provided
  if (participants && participants.length > 0) {
    const participantInserts = participants.map(userId => ({
      room_id: data.id,
      user_id: userId
    }));

    await supabase
      .from('chat_participants')
      .insert(participantInserts);
  }

  return {
    ...data,
    type: data.type as 'direct' | 'group' | 'work_order',
    metadata: data.metadata as any
  };
}

export async function getChatParticipants(roomId: string): Promise<ChatParticipant[]> {
  const { data, error } = await supabase
    .from('chat_participants')
    .select('*')
    .eq('room_id', roomId);

  if (error) {
    console.error('Error fetching chat participants:', error);
    throw error;
  }

  return data || [];
}

export async function markMessageAsRead(messageId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_message_read_receipts')
    .upsert({
      message_id: messageId,
      user_id: userId
    });

  if (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
}

export async function pinRoom(roomId: string, isPinned: boolean): Promise<void> {
  const { error } = await supabase
    .from('chat_rooms')
    .update({ is_pinned: isPinned })
    .eq('id', roomId);

  if (error) {
    console.error('Error pinning room:', error);
    throw error;
  }
}

export async function archiveRoom(roomId: string, isArchived: boolean): Promise<void> {
  const { error } = await supabase
    .from('chat_rooms')
    .update({ is_archived: isArchived })
    .eq('id', roomId);

  if (error) {
    console.error('Error archiving room:', error);
    throw error;
  }
}