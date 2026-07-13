import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Clock, Send } from 'lucide-react';
import { ChatInterfaceConnected } from '@/components/chat/ChatInterfaceConnected';
import { useChatStats } from '@/hooks/useChatStats';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Skeleton } from '@/components/ui/skeleton';

export default function Chat() {
  const { userId } = useAuthUser();
  const { activeChats, onlineMembers, averageResponseTime, messagesToday, loading } = useChatStats(userId || undefined);

  return (
    <>
      <Helmet>
        <title>Team Chat | All Business 365</title>
      </Helmet>
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Chat</h1>
          <p className="text-muted-foreground">
            Communicate with your team and customers in real-time
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold">{activeChats}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Ongoing conversations
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold">{onlineMembers}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Team members online
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">
                  {averageResponseTime > 0 ? `${averageResponseTime}min` : 'N/A'}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Average response time
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold">{messagesToday}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Sent today
              </p>
            </CardContent>
          </Card>
        </div>

        <ChatInterfaceConnected />
      </div>
    </>
  );
}