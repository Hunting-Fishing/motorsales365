export interface Raffle {
  id: string;
  title: string;
  description?: string;
  vehicle_id?: string;
  ticket_price: number;
  max_tickets?: number;
  tickets_sold: number;
  start_date: string;
  end_date: string;
  draw_date?: string;
  status: string;
  winner_ticket_number?: string;
  winner_contact_info?: any;
  images: any;
  terms_conditions?: string;
  shop_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface RaffleTicket {
  id: string;
  raffle_id: string;
  ticket_number: string;
  purchaser_name: string;
  purchaser_email: string;
  purchaser_phone?: string;
  purchase_date: string;
  payment_method?: string;
  payment_reference?: string;
  amount_paid: number;
  is_winner?: boolean;
  created_at: string;
}

export interface RaffleStats {
  activeRaffles: number;
  totalTicketsSold: number;
  totalRevenue: number;
  totalWinners: number;
  pendingPayments: number;
  confirmedSales: number;
  averageTicketPrice: number;
}

export interface RaffleTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultSettings: Partial<Raffle>;
}

export interface CreateRaffleData {
  title: string;
  description?: string;
  vehicle_id?: string;
  ticket_price: number;
  max_tickets?: number;
  start_date: string;
  end_date: string;
  draw_date?: string;
  images?: any;
  terms_conditions?: string;
}

export interface UpdateRaffleData extends Partial<CreateRaffleData> {
  status?: string;
}

export interface CreateTicketData {
  raffle_id: string;
  purchaser_name: string;
  purchaser_email: string;
  purchaser_phone?: string;
  payment_method?: string;
  amount_paid: number;
  quantity?: number;
}

export interface DrawWinnerData {
  raffle_id: string;
  winner_ticket_number: string;
  winner_contact_info: {
    name: string;
    email: string;
    phone?: string;
  };
}