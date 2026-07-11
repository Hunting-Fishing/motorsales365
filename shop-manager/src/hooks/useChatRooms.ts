
import { useState, useEffect, useCallback } from 'react';
import { ChatRoom } from '@/types/chat';
import { getUserChatRooms, pinChatRoom, archiveChatRoom, deleteChatRoom } from '@/services/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UseChatRoomsProps {
  userId: string;
}

export const useChatRooms = ({ userId }: UseChatRoomsProps) => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch chat rooms
  const fetchChatRooms = useCallback(async () => {
    if (!userId) {
      console.error('[useChatRooms] Cannot fetch rooms: userId is missing');
      return;
    }
    
    console.log('[useChatRooms] Fetching chat rooms for user:', userId);
    
    try {
      setLoading(true);
      setError(null);
      
      const fetchedRooms = await getUserChatRooms(userId);
      console.log('[useChatRooms] Fetched rooms:', fetchedRooms.length, 'rooms');
      
      // Sort by pin status first, then by most recently updated
      fetchedRooms.sort((a, b) => {
        // Pinned rooms come first
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        
        // Then sort by update time
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      
      // Filter out archived rooms unless we're specifically viewing them
      const filteredRooms = fetchedRooms.filter(room => !room.is_archived);
      console.log('[useChatRooms] After filtering archived:', filteredRooms.length, 'active rooms');
      
      setChatRooms(filteredRooms);
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error';
      const errorCode = err?.code || 'NO_CODE';
      console.error('[useChatRooms] Failed to load chat rooms:', {
        error: err,
        message: errorMessage,
        code: errorCode,
        userId,
        timestamp: new Date().toISOString()
      });
      
      setError(`Failed to load chat rooms: ${errorMessage} (${errorCode})`);
      toast({
        title: "Error Loading Conversations",
        description: `Couldn't load conversations: ${errorMessage}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Pin a chat room
  const pinRoom = useCallback(async (roomId: string, isPinned: boolean) => {
    console.log('[useChatRooms] Pinning room:', { roomId, isPinned });
    
    try {
      await pinChatRoom(roomId, isPinned);
      
      // Update local state
      setChatRooms(prevRooms => {
        const updatedRooms = prevRooms.map(room => 
          room.id === roomId ? { ...room, is_pinned: isPinned } : room
        );
        
        // Re-sort based on pin status
        return [...updatedRooms].sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
      });
      
      console.log('[useChatRooms] Successfully pinned/unpinned room:', roomId);
      toast({
        title: isPinned ? "Conversation pinned" : "Conversation unpinned",
        description: isPinned 
          ? "This conversation will stay at the top of your list" 
          : "This conversation has been unpinned",
      });
    } catch (err: any) {
      console.error('[useChatRooms] Failed to pin/unpin room:', {
        error: err,
        roomId,
        isPinned,
        message: err?.message,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error",
        description: `Failed to update conversation settings: ${err?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  }, []);

  // Archive a chat room
  const archiveRoom = useCallback(async (roomId: string, isArchived: boolean) => {
    console.log('[useChatRooms] Archiving room:', { roomId, isArchived });
    
    try {
      await archiveChatRoom(roomId, isArchived);
      
      // Update local state - remove from list if archived
      if (isArchived) {
        setChatRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));
      } else {
        // If unarchiving, we'll need to fetch all rooms again
        fetchChatRooms();
      }
      
      console.log('[useChatRooms] Successfully archived/unarchived room:', roomId);
      toast({
        title: isArchived ? "Conversation archived" : "Conversation unarchived",
        description: isArchived 
          ? "This conversation has been moved to archives" 
          : "This conversation has been restored",
      });
    } catch (err: any) {
      console.error('[useChatRooms] Failed to archive/unarchive room:', {
        error: err,
        roomId,
        isArchived,
        message: err?.message,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error",
        description: `Failed to update conversation settings: ${err?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  }, [fetchChatRooms]);

  // Subscribe to chat room updates
  useEffect(() => {
    if (!userId) return;

    // Subscribe to changes in chat_rooms
    const roomsChannel = supabase
      .channel('public:chat_rooms')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_rooms'
      }, () => {
        // Refresh the rooms when changes occur
        fetchChatRooms();
      })
      .subscribe();

    // Subscribe to changes in chat_messages (to update last_message and unread_count)
    const messagesChannel = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, () => {
        // Refresh the rooms when a new message is added
        fetchChatRooms();
      })
      .subscribe();

    // Initial fetch of chat rooms
    fetchChatRooms();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [userId, fetchChatRooms]);

  // Delete a chat room
  const deleteRoom = useCallback(async (roomId: string) => {
    console.log('[useChatRooms] Deleting room:', roomId);
    
    try {
      await deleteChatRoom(roomId);
      
      // Update local state - remove from list
      setChatRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));
      
      console.log('[useChatRooms] Successfully deleted room:', roomId);
      toast({
        title: "Conversation deleted",
        description: "The conversation has been permanently deleted",
      });
    } catch (err: any) {
      console.error('[useChatRooms] Failed to delete room:', {
        error: err,
        roomId,
        message: err?.message,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error",
        description: `Failed to delete conversation: ${err?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  }, []);

  return {
    chatRooms,
    loading,
    error,
    refreshRooms: fetchChatRooms,
    pinRoom,
    archiveRoom,
    deleteRoom
  };
};
