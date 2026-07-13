
// Re-export all chat service functions with explicit exports to avoid ambiguity
export * from './message';
export * from './participantService';
export * from './supabaseClient';

// Export room functions but rename DatabaseChatRoom to avoid conflicts
export { 
  getChatRoom,
  getWorkOrderChatRoom, 
  getShiftChatRoom,
  getDirectMessageRoom,
  searchChatRooms
} from './room/queries';

export {
  getUserChatRooms,
  getArchivedChatRooms
} from './room/userRooms';

export {
  createChatRoom,
  pinChatRoom,
  archiveChatRoom,
  deleteChatRoom
} from './room/mutations';

export {
  transformDatabaseRoom,
  type CreateRoomParams
} from './room/types';
