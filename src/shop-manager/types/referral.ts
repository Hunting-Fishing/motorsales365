
export interface ReferralSource {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerReferral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_date: string;
  status: 'pending' | 'converted' | 'cancelled' | 'expired';
  converted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralTransaction {
  id: string;
  referral_id: string;
  referrer_id: string;
  referred_id: string;
  points_awarded: number;
  transaction_date: string;
  transaction_type: string;
  created_at: string;
}

export interface CustomerReferralView {
  id: string;
  referrer_id: string;
  referrer_first_name: string;
  referrer_last_name: string;
  referrer_email: string;
  referred_id: string;
  referred_first_name: string;
  referred_last_name: string;
  referred_email: string;
  referral_date: string;
  status: 'pending' | 'converted' | 'cancelled' | 'expired';
  converted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralFormData {
  referrer_id: string;
  referred_id: string;
  notes?: string;
}

export interface ReferralStatistics {
  totalReferrals: number;
  convertedReferrals: number;
  pendingReferrals: number;
  conversionRate: number;
  totalPointsAwarded: number;
}
