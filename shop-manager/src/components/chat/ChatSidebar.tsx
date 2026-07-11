
import React from 'react';
import { ChatRoom } from '@/types/chat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MessageCircle, SearchIcon, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ChatSidebarProps {
  rooms: ChatRoom[];
  selectedRoom: ChatRoom | null;
  onSelectRoom: (room: ChatRoom) => void;
  onNewChat: () => void;
  onDeleteRoom?: (roomId: string) => void;
  newChatDialog?: React.ReactNode;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  rooms,
  selectedRoom,
  onSelectRoom,
  onNewChat,
  onDeleteRoom,
  newChatDialog
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Conversations</CardTitle>
          {newChatDialog || (
            <Button variant="ghost" size="sm" onClick={onNewChat}>
              <PlusCircle className="h-5 w-5" />
            </Button>
          )}
        </div>
        <div className="relative mt-2">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search conversations..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-auto">
        {filteredRooms.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            No conversations found
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredRooms.map(room => (
              <div
                key={room.id}
                className={`flex items-center px-4 py-3 transition-colors cursor-pointer hover:bg-slate-100 group ${
                  selectedRoom?.id === room.id ? 'bg-slate-100' : ''
                }`}
                onClick={() => onSelectRoom(room)}
              >
                <div className="flex-shrink-0 mr-3">
                  {room.type === 'work_order' ? (
                    <div className="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">WO</span>
                    </div>
                  ) : room.type === 'direct' ? (
                    <div className="bg-teal-100 text-teal-600 w-10 h-10 rounded-full flex items-center justify-center">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="bg-amber-100 text-amber-600 w-10 h-10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">G</span>
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between">
                    <h4 className="font-medium text-sm truncate">{room.name}</h4>
                    {room.last_message && (
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(room.updated_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <p className="text-sm text-slate-500 truncate">
                      {room.last_message?.content || 'No messages yet'}
                    </p>
                    {(room.unread_count ?? 0) > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {room.unread_count}
                      </span>
                    )}
                  </div>
                </div>
                {onDeleteRoom && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100 ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{room.name}"? This will permanently delete all messages and cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => onDeleteRoom(room.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
