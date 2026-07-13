import { supabase } from '@/integrations/supabase/client';
import type { 
  Raffle, 
  RaffleStats, 
  CreateRaffleData, 
  UpdateRaffleData,
  DrawWinnerData 
} from '@/types/raffle';

export class RaffleService {
  // Get all raffles for a shop
  static async getRaffles(shopId?: string): Promise<Raffle[]> {
    let query = supabase
      .from('raffles')
      .select('*')
      .order('created_at', { ascending: false });

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching raffles:', error);
      throw new Error(`Failed to fetch raffles: ${error.message}`);
    }

    return data || [];
  }

  // Get a single raffle by ID
  static async getRaffle(id: string): Promise<Raffle | null> {
    const { data, error } = await supabase
      .from('raffles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching raffle:', error);
      throw new Error(`Failed to fetch raffle: ${error.message}`);
    }

    return data;
  }

  // Create a new raffle
  static async createRaffle(raffleData: CreateRaffleData): Promise<Raffle> {
    // Get current user's shop_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (!profile?.shop_id) throw new Error('User shop not found');

    const { data, error } = await supabase
      .from('raffles')
      .insert({
        ...raffleData,
        shop_id: profile.shop_id,
        created_by: user.id,
        status: 'draft',
        tickets_sold: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating raffle:', error);
      throw new Error(`Failed to create raffle: ${error.message}`);
    }

    return data;
  }

  // Update a raffle
  static async updateRaffle(id: string, updates: UpdateRaffleData): Promise<Raffle> {
    const { data, error } = await supabase
      .from('raffles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating raffle:', error);
      throw new Error(`Failed to update raffle: ${error.message}`);
    }

    return data;
  }

  // Delete a raffle
  static async deleteRaffle(id: string): Promise<void> {
    const { error } = await supabase
      .from('raffles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting raffle:', error);
      throw new Error(`Failed to delete raffle: ${error.message}`);
    }
  }

  // Calculate raffle revenue using database function
  static async calculateRevenue(raffleId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('calculate_raffle_revenue', { p_raffle_id: raffleId });

    if (error) {
      console.error('Error calculating revenue:', error);
      return 0;
    }

    return data || 0;
  }

  // Conduct raffle draw and select winner
  static async drawWinner(raffleId: string, winnerData: DrawWinnerData): Promise<Raffle> {
    const { data, error } = await supabase
      .from('raffles')
      .update({
        status: 'completed',
        winner_ticket_number: winnerData.winner_ticket_number,
        winner_contact_info: winnerData.winner_contact_info
      })
      .eq('id', raffleId)
      .select()
      .single();

    if (error) {
      console.error('Error conducting draw:', error);
      throw new Error(`Failed to conduct draw: ${error.message}`);
    }

    return data;
  }

  // Get raffle statistics
  static async getRaffleStats(shopId?: string): Promise<RaffleStats> {
    try {
      // Get active raffles count
      let activeQuery = supabase
        .from('raffles')
        .select('id', { count: 'exact' })
        .eq('status', 'active');

      if (shopId) {
        activeQuery = activeQuery.eq('shop_id', shopId);
      }

      // Get total tickets sold and revenue
      let statsQuery = supabase
        .from('raffles')
        .select('tickets_sold, ticket_price');

      if (shopId) {
        statsQuery = statsQuery.eq('shop_id', shopId);
      }

      // Get total winners
      let winnersQuery = supabase
        .from('raffles')
        .select('id', { count: 'exact' })
        .not('winner_ticket_number', 'is', null);

      if (shopId) {
        winnersQuery = winnersQuery.eq('shop_id', shopId);
      }

      // Get all tickets to calculate pending payments
      let allTicketsQuery = supabase
        .from('raffle_tickets')
        .select('amount_paid');

      if (shopId) {
        // Get raffle IDs for the shop first
        const { data: shopRaffles } = await supabase
          .from('raffles')
          .select('id')
          .eq('shop_id', shopId);
        
        const raffleIds = shopRaffles?.map(r => r.id) || [];
        if (raffleIds.length > 0) {
          allTicketsQuery = allTicketsQuery.in('raffle_id', raffleIds);
        }
      }

      const [
        { count: activeRaffles },
        { data: raffleData },
        { count: totalWinners },
        { data: ticketData }
      ] = await Promise.all([
        activeQuery,
        statsQuery,
        winnersQuery,
        allTicketsQuery
      ]);

      const totalTicketsSold = raffleData?.reduce((sum, raffle) => sum + raffle.tickets_sold, 0) || 0;
      const totalRevenue = ticketData?.reduce((sum, ticket) => sum + ticket.amount_paid, 0) || 0;
      const totalTicketPrices = raffleData?.reduce((sum, raffle) => sum + raffle.ticket_price, 0) || 0;
      const averageTicketPrice = raffleData?.length ? totalTicketPrices / raffleData.length : 0;

      return {
        activeRaffles: activeRaffles || 0,
        totalTicketsSold,
        totalRevenue,
        totalWinners: totalWinners || 0,
        pendingPayments: 0, // We'll calculate this differently if needed
        confirmedSales: totalTicketsSold,
        averageTicketPrice
      };
    } catch (error) {
      console.error('Error fetching raffle stats:', error);
      return {
        activeRaffles: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        totalWinners: 0,
        pendingPayments: 0,
        confirmedSales: 0,
        averageTicketPrice: 0
      };
    }
  }

  // Get upcoming draws
  static async getUpcomingDraws(shopId?: string): Promise<Raffle[]> {
    let query = supabase
      .from('raffles')
      .select('*')
      .eq('status', 'active')
      .gte('draw_date', new Date().toISOString())
      .order('draw_date', { ascending: true })
      .limit(5);

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching upcoming draws:', error);
      return [];
    }

    return data || [];
  }

  // Get recent winners
  static async getRecentWinners(shopId?: string): Promise<Raffle[]> {
    let query = supabase
      .from('raffles')
      .select('*')
      .eq('status', 'completed')
      .not('winner_ticket_number', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching recent winners:', error);
      return [];
    }

    return data || [];
  }
}