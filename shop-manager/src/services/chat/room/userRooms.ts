
import { supabase } from "../supabaseClient";
import { ChatRoom, ChatMessage } from "@/types/chat";
import { DatabaseChatRoom } from "./types";

// Get all chat rooms for a specific user
export const getUserChatRooms = async (userId: string): Promise<ChatRoom[]> => {
  try {
    const { data: roomsData, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants!inner(user_id)
      `)
      .eq('chat_participants.user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    // Get last message and unread count for each room
    const roomsWithDetails = await Promise.all(
      (roomsData || []).map(async (room: any) => {
        // Get last message
        const { data: lastMessage } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        // Get unread count
        const { count: unreadCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .eq('is_read', false)
          .neq('sender_id', userId);
        
        return {
          ...room,
          last_message: lastMessage ? {
            ...lastMessage,
            message_type: lastMessage.message_type as ChatMessage['message_type'] || 'text'
          } : undefined,
          unread_count: unreadCount || 0,
          type: room.type as 'direct' | 'group' | 'work_order'
        } as ChatRoom;
      })
    );
    
    return roomsWithDetails;
  } catch (error) {
    console.error("Error fetching user chat rooms:", error);
    throw error;
  }
};

// Get archived chat rooms for a user
export const getArchivedChatRooms = async (userId: string): Promise<ChatRoom[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants!inner(user_id)
      `)
      .eq('chat_participants.user_id', userId)
      .eq('is_archived', true)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(room => ({
      ...room,
      type: room.type as 'direct' | 'group' | 'work_order'
    })) as ChatRoom[];
  } catch (error) {
    console.error("Error fetching archived chat rooms:", error);
    throw error;
  }
};
