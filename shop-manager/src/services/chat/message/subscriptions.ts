
import { ChatMessage } from "@/types/chat";
import { supabase, DatabaseChatMessage } from "../supabaseClient";
import { RealtimeChannel } from "@supabase/supabase-js";
import { transformDatabaseMessage } from "./types";

// Subscribe to new messages in a chat room
export const subscribeToMessages = (roomId: string, callback: (message: ChatMessage) => void): (() => void) => {
  console.log('[subscribeToMessages] Setting up subscription for room:', roomId);
  
  const channel: RealtimeChannel = supabase
    .channel(`room-${roomId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `room_id=eq.${roomId}`
    }, (payload) => {
      try {
        console.log('[subscribeToMessages] New message received:', {
          roomId,
          messageId: payload.new.id,
          senderId: payload.new.sender_id
        });
        
        const newMessage = transformDatabaseMessage(payload.new as DatabaseChatMessage);
        callback(newMessage);
      } catch (error) {
        console.error('[subscribeToMessages] Error processing new message:', {
          error,
          payload,
          roomId
        });
      }
    })
    .subscribe((status, err) => {
      console.log('[subscribeToMessages] Subscription status changed:', {
        roomId,
        status,
        error: err
      });
    });
  
  // Return unsubscribe function
  return () => {
    console.log('[subscribeToMessages] Unsubscribing from room:', roomId);
    supabase.removeChannel(channel);
  };
};

// Subscribe to message updates (e.g., read status, flags)
export const subscribeToMessageUpdates = (roomId: string, callback: (message: ChatMessage) => void): (() => void) => {
  const channel: RealtimeChannel = supabase
    .channel(`room-updates-${roomId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'chat_messages',
      filter: `room_id=eq.${roomId}`
    }, (payload) => {
      const updatedMessage = transformDatabaseMessage(payload.new as DatabaseChatMessage);
      callback(updatedMessage);
    })
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};
