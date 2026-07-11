import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Route,
  Droplets,
  User,
  Truck,
  MapPin,
  Clock,
  Calendar,
  Building2,
  AlertTriangle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WaterDeliveryCalendarEvent } from '@/hooks/water-delivery/useWaterDeliveryCalendarEvents';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface WaterDeliveryEventDialogProps {
  event: WaterDeliveryCalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusBadgeStyles = {
  pending: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const priorityBadgeStyles = {
  emergency: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  normal: 'bg-cyan-500 text-white',
  low: 'bg-gray-400 text-white',
};

export function WaterDeliveryEventDialog({ event, isOpen, onClose }: WaterDeliveryEventDialogProps) {
  const navigate = useNavigate();
  
  if (!event) return null;

  const TypeIcon = event.type === 'route' ? Route : Droplets;
  const formattedDate = format(parseISO(event.date), 'EEEE, MMMM d, yyyy');

  const handleViewDetails = () => {
    if (event.type === 'route') {
      navigate(`/water-delivery/routes?id=${event.id}`);
    } else {
      navigate(`/water-delivery/orders?id=${event.id}`);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn(
              'p-2.5 rounded-xl',
              event.type === 'route' ? 'bg-emerald-500' : 'bg-blue-500'
            )}>
              <TypeIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold">{event.title}</DialogTitle>
              <p className="text-sm text-muted-foreground capitalize">{event.type}</p>
            </div>
            {event.priority === 'emergency' && (
              <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status & Priority */}
          <div className="flex items-center gap-2">
            <Badge className={cn('capitalize', statusBadgeStyles[event.status])}>
              {event.status.replace('_', ' ')}
            </Badge>
            <Badge className={cn('capitalize', priorityBadgeStyles[event.priority])}>
              {event.priority} priority
            </Badge>
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formattedDate}</span>
            </div>
            {event.startTime && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Assignment */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Assignment</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{event.driverName || <span className="text-orange-600">Unassigned</span>}</span>
              </div>
              {event.truckNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span>{event.truckNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order-specific details */}
          {event.type === 'order' && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Delivery Details</h4>
                {event.customerName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{event.customerName}</span>
                  </div>
                )}
                {event.locationName && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{event.locationName}</span>
                  </div>
                )}
                {event.quantity && (
                  <div className="flex items-center gap-2 text-sm">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-blue-600">
                      {event.quantity.toLocaleString()} gallons
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Route-specific details */}
          {event.type === 'route' && event.totalStops && event.totalStops > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Route Details</h4>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.totalStops} stops</span>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {event.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {event.notes}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button onClick={handleViewDetails} className="flex-1 gap-2">
            <ExternalLink className="h-4 w-4" />
            View Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
