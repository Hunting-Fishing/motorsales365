
import { supabase } from "../supabaseClient";
import { ChatRoom } from "@/types/chat";
import { CreateRoomParams, transformDatabaseRoom } from "./types";

// Create a new chat room
export const createChatRoom = async (params: CreateRoomParams): Promise<ChatRoom> => {
  console.log('[createChatRoom] Starting room creation:', {
    name: params.name,
    type: params.type,
    participantsCount: params.participants.length,
    hasWorkOrderId: !!params.workOrderId
  });

  try {
    // Validate and recover session before proceeding
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('[createChatRoom] Auth session validation:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      sessionError: sessionError?.message,
      expiresAt: session?.expires_at
    });

    // Critical: Verify we have a valid authenticated session
    if (!session || sessionError) {
      console.error('[createChatRoom] No valid session found:', {
        sessionError: sessionError?.message,
        hasSession: !!session
      });
      throw new Error('Authentication required. Please log in and try again.');
    }

    // Verify session is not expired
    if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
      console.error('[createChatRoom] Session expired:', {
        expiresAt: new Date(session.expires_at * 1000),
        now: new Date()
      });
      throw new Error('Your session has expired. Please log in again.');
    }

    console.log('[createChatRoom] Session validated successfully');

    // Prepare the room data with creator tracking
    const roomData: any = {
      name: params.name,
      type: params.type,
      work_order_id: params.workOrderId,
      metadata: params.metadata as any,
      created_by: session.user.id  // Track room creator for RLS
    };
    
    // Only add ID if explicitly provided
    if (params.id) {
      roomData.id = params.id;
      console.log('[createChatRoom] Using provided room ID:', params.id);
    }

    // Ensure creator is always in participants list
    const creatorId = session.user.id;
    const participants = params.participants.includes(creatorId)
      ? params.participants
      : [creatorId, ...params.participants];

    console.log('[createChatRoom] Inserting room into database');
    
    // Create the room
    const { data: room, error: roomError } = params.id 
      ? await supabase.from('chat_rooms').upsert([roomData]).select().single()
      : await supabase.from('chat_rooms').insert([roomData]).select().single();
    
    if (roomError) {
      console.error('[createChatRoom] Room creation failed:', {
        error: roomError,
        message: roomError.message,
        code: roomError.code,
        details: roomError.details,
        hint: roomError.hint
      });
      throw roomError;
    }
    
    console.log('[createChatRoom] Room created successfully:', room.id);
    console.log('[createChatRoom] Adding participants:', participants);
    
    // Add participants to the room (including creator)
    const participantData = participants.map(userId => ({
      room_id: room.id,
      user_id: userId
    }));
    
    const { error: participantError } = await supabase
      .from('chat_participants')
      .upsert(participantData);
    
    if (participantError) {
      console.error('[createChatRoom] Participant insertion failed:', {
        error: participantError,
        message: participantError.message,
        code: participantError.code,
        details: participantError.details,
        hint: participantError.hint,
        roomId: room.id,
        participants: params.participants
      });
      throw participantError;
    }
    
    console.log('[createChatRoom] Participants added successfully');
    const transformedRoom = transformDatabaseRoom(room);
    console.log('[createChatRoom] Room creation complete:', transformedRoom.id);
    
    return transformedRoom;
  } catch (error: any) {
    console.error('[createChatRoom] Fatal error creating chat room:', {
      error,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      params,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Pin or unpin a chat room
export const pinChatRoom = async (roomId: string, isPinned: boolean): Promise<void> => {
  try {
    const { error } = await supabase
      .from('chat_rooms')
      .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
      .eq('id', roomId);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error pinning chat room:", error);
    throw error;
  }
};

// Archive or unarchive a chat room
export const archiveChatRoom = async (roomId: string, isArchived: boolean): Promise<void> => {
  try {
    const { error } = await supabase
      .from('chat_rooms')
      .update({ is_archived: isArchived, updated_at: new Date().toISOString() })
      .eq('id', roomId);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error archiving chat room:", error);
    throw error;
  }
};

// Delete a chat room and its messages/participants
export const deleteChatRoom = async (roomId: string): Promise<void> => {
  try {
    // Delete participants first (foreign key constraint)
    const { error: participantsError } = await supabase
      .from('chat_participants')
      .delete()
      .eq('room_id', roomId);
    
    if (participantsError) throw participantsError;

    // Delete messages
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('room_id', roomId);
    
    if (messagesError) throw messagesError;

    // Delete the room
    const { error: roomError } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', roomId);
    
    if (roomError) throw roomError;
  } catch (error) {
    console.error("Error deleting chat room:", error);
    throw error;
  }
};
