import React from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  format
} from 'date-fns';
import { cn } from '@/lib/utils';
import { StaffScheduleEvent } from '@/types/staffScheduleCalendar';
import { StaffCalendarEvent } from './StaffCalendarEvent';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StaffCalendarMonthViewProps {
  currentDate: Date;
  events: StaffScheduleEvent[];
  onEventClick: (event: StaffScheduleEvent) => void;
  onDateClick?: (date: Date) => void;
}

export function StaffCalendarMonthView({ 
  currentDate, 
  events, 
  onEventClick,
  onDateClick 
}: StaffCalendarMonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const daysInMonth = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      return isSameDay(date, eventStart);
    });
  };

  return (
    <div className="w-full bg-card rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {daysInMonth.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isTodayDate = isToday(day);
          const maxEventsToShow = 3;
          const hasMore = dayEvents.length > maxEventsToShow;

          return (
            <div
              key={i}
              className={cn(
                'min-h-[120px] border-b border-r p-1 relative group',
                !isCurrentMonth && 'bg-muted/30',
                isTodayDate && 'bg-primary/5'
              )}
            >
              {/* Date Header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-7 h-7 text-sm rounded-full',
                    isTodayDate && 'bg-primary text-primary-foreground font-bold',
                    !isCurrentMonth && 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
                
                {onDateClick && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDateClick(day)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, maxEventsToShow).map((event) => (
                  <StaffCalendarEvent
                    key={event.id}
                    event={event}
                    onClick={onEventClick}
                    compact
                  />
                ))}
                
                {hasMore && (
                  <button
                    className="text-xs text-primary hover:underline w-full text-left px-1"
                    onClick={() => onDateClick?.(day)}
                  >
                    +{dayEvents.length - maxEventsToShow} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
