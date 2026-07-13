
export interface EmailSequence {
  id: string;
  name: string;
  description?: string;
  steps: EmailSequenceStep[];
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  shop_id?: string;
  shopId?: string;
  created_by?: string;
  createdBy?: string;
  trigger_type?: 'manual' | 'event' | 'schedule';
  triggerType?: 'manual' | 'event' | 'schedule';
  trigger_event?: string;
  triggerEvent?: string;
  is_active?: boolean;
  isActive?: boolean;
  
  // Additional fields for system schedules
  last_run?: string | null;
  lastRun?: string | null;
  next_run?: string | null;
  nextRun?: string | null;
  run_frequency?: string | null;
  runFrequency?: string | null;
}

export interface EmailSequenceStep {
  id: string;
  sequence_id: string;
  sequenceId?: string;
  order?: number;
  position?: number;
  delay_hours?: number;
  delayHours?: number;
  delay_type?: string;
  delayType?: string;
  email_template_id?: string;
  emailTemplateId?: string;
  template_id?: string;
  templateId?: string;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  
  // UI component support
  name?: string;
  type?: 'delay' | 'email';
  isActive?: boolean;
  is_active?: boolean;
  condition?: {
    type: 'event' | 'property';
    value: any;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=';
  };
  
  // Additional fields for system schedules
  last_run?: string | null;
  lastRun?: string | null;
  next_run?: string | null;
  nextRun?: string | null;
  run_frequency?: string | null;
  runFrequency?: string | null;
}

export interface EmailSequenceEnrollment {
  id: string;
  sequence_id: string;
  sequenceId?: string;
  customer_id: string;
  customerId?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  current_step_id?: string;
  currentStepId?: string;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  completed_at?: string;
  completedAt?: string;
  
  // UI component support
  startedAt?: string;
  started_at?: string;
  nextSendTime?: string;
  next_send_time?: string;
  metadata?: Record<string, any>;
  
  // Additional properties from joins
  sequence?: EmailSequence;
  current_step?: EmailSequenceStep;
  currentStep?: EmailSequenceStep;
  customer?: any;
}

export interface EmailSequenceAnalytics {
  id: string;
  sequence_id: string;
  sequenceId?: string;
  total_enrollments: number;
  totalEnrollments?: number;
  active_enrollments: number;
  activeEnrollments?: number;
  completed_enrollments: number;
  completedEnrollments?: number;
  cancelled_enrollments?: number;
  cancelledEnrollments?: number;
  conversion_rate: number;
  conversionRate?: number;
  average_time_to_complete: number;
  averageTimeToComplete?: number;
  updated_at: string;
  updatedAt?: string;
  created_at?: string;
  createdAt?: string;
  
  // Additional analytics properties
  total_emails_sent?: number;
  totalEmailsSent?: number;
  emailsSent?: number; // Adding this for component compatibility
  open_rate?: number;
  openRate?: number;
  click_rate?: number;
  clickRate?: number;
  timeline?: Array<{date: string, enrollments: number, emailsSent: number}>;
}
