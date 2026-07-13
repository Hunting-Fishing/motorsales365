export interface HybridActivity {
  id: string;
  activity_name: string;
  activity_type: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  for_profit_percentage: number;
  non_profit_percentage: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  revenue_for_profit: number;
  revenue_non_profit: number;
  expenses_for_profit?: number;
  expenses_non_profit?: number;
  participants_count?: number;
  beneficiaries_count?: number;
  volunteer_hours?: number;
  impact_metrics?: Record<string, any>;
  compliance_notes?: string;
  shop_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceRequirement {
  id: string;
  requirement_name: string;
  requirement_type: string;
  description?: string;
  applicable_to: 'for_profit' | 'non_profit' | 'both';
  completion_status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  due_date?: string;
  next_due_date?: string;
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  frequency?: string;
  documentation_required?: string[];
  cost_to_comply?: number;
  penalties_for_non_compliance?: string;
  responsible_person?: string;
  last_compliance_date?: string;
  auto_renew?: boolean;
  notes?: string;
  attachments?: Record<string, any>;
  shop_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHybridActivityData {
  activity_name: string;
  activity_type: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  for_profit_percentage: number;
  non_profit_percentage: number;
  status?: HybridActivity['status'];
  revenue_for_profit?: number;
  revenue_non_profit?: number;
  expenses_for_profit?: number;
  expenses_non_profit?: number;
  participants_count?: number;
  beneficiaries_count?: number;
  volunteer_hours?: number;
  impact_metrics?: Record<string, any>;
  compliance_notes?: string;
}

export interface CreateComplianceRequirementData {
  requirement_name: string;
  requirement_type: string;
  description?: string;
  applicable_to: ComplianceRequirement['applicable_to'];
  completion_status?: ComplianceRequirement['completion_status'];
  due_date?: string;
  priority_level: ComplianceRequirement['priority_level'];
  frequency?: string;
  documentation_required?: string[];
  cost_to_comply?: number;
  penalties_for_non_compliance?: string;
  responsible_person?: string;
  auto_renew?: boolean;
  notes?: string;
}

export interface HybridActivityAnalytics {
  totalActivities: number;
  activeActivities: number;
  totalForProfitRevenue: number;
  totalNonProfitRevenue: number;
  totalParticipants: number;
  totalBeneficiaries: number;
  totalVolunteerHours: number;
  complianceCompletionRate: number;
  averageActivityDuration: number;
  revenueAllocationAccuracy: number;
}