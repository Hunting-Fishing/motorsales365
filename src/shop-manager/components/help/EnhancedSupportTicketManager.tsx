import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Plus, User, AlertCircle, Clock, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  user_id: string;
  created_at: string;
}

export const EnhancedSupportTicketManager: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const { toast } = useToast();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-tickets', statusFilter, priorityFilter],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tickets:', error);
        throw error;
      }

      return (data || []).map(ticket => ({
        id: ticket.id,
        ticket_number: `TKT-${ticket.id.slice(0, 8).toUpperCase()}`,
        subject: ticket.subject,
        description: ticket.description || '',
        status: ticket.status || 'open',
        priority: ticket.priority || 'medium',
        user_id: ticket.user_id,
        created_at: ticket.created_at,
      })) as SupportTicket[];
    },
    staleTime: 30 * 1000,
  });

  const filteredTickets = tickets;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive';
      case 'in_progress':
        return 'default';
      case 'resolved':
        return 'secondary';
      case 'closed':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Clock className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Support Tickets</h2>
            <p className="text-muted-foreground">Manage customer support requests</p>
          </div>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-16 bg-muted rounded"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-muted rounded w-20"></div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Support Tickets</h2>
          <p className="text-muted-foreground">Manage customer support requests</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    {getPriorityIcon(ticket.priority)}
                    <h3 className="font-semibold">{ticket.subject}</h3>
                    <span className="text-sm text-muted-foreground">#{ticket.ticket_number}</span>
                  </div>
                  <p className="text-muted-foreground">{ticket.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTimeAgo(ticket.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Badge variant={getStatusColor(ticket.status)}>
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant={getPriorityColor(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTickets.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-8">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Support Tickets Found</h3>
            <p className="text-muted-foreground">
              {statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filter criteria.'
                : 'Support tickets will appear here when created.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
