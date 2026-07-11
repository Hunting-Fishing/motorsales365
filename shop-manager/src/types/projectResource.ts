// Project Resource Assignment Types
import type { Json } from '@/integrations/supabase/types';

export type ResourceType = 'employee' | 'equipment' | 'vessel' | 'vehicle';
export type ResourceAssignmentStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  notes?: string | null;
  logged_by?: string;
  logged_at: string;
}

export interface ProjectResourceAssignment {
  id: string;
  project_id: string;
  phase_id: string | null;
  resource_type: ResourceType;
  resource_id: string;
  resource_name: string | null;
  role: string | null;
  
  // Planning
  planned_hours: number;
  planned_cost: number;
  hourly_rate: number | null;
  
  // Actual
  actual_hours: number;
  actual_cost: number;
  
  // Time Entries
  time_entries: Json | null;
  
  // Scheduling
  start_date: string | null;
  end_date: string | null;
  is_full_time: boolean;
  allocation_percent: number;
  
  // Status
  status: ResourceAssignmentStatus;
  notes: string | null;
  
  shop_id: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTimelineItem {
  id: string;
  type: 'project' | 'phase' | 'milestone';
  title: string;
  startDate: Date;
  endDate: Date;
  color: string;
  projectId?: string;
  phaseId?: string;
  progress?: number;
  status?: string;
  isMilestone?: boolean;
  dependsOn?: string;
  resources?: {
    id: string;
    name: string;
    type: ResourceType;
    hours: number;
  }[];
}

export interface ResourceUtilization {
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  assignments: {
    projectId: string;
    projectName: string;
    phaseId?: string;
    phaseName?: string;
    startDate: Date;
    endDate: Date;
    allocationPercent: number;
    plannedHours: number;
  }[];
  totalPlannedHours: number;
  totalAllocatedPercent: number;
}
