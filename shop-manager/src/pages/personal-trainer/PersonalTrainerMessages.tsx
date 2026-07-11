import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Users, Loader2 } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PersonalTrainerMessages() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['pt-clients-messages', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_clients').select('id, first_name, last_name').eq('shop_id', shopId).eq('membership_status', 'active').order('first_name');
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['pt-messages', shopId, selectedClientId],
    queryFn: async () => {
      if (!shopId || !selectedClientId) return [];
      const { data, error } = await (supabase as any).from('pt_messages')
        .select('*')
        .eq('shop_id', shopId)
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId && !!selectedClientId,
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!shopId || !selectedClientId || !currentUserId || !messageText.trim()) throw new Error('Missing data');
      const { error } = await (supabase as any).from('pt_messages').insert({
        shop_id: shopId,
        client_id: selectedClientId,
        sender_id: currentUserId,
        content: messageText.trim(),
        message_type: 'text',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['pt-messages'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const selectedClient = clients.find((c: any) => c.id === selectedClientId);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground text-sm">Chat with your clients</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Client list */}
        <Card className="md:col-span-1">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Clients</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-56px)]">
            <div className="p-2 space-y-1">
              {clients.map((client: any) => (
                <button
                  key={client.id}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-colors text-sm',
                    selectedClientId === client.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                  )}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  {client.first_name} {client.last_name}
                </button>
              ))}
              {clients.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">No active clients</p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Messages */}
        <Card className="md:col-span-2 flex flex-col">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : 'Select a client'}
            </CardTitle>
          </CardHeader>

          {!selectedClientId ? (
            <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a client to start messaging</p>
              </div>
            </CardContent>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</p>
                ) : (
                  messages.map((msg: any) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                      <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2',
                          isMe ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'
                        )}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={cn('text-[10px] mt-1', isMe ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t flex gap-2">
                <Input
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage.mutate()}
                />
                <Button
                  size="icon"
                  disabled={!messageText.trim() || sendMessage.isPending}
                  onClick={() => sendMessage.mutate()}
                  className="bg-gradient-to-r from-orange-500 to-red-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
