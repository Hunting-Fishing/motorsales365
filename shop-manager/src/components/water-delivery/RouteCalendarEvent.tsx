import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Building2, Home, MapPin, User, Truck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface RouteCalendarEventData {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  priority: 'emergency' | 'high' | 'normal' | 'low';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  driverName?: string;
  truckNumber?: string;
  totalStops: number;
  businessStops: number;
  residentialStops: number;
  notes?: string;
}

interface RouteCalendarEventProps {
  event: RouteCalendarEventData;
  variant?: 'compact' | 'full';
  onClick?: () => void;
}

const priorityStyles = {
  emergency: 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/30',
  high: 'border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/30',
  normal: 'border-l-4 border-l-cyan-500 bg-cyan-50 dark:bg-cyan-950/30',
  low: 'border-l-4 border-l-gray-400 bg-gray-50 dark:bg-gray-950/30',
};

const statusBadgeStyles = {
  planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const priorityBadgeStyles = {
  emergency: 'bg-red-500 text-white animate-pulse',
  high: 'bg-orange-500 text-white',
  normal: 'bg-cyan-500 text-white',
  low: 'bg-gray-400 text-white',
};

export function RouteCalendarEvent({ event, variant = 'full', onClick }: RouteCalendarEventProps) {
  const statusLabel = event.status.replace('_', ' ');

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'px-2 py-1 rounded text-xs cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md',
          priorityStyles[event.priority]
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-medium truncate">{event.title}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {event.businessStops > 0 && (
              <Building2 className="h-3 w-3 text-blue-500" />
            )}
            {event.residentialStops > 0 && (
              <Home className="h-3 w-3 text-green-500" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
          <MapPin className="h-2.5 w-2.5" />
          <span>{event.totalStops} stops</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg cursor-pointer transition-all hover:shadow-lg',
        priorityStyles[event.priority]
      )}
    >
      {/* Priority Bar & Title */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{event.title}</h4>
          {event.startTime && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Clock className="h-3 w-3" />
              <span>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</span>
            </div>
          )}
        </div>
        <Badge className={cn('text-xs px-1.5 py-0', priorityBadgeStyles[event.priority])}>
          {event.priority}
        </Badge>
      </div>

      {/* Driver & Truck */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        {event.driverName && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{event.driverName}</span>
          </div>
        )}
        {event.truckNumber && (
          <div className="flex items-center gap-1">
            <Truck className="h-3 w-3" />
            <span>{event.truckNumber}</span>
          </div>
        )}
      </div>

      {/* Stops Summary */}
      <div className="flex items-center gap-4 text-xs mb-2">
        {event.businessStops > 0 && (
          <div className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-blue-600 dark:text-blue-400">{event.businessStops} business</span>
          </div>
        )}
        {event.residentialStops > 0 && (
          <div className="flex items-center gap-1">
            <Home className="h-3.5 w-3.5 text-green-500" />
            <span className="text-green-600 dark:text-green-400">{event.residentialStops} residential</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>{event.totalStops} total</span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <Badge className={cn('text-xs capitalize', statusBadgeStyles[event.status])}>
          {statusLabel}
        </Badge>
      </div>
    </div>
  );
}
