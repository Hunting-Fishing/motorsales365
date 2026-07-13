
import React from 'react';
import { Badge } from '@sm/components/ui/badge';

interface WorkOrderStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; classes: string; icon?: string }> = {
  'draft': { label: 'Draft', classes: 'status-draft', icon: '📝' },
  'pending': { label: 'Pending', classes: 'status-pending', icon: '⏳' },
  'scheduled': { label: 'Scheduled', classes: 'status-scheduled', icon: '📅' },
  'in_progress': { label: 'In Progress', classes: 'status-in-progress', icon: '🔧' },
  'awaiting_parts': { label: 'Awaiting Parts', classes: 'status-awaiting-parts', icon: '📦' },
  'quality_check': { label: 'Quality Check', classes: 'status-quality-check', icon: '🔍' },
  'completed': { label: 'Completed', classes: 'status-completed', icon: '✅' },
  'cancelled': { label: 'Cancelled', classes: 'status-cancelled', icon: '❌' },
  'on_hold': { label: 'On Hold', classes: 'status-on-hold', icon: '⏸️' },
  'ready_for_pickup': { label: 'Ready for Pickup', classes: 'status-ready-pickup', icon: '🚗' },
  'picked_up': { label: 'Picked Up', classes: 'status-completed', icon: '✅' }
};

export function WorkOrderStatusBadge({ status }: WorkOrderStatusBadgeProps) {
  const config = statusConfig[status] || { 
    label: status, 
    classes: 'bg-muted/20 text-muted-foreground border-muted/30',
    icon: '📄'
  };
  
  return (
    <Badge className={`status-badge ${config.classes}`}>
      {config.icon && <span className="mr-1.5">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}
