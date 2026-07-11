
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from './use-toast';
import { useNotifications } from '@/context/notifications';

interface UseChatNotificationsProps {
  userId: string;
}

export const useChatNotifications = ({ userId }: UseChatNotificationsProps) => {
  const { addNotification } = useNotifications();

  // Handler for new message notifications
  const handleNewMessage = useCallback((payload: any) => {
    const message = payload.new;
    
    // Only notify for messages from other users
    if (message.sender_id !== userId) {
      // Show toast notification
      toast({
        title: `New message from ${message.sender_name}`,
        description: message.content.length > 60 
          ? `${message.content.substring(0, 60)}...` 
          : message.content,
        variant: "default",
      });
      
      // Add to notification center
      addNotification({
        title: `New message from ${message.sender_name}`,
        message: message.content.length > 100 
          ? `${message.content.substring(0, 100)}...` 
          : message.content,
        type: 'info',
        category: 'chat',
        link: `/chat/${message.room_id}`,
      });
    }
  }, [userId, addNotification]);

  // Subscribe to new messages
  useEffect(() => {
    if (!userId) return;

    // Create a channel to listen for new messages across all rooms
    const channel = supabase
      .channel('chat-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, handleNewMessage)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, handleNewMessage]);

  return {
    // Return any methods if needed
  };
};
