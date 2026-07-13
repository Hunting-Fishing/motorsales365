import React from 'react';
import { WorkOrderJobLine, JobLineStatus, jobLineStatusMap } from '@/types/jobLine';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  UserCheck, 
  Wrench, 
  Package, 
  Pause, 
  CheckCircle, 
  CheckCircle2, 
  AlertCircle, 
  Truck,
  Car,
  HelpCircle,
  Shield,
  ExternalLink,
  ShoppingCart,
  PackageCheck,
  RotateCcw
} from 'lucide-react';

interface JobLineStatusSelectorProps {
  jobLine: WorkOrderJobLine;
  onStatusChange: (jobLineId: string, newStatus: JobLineStatus, reason?: string) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'default';
  showQuickActions?: boolean;
}

const statusIcons = {
  'Clock': Clock,
  'UserCheck': UserCheck,
  'Wrench': Wrench,
  'Package': Package,
  'Pause': Pause,
  'CheckCircle': CheckCircle,
  'CheckCircle2': CheckCircle2,
  'AlertCircle': AlertCircle,
  'Truck': Truck,
  'Car': Car,
  'HelpCircle': HelpCircle,
  'Shield': Shield,
  'ExternalLink': ExternalLink,
  'ShoppingCart': ShoppingCart,
  'PackageCheck': PackageCheck,
  'RotateCcw': RotateCcw
};

export function JobLineStatusSelector({
  jobLine,
  onStatusChange,
  disabled = false,
  size = 'default',
  showQuickActions = false
}: JobLineStatusSelectorProps) {
  const currentStatus = jobLine.status || 'pending';
  const statusInfo = jobLineStatusMap[currentStatus];
  const IconComponent = statusInfo.icon ? statusIcons[statusInfo.icon as keyof typeof statusIcons] : Clock;

  const handleStatusChange = async (newStatus: JobLineStatus) => {
    if (newStatus === currentStatus) return;
    
    try {
      await onStatusChange(jobLine.id, newStatus);
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  // Get allowed transitions for current status
  const allowedTransitions = statusInfo.canTransitionTo || [];
  const hasTransitions = allowedTransitions.length > 0;

  // Quick action buttons for common transitions
  const getQuickActions = () => {
    const actions = [];
    
    if (currentStatus === 'pending') {
      actions.push({ status: 'signed-onto-task' as JobLineStatus, label: 'Sign On', variant: 'outline' as const });
    }
    
    if (currentStatus === 'signed-onto-task') {
      actions.push({ status: 'in-progress' as JobLineStatus, label: 'Start Work', variant: 'default' as const });
    }
    
    if (currentStatus === 'in-progress') {
      actions.push({ status: 'waiting-for-parts' as JobLineStatus, label: 'Wait for Parts', variant: 'outline' as const });
      actions.push({ status: 'completed' as JobLineStatus, label: 'Complete', variant: 'default' as const });
    }
    
    if (currentStatus === 'waiting-for-parts') {
      actions.push({ status: 'in-progress' as JobLineStatus, label: 'Resume', variant: 'default' as const });
    }
    
    if (currentStatus === 'parts-ordered') {
      actions.push({ status: 'parts-arrived' as JobLineStatus, label: 'Parts Arrived', variant: 'default' as const });
    }
    
    if (currentStatus === 'parts-arrived') {
      actions.push({ status: 'in-progress' as JobLineStatus, label: 'Start Work', variant: 'default' as const });
    }
    
    if (currentStatus === 'customer-auth-required') {
      actions.push({ status: 'in-progress' as JobLineStatus, label: 'Authorized', variant: 'default' as const });
    }
    
    if (currentStatus === 'rework-required') {
      actions.push({ status: 'in-progress' as JobLineStatus, label: 'Start Rework', variant: 'default' as const });
    }
    
    return actions;
  };

  const quickActions = showQuickActions ? getQuickActions() : [];

  return (
    <div className="flex items-center gap-2">
      {/* Current Status Badge */}
      <Badge className={`${statusInfo.classes} flex items-center gap-1 ${size === 'sm' ? 'text-xs px-2 py-1' : ''}`}>
        <IconComponent className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        {statusInfo.label}
      </Badge>

      {/* Status Selector */}
      {!disabled && hasTransitions && (
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className={`w-auto ${size === 'sm' ? 'h-7 text-xs' : 'h-8'}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={currentStatus} disabled>
              {statusInfo.label} (Current)
            </SelectItem>
            {allowedTransitions.map((status) => {
              const targetStatusInfo = jobLineStatusMap[status];
              const TargetIcon = targetStatusInfo.icon ? statusIcons[targetStatusInfo.icon as keyof typeof statusIcons] : Clock;
              
              return (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    <TargetIcon className="h-4 w-4" />
                    {targetStatusInfo.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {/* Quick Action Buttons */}
      {showQuickActions && quickActions.length > 0 && (
        <div className="flex gap-1">
          {quickActions.map((action) => (
            <Button
              key={action.status}
              variant={action.variant}
              size={size === 'sm' ? 'sm' : 'default'}
              onClick={() => handleStatusChange(action.status)}
              className={size === 'sm' ? 'text-xs px-2 py-1 h-6' : ''}
              disabled={disabled}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to check if a status transition is valid
export function isValidStatusTransition(from: JobLineStatus, to: JobLineStatus): boolean {
  if (from === to) return true;
  
  const fromInfo = jobLineStatusMap[from];
  return fromInfo.canTransitionTo?.includes(to) || false;
}

// Helper function to get next logical status
export function getNextLogicalStatus(currentStatus: JobLineStatus): JobLineStatus | null {
  const statusInfo = jobLineStatusMap[currentStatus];
  const transitions = statusInfo.canTransitionTo || [];
  
  // Return the most logical next status based on common workflow
  switch (currentStatus) {
    case 'pending':
      return 'signed-onto-task';
    case 'signed-onto-task':
      return 'in-progress';
    case 'in-progress':
      return 'completed';
    case 'quality-check':
      return 'completed';
    case 'completed':
      return 'ready-for-delivery';
    default:
      return transitions[0] || null;
  }
}