import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, CheckCircle, XCircle, Pause } from 'lucide-react';

interface EnhancedStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function EnhancedStatusBadge({ 
  status, 
  size = 'md', 
  showIcon = true 
}: EnhancedStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/[_\s]/g, '-');
    
    const configs = {
      'pending': {
        className: 'status-pending',
        icon: Clock,
        label: 'Pending'
      },
      'in-progress': {
        className: 'status-in-progress',
        icon: Play,
        label: 'In Progress'
      },
      'completed': {
        className: 'status-completed',
        icon: CheckCircle,
        label: 'Completed'
      },
      'cancelled': {
        className: 'status-cancelled',
        icon: XCircle,
        label: 'Cancelled'
      },
      'on-hold': {
        className: 'status-on-hold',
        icon: Pause,
        label: 'On Hold'
      }
    };

    return configs[normalizedStatus] || configs['pending'];
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge 
      className={`status-badge ${config.className} ${sizeClasses[size]} inline-flex items-center gap-2 font-medium tracking-wide`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} flex-shrink-0`} />}
      <span className="font-semibold">{config.label}</span>
    </Badge>
  );
}