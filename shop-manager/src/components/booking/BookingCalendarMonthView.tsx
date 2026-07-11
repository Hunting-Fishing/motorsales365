import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  parseISO
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { BookingAppointment, BookableService } from '@/hooks/useBookingSystem';

interface BookingCalendarMonthViewProps {
  currentDate: Date;
  appointments: BookingAppointment[];
  services: BookableService[];
  onDayClick: (date: Date) => void;
  onAppointmentClick: (appointment: BookingAppointment) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  in_progress: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-400',
  no_show: 'bg-red-500',
};

export function BookingCalendarMonthView({ 
  currentDate, 
  appointments,
  services,
  onDayClick,
  onAppointmentClick 
}: BookingCalendarMonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const daysInMonth = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => 
      isSameDay(parseISO(apt.start_time), date) && apt.status !== 'cancelled'
    ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  const getServiceColor = (serviceId: string | null) => {
    const service = services.find(s => s.id === serviceId);
    return service?.color || '#3B82F6';
  };

  return (
    <div className="w-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-2 text-center font-medium text-sm text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {daysInMonth.map((day, i) => {
          const dayAppointments = getAppointmentsForDay(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isTodayDate = isToday(day);
          const displayCount = 3;
          const remaining = dayAppointments.length - displayCount;

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={`min-h-[120px] border-b border-r p-1 cursor-pointer hover:bg-muted/50 transition-colors ${
                !isCurrentMonth ? 'bg-muted/30' : ''
              }`}
            >
              <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                isTodayDate 
                  ? 'bg-primary text-primary-foreground' 
                  : !isCurrentMonth 
                    ? 'text-muted-foreground' 
                    : ''
              }`}>
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {dayAppointments.slice(0, displayCount).map((apt) => (
                  <button
                    key={apt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(apt);
                    }}
                    className="w-full text-left text-xs p-1 rounded truncate hover:opacity-80 transition-opacity"
                    style={{ 
                      backgroundColor: `${getServiceColor(apt.service_id)}20`,
                      borderLeft: `2px solid ${getServiceColor(apt.service_id)}`,
                    }}
                  >
                    <span className="font-medium">{format(parseISO(apt.start_time), 'h:mm a')}</span>
                    {' '}
                    <span className="text-muted-foreground">
                      {apt.customers?.first_name}
                    </span>
                  </button>
                ))}
                
                {remaining > 0 && (
                  <div className="text-xs text-muted-foreground pl-1">
                    +{remaining} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
