
import { supabase } from "../supabaseClient";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface TypingIndicator {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  started_at: string;
}

// Set typing indicator for a user in a room
export async function setTypingIndicator(
  roomId: string,
  userId: string,
  userName: string
): Promise<TypingIndicator | null> {
  try {
    // Upsert to avoid duplicate entries
    const { data, error } = await supabase
      .from('chat_typing_indicators')
      .upsert({
        room_id: roomId,
        user_id: userId,
        user_name: userName,
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error setting typing indicator:", error);
    return null;
  }
}

// Clear typing indicator for a user
export async function clearTypingIndicator(
  roomId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('chat_typing_indicators')
      .delete()
      .match({
        room_id: roomId,
        user_id: userId
      });
    
    if (error) throw error;
  } catch (error) {
    console.error("Error clearing typing indicator:", error);
  }
}

// Get all typing indicators for a room
export async function getTypingIndicators(
  roomId: string
): Promise<TypingIndicator[]> {
  try {
    // Get indicators less than 5 seconds old to filter out stale ones
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    
    const { data, error } = await supabase
      .from('chat_typing_indicators')
      .select('*')
      .eq('room_id', roomId)
      .gt('started_at', fiveSecondsAgo);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting typing indicators:", error);
    return [];
  }
}

// Subscribe to typing indicators for a room
export function subscribeToTypingIndicators(
  roomId: string,
  callback: (indicators: TypingIndicator[]) => void
): (() => void) {
  const channel = supabase
    .channel(`typing-indicators-${roomId}`)
    .on('postgres_changes', {
      event: '*', // Listen for all events (insert, update, delete)
      schema: 'public',
      table: 'chat_typing_indicators',
      filter: `room_id=eq.${roomId}`
    }, () => {
      // When there's any change, fetch all current indicators
      getTypingIndicators(roomId)
        .then(indicators => callback(indicators))
        .catch(console.error);
    })
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}
