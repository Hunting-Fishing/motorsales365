import React from 'react';
import { cn } from '@/lib/utils';
import { Ship, Wrench, Truck, Clock, RefreshCw } from 'lucide-react';
import { StaffScheduleEvent, ASSET_TYPE_COLORS } from '@/types/staffScheduleCalendar';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StaffCalendarEventProps {
  event: StaffScheduleEvent;
  onClick: (event: StaffScheduleEvent) => void;
  compact?: boolean;
}

export function StaffCalendarEvent({ event, onClick, compact = false }: StaffCalendarEventProps) {
  const getAssetIcon = () => {
    if (!event.asset) return null;
    switch (event.asset.type) {
      case 'vessel':
        return <Ship className="h-3 w-3" />;
      case 'equipment':
        return <Wrench className="h-3 w-3" />;
      case 'vehicle':
        return <Truck className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (event.status) {
      case 'active':
        return 'border-l-4 border-l-green-500';
      case 'scheduled':
        return 'border-l-4 border-l-blue-500';
      case 'completed':
        return 'border-l-4 border-l-gray-400';
      case 'cancelled':
        return 'border-l-4 border-l-red-500 opacity-60';
      default:
        return 'border-l-4 border-l-gray-300';
    }
  };

  const backgroundColor = event.asset 
    ? ASSET_TYPE_COLORS[event.asset.type]
    : event.color;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={() => onClick(event)}
              className={cn(
                'px-1.5 py-0.5 text-xs rounded cursor-pointer truncate',
                'hover:opacity-80 transition-opacity',
                getStatusColor()
              )}
              style={{ 
                backgroundColor: `${backgroundColor}20`,
                color: backgroundColor,
              }}
            >
              <div className="flex items-center gap-1">
                {getAssetIcon()}
                <span className="truncate font-medium">{event.asset?.name || event.title}</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{event.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
              </p>
              <p className="text-xs">Employee: {event.employee.name}</p>
              {event.notes && <p className="text-xs">{event.notes}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      onClick={() => onClick(event)}
      className={cn(
        'px-2 py-1.5 rounded cursor-pointer',
        'hover:opacity-80 transition-opacity',
        getStatusColor()
      )}
      style={{ 
        backgroundColor: `${backgroundColor}15`,
        borderColor: backgroundColor,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor }}
          />
          {getAssetIcon()}
          <span className="font-medium text-sm truncate">
            {event.asset?.name || event.title}
          </span>
        </div>
        {event.isRecurring && (
          <RefreshCw className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      
      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}</span>
      </div>
      
      <div className="text-xs text-muted-foreground mt-0.5 truncate">
        {event.employee.name}
      </div>
      
      {event.notes && (
        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {event.notes}
        </div>
      )}
    </div>
  );
}
