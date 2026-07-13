
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JOB_LINE_STATUSES, WORK_ORDER_PART_STATUSES } from '@/types/jobLine';
import { WORK_ORDER_STATUSES } from '@/data/workOrderConstants';

interface StatusSelectorProps {
  currentStatus: string;
  type: 'jobLine' | 'part' | 'workOrder';
  onStatusChange: (newStatus: string) => void;
  disabled?: boolean;
}

export function StatusSelector({ currentStatus, type, onStatusChange, disabled = false }: StatusSelectorProps) {
  let statuses: readonly string[] = [];
  
  if (type === 'jobLine') {
    statuses = JOB_LINE_STATUSES;
  } else if (type === 'part') {
    statuses = WORK_ORDER_PART_STATUSES;
  } else if (type === 'workOrder') {
    statuses = WORK_ORDER_STATUSES.map(status => status.value);
  }
  
  const formatStatusLabel = (status: string) => {
    if (type === 'workOrder') {
      const workOrderStatus = WORK_ORDER_STATUSES.find(s => s.value === status);
      return workOrderStatus ? workOrderStatus.label : status
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return status
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Filter out any empty, null, or invalid statuses
  const validStatuses = statuses.filter(status => 
    status && 
    typeof status === 'string' && 
    status.trim() !== '' &&
    status !== 'undefined' &&
    status !== 'null'
  );
  
  // Ensure currentStatus is valid, default to first valid status if not
  const safeCurrentStatus = (currentStatus && currentStatus.trim() !== '' && currentStatus !== 'undefined') 
    ? currentStatus 
    : validStatuses[0] || 'pending';
  
  // Only render if we have valid statuses
  if (validStatuses.length === 0) {
    console.warn(`No valid statuses found for type: ${type}`);
    return (
      <Select value="pending" onValueChange={onStatusChange} disabled={true}>
        <SelectTrigger className="w-40 bg-gray-100 border-slate-300 text-slate-500">
          <SelectValue placeholder="No statuses available" />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200 shadow-lg z-50">
          <SelectItem value="pending" className="hover:bg-slate-50 focus:bg-slate-100 text-slate-900">
            Pending
          </SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={safeCurrentStatus} onValueChange={onStatusChange} disabled={disabled}>
      <SelectTrigger className="w-40 bg-white border-slate-300 text-slate-900">
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent className="bg-white border-slate-200 shadow-lg z-50">
        {validStatuses.map((status) => (
          <SelectItem 
            key={status} 
            value={status} 
            className="hover:bg-slate-50 focus:bg-slate-100 text-slate-900"
          >
            {formatStatusLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
