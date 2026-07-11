
import { useState, useCallback } from 'react';
import { ChatRoom } from '@/types/chat';
import { useChatRooms } from './useChatRooms';
import { useChatMessages } from './useChatMessages';

interface UseChatProps {
  userId: string;
  userName: string;
}

export const useChat = ({ userId, userName }: UseChatProps) => {
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  
  // Use the extracted hooks
  const { 
    chatRooms, 
    loading: roomsLoading, 
    error: roomsError,
    refreshRooms,
    pinRoom,
    archiveRoom,
    deleteRoom
  } = useChatRooms({ userId });

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
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
  } = useChatMessages({ 
    userId, 
    userName, 
    currentRoomId: currentRoom?.id || null 
  });

  // Select a chat room (or null to deselect for mobile back navigation)
  const selectRoom = useCallback(async (room: ChatRoom | null) => {
    setCurrentRoom(room);
  }, []);

  // Pin a room
  const handlePinRoom = useCallback(() => {
    if (currentRoom) {
      pinRoom(currentRoom.id, !currentRoom.is_pinned);
    }
  }, [currentRoom, pinRoom]);

  // Archive a room
  const handleArchiveRoom = useCallback(() => {
    if (currentRoom) {
      archiveRoom(currentRoom.id, !currentRoom.is_archived);
    }
  }, [currentRoom, archiveRoom]);

  // Delete a room
  const handleDeleteRoom = useCallback((roomId: string) => {
    deleteRoom(roomId);
    if (currentRoom?.id === roomId) {
      setCurrentRoom(null);
    }
  }, [deleteRoom, currentRoom]);

  return {
    chatRooms,
    currentRoom,
    messages,
    loading: roomsLoading || messagesLoading,
    error: roomsError || messagesError,
    newMessageText,
    setNewMessageText,
    selectRoom,
    handleSendMessage,
    handleSendVoiceMessage,
    handleSendFileMessage,
    handlePinRoom,
    handleArchiveRoom,
    handleDeleteRoom,
    flagMessage,
    handleEditMessage,
    isTyping,
    typingUsers,
    handleTyping,
    threadMessages,
    activeThreadId,
    handleThreadOpen,
    handleThreadClose,
    fetchThreadReplies,
    refreshRooms
  };
};
