import { supabase } from "@/integrations/supabase/client";

export interface SupportTicket {
  id: string;
  user_id: string;
  order_id?: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'pending' | 'resolved' | 'closed';
  category: 'order' | 'product' | 'payment' | 'shipping' | 'returns' | 'technical' | 'other';
  assigned_to?: string;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal: boolean;
  attachments: any[];
  created_at: string;
}

export interface CreateTicketRequest {
  subject: string;
  description: string;
  category: SupportTicket['category'];
  priority?: SupportTicket['priority'];
  order_id?: string;
}

export interface CreateMessageRequest {
  ticket_id: string;
  message: string;
  attachments?: any[];
}

export const supportService = {
  // Get user tickets (placeholder - using notifications table)
  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('category', 'support')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data?.map(item => ({
      id: item.id,
      user_id: item.user_id,
      order_id: null,
      ticket_number: `T-${item.id.slice(-8)}`,
      subject: item.title,
      description: item.message,
      priority: 'medium' as const,
      status: 'open' as const,
      category: 'other' as const,
      assigned_to: undefined,
      resolution_notes: undefined,
      resolved_at: undefined,
      created_at: item.timestamp,
      updated_at: item.timestamp
    })) || [];
  },

  // Get single ticket (placeholder)
  async getTicket(ticketId: string): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error) throw error;
    return {
      id: data.id,
      user_id: data.user_id,
      order_id: null,
      ticket_number: `T-${data.id.slice(-8)}`,
      subject: data.title,
      description: data.message,
      priority: 'medium' as const,
      status: 'open' as const,
      category: 'other' as const,
      assigned_to: undefined,
      resolution_notes: undefined,
      resolved_at: undefined,
      created_at: data.timestamp,
      updated_at: data.timestamp
    };
  },

  // Create ticket (placeholder)
  async createTicket(userId: string, ticket: CreateTicketRequest): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: ticket.subject,
        message: ticket.description,
        category: 'support',
        type: 'ticket',
        priority: ticket.priority || 'medium'
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      user_id: data.user_id,
      order_id: ticket.order_id,
      ticket_number: `T-${data.id.slice(-8)}`,
      subject: data.title,
      description: data.message,
      priority: ticket.priority || 'medium',
      status: 'open' as const,
      category: ticket.category,
      assigned_to: undefined,
      resolution_notes: undefined,
      resolved_at: undefined,
      created_at: data.timestamp,
      updated_at: data.timestamp
    };
  },

  // Get ticket messages (placeholder)
  async getTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
    // For now, return empty array as placeholder
    return [];
  },

  // Send message (placeholder)
  async sendMessage(userId: string, message: CreateMessageRequest): Promise<SupportTicketMessage> {
    // Placeholder implementation
    return {
      id: crypto.randomUUID(),
      ticket_id: message.ticket_id,
      user_id: userId,
      message: message.message,
      is_internal: false,
      attachments: message.attachments || [],
      created_at: new Date().toISOString()
    };
  },

  // Update ticket status (placeholder)
  async updateTicketStatus(ticketId: string, status: SupportTicket['status']): Promise<SupportTicket> {
    const ticket = await this.getTicket(ticketId);
    return {
      ...ticket,
      status,
      resolved_at: status === 'resolved' || status === 'closed' ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString()
    };
  },

  // Subscribe to ticket updates (placeholder)
  subscribeToTicketUpdates(ticketId: string, callback: (data: any) => void) {
    return supabase
      .channel(`support_ticket_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `id=eq.${ticketId}`
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to ticket messages (placeholder)
  subscribeToTicketMessages(ticketId: string, callback: (message: SupportTicketMessage) => void) {
    return supabase
      .channel(`support_messages_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications', // Placeholder table
          filter: `title=eq.message_${ticketId}`
        },
        (payload) => {
          callback({
            id: payload.new.id,
            ticket_id: ticketId,
            user_id: payload.new.user_id,
            message: payload.new.message,
            is_internal: false,
            attachments: [],
            created_at: payload.new.timestamp
          });
        }
      )
      .subscribe();
  }
};