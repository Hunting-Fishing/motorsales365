
export type QuestionType = 'rating' | 'text' | 'multiple_choice' | 'yes_no' | 'nps';

export interface FeedbackQuestion {
  id: string;
  form_id: string;
  question: string;
  question_type: QuestionType;
  options?: string[] | null;
  is_required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface FeedbackForm {
  id: string;
  shop_id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  questions?: FeedbackQuestion[];
}

export interface FeedbackResponse {
  id: string;
  form_id: string;
  customer_id: string;
  work_order_id?: string;
  overall_rating?: number;
  nps_score?: number;
  response_data: Record<string, any>;
  submitted_at: string;
  created_at: string;
}

export interface FeedbackAnalytics {
  average_rating: number;
  total_responses: number;
  nps_score: number;
  promoters: number; // NPS scores 9-10
  passives: number;  // NPS scores 7-8
  detractors: number; // NPS scores 0-6
  response_rate: number;
  feedback_by_category: Record<string, number>;
}
