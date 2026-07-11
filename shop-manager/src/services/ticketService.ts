import { supabase } from '@/integrations/supabase/client';
import type { RaffleTicket, CreateTicketData } from '@/types/raffle';

export class TicketService {
  // Get all tickets for a raffle
  static async getTicketsByRaffle(raffleId: string): Promise<RaffleTicket[]> {
    const { data, error } = await supabase
      .from('raffle_tickets')
      .select('*')
      .eq('raffle_id', raffleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }

    return data || [];
  }

  // Get a single ticket
  static async getTicket(id: string): Promise<RaffleTicket | null> {
    const { data, error } = await supabase
      .from('raffle_tickets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching ticket:', error);
      throw new Error(`Failed to fetch ticket: ${error.message}`);
    }

    return data;
  }

  // Create ticket(s) for a raffle
  static async createTickets(ticketData: CreateTicketData): Promise<RaffleTicket[]> {
    const { raffle_id, quantity = 1, ...purchaserInfo } = ticketData;

    // Generate ticket numbers for multiple tickets
    const tickets = [];
    for (let i = 0; i < quantity; i++) {
      // Generate ticket number using database function
      const { data: ticketNumber, error: numberError } = await supabase
        .rpc('generate_raffle_ticket_number', { p_raffle_id: raffle_id });

      if (numberError) {
        console.error('Error generating ticket number:', numberError);
        throw new Error(`Failed to generate ticket number: ${numberError.message}`);
      }

      tickets.push({
        raffle_id,
        ticket_number: ticketNumber,
        ...purchaserInfo
      });
    }

    const { data, error } = await supabase
      .from('raffle_tickets')
      .insert(tickets)
      .select();

    if (error) {
      console.error('Error creating tickets:', error);
      throw new Error(`Failed to create tickets: ${error.message}`);
    }

    // Update raffle tickets_sold count
    await this.updateRaffleTicketCount(raffle_id);

    return data || [];
  }

  // Update ticket amount paid
  static async updateTicketPayment(
    ticketId: string, 
    amountPaid: number
  ): Promise<RaffleTicket> {
    const { data, error } = await supabase
      .from('raffle_tickets')
      .update({ amount_paid: amountPaid })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket payment:', error);
      throw new Error(`Failed to update ticket payment: ${error.message}`);
    }

    return data;
  }

  // Delete a ticket
  static async deleteTicket(id: string): Promise<void> {
    // Get ticket to find raffle_id for count update
    const ticket = await this.getTicket(id);
    if (!ticket) throw new Error('Ticket not found');

    const { error } = await supabase
      .from('raffle_tickets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ticket:', error);
      throw new Error(`Failed to delete ticket: ${error.message}`);
    }

    // Update raffle tickets_sold count
    await this.updateRaffleTicketCount(ticket.raffle_id);
  }

  // Get tickets by purchaser email
  static async getTicketsByPurchaser(email: string): Promise<RaffleTicket[]> {
    const { data, error } = await supabase
      .from('raffle_tickets')
      .select(`
        *,
        raffles:raffle_id (
          title,
          draw_date,
          status
        )
      `)
      .eq('purchaser_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching purchaser tickets:', error);
      throw new Error(`Failed to fetch purchaser tickets: ${error.message}`);
    }

    return data || [];
  }

  // Get random ticket for draw
  static async getRandomTicket(raffleId: string): Promise<RaffleTicket | null> {
    const { data, error } = await supabase
      .from('raffle_tickets')
      .select('*')
      .eq('raffle_id', raffleId)
      .gt('amount_paid', 0);

    if (error) {
      console.error('Error fetching tickets for draw:', error);
      throw new Error(`Failed to fetch tickets for draw: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Select random ticket
    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex];
  }

  // Update raffle ticket count
  private static async updateRaffleTicketCount(raffleId: string): Promise<void> {
    // Count paid tickets
    const { count, error: countError } = await supabase
      .from('raffle_tickets')
      .select('id', { count: 'exact' })
      .eq('raffle_id', raffleId)
      .gt('amount_paid', 0);

    if (countError) {
      console.error('Error counting tickets:', countError);
      return;
    }

    // Update raffle tickets sold count
    const { error: updateError } = await supabase
      .from('raffles')
      .update({ tickets_sold: count || 0 })
      .eq('id', raffleId);

    if (updateError) {
      console.error('Error updating raffle count:', updateError);
    }
  }

  // Get ticket sales summary
  static async getTicketSalesSummary(raffleId: string) {
    const { data, error } = await supabase
      .from('raffle_tickets')
      .select('amount_paid')
      .eq('raffle_id', raffleId);

    if (error) {
      console.error('Error fetching ticket sales summary:', error);
      return {
        total: 0,
        pending: 0,
        completed: 0,
        totalRevenue: 0
      };
    }

    const summary = data.reduce((acc, ticket) => {
      acc.total++;
      if (ticket.amount_paid > 0) {
        acc.completed++;
        acc.totalRevenue += ticket.amount_paid;
      } else {
        acc.pending++;
      }
      return acc;
    }, {
      total: 0,
      pending: 0,
      completed: 0,
      totalRevenue: 0
    });

    return summary;
  }
}