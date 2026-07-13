import React from 'react';
import { format, isSameDay, startOfDay, addHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { StaffScheduleEvent } from '@/types/staffScheduleCalendar';
import { StaffCalendarEvent } from './StaffCalendarEvent';

interface StaffCalendarDayViewProps {
  currentDate: Date;
  events: StaffScheduleEvent[];
  onEventClick: (event: StaffScheduleEvent) => void;
}

export function StaffCalendarDayView({ 
  currentDate, 
  events, 
  onEventClick 
}: StaffCalendarDayViewProps) {
  const timeSlots = Array.from({ length: 16 }, (_, i) => 5 + i); // 5am to 9pm
  const now = new Date();
  const currentHour = now.getHours();
  const isToday = isSameDay(currentDate, now);

  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventHour = eventStart.getHours();
      return isSameDay(eventStart, currentDate) && eventHour === hour;
    });
  };

  const dayEvents = events.filter(event => 
    isSameDay(new Date(event.start), currentDate)
  );

  return (
    <div className="w-full bg-card rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-muted/50">
        <h3 className="text-lg font-semibold">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {dayEvents.length} assignment{dayEvents.length !== 1 ? 's' : ''} scheduled
        </p>
      </div>

      {/* Day Summary */}
      {dayEvents.length > 0 && (
        <div className="p-4 border-b bg-muted/30">
          <h4 className="text-sm font-medium mb-2">Today's Assignments</h4>
          <div className="flex flex-wrap gap-2">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-2 px-2 py-1 rounded-full text-xs bg-card border cursor-pointer hover:bg-accent"
                onClick={() => onEventClick(event)}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: event.color }}
                />
                <span>{event.asset?.name || event.title}</span>
                <span className="text-muted-foreground">
                  {format(event.start, 'h:mm a')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {timeSlots.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          const isCurrentHour = isToday && hour === currentHour;
          
          return (
            <div
              key={hour}
              className={cn(
                'grid grid-cols-[80px_1fr] min-h-[80px] border-b',
                isCurrentHour && 'bg-primary/5'
              )}
            >
              {/* Time Label */}
              <div className="p-3 text-right text-sm text-muted-foreground border-r font-medium">
                {format(new Date().setHours(hour, 0), 'h:mm a')}
              </div>
              
              {/* Events */}
              <div className="p-2 relative">
                {/* Current time indicator */}
                {isCurrentHour && (
                  <div className="absolute left-0 right-0 top-1/2 border-t-2 border-primary z-10">
                    <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-primary" />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 relative z-20">
                  {hourEvents.map((event) => (
                    <StaffCalendarEvent
                      key={event.id}
                      event={event}
                      onClick={onEventClick}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
