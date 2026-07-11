import { format, parseISO, isSameDay, getHours, getMinutes } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { BookingAppointment, BookableService } from '@/hooks/useBookingSystem';

interface BookingCalendarDayViewProps {
  currentDate: Date;
  appointments: BookingAppointment[];
  services: BookableService[];
  onAppointmentClick: (appointment: BookingAppointment) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertCircle },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle },
  no_show: { label: 'No Show', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

export function BookingCalendarDayView({ 
  currentDate, 
  appointments,
  services,
  onAppointmentClick 
}: BookingCalendarDayViewProps) {
  const dayAppointments = appointments.filter(apt => 
    isSameDay(parseISO(apt.start_time), currentDate) && apt.status !== 'cancelled'
  );

  const getServiceColor = (serviceId: string | null) => {
    const service = services.find(s => s.id === serviceId);
    return service?.color || '#3B82F6';
  };

  const getAppointmentPosition = (apt: BookingAppointment) => {
    const startTime = parseISO(apt.start_time);
    const endTime = parseISO(apt.end_time);
    const startHour = getHours(startTime) + getMinutes(startTime) / 60;
    const endHour = getHours(endTime) + getMinutes(endTime) / 60;
    
    const top = ((startHour - 7) / 14) * 100; // Relative to 7 AM start
    const height = ((endHour - startHour) / 14) * 100;
    
    return { top: `${Math.max(0, top)}%`, height: `${Math.min(100, height)}%` };
  };

  const isCurrentHour = (hour: number) => {
    const now = new Date();
    return isSameDay(currentDate, now) && getHours(now) === hour;
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-lg overflow-hidden">
      {/* Day header */}
      <div className="bg-muted px-4 py-3 border-b">
        <h3 className="font-semibold">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h3>
        <p className="text-sm text-muted-foreground">
          {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0">
          {/* Hour lines */}
          {HOURS.map((hour) => (
            <div 
              key={hour} 
              className={`flex border-b ${isCurrentHour(hour) ? 'bg-primary/5' : ''}`}
              style={{ height: `${100 / 14}%` }}
            >
              <div className="w-16 flex-shrink-0 text-xs text-muted-foreground p-1 border-r bg-muted/50">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
              <div className="flex-1 relative">
                {/* Appointments for this hour */}
              </div>
            </div>
          ))}

          {/* Appointments overlay */}
          <div className="absolute top-0 left-16 right-0 bottom-0">
            {dayAppointments.map((apt) => {
              const position = getAppointmentPosition(apt);
              const StatusIcon = STATUS_CONFIG[apt.status]?.icon || AlertCircle;
              
              return (
                <button
                  key={apt.id}
                  onClick={() => onAppointmentClick(apt)}
                  className="absolute left-1 right-1 p-2 rounded-md shadow-sm border hover:shadow-md transition-shadow overflow-hidden text-left"
                  style={{
                    top: position.top,
                    height: position.height,
                    minHeight: '40px',
                    backgroundColor: `${getServiceColor(apt.service_id)}15`,
                    borderLeftWidth: '4px',
                    borderLeftColor: getServiceColor(apt.service_id),
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(parseISO(apt.start_time), 'h:mm a')} - {format(parseISO(apt.end_time), 'h:mm a')}
                        </span>
                      </div>
                      <div className="font-medium text-sm truncate mt-0.5">
                        {apt.customers?.first_name} {apt.customers?.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {apt.bookable_services?.name}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_CONFIG[apt.status]?.color || ''}`}>
                      <StatusIcon className="h-2 w-2 mr-1" />
                      {STATUS_CONFIG[apt.status]?.label || apt.status}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
