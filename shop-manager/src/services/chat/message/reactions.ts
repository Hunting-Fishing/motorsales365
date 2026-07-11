
import { supabase } from "../supabaseClient";

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

// Add a reaction to a message
export async function addMessageReaction(
  messageId: string,
  userId: string,
  reactionType: string
): Promise<MessageReaction | null> {
  try {
    const { data, error } = await supabase
      .from('chat_message_reactions')
      .insert([{
        message_id: messageId,
        user_id: userId,
        reaction_type: reactionType
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding message reaction:", error);
    throw error;
  }
}

// Remove a reaction from a message
export async function removeMessageReaction(
  messageId: string,
  userId: string,
  reactionType: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('chat_message_reactions')
      .delete()
      .match({
        message_id: messageId,
        user_id: userId,
        reaction_type: reactionType
      });
    
    if (error) throw error;
  } catch (error) {
    console.error("Error removing message reaction:", error);
    throw error;
  }
}

// Get all reactions for a message
export async function getMessageReactions(
  messageId: string
): Promise<MessageReaction[]> {
  try {
    const { data, error } = await supabase
      .from('chat_message_reactions')
      .select('*')
      .eq('message_id', messageId);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting message reactions:", error);
    throw error;
  }
}
