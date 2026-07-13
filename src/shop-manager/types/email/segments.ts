
export interface EmailSegment {
  id: string;
  name: string;
  description?: string;
  criteria: EmailSegmentCriteria[];
  created_at: string;
  updated_at: string;
}

export interface EmailSegmentCriteria {
  id: string;
  segment_id: string;
  field: string;
  operator: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerValuePrediction {
  currentValue: number;
  predictedValue: number;
  growthRate: number;
  timeframe: number; // months
  recommendedServices: string[];
  nextContactTime: string;
}

export interface CustomerSegmentAnalytics {
  segmentId: string;
  segmentName: string;
  customerCount: number;
  averageValue: number;
  retentionRate: number;
  growthRate: number;
  serviceFrequency: number;
}

export interface RetentionAnalytics {
  overallRate: number;
  bySegment: Record<string, number>;
  byTimeframe: {
    month: string;
    rate: number;
  }[];
  riskFactors: {
    factor: string;
    impact: number;
  }[];
}
