
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatCurrency as formatCurrencyUtil } from '@/utils/formatters';
import { WorkOrderJobLine } from '@/types/jobLine';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export formatCurrency for backward compatibility
export const formatCurrency = formatCurrencyUtil;

// Job line calculation utilities
export function calculateTotalJobLineAmount(jobLine: WorkOrderJobLine): number {
  if (!jobLine.estimated_hours || !jobLine.labor_rate) {
    return jobLine.total_amount || 0;
  }
  return jobLine.estimated_hours * jobLine.labor_rate;
}

export function calculateTotalEstimatedHours(jobLines: WorkOrderJobLine[]): number {
  return jobLines.reduce((total, jobLine) => total + (jobLine.estimated_hours || 0), 0);
}

export function calculateTotalPartsCost(jobLines: WorkOrderJobLine[]): number {
  return jobLines.reduce((total, jobLine) => {
    if (!jobLine.parts) return total;
    return total + jobLine.parts.reduce((partTotal, part) => 
      partTotal + (part.unit_price * part.quantity), 0
    );
  }, 0);
}
