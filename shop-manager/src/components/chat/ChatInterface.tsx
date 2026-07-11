import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Phone, Video, MoreVertical, Paperclip, Smile } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  type: 'text' | 'file' | 'system';
  isMe: boolean;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'team' | 'customer' | 'direct';
  participants: number;
  lastMessage: string;
  lastActivity: string;
  unreadCount: number;
  isOnline: boolean;
}

const mockRooms: ChatRoom[] = [
  {
    id: '1',
    name: 'General Team',
    type: 'team',
    participants: 8,
    lastMessage: 'Meeting starts in 10 minutes',
    lastActivity: '2 min ago',
    unreadCount: 3,
    isOnline: true,
  },
  {
    id: '2',
    name: 'John Customer',
    type: 'customer',
    participants: 2,
    lastMessage: 'When will my car be ready?',
    lastActivity: '5 min ago',
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: '3',
    name: 'Technical Support',
    type: 'team',
    participants: 4,
    lastMessage: 'Diagnostic tool calibration complete',
    lastActivity: '1 hour ago',
    unreadCount: 0,
    isOnline: false,
  },
];

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    sender: 'Mike Johnson',
    content: 'Good morning team! Ready for today\'s service schedule?',
    timestamp: '09:00 AM',
    type: 'text',
    isMe: false,
  },
  {
    id: '2',
    sender: 'You',
    content: 'Yes, I\'ve reviewed all the work orders for today.',
    timestamp: '09:02 AM',
    type: 'text',
    isMe: true,
  },
  {
    id: '3',
    sender: 'Sarah Wilson',
    content: 'Bay 2 lift is having issues, might need to reschedule the 10 AM appointment',
    timestamp: '09:15 AM',
    type: 'text',
    isMe: false,
  },
  {
    id: '4',
    sender: 'System',
    content: 'New work order #WO-2024-1234 has been assigned to Bay 1',
    timestamp: '09:30 AM',
    type: 'system',
    isMe: false,
  },
];

export function ChatInterface() {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom>(mockRooms[0]);
  const [newMessage, setNewMessage] = useState('');
  const [messages] = useState<ChatMessage[]>(mockMessages);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // In a real app, this would send the message via WebSocket or API
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  const getRoomTypeColor = (type: string) => {
    switch (type) {
      case 'team': return 'bg-blue-100 text-blue-800';
      case 'customer': return 'bg-green-100 text-green-800';
      case 'direct': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Chat Rooms List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {mockRooms.map((room) => (
              <div
                key={room.id}
                className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedRoom.id === room.id ? 'bg-muted' : ''
                }`}
                onClick={() => setSelectedRoom(room)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {room.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {room.isOnline && (
                        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium truncate">{room.name}</h3>
                        <Badge className={`text-xs ${getRoomTypeColor(room.type)}`}>
                          {room.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{room.lastMessage}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{room.lastActivity}</p>
                    {room.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {room.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="lg:col-span-2 flex flex-col">
        {/* Chat Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {selectedRoom.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{selectedRoom.name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedRoom.participants} participants
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Chat Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  message.isMe
                    ? 'bg-primary text-primary-foreground'
                    : message.type === 'system'
                    ? 'bg-muted text-muted-foreground text-center'
                    : 'bg-muted'
                }`}
              >
                {!message.isMe && message.type !== 'system' && (
                  <p className="text-xs font-medium mb-1">{message.sender}</p>
                )}
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
              </div>
            </div>
          ))}
        </CardContent>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button variant="ghost" size="sm">
              <Smile className="h-4 w-4" />
            </Button>
            <Button onClick={handleSendMessage} size="sm">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}