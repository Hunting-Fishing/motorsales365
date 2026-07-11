// Phase 3 specific types that match the database schema

export interface SupportTicket {
  id: string;
  user_id: string;
  order_id?: string;
  subject: string;
  description: string;
  status: string; // Database returns string, we'll cast as needed
  priority: string; // Database returns string, we'll cast as needed
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CustomerAddress {
  id: string;
  user_id: string;
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default: boolean;
  address_type: string; // Database returns string, we'll cast as needed
  created_at: string;
  updated_at: string;
}

export type AddressType = 'shipping' | 'billing' | 'both';

export interface CustomerPaymentMethod {
  id: string;
  user_id: string;
  payment_type: string; // Database returns string, we'll cast as needed
  provider: string;
  last_four?: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
  stripe_payment_method_id?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentMethodType = 'card' | 'paypal' | 'bank';

export interface LoyaltyPoints {
  id: string;
  user_id: string;
  points_earned: number;
  points_spent: number;
  points_balance: number;
  tier: string; // Database returns string, we'll cast as needed
  created_at: string;
  updated_at: string;
}

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyPointTransaction {
  id: string;
  user_id: string;
  order_id?: string;
  transaction_type: string; // Database returns string, we'll cast as needed
  points: number;
  description?: string;
  created_at: string;
}

export type TransactionType = 'earned' | 'spent' | 'expired' | 'refunded';

export interface ProductRecommendation {
  id: string;
  user_id: string;
  product_id: string;
  recommendation_type: string; // Database returns string, we'll cast as needed
  score: number;
  created_at: string;
}

export type RecommendationType = 'viewed_together' | 'bought_together' | 'similar' | 'trending';

export interface CustomerProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  preferences?: any;
  marketing_consent: boolean;
  created_at: string;
  updated_at: string;
}

// Helper functions to cast database strings to proper types
export const castSupportTicketStatus = (status: string): SupportTicketStatus => {
  return status as SupportTicketStatus;
};

export const castSupportTicketPriority = (priority: string): SupportTicketPriority => {
  return priority as SupportTicketPriority;
};

export const castAddressType = (type: string): AddressType => {
  return type as AddressType;
};

export const castPaymentMethodType = (type: string): PaymentMethodType => {
  return type as PaymentMethodType;
};

export const castLoyaltyTier = (tier: string): LoyaltyTier => {
  return tier as LoyaltyTier;
};

export const castTransactionType = (type: string): TransactionType => {
  return type as TransactionType;
};

export const castRecommendationType = (type: string): RecommendationType => {
  return type as RecommendationType;
};