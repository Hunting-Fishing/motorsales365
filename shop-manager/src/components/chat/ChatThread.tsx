
import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { ChatMessage } from './ChatMessage';

interface ChatThreadProps {
  threadId: string;
  messages: ChatMessageType[];
  onClose: () => void;
  onSendReply: (content: string, threadParentId: string) => Promise<void>;
  userId: string;
  parentMessage?: ChatMessageType;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  threadId,
  messages = [],
  onClose,
  onSendReply,
  userId,
  parentMessage,
  onEditMessage
}) => {
  const [replyText, setReplyText] = useState('');
  
  const handleSendReply = async () => {
    if (replyText.trim()) {
      await onSendReply(replyText, threadId);
      setReplyText('');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };
  
  return (
    <div className="flex flex-col border rounded-lg bg-white h-full">
      <div className="p-2 border-b flex justify-between items-center bg-slate-50">
        <h3 className="font-medium text-sm">Thread Replies</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-2 border-b bg-slate-100">
        {parentMessage && (
          <ChatMessage 
            message={parentMessage}
            isCurrentUser={parentMessage.sender_id === userId}
            userId={userId}
          />
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            No replies yet. Be the first to reply!
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id}
                message={message}
                isCurrentUser={message.sender_id === userId}
                onEdit={onEditMessage}
                userId={userId}
              />
            ))}
          </div>
        )}
      </div>
      
      <div className="p-2 border-t">
        <div className="flex gap-2">
          <Input 
            placeholder="Type your reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1"
          />
          <Button 
            onClick={handleSendReply}
            disabled={!replyText.trim()}
          >
            Reply
          </Button>
        </div>
      </div>
    </div>
  );
}
