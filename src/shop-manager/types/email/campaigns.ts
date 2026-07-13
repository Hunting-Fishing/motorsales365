
import { EmailABTest } from './ab-testing';

export type EmailCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'completed' | 'cancelled';

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  content?: string;
  status: EmailCampaignStatus;
  scheduled_at?: string;
  scheduledAt?: string;
  sent_at?: string;
  sentAt?: string;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  
  // IDs
  template_id?: string;
  templateId?: string;
  segment_id?: string;
  segmentId?: string;
  recipient_ids: string[];
  recipientIds?: string[];
  segment_ids: string[];
  segmentIds?: string[];
  
  // Data
  personalizations: Record<string, any>;
  metadata: Record<string, any>;
  
  // A/B Testing
  ab_test?: EmailABTest | null;
  abTest?: EmailABTest | null;
  
  // Analytics data
  totalRecipients?: number;
  total_recipients?: number;
  opened?: number;
  clicked?: number;
  bounced?: number;
  complained?: number;
  unsubscribed?: number;
}

export interface EmailCampaignPreview {
  id: string;
  name: string;
  subject: string;
  status: EmailCampaignStatus;
  scheduled_at?: string;
  scheduledAt?: string;
  sent_at?: string;
  sentAt?: string;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  total_recipients: number;
  totalRecipients?: number;
  opened: number;
  clicked: number;
  has_ab_test: boolean;
}

export interface EmailCampaignTimelinePoint {
  date: string;
  opens: number;
  clicks: number;
  unsubscribes?: number;
  complaints?: number;
}

export interface EmailCampaignAnalytics {
  id: string;
  name: string;
  campaign_id: string;
  // Total numbers
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  // For UI compatibility
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_complained: number;
  total_unsubscribed: number;
  // Rates
  open_rate: number;
  click_rate: number;
  click_to_open_rate: number;
  bounced_rate: number;
  unsubscribe_rate: number;
  // Timeline data
  timeline: EmailCampaignTimelinePoint[];
  // Metadata
  created_at: string;
  updated_at: string;
}
