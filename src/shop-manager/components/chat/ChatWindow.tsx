
import React, { useRef, useEffect, useState } from 'react';
import { ChatRoom, ChatMessage as ChatMessageType } from '@/types/chat';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Info, Users, MoreVertical, MessageSquare, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChatMessage } from './ChatMessage';
import { AudioRecorder } from './AudioRecorder';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatFileMessage, ChatFileInfo } from '@/services/chat/fileService';
import { FileUploadButton } from './file/FileUploadButton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChatThread } from './ChatThread';

interface ChatWindowProps {
  room: ChatRoom | null;
  messages: ChatMessageType[];
  userId: string;
  userName: string;
  messageText: string;
  setMessageText: (text: string) => void;
  onSendMessage: (threadParentId?: string) => void;
  onSendVoiceMessage?: (audioUrl: string, threadParentId?: string) => void;
  onSendFileMessage?: (fileMessage: string, threadParentId?: string) => void;
  onViewInfo?: () => void;
  onViewParticipants?: () => void;
  onFlagMessage?: (messageId: string, reason: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onPinRoom?: () => void;
  onArchiveRoom?: () => void;
  onDeleteRoom?: () => void;
  isTyping?: boolean;
  typingUsers?: {id: string, name: string}[];
  threadMessages?: {[key: string]: ChatMessageType[]};
  activeThreadId?: string | null;
  onOpenThread?: (messageId: string) => void;
  onCloseThread?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  room,
  messages,
  userId,
  userName,
  messageText,
  setMessageText,
  onSendMessage,
  onSendVoiceMessage,
  onSendFileMessage,
  onViewInfo,
  onViewParticipants,
  onFlagMessage,
  onEditMessage,
  onPinRoom,
  onArchiveRoom,
  onDeleteRoom,
  isTyping = false,
  typingUsers = [],
  threadMessages = {},
  activeThreadId = null,
  onOpenThread,
  onCloseThread
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleVoiceMessage = async (audioBlob: Blob) => {
    if (!room || !onSendFileMessage) return;
    
    try {
      setIsUploading(true);
      // Create a unique filename
      const filename = `voice-${Date.now()}.mp3`;
      
      // Create a File from the Blob
      const file = new File([audioBlob], filename, { type: 'audio/mp3' });
      
      // Create a temporary URL for the file
      const audioUrl = URL.createObjectURL(file);
      
      // Get estimated file size in bytes
      const fileSize = file.size;
      
      // Format audio message
      const fileMessage = formatFileMessage({
        url: audioUrl,
        type: 'audio',
        name: filename,
        size: fileSize,
        contentType: 'audio/mp3'
      });
      
      // Send the voice message
      if (onSendFileMessage) {
        onSendFileMessage(fileMessage, activeThreadId || undefined);
      }
    } catch (error) {
      console.error("Error with voice message:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUploaded = (fileUrl: string, fileType: string, caption?: string) => {
    if (onSendFileMessage) {
      onSendFileMessage(fileUrl + (caption ? `|${caption}` : ''), activeThreadId || undefined);
    }
  };
  
  const getParentMessage = () => {
    if (!activeThreadId) return null;
    return messages.find(msg => msg.id === activeThreadId) || null;
  };

  if (!room) {
    return (
      <Card className="h-full flex flex-col items-center justify-center">
        <CardContent className="text-center p-6">
          <div className="bg-slate-100 rounded-full p-6 inline-block mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
          <p className="text-slate-500 text-sm max-w-md">
            Choose an existing conversation from the sidebar or start a new one to begin messaging.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSendReply = async (content: string, threadId: string) => {
    setMessageText(content);
    await onSendMessage(threadId);
    setMessageText('');
    return Promise.resolve();
  };
  
  const handleThreadEditMessage = async (messageId: string, content: string) => {
    if (onEditMessage) {
      await onEditMessage(messageId, content);
    }
    return Promise.resolve();
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
        <div className="flex items-center">
          <CardTitle className="text-lg">
            {room.name}
          </CardTitle>
          {room.type === 'work_order' && (
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              Work Order
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {room.type === 'work_order' && onViewInfo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onViewInfo}>
                    <Info className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View work order details</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onViewParticipants && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onViewParticipants}>
                    <Users className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View participants</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onPinRoom && (
                <DropdownMenuItem onClick={onPinRoom}>
                  {room.is_pinned ? 'Unpin Conversation' : 'Pin Conversation'}
                </DropdownMenuItem>
              )}
              {onArchiveRoom && (
                <DropdownMenuItem onClick={onArchiveRoom}>
                  {room.is_archived ? 'Unarchive' : 'Archive'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => {/* Add mute functionality */}}>
                Mute Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {/* Add search functionality */}}>
                Search in Conversation
              </DropdownMenuItem>
              {onDeleteRoom && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Conversation
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{room?.name}"? This will permanently delete all messages and cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={onDeleteRoom}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow p-0 overflow-hidden grid grid-cols-1 md:grid-cols-3 relative">
        <div className={`md:col-span-${activeThreadId ? '2' : '3'} overflow-y-auto p-4 h-full`}>
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-500">
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map(message => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isCurrentUser={message.sender_id === userId}
                  onFlagMessage={onFlagMessage}
                  onReply={onOpenThread}
                  onEdit={onEditMessage}
                  userId={userId}
                />
              ))}
              {isTyping && typingUsers.length > 0 && (
                <div className="flex ml-2 mb-4">
                  <div className="bg-slate-200 text-slate-900 px-4 py-2 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-xs mr-2">
                        {typingUsers.length === 1 
                          ? `${typingUsers[0].name} is typing...` 
                          : `${typingUsers.length} people are typing...`}
                      </span>
                      <div className="flex gap-1 items-center">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.3s]"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.5s]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {activeThreadId && onCloseThread && (
          <div className="md:col-span-1 border-l h-full">
            <ChatThread
              threadId={activeThreadId}
              messages={threadMessages[activeThreadId] || []}
              onClose={onCloseThread}
              onSendReply={handleSendReply}
              userId={userId}
              parentMessage={getParentMessage() || undefined}
              onEditMessage={handleThreadEditMessage}
            />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2 pb-3 px-4 border-t">
        <div className="flex w-full items-center space-x-2">
          <FileUploadButton
            roomId={room.id}
            onFileUploaded={handleFileUploaded}
            isDisabled={isUploading}
          />
          
          <Input
            placeholder="Type your message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-grow"
            disabled={isUploading}
          />
          
          <AudioRecorder 
            onAudioRecorded={handleVoiceMessage}
            isDisabled={isUploading} 
          />
          
          <Button 
            onClick={() => onSendMessage(activeThreadId || undefined)} 
            disabled={!messageText.trim() || isUploading}
            className="px-3"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
