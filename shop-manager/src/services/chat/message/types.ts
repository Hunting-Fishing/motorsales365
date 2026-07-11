
import { getMessageType, transformDatabaseMessage, MessageSendParams, MessageEditParams, MessageFlagParams } from './messageTypes';
import { parseTaggedItems as parseTagsHelper } from './messageHelpers';

// Re-export functions
export {
  getMessageType,
  transformDatabaseMessage
};

// Re-export types with proper syntax
export type { MessageSendParams, MessageEditParams, MessageFlagParams };

// Export parseTaggedItems from messageHelpers (not duplicating)
export { parseTagsHelper as parseTaggedItems };
