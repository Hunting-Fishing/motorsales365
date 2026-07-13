import React, { useEffect, useState } from 'react';
import { MessageCircle, Plus, Send, Paperclip, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supportService, SupportTicket, SupportTicketMessage, CreateTicketRequest } from '@/services/customer/supportService';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SupportTicketSystemProps {
  userId: string;
  className?: string;
}

const statusIcons = {
  open: AlertCircle,
  pending: Clock,
  resolved: CheckCircle,
  closed: CheckCircle,
};

const statusColors = {
  open: 'destructive',
  pending: 'secondary',
  resolved: 'default',
  closed: 'outline',
};

const priorityColors = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
};

export function SupportTicketSystem({ userId, className }: SupportTicketSystemProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTickets();
  }, [userId]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
      
      // Subscribe to new messages
      const messagesChannel = supportService.subscribeToTicketMessages(selectedTicket.id, (message) => {
        setMessages(prev => [...prev, message]);
      });

      // Subscribe to ticket updates
      const ticketChannel = supportService.subscribeToTicketUpdates(selectedTicket.id, (payload) => {
        if (payload.new) {
          setSelectedTicket(payload.new as SupportTicket);
          setTickets(prev => prev.map(t => 
            t.id === payload.new.id ? payload.new as SupportTicket : t
          ));
        }
      });

      return () => {
        messagesChannel.unsubscribe();
        ticketChannel.unsubscribe();
      };
    }
  }, [selectedTicket]);

  const loadTickets = async () => {
    try {
      const ticketsData = await supportService.getUserTickets(userId);
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const messagesData = await supportService.getTicketMessages(ticketId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createTicket = async (ticketData: CreateTicketRequest) => {
    try {
      const newTicket = await supportService.createTicket(userId, ticketData);
      setTickets(prev => [newTicket, ...prev]);
      setCreateTicketOpen(false);
      setSelectedTicket(newTicket);
      
      toast({
        title: "Ticket Created",
        description: `Your support ticket ${newTicket.ticket_number} has been created.`,
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create support ticket",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const message = await supportService.sendMessage(userId, {
        ticket_id: selectedTicket.id,
        message: newMessage.trim()
      });
      
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("flex gap-6", className)}>
      {/* Tickets List */}
      <Card className="w-1/3">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Support Tickets
            </CardTitle>
            
            <CreateTicketDialog onCreateTicket={createTicket}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Ticket
              </Button>
            </CreateTicketDialog>
          </div>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-[500px]">
            {tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <TicketListItem
                    key={ticket.id}
                    ticket={ticket}
                    isSelected={selectedTicket?.id === ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No support tickets yet</p>
                <p className="text-sm mt-1">Create your first ticket to get help</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Ticket Details */}
      <Card className="flex-1">
        {selectedTicket ? (
          <>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    #{selectedTicket.ticket_number}
                    <Badge variant={statusColors[selectedTicket.status] as any}>
                      {selectedTicket.status}
                    </Badge>
                    <Badge variant={priorityColors[selectedTicket.priority] as any}>
                      {selectedTicket.priority} priority
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTicket.subject}
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Original Description */}
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Original Request</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedTicket.description}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Created {formatDistanceToNow(new Date(selectedTicket.created_at), { addSuffix: true })}
                </p>
              </div>

              <Separator />

              {/* Messages */}
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-3 rounded-lg max-w-[80%]",
                        message.user_id === userId
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        message.user_id === userId
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        {message.user_id !== userId && " • Support"}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              {selectedTicket.status !== 'closed' && (
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="min-h-[60px]"
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-[600px]">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a ticket to view details</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

interface TicketListItemProps {
  ticket: SupportTicket;
  isSelected: boolean;
  onClick: () => void;
}

function TicketListItem({ ticket, isSelected, onClick }: TicketListItemProps) {
  const StatusIcon = statusIcons[ticket.status];

  return (
    <div
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-colors",
        isSelected 
          ? "bg-accent border-accent-foreground/20" 
          : "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            #{ticket.ticket_number}
          </span>
        </div>
        <Badge variant={priorityColors[ticket.priority] as any} className="text-xs">
          {ticket.priority}
        </Badge>
      </div>
      
      <h4 className="font-medium text-sm mb-1 line-clamp-2">
        {ticket.subject}
      </h4>
      
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
        {ticket.description}
      </p>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Badge variant={statusColors[ticket.status] as any} className="text-xs">
          {ticket.status}
        </Badge>
        <span>
          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

interface CreateTicketDialogProps {
  children: React.ReactNode;
  onCreateTicket: (ticket: CreateTicketRequest) => void;
}

function CreateTicketDialog({ children, onCreateTicket }: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateTicketRequest>({
    subject: '',
    description: '',
    category: 'other',
    priority: 'medium'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.subject && formData.description) {
      onCreateTicket(formData);
      setFormData({
        subject: '',
        description: '',
        category: 'other',
        priority: 'medium'
      });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Brief description of your issue"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">Order Issue</SelectItem>
                <SelectItem value="product">Product Question</SelectItem>
                <SelectItem value="payment">Payment Issue</SelectItem>
                <SelectItem value="shipping">Shipping & Delivery</SelectItem>
                <SelectItem value="returns">Returns & Refunds</SelectItem>
                <SelectItem value="technical">Technical Support</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Please provide detailed information about your issue..."
              required
              className="min-h-[120px]"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}