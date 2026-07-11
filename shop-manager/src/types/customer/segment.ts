
// Segment-related type definitions
export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
  rule_count?: number;
  customer_count?: number;
}

export interface SegmentRule {
  id: string;
  segment_id: string;
  rule_type: string;
  rule_value: string;
  rule_operator: string;
  created_at: string;
  updated_at: string;
}
