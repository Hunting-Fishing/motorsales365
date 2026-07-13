
import { supabase } from "../supabaseClient";

export interface ReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

// Mark a message as read by a user
export async function markMessageAsRead(
  messageId: string,
  userId: string
): Promise<ReadReceipt | null> {
  try {
    // Use upsert to avoid duplicate entries
    const { data, error } = await supabase
      .from('chat_message_read_receipts')
      .upsert({
        message_id: messageId,
        user_id: userId,
        read_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error marking message as read:", error);
    throw error;
  }
}

// Get read receipts for a message
export async function getMessageReadReceipts(
  messageId: string
): Promise<ReadReceipt[]> {
  try {
    const { data, error } = await supabase
      .from('chat_message_read_receipts')
      .select('*')
      .eq('message_id', messageId);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting message read receipts:", error);
    throw error;
  }
}

// Check if all room participants have read a message
export async function checkAllHaveRead(
  messageId: string,
  roomId: string,
  senderId: string
): Promise<boolean> {
  try {
    // Get all participants in the room except the sender
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', roomId)
      .neq('user_id', senderId);
    
    if (participantsError) throw participantsError;
    
    // If there are no other participants, return true
    if (!participants || participants.length === 0) {
      return true;
    }
    
    // Get read receipts for this message
    const { data: readReceipts, error: receiptsError } = await supabase
      .from('chat_message_read_receipts')
      .select('user_id')
      .eq('message_id', messageId);
      
    if (receiptsError) throw receiptsError;
    
    if (!readReceipts) return false;
    
    // Check if all participants have read the message
    const participantIds = participants.map(p => p.user_id);
    const readUserIds = readReceipts.map(r => r.user_id);
    
    return participantIds.every(id => readUserIds.includes(id));
  } catch (error) {
    console.error("Error checking if all have read:", error);
    return false;
  }
}
