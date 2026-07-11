
import { ChatParticipant } from "@/types/chat";
import { supabase } from "./supabaseClient";

// Get participants for a chat room
export const getChatParticipants = async (roomId: string): Promise<ChatParticipant[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('room_id', roomId);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching chat participants:", error);
    throw error;
  }
};

// Add participant to a chat room
export const addParticipantToRoom = async (roomId: string, userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('chat_participants')
      .insert([{
        room_id: roomId,
        user_id: userId
      }]);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error adding participant to room:", error);
    throw error;
  }
};
