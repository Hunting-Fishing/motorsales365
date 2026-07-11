
export interface Email {
  id: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  sent_at?: string;
  status: 'sent' | 'draft' | 'failed';
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export type EmailCategory = 'marketing' | 'transactional' | 'reminder' | 'welcome' | 'follow_up' | 'survey' | 'custom';

export interface EmailTemplateVariable {
  id: string;
  name: string;
  description?: string;
  default_value?: string;
  defaultValue?: string; // Support for UI components
}
