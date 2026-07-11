
export interface EmailABTest {
  enabled: boolean;
  variants: EmailABTestVariant[];
  winnerCriteria: 'open_rate' | 'click_rate';
  winner_criteria?: 'open_rate' | 'click_rate';
  winnerSelectionDate: string | null;
  winner_selection_date?: string | null;
  winnerId: string | null;
  winner_id?: string | null;
  confidenceLevel?: number;
  confidence_level?: number;
}

export interface EmailABTestVariant {
  id: string;
  name: string;
  subject: string;
  content: string;
  recipientPercentage: number;
  recipient_percentage?: number;
  recipients: number;
  opened: number;
  clicked: number;
  improvement?: number;
  metrics?: {
    openRate: number;
    clickRate: number;
    clickToOpenRate: number;
    conversionRate?: number;
  };
}

export interface EmailABTestResult {
  testId: string;
  test_id?: string;
  campaignId: string;
  campaign_id?: string;
  variants: EmailABTestVariant[];
  winner: EmailABTestVariant | null;
  winnerSelectedAt: string | null;
  winner_selected_at?: string | null;
  winnerCriteria: 'open_rate' | 'click_rate';
  winner_criteria?: 'open_rate' | 'click_rate';
  isComplete: boolean;
  is_complete?: boolean;
  winningVariantId?: string;
  winning_variant_id?: string;
  confidenceLevel?: number;
  confidence_level?: number;
}
