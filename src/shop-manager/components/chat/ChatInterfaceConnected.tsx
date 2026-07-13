import React, { useEffect, useCallback } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useChat } from '@/hooks/useChat';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { ChatPageLayout } from './ChatPageLayout';
import { ChatLoading } from './ChatLoading';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { NewChatDialogComplete } from './NewChatDialogComplete';
import { ChatRoom } from '@/types/chat';

export function ChatInterfaceConnected() {
  const { user, userId } = useAuthUser();
  const navigate = useNavigate();
  
  // Get user name from user metadata or email
  const userName = user?.user_metadata?.full_name || 
                   user?.user_metadata?.name || 
                   user?.email?.split('@')[0] || 
                   'User';

  const {
    chatRooms,
    currentRoom,
    messages,
    loading,
    error,
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
  } = useChat({ 
    userId: userId || '', 
    userName 
  });

  // Set up real-time notifications
  useChatNotifications({ userId: userId || '' });

  // Handle new chat creation - auto-select the new room
  const handleChatCreated = useCallback((room: ChatRoom) => {
    refreshRooms();
    selectRoom(room);
  }, [refreshRooms, selectRoom]);

  // Handle keyboard events for typing indicator
  useEffect(() => {
    if (newMessageText && currentRoom) {
      handleTyping();
    }
  }, [newMessageText, currentRoom?.id]);

  if (!user || !userId) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <CardContent className="text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Sign in to chat</h3>
          <p className="text-muted-foreground mb-4">
            You need to be logged in to access team chat
          </p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading && chatRooms.length === 0) {
    return <ChatLoading />;
  }

  if (error) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <CardContent className="text-center">
          <MessageSquare className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Error loading chat</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refreshRooms} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (chatRooms.length === 0) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <CardContent className="text-center">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
          <p className="text-muted-foreground mb-4">
            Start a new conversation to begin chatting with your team
          </p>
          <NewChatDialogComplete 
            currentUserId={userId} 
            onChatCreated={handleChatCreated}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <ChatPageLayout
      chatRooms={chatRooms}
      currentRoom={currentRoom}
      messages={messages}
      userId={userId}
      userName={userName}
      newMessageText={newMessageText}
      setNewMessageText={setNewMessageText}
      onSelectRoom={selectRoom}
      onSendMessage={handleSendMessage}
      onSendVoiceMessage={handleSendVoiceMessage}
      onSendFileMessage={handleSendFileMessage}
      onFlagMessage={flagMessage}
      onEditMessage={handleEditMessage}
      onPinRoom={handlePinRoom}
      onArchiveRoom={handleArchiveRoom}
      onDeleteRoom={handleDeleteRoom}
      isTyping={isTyping}
      typingUsers={typingUsers}
      threadMessages={threadMessages}
      activeThreadId={activeThreadId}
      onOpenThread={handleThreadOpen}
      onCloseThread={handleThreadClose}
      navigateToRoom={(roomId) => selectRoom(chatRooms.find(r => r.id === roomId)!)}
      onNewChat={refreshRooms}
      newChatDialog={
        <NewChatDialogComplete 
          currentUserId={userId} 
          onChatCreated={handleChatCreated}
          trigger={<Button variant="ghost" size="sm"><UserPlus className="h-5 w-5" /></Button>}
        />
      }
    />
  );
}
