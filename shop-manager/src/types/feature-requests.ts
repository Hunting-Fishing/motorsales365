export interface FeatureRequest {
  id: string;
  request_number: number; // Auto-incrementing readable ID (FR-001, etc.)
  
  // Request details
  title: string;
  description: string;
  reason_for_change?: string; // Why the user wants the change
  
  // Categorization
  module: 'gunsmith' | 'power_washing' | 'pos' | 'payroll' | 'automotive' | 'marine' | 'fuel_delivery' | 'export_company' | 'personal_trainer' | 'welding' | 'game_development' | 'general';
  category: 'ui_ux' | 'functionality' | 'integration' | 'performance' | 'security' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted' | 'under_review' | 'approved' | 'in_development' | 'testing' | 'completed' | 'rejected' | 'on_hold';
  
  // Developer tracking
  progress_notes?: string; // Progress updates / reason for rejection
  developer_actions?: string; // Actions taken or planned
  
  // User information
  submitted_by?: string;
  submitter_email?: string;
  submitter_name?: string;
  
  // Voting system
  vote_count: number;
  upvotes: number;
  downvotes: number;
  
  // Development tracking
  complexity_estimate?: 'trivial' | 'minor' | 'major' | 'epic';
  estimated_hours?: number;
  assigned_developer?: string;
  target_version?: string;
  
  // Technical details
  technical_requirements?: string;
  implementation_notes?: string;
  acceptance_criteria?: string;
  
  // Integration with support system
  support_ticket_id?: string;
  
  // Metadata
  is_public: boolean;
  is_featured: boolean;
  tags: string[];
  attachments: any[];
  
  // Tracking
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  completed_at?: string;
  
  // Admin notes
  admin_notes?: string;
}

export interface FeatureRequestVote {
  id: string;
  feature_request_id: string;
  user_id?: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
}

export interface FeatureRequestComment {
  id: string;
  feature_request_id: string;
  user_id?: string;
  commenter_name?: string;
  commenter_email?: string;
  content: string;
  is_admin_comment: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureRequestStatusHistory {
  id: string;
  feature_request_id: string;
  old_status?: string;
  new_status: string;
  changed_by?: string;
  change_reason?: string;
  created_at: string;
}

export interface CreateFeatureRequestPayload {
  title: string;
  description: string;
  reason_for_change?: string;
  module: FeatureRequest['module'];
  category: FeatureRequest['category'];
  priority: FeatureRequest['priority'];
  submitter_name?: string;
  submitter_email?: string;
  technical_requirements?: string;
  implementation_notes?: string;
  acceptance_criteria?: string;
  tags?: string[];
}

export type ModuleType = FeatureRequest['module'];

export const MODULE_OPTIONS: { value: ModuleType; label: string }[] = [
  { value: 'gunsmith', label: 'Gunsmith' },
  { value: 'power_washing', label: 'Power Washing' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'marine', label: 'Marine' },
  { value: 'fuel_delivery', label: 'Fuel Delivery' },
  { value: 'export_company', label: 'Export Company' },
  { value: 'personal_trainer', label: 'Personal Trainer' },
  { value: 'pos', label: 'Point of Sale' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'welding', label: 'Welding' },
  { value: 'game_development', label: 'Game Development' },
  { value: 'general', label: 'General' },
];

export const STATUS_OPTIONS: { value: FeatureRequest['status']; label: string; color: string }[] = [
  { value: 'submitted', label: 'Submitted', color: 'bg-gray-500' },
  { value: 'under_review', label: 'Under Review', color: 'bg-blue-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'in_development', label: 'In Development', color: 'bg-purple-500' },
  { value: 'testing', label: 'Testing', color: 'bg-yellow-500' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-orange-500' },
];

export const PRIORITY_OPTIONS: { value: FeatureRequest['priority']; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-gray-500' },
  { value: 'medium', label: 'Medium', color: 'text-blue-500' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'critical', label: 'Critical', color: 'text-red-500' },
];

export const CATEGORY_OPTIONS: { value: FeatureRequest['category']; label: string }[] = [
  { value: 'ui_ux', label: 'UI/UX Improvement' },
  { value: 'functionality', label: 'New Functionality' },
  { value: 'integration', label: 'Integration' },
  { value: 'performance', label: 'Performance' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];
