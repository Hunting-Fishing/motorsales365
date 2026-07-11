
export interface WorkOrderJobLine {
  id: string;
  work_order_id: string;
  name: string;
  category?: string;
  subcategory?: string;
  description?: string;
  estimated_hours?: number;
  labor_rate?: number;
  labor_rate_type?: 'standard' | 'diagnostic' | 'emergency' | 'warranty' | 'internal' | 'overtime' | 'premium' | 'flat_rate';
  total_amount?: number;
  status?: JobLineStatus;
  display_order?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  parts?: any[]; // For associated parts
  is_from_service_selection?: boolean; // Indicates if this job line was created from service selection
  is_work_completed?: boolean; // Completion status independent of workflow status
  completion_date?: string;
  completed_by?: string;
}

export interface JobLineFormValues {
  name: string;
  category?: string;
  subcategory?: string;
  description?: string;
  estimated_hours?: number;
  labor_rate?: number;
  labor_rate_type?: 'standard' | 'diagnostic' | 'emergency' | 'warranty' | 'internal' | 'overtime' | 'premium' | 'flat_rate';
  total_amount?: number;
  status?: JobLineStatus;
  display_order?: number;
  notes?: string;
}

// Type aliases for better type safety
export type JobLineStatus = 'pending' | 'signed-onto-task' | 'in-progress' | 'waiting-for-parts' | 'paused' | 'awaiting-approval' | 'quality-check' | 'completed' | 'on-hold' | 'ready-for-delivery' | 'needs-road-test' | 'tech-support' | 'warranty' | 'sublet' | 'customer-auth-required' | 'parts-ordered' | 'parts-arrived' | 'rework-required';
export type LaborRateType = 'standard' | 'diagnostic' | 'emergency' | 'warranty' | 'internal' | 'overtime' | 'premium' | 'flat_rate';
export type PartStatus = 'pending' | 'ordered' | 'received' | 'installed' | 'returned';

// Job Line Status constants - Enhanced with more workflow states
export const JOB_LINE_STATUSES = [
  'pending', 
  'signed-onto-task', 
  'in-progress', 
  'waiting-for-parts', 
  'paused', 
  'awaiting-approval', 
  'quality-check', 
  'completed', 
  'on-hold',
  'ready-for-delivery',
  'needs-road-test',
  'tech-support',
  'warranty',
  'sublet',
  'customer-auth-required',
  'parts-ordered',
  'parts-arrived',
  'rework-required'
] as const;

// Work Order Part Status constants
export const WORK_ORDER_PART_STATUSES = ['pending', 'ordered', 'received', 'installed', 'returned'] as const;

// Labor Rate Type constants
export const LABOR_RATE_TYPES = ['standard', 'diagnostic', 'emergency', 'warranty', 'internal', 'overtime', 'premium', 'flat_rate'] as const;

// Job Line Status mapping for UI display
export const jobLineStatusMap: Record<JobLineStatus, { label: string; classes: string; icon?: string; canTransitionTo?: JobLineStatus[] }> = {
  'pending': { 
    label: 'Pending', 
    classes: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    icon: 'Clock',
    canTransitionTo: ['signed-onto-task', 'on-hold']
  },
  'signed-onto-task': { 
    label: 'Signed Onto Task', 
    classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: 'UserCheck',
    canTransitionTo: ['in-progress', 'waiting-for-parts', 'paused', 'on-hold']
  },
  'in-progress': { 
    label: 'In Progress', 
    classes: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    icon: 'Wrench',
    canTransitionTo: ['waiting-for-parts', 'paused', 'awaiting-approval', 'quality-check', 'completed', 'on-hold']
  },
  'waiting-for-parts': { 
    label: 'Waiting for Parts', 
    classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    icon: 'Package',
    canTransitionTo: ['in-progress', 'paused', 'on-hold']
  },
  'paused': { 
    label: 'Paused', 
    classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: 'Pause',
    canTransitionTo: ['in-progress', 'signed-onto-task', 'on-hold', 'pending']
  },
  'awaiting-approval': { 
    label: 'Awaiting Approval', 
    classes: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    icon: 'Clock',
    canTransitionTo: ['in-progress', 'quality-check', 'completed', 'on-hold']
  },
  'quality-check': { 
    label: 'Quality Check', 
    classes: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    icon: 'CheckCircle',
    canTransitionTo: ['in-progress', 'completed', 'awaiting-approval']
  },
  'completed': { 
    label: 'Completed', 
    classes: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: 'CheckCircle2',
    canTransitionTo: ['ready-for-delivery']
  },
  'on-hold': { 
    label: 'On Hold', 
    classes: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: 'AlertCircle',
    canTransitionTo: ['pending', 'signed-onto-task', 'in-progress', 'paused']
  },
  'ready-for-delivery': { 
    label: 'Ready for Delivery', 
    classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    icon: 'Truck',
    canTransitionTo: []
  },
  'needs-road-test': { 
    label: 'Needs Road Test', 
    classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    icon: 'Car',
    canTransitionTo: ['in-progress', 'completed', 'rework-required']
  },
  'tech-support': { 
    label: 'Tech Support', 
    classes: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
    icon: 'HelpCircle',
    canTransitionTo: ['in-progress', 'paused', 'on-hold']
  },
  'warranty': { 
    label: 'Warranty', 
    classes: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    icon: 'Shield',
    canTransitionTo: ['in-progress', 'completed', 'awaiting-approval']
  },
  'sublet': { 
    label: 'Sublet', 
    classes: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
    icon: 'ExternalLink',
    canTransitionTo: ['in-progress', 'completed', 'on-hold']
  },
  'customer-auth-required': { 
    label: 'Customer Authorization Required', 
    classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    icon: 'UserCheck',
    canTransitionTo: ['in-progress', 'on-hold', 'paused']
  },
  'parts-ordered': { 
    label: 'Parts Ordered', 
    classes: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
    icon: 'ShoppingCart',
    canTransitionTo: ['parts-arrived', 'waiting-for-parts', 'on-hold']
  },
  'parts-arrived': { 
    label: 'Parts Arrived', 
    classes: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
    icon: 'PackageCheck',
    canTransitionTo: ['in-progress', 'signed-onto-task']
  },
  'rework-required': { 
    label: 'Rework Required', 
    classes: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: 'RotateCcw',
    canTransitionTo: ['in-progress', 'signed-onto-task', 'tech-support']
  }
};

// Part Status mapping for UI display
export const partStatusMap: Record<PartStatus, { label: string; classes: string }> = {
  'pending': { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800' },
  'ordered': { label: 'Ordered', classes: 'bg-blue-100 text-blue-800' },
  'received': { label: 'Received', classes: 'bg-purple-100 text-purple-800' },
  'installed': { label: 'Installed', classes: 'bg-green-100 text-green-800' },
  'returned': { label: 'Returned', classes: 'bg-red-100 text-red-800' }
};

// Type guard functions
export function isValidJobLineStatus(status: string): status is JobLineStatus {
  return JOB_LINE_STATUSES.includes(status as any);
}

export function isValidLaborRateType(type: string): type is LaborRateType {
  return LABOR_RATE_TYPES.includes(type as any);
}

export function isValidPartStatus(status: string): status is PartStatus {
  return WORK_ORDER_PART_STATUSES.includes(status as any);
}
