
import { ChatMessage } from "@/types/chat";
import { supabase, DatabaseChatMessage } from "../supabaseClient";
import { transformDatabaseMessage } from "./types";

// Get messages for a specific chat room
export const getChatMessages = async (roomId: string): Promise<ChatMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .is('thread_parent_id', null) // Get top-level messages only
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Transform messages to ensure proper types
    const messages = data ? data.map(msg => transformDatabaseMessage(msg as DatabaseChatMessage)) : [];
    return messages;
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    throw error;
  }
};

// Get thread replies for a parent message
export const getThreadReplies = async (parentMessageId: string): Promise<ChatMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_parent_id', parentMessageId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Transform messages to ensure proper types
    const messages = data ? data.map(msg => transformDatabaseMessage(msg as DatabaseChatMessage)) : [];
    return messages;
  } catch (error) {
    console.error("Error fetching thread replies:", error);
    throw error;
  }
};

// Get a single message by ID
export const getChatMessage = async (messageId: string): Promise<ChatMessage | null> => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)
      .single();
    
    if (error) throw error;
    if (!data) return null;
    
    return transformDatabaseMessage(data as DatabaseChatMessage);
  } catch (error) {
    console.error("Error fetching chat message:", error);
    throw error;
  }
};

// Get unread message count for a room
export const getUnreadMessagesCount = async (roomId: string, userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact' })
      .eq('room_id', roomId)
      .eq('is_read', false)
      .neq('sender_id', userId);
    
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error counting unread messages:", error);
    throw error;
  }
};
