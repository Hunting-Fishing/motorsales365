
import { supabase } from "../supabaseClient";
import { ChatRoom } from "@/types/chat";
import { DatabaseChatRoom, transformDatabaseRoom } from "./types";

// Get a specific chat room by ID
export const getChatRoom = async (roomId: string): Promise<ChatRoom | null> => {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Room not found
      }
      throw error;
    }
    
    return transformDatabaseRoom(data);
  } catch (error) {
    console.error("Error fetching chat room:", error);
    throw error;
  }
};

// Get chat room for a specific work order
export const getWorkOrderChatRoom = async (workOrderId: string): Promise<ChatRoom | null> => {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('type', 'work_order')
      .eq('work_order_id', workOrderId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Room not found
      }
      throw error;
    }
    
    return transformDatabaseRoom(data);
  } catch (error) {
    console.error("Error fetching work order chat room:", error);
    throw error;
  }
};

// Get shift chat room by date or room ID
export const getShiftChatRoom = async (dateOrId: Date | string): Promise<ChatRoom | null> => {
  try {
    let roomId: string;
    
    if (typeof dateOrId === 'string' && dateOrId.startsWith('shift-chat-')) {
      roomId = dateOrId;
    } else if (dateOrId instanceof Date) {
      const dateStr = dateOrId.toISOString().split('T')[0];
      roomId = `shift-chat-${dateStr}`;
    } else {
      roomId = dateOrId as string;
    }
    
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Room not found
      }
      throw error;
    }
    
    return transformDatabaseRoom(data);
  } catch (error) {
    console.error("Error fetching shift chat room:", error);
    throw error;
  }
};

// Get direct message room between two users
export const getDirectMessageRoom = async (userId1: string, userId2: string): Promise<ChatRoom | null> => {
  try {
    // Query for direct rooms where both users are participants
    const { data: rooms, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants!inner(user_id)
      `)
      .eq('type', 'direct');
    
    if (error) throw error;
    
    // Find room where both users are participants
    const room = rooms?.find(room => {
      const participants = room.chat_participants as any[];
      const userIds = participants.map(p => p.user_id);
      return userIds.includes(userId1) && userIds.includes(userId2) && userIds.length === 2;
    });
    
    return room ? transformDatabaseRoom(room) : null;
  } catch (error) {
    console.error("Error fetching direct message room:", error);
    throw error;
  }
};

// Search chat rooms
export const searchChatRooms = async (query: string, userId: string): Promise<ChatRoom[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants!inner(user_id)
      `)
      .eq('chat_participants.user_id', userId)
      .ilike('name', `%${query}%`)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(transformDatabaseRoom);
  } catch (error) {
    console.error("Error searching chat rooms:", error);
    throw error;
  }
};
