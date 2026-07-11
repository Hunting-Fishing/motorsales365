export interface AIAnalytics {
  id: string;
  type: 'demand_forecast' | 'behavior_analysis' | 'price_optimization' | 'maintenance_prediction';
  data: any;
  confidence: number;
  generated_at: string;
  valid_until: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface AIRecommendation {
  id: string;
  type: 'product' | 'service' | 'cross_sell' | 'upsell';
  target_id: string;
  recommended_items: any[];
  confidence: number;
  reason: string;
  created_at: string;
}

export interface SmartNotification {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'info' | 'warning' | 'error' | 'success';
  user_id: string;
  created_at: string;
  read: boolean;
  ai_generated: boolean;
  metadata?: any;
}

export interface AISearchResult {
  id: string;
  type: 'customer' | 'product' | 'order' | 'service' | 'document';
  title: string;
  description: string;
  relevance_score: number;
  metadata: any;
}

export interface WorkflowAutomation {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  conditions: any[];
  actions: any[];
  is_active: boolean;
  created_at: string;
  last_run: string | null;
  run_count: number;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  confidence: number;
  impact_level: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendations: string[];
  created_at: string;
}

// Advanced Analytics, Payroll & Compliance Types

export interface LaborCostAnalytics {
  id: string;
  shop_id: string;
  period_start: string;
  period_end: string;
  total_labor_hours: number;
  total_labor_cost: number;
  regular_hours: number;
  overtime_hours: number;
  total_shifts: number;
  average_hourly_rate: number | null;
  labor_cost_percentage: number | null;
  revenue: number | null;
  created_at: string;
  updated_at: string;
}

export interface TimeCardEntry {
  id: string;
  shop_id: string;
  employee_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  total_hours: number | null;
  regular_hours: number | null;
  overtime_hours: number | null;
  break_duration_minutes: number | null;
  hourly_rate: number | null;
  total_pay: number | null;
  status: 'active' | 'completed' | 'approved' | 'disputed';
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayPeriod {
  id: string;
  shop_id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'processing' | 'closed' | 'paid';
  total_hours: number | null;
  total_cost: number | null;
  employee_count: number | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceViolation {
  id: string;
  shop_id: string;
  employee_id: string | null;
  violation_type: string;
  violation_date: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  schedule_assignment_id: string | null;
  time_card_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleOptimizationMetrics {
  id: string;
  shop_id: string;
  metric_date: string;
  coverage_score: number | null;
  efficiency_score: number | null;
  cost_score: number | null;
  employee_satisfaction_score: number | null;
  understaffed_hours: number | null;
  overstaffed_hours: number | null;
  optimal_hours: number | null;
  total_gaps: number | null;
  total_overlaps: number | null;
  recommendations: any;
  created_at: string;
}

export interface ScheduleForecast {
  id: string;
  shop_id: string;
  forecast_date: string;
  forecast_type: 'demand' | 'labor_cost' | 'coverage';
  predicted_value: number;
  confidence_level: number | null;
  actual_value: number | null;
  variance: number | null;
  factors: any;
  created_at: string;
  updated_at: string;
}

export interface OvertimeTracking {
  id: string;
  shop_id: string;
  employee_id: string;
  week_start_date: string;
  week_end_date: string;
  regular_hours: number;
  overtime_hours: number;
  weekly_limit: number;
  status: 'normal' | 'approaching_limit' | 'over_limit';
  alert_sent: boolean;
  created_at: string;
  updated_at: string;
}