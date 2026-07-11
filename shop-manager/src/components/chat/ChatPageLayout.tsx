
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatSidebar } from './ChatSidebar';
import { ChatWindow } from './ChatWindow';
import { ChatRoom, ChatMessage } from '@/types/chat';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatPageLayoutProps {
  chatRooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  messages: ChatMessage[];
  userId: string;
  userName: string;
  newMessageText: string;
  setNewMessageText: (text: string) => void;
  onSelectRoom: (room: ChatRoom | null) => void;
  onSendMessage: (threadParentId?: string) => void;
  onSendVoiceMessage?: (audioUrl: string, threadParentId?: string) => void;
  onSendFileMessage?: (fileUrl: string, threadParentId?: string) => void;
  onPinRoom?: () => void;
  onArchiveRoom?: () => void;
  onDeleteRoom?: (roomId: string) => void;
  onFlagMessage?: (messageId: string, reason: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  isTyping?: boolean;
  typingUsers?: {id: string, name: string}[];
  threadMessages?: {[key: string]: ChatMessage[]};
  activeThreadId?: string | null;
  onOpenThread?: (messageId: string) => void;
  onCloseThread?: () => void;
  onViewWorkOrderDetails?: () => void;
  navigateToRoom: (roomId: string) => void;
  onNewChat: () => void;
  newChatDialog?: React.ReactNode;
}

export const ChatPageLayout: React.FC<ChatPageLayoutProps> = ({
  chatRooms,
  currentRoom,
  messages,
  userId,
  userName,
  newMessageText,
  setNewMessageText,
  onSelectRoom,
  onSendMessage,
  onSendVoiceMessage,
  onSendFileMessage,
  onPinRoom,
  onArchiveRoom,
  onDeleteRoom,
  onFlagMessage,
  onEditMessage,
  isTyping,
  typingUsers,
  threadMessages,
  activeThreadId,
  onOpenThread,
  onCloseThread,
  onViewWorkOrderDetails,
  navigateToRoom,
  onNewChat,
  newChatDialog
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Chat</h1>
      </div>
      
      <div className="h-[calc(100vh-200px)]">
        {/* Mobile: Show sidebar OR chat window (drill-down pattern) */}
        {isMobile ? (
          !currentRoom ? (
            <ChatSidebar
              rooms={chatRooms}
              selectedRoom={currentRoom}
              onSelectRoom={(room) => {
                onSelectRoom(room);
                navigateToRoom(room.id);
              }}
              onNewChat={onNewChat}
              onDeleteRoom={onDeleteRoom}
              newChatDialog={newChatDialog}
            />
          ) : (
            <div className="h-full flex flex-col">
              <Button 
                variant="ghost" 
                onClick={() => onSelectRoom(null)} 
                className="mb-2 self-start"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Conversations
              </Button>
              <div className="flex-1 min-h-0">
                <ChatWindow
                  room={currentRoom}
                  messages={messages}
                  userId={userId}
                  userName={userName}
                  messageText={newMessageText}
                  setMessageText={setNewMessageText}
                  onSendMessage={onSendMessage}
                  onSendVoiceMessage={onSendVoiceMessage}
                  onSendFileMessage={onSendFileMessage}
                  onPinRoom={onPinRoom}
                  onArchiveRoom={onArchiveRoom}
                  onDeleteRoom={() => onDeleteRoom?.(currentRoom.id)}
                  onFlagMessage={onFlagMessage}
                  onEditMessage={onEditMessage}
                  isTyping={isTyping}
                  typingUsers={typingUsers}
                  threadMessages={threadMessages}
                  activeThreadId={activeThreadId}
                  onOpenThread={onOpenThread}
                  onCloseThread={onCloseThread}
                  onViewInfo={currentRoom?.work_order_id ? onViewWorkOrderDetails : undefined}
                />
              </div>
            </div>
          )
        ) : (
          /* Desktop: Show both side-by-side */
          <div className="grid grid-cols-3 gap-4 h-full">
            <div className="col-span-1">
              <ChatSidebar
                rooms={chatRooms}
                selectedRoom={currentRoom}
                onSelectRoom={(room) => {
                  onSelectRoom(room);
                  navigateToRoom(room.id);
                }}
                onNewChat={onNewChat}
                onDeleteRoom={onDeleteRoom}
                newChatDialog={newChatDialog}
              />
            </div>
            
            <div className="col-span-2">
              <ChatWindow
                room={currentRoom}
                messages={messages}
                userId={userId}
                userName={userName}
                messageText={newMessageText}
                setMessageText={setNewMessageText}
                onSendMessage={onSendMessage}
                onSendVoiceMessage={onSendVoiceMessage}
                onSendFileMessage={onSendFileMessage}
                onPinRoom={onPinRoom}
                onArchiveRoom={onArchiveRoom}
                onDeleteRoom={currentRoom ? () => onDeleteRoom?.(currentRoom.id) : undefined}
                onFlagMessage={onFlagMessage}
                onEditMessage={onEditMessage}
                isTyping={isTyping}
                typingUsers={typingUsers}
                threadMessages={threadMessages}
                activeThreadId={activeThreadId}
                onOpenThread={onOpenThread}
                onCloseThread={onCloseThread}
                onViewInfo={currentRoom?.work_order_id ? onViewWorkOrderDetails : undefined}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
