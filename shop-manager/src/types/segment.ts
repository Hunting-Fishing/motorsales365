
export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentRule {
  id: string;
  segmentId: string;
  ruleType: string;
  ruleOperator: string;
  ruleValue: string;
}

export interface SegmentMember {
  id: string;
  segmentId: string;
  customerId: string;
  isAutomatic: boolean;
  addedAt: string;
}
