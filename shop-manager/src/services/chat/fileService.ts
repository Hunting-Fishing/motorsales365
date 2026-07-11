
import { uploadChatFile } from './file/uploadService';
import { formatFileMessage, parseFileFromMessage } from './file';

// Re-export functions
export { 
  uploadChatFile, 
  formatFileMessage, 
  parseFileFromMessage 
};

// Re-export types using the correct syntax
export type { ChatFileInfo } from './file';
