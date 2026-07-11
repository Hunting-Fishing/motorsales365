import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Droplets, Route, MapPin, User, Truck, Clock, Building2, Home, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WaterDeliveryCalendarEvent as CalendarEventType } from '@/hooks/water-delivery/useWaterDeliveryCalendarEvents';

interface WaterDeliveryCalendarEventProps {
  event: CalendarEventType;
  variant?: 'compact' | 'medium' | 'full';
  onClick?: () => void;
}

const priorityStyles = {
  emergency: 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/30',
  high: 'border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/30',
  normal: 'border-l-4 border-l-cyan-500 bg-cyan-50 dark:bg-cyan-950/30',
  low: 'border-l-4 border-l-gray-400 bg-gray-50 dark:bg-gray-950/30',
};

const statusBadgeStyles = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  scheduled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const typeStyles = {
  route: 'bg-emerald-500',
  order: 'bg-blue-500',
};

export function WaterDeliveryCalendarEventComponent({ event, variant = 'medium', onClick }: WaterDeliveryCalendarEventProps) {
  const statusLabel = event.status.replace('_', ' ');
  const TypeIcon = event.type === 'route' ? Route : Droplets;

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'px-2 py-1 rounded text-xs cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md',
          priorityStyles[event.priority]
        )}
      >
        <div className="flex items-center gap-1">
          <TypeIcon className={cn('h-3 w-3 flex-shrink-0', event.type === 'route' ? 'text-emerald-500' : 'text-blue-500')} />
          <span className="font-medium truncate">{event.title}</span>
          {event.priority === 'emergency' && (
            <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0 animate-pulse" />
          )}
        </div>
        {event.quantity && (
          <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
            <Droplets className="h-2.5 w-2.5" />
            <span>{event.quantity.toLocaleString()} gal</span>
          </div>
        )}
        {event.totalStops && event.totalStops > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
            <MapPin className="h-2.5 w-2.5" />
            <span>{event.totalStops} stops</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'medium') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'px-3 py-2 rounded-lg cursor-pointer transition-all hover:shadow-md',
          priorityStyles[event.priority]
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className={cn('p-1 rounded', typeStyles[event.type])}>
            <TypeIcon className="h-3 w-3 text-white" />
          </div>
          <span className="font-medium text-sm truncate flex-1">{event.title}</span>
          {event.priority === 'emergency' && (
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 animate-pulse" />
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {event.startTime && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{event.startTime}</span>
            </div>
          )}
          {event.driverName && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{event.driverName}</span>
            </div>
          )}
          {!event.driverId && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-orange-600 border-orange-300">
              Unassigned
            </Badge>
          )}
        </div>
        
        {event.quantity && (
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1">
            <Droplets className="h-3 w-3" />
            <span>{event.quantity.toLocaleString()} gal</span>
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg cursor-pointer transition-all hover:shadow-lg',
        priorityStyles[event.priority]
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg', typeStyles[event.type])}>
            <TypeIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">{event.title}</h4>
            {event.customerName && event.type === 'order' && (
              <p className="text-xs text-muted-foreground">{event.customerName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {event.priority === 'emergency' && (
            <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
          )}
          <Badge className={cn('text-xs capitalize', statusBadgeStyles[event.status])}>
            {statusLabel}
          </Badge>
        </div>
      </div>

      {/* Time */}
      {event.startTime && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Clock className="h-3 w-3" />
          <span>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</span>
        </div>
      )}

      {/* Driver & Truck */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
        {event.driverName ? (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{event.driverName}</span>
          </div>
        ) : (
          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
            Unassigned
          </Badge>
        )}
        {event.truckNumber && (
          <div className="flex items-center gap-1">
            <Truck className="h-3 w-3" />
            <span>{event.truckNumber}</span>
          </div>
        )}
      </div>

      {/* Quantity or Stops */}
      <div className="flex items-center gap-4 text-xs">
        {event.quantity && (
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Droplets className="h-3.5 w-3.5" />
            <span className="font-medium">{event.quantity.toLocaleString()} gallons</span>
          </div>
        )}
        {event.totalStops && event.totalStops > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{event.totalStops} stops</span>
          </div>
        )}
        {event.locationName && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px]">{event.locationName}</span>
          </div>
        )}
      </div>

      {/* Notes preview */}
      {event.notes && (
        <p className="text-xs text-muted-foreground mt-2 truncate italic">
          {event.notes}
        </p>
      )}
    </div>
  );
}
