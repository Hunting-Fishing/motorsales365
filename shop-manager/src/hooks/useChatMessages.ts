
import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '@/types/chat';
import { 
  getChatMessages,
  markMessagesAsRead,
  subscribeToMessages,
  sendMessage,
  flagChatMessage,
  editMessage,
  getThreadReplies
} from '@/services/chat';
import { toast } from '@/hooks/use-toast';
import { MessageSendParams } from '@/services/chat/message/types';
import { parseFileFromMessage } from '@/services/chat/fileService';
import { 
  setTypingIndicator, 
  clearTypingIndicator, 
  subscribeToTypingIndicators 
} from '@/services/chat/message/typingIndicator';

interface UseChatMessagesProps {
  userId: string;
  userName: string;
  currentRoomId: string | null;
}

export const useChatMessages = ({ userId, userName, currentRoomId }: UseChatMessagesProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);
  const [typingUsers, setTypingUsers] = useState<{id: string, name: string}[]>([]);
  const [threadMessages, setThreadMessages] = useState<{[key: string]: ChatMessage[]}>({});
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Fetch messages for a selected room
  const fetchMessages = useCallback(async (roomId: string) => {
    if (!roomId || !userId) {
      console.error('[useChatMessages] Cannot fetch messages: missing roomId or userId', { roomId, userId });
      return;
    }
    
    console.log('[useChatMessages] Fetching messages for room:', roomId);
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch messages for the selected room
      const fetchedMessages = await getChatMessages(roomId);
      console.log('[useChatMessages] Fetched messages:', fetchedMessages.length, 'messages');
      setMessages(fetchedMessages);
      
      // Mark messages as read
      await markMessagesAsRead(roomId, userId);
      console.log('[useChatMessages] Marked messages as read for room:', roomId);
    } catch (err: any) {
      console.error('[useChatMessages] Failed to load messages:', {
        error: err,
        roomId,
        userId,
        message: err?.message,
        code: err?.code,
        timestamp: new Date().toISOString()
      });
      
      setError(`Failed to load messages: ${err?.message || 'Unknown error'}`);
      toast({
        title: "Error Loading Messages",
        description: `Couldn't load messages: ${err?.message || 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch thread replies
  const fetchThreadReplies = useCallback(async (messageId: string) => {
    if (!messageId) return;
    
    try {
      const replies = await getThreadReplies(messageId);
      
      setThreadMessages(prev => ({
        ...prev,
        [messageId]: replies
      }));
      
      return replies;
    } catch (err) {
      console.error('Failed to load thread replies:', err);
      toast({
        title: "Error",
        description: "Couldn't load message replies.",
        variant: "destructive",
      });
      return [];
    }
  }, []);

  // Handle opening/closing threads
  const handleThreadOpen = useCallback(async (messageId: string) => {
    setActiveThreadId(messageId);
    
    // Load thread replies if not already loaded
    if (!threadMessages[messageId]) {
      await fetchThreadReplies(messageId);
    }
  }, [threadMessages, fetchThreadReplies]);

  const handleThreadClose = useCallback(() => {
    setActiveThreadId(null);
  }, []);

  // Subscribe to new messages when a room is selected
  useEffect(() => {
    if (!currentRoomId || !userId) return;

    // Initial fetch of messages
    fetchMessages(currentRoomId);

    const unsubscribe = subscribeToMessages(currentRoomId, (newMessage) => {
      setMessages(prevMessages => {
        // Check if the message is already in the list to avoid duplicates
        const isDuplicate = prevMessages.some(msg => msg.id === newMessage.id);
        if (isDuplicate) return prevMessages;
        
        // If it's a thread reply, add it to the thread messages
        if (newMessage.thread_parent_id) {
          setThreadMessages(prev => {
            const parentId = newMessage.thread_parent_id!;
            return {
              ...prev,
              [parentId]: [
                ...(prev[parentId] || []),
                newMessage
              ]
            };
          });
          
          // Also update the thread count on the parent message
          return prevMessages.map(msg => 
            msg.id === newMessage.thread_parent_id
              ? { ...msg, thread_count: (msg.thread_count || 0) + 1 }
              : msg
          );
        }
        
        // For regular messages, add to the main list
        return [...prevMessages, newMessage];
      });
      
      // If the message is from someone else, mark it as read
      if (newMessage.sender_id !== userId) {
        markMessagesAsRead(currentRoomId, userId).catch(console.error);
      }
    });

    // Subscribe to typing indicators
    const unsubscribeTyping = subscribeToTypingIndicators(currentRoomId, (indicators) => {
      // Filter out current user and convert to simpler format
      const typingUserList = indicators
        .filter(indicator => indicator.user_id !== userId)
        .map(indicator => ({ 
          id: indicator.user_id, 
          name: indicator.user_name 
        }));
        
      setTypingUsers(typingUserList);
      setIsTyping(typingUserList.length > 0);
    });

    return () => {
      unsubscribe();
      unsubscribeTyping();
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
    };
  }, [currentRoomId, userId, fetchMessages, typingTimer]);

  // Send a new text message
  const handleSendMessage = useCallback(async (threadParentId?: string) => {
    if (!currentRoomId || !newMessageText.trim() || !userId) {
      console.warn('[useChatMessages] Cannot send message: missing required fields', {
        currentRoomId,
        hasMessage: !!newMessageText.trim(),
        userId
      });
      return;
    }
    
    console.log('[useChatMessages] Sending message:', {
      roomId: currentRoomId,
      messageLength: newMessageText.length,
      threadParentId
    });
    
    try {
      const messageParams: MessageSendParams = {
        room_id: currentRoomId,
        sender_id: userId,
        sender_name: userName,
        content: newMessageText,
        message_type: 'text',
        thread_parent_id: threadParentId,
        metadata: {}
      };
      
      await sendMessage(messageParams);
      console.log('[useChatMessages] Message sent successfully');
      
      // Clear typing indicator
      await clearTypingIndicator(currentRoomId, userId);
      
      // Clear the input after sending (the subscription will catch the new message)
      setNewMessageText('');
    } catch (err: any) {
      console.error('[useChatMessages] Failed to send message:', {
        error: err,
        roomId: currentRoomId,
        userId,
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        timestamp: new Date().toISOString()
      });
      
      setError(`Failed to send message: ${err?.message || 'Unknown error'}`);
      toast({
        title: "Error Sending Message",
        description: `Failed to send message: ${err?.message || 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    }
  }, [currentRoomId, newMessageText, userId, userName]);

  // Send a voice message
  const handleSendVoiceMessage = useCallback(async (audioUrl: string, threadParentId?: string) => {
    if (!currentRoomId || !userId) return;
    
    try {
      const messageParams: MessageSendParams = {
        room_id: currentRoomId,
        sender_id: userId,
        sender_name: userName,
        content: audioUrl,
        message_type: 'audio',
        thread_parent_id: threadParentId,
        metadata: {}
      };
      
      await sendMessage(messageParams);
    } catch (err) {
      console.error('Failed to send voice message:', err);
      setError('Failed to send voice message');
      toast({
        title: "Error",
        description: "Failed to send voice message. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentRoomId, userId, userName]);

  // Send a file message
  const handleSendFileMessage = useCallback(async (fileMessage: string, threadParentId?: string) => {
    if (!currentRoomId || !userId) return;
    
    try {
      const messageParams: MessageSendParams = {
        room_id: currentRoomId,
        sender_id: userId,
        sender_name: userName,
        content: fileMessage,
        message_type: 'file',
        thread_parent_id: threadParentId,
        metadata: {}
      };
      
      await sendMessage(messageParams);
    } catch (err) {
      console.error('Failed to send file message:', err);
      setError('Failed to send file message');
      toast({
        title: "Error",
        description: "Failed to send file. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentRoomId, userId, userName]);

  // Flag a message as important or for attention
  const flagMessage = useCallback(async (messageId: string, reason: string) => {
    if (!messageId || !userId) return;
    
    try {
      await flagChatMessage({
        messageId,
        reason,
        userId
      });
      
      // Update the message in the local state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, is_flagged: true, flag_reason: reason } 
            : msg
        )
      );
      
      toast({
        title: "Message flagged",
        description: `The message has been flagged as ${reason}`,
      });
    } catch (err) {
      console.error('Failed to flag message:', err);
      toast({
        title: "Error",
        description: "Failed to flag message. Please try again.",
        variant: "destructive",
      });
    }
  }, [userId]);

  // Edit a message
  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!messageId || !userId || !newContent.trim()) return;
    
    try {
      const updatedMessage = await editMessage({
        messageId,
        content: newContent,
        userId
      });
      
      // Update the message in the local state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId ? updatedMessage : msg
        )
      );
      
      // Also update in thread messages if needed
      if (updatedMessage.thread_parent_id) {
        setThreadMessages(prev => {
          const parentId = updatedMessage.thread_parent_id!;
          if (!prev[parentId]) return prev;
          
          return {
            ...prev,
            [parentId]: prev[parentId].map(msg => 
              msg.id === messageId ? updatedMessage : msg
            )
          };
        });
      }
      
      toast({
        title: "Message updated",
        description: "Your message has been edited.",
      });
    } catch (err) {
      console.error('Failed to edit message:', err);
      toast({
        title: "Error",
        description: "Failed to edit message. Please try again.",
        variant: "destructive",
      });
    }
  }, [userId]);

  // Simulate typing indicator
  const handleTyping = useCallback(() => {
    if (!currentRoomId || !userId) return;
    
    // Update typing indicator in database
    setTypingIndicator(currentRoomId, userId, userName)
      .catch(console.error);
    
    if (typingTimer) {
      clearTimeout(typingTimer);
    }
    
    // Clear typing indicator after 3 seconds of inactivity
    const timer = setTimeout(async () => {
      await clearTypingIndicator(currentRoomId, userId);
    }, 3000);
    
    setTypingTimer(timer);
    
    return () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
    };
  }, [currentRoomId, typingTimer, userId, userName]);

  return {
    messages,
    loading,
    error,
    newMessageText,
    setNewMessageText,
    handleSendMessage,
    handleSendVoiceMessage,
    handleSendFileMessage,
    flagMessage,
    handleEditMessage,
    isTyping,
    typingUsers,
    handleTyping,
    threadMessages,
    activeThreadId,
    handleThreadOpen,
    handleThreadClose,
    fetchThreadReplies
  };
};
