
import { ChatMessage } from "@/types/chat";
import { supabase, DatabaseChatMessage } from "../supabaseClient";
import { MessageSendParams, MessageFlagParams, MessageEditParams, getMessageType, transformDatabaseMessage, parseTaggedItems } from "./types";

// Send a message to a chat room
export const sendMessage = async (message: MessageSendParams): Promise<ChatMessage> => {
  try {
    // Parse tagged items from the message content
    const taggedItems = parseTaggedItems(message.content);
    
    // Create metadata with tagged items
    const metadata = {
      ...message.metadata,
      taggedItems: taggedItems
    };
    
    const messageData = {
      room_id: message.room_id,
      sender_id: message.sender_id,
      sender_name: message.sender_name,
      content: message.content,
      is_read: false,
      message_type: getMessageType(message.content),
      metadata: metadata as any
    };
    
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([messageData])
      .select()
      .single();
    
    if (error) throw error;
    
    // Update the room's updated_at timestamp
    await supabase
      .from('chat_rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', message.room_id);
    
    return transformDatabaseMessage(data as DatabaseChatMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (roomId: string, userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('room_id', roomId)
      .neq('sender_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
};

// Flag a message for attention
export const flagChatMessage = async ({ messageId, reason, userId }: MessageFlagParams): Promise<void> => {
  try {
    // Update the message to mark it as flagged
    const { error } = await supabase
      .from('chat_messages')
      .update({
        is_flagged: true,
        flag_reason: reason,
        metadata: {
          flagged_by: userId,
          flagged_at: new Date().toISOString()
        } as any
      })
      .eq('id', messageId);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error flagging message:", error);
    throw error;
  }
};

// Delete a message
export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

// Edit a message
export const editMessage = async ({ messageId, content, userId }: MessageEditParams): Promise<ChatMessage> => {
  try {
    // First get the original message
    const { data: originalMessage, error: fetchError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Make sure the user can edit this message
    if (originalMessage.sender_id !== userId) {
      throw new Error("You can only edit your own messages");
    }
    
    // Parse tagged items from the new content
    const taggedItems = parseTaggedItems(content);
    
    // Handle metadata safely
    const originalMetadata = originalMessage.metadata || {};
    const metadataObj = typeof originalMetadata === 'string' ? 
      JSON.parse(originalMetadata) : originalMetadata;
    
    // Update the message
    const { data, error } = await supabase
      .from('chat_messages')
      .update({
        content: content,
        is_edited: true,
        edited_at: new Date().toISOString(),
        original_content: originalMessage.original_content || originalMessage.content,
        metadata: {
          ...metadataObj,
          taggedItems: taggedItems,
          edit_history: [
            ...(metadataObj.edit_history || []),
            {
              previous_content: originalMessage.content,
              edited_at: new Date().toISOString()
            }
          ]
        } as any
      })
      .eq('id', messageId)
      .select()
      .single();
      
    if (error) throw error;
    
    return transformDatabaseMessage(data as DatabaseChatMessage);
  } catch (error) {
    console.error("Error editing message:", error);
    throw error;
  }
};

// Save message to vehicle history or work order
export const saveMessageToRecord = async (
  messageId: string, 
  recordType: 'vehicle' | 'work_order', 
  recordId: string
): Promise<void> => {
  try {
    // First, get the message to be saved
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)
      .single();
      
    if (messageError) throw messageError;
    
    // Handle metadata safely
    const currentMetadata = message.metadata || {};
    const metadataObj = typeof currentMetadata === 'string' ? 
      JSON.parse(currentMetadata) : currentMetadata;
    
    // Update the message metadata to indicate it's been saved
    const updatedMetadata = {
      ...metadataObj,
      saved_to: {
        ...(metadataObj.saved_to || {}),
        [recordType]: recordId,
        saved_at: new Date().toISOString()
      }
    };
    
    // Update the message with the new metadata
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({
        metadata: updatedMetadata as any
      })
      .eq('id', messageId);
      
    if (updateError) throw updateError;
    
    // If saving to a work order, you could add a note to the work order
    if (recordType === 'work_order') {
      // Logic to add the message to work order notes could go here
      // This would depend on your work order table structure
    }
    
    // If saving to a vehicle, you could add a note to the vehicle history
    if (recordType === 'vehicle') {
      // Logic to add the message to vehicle history could go here
      // This would depend on your vehicle history table structure
    }
  } catch (error) {
    console.error(`Error saving message to ${recordType}:`, error);
    throw error;
  }
};
