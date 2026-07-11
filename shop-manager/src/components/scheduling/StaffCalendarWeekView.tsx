import React from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { StaffScheduleEvent } from '@/types/staffScheduleCalendar';
import { StaffCalendarEvent } from './StaffCalendarEvent';

interface StaffCalendarWeekViewProps {
  currentDate: Date;
  events: StaffScheduleEvent[];
  onEventClick: (event: StaffScheduleEvent) => void;
  onDateClick?: (date: Date) => void;
}

export function StaffCalendarWeekView({ 
  currentDate, 
  events, 
  onEventClick,
  onDateClick 
}: StaffCalendarWeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const timeSlots = Array.from({ length: 12 }, (_, i) => 6 + i); // 6am to 6pm

  const getEventsForDayAndHour = (date: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventHour = eventStart.getHours();
      return isSameDay(eventStart, date) && eventHour === hour;
    });
  };

  const now = new Date();
  const currentHour = now.getHours();

  return (
    <div className="w-full bg-card rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-8 border-b bg-muted/50">
        <div className="p-3 text-center text-sm font-medium text-muted-foreground">
          Time
        </div>
        {weekDays.map((day, index) => {
          const isTodayDate = isToday(day);
          return (
            <div
              key={index}
              className={cn(
                'p-3 text-center cursor-pointer hover:bg-muted/80 transition-colors',
                isTodayDate && 'bg-primary/10'
              )}
              onClick={() => onDateClick?.(day)}
            >
              <div className="text-sm font-medium">{format(day, 'EEE')}</div>
              <div
                className={cn(
                  'text-lg',
                  isTodayDate && 'text-primary font-bold'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time Grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {timeSlots.map((hour) => {
          const isCurrentHourSlot = hour === currentHour;
          
          return (
            <div key={hour} className="grid grid-cols-8 border-b min-h-[80px]">
              {/* Time Label */}
              <div className="p-2 text-right text-sm text-muted-foreground border-r">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
              
              {/* Day Columns */}
              {weekDays.map((day, dayIndex) => {
                const hourEvents = getEventsForDayAndHour(day, hour);
                const isCurrentHour = isSameDay(day, now) && isCurrentHourSlot;
                
                return (
                  <div 
                    key={dayIndex}
                    className={cn(
                      'p-1 border-r relative',
                      isCurrentHour && 'bg-primary/5'
                    )}
                  >
                    {/* Current time indicator */}
                    {isCurrentHour && (
                      <div className="absolute left-0 right-0 top-1/2 border-t-2 border-primary z-10" />
                    )}
                    
                    {/* Events */}
                    <div className="space-y-1 relative z-20">
                      {hourEvents.map((event) => (
                        <StaffCalendarEvent
                          key={event.id}
                          event={event}
                          onClick={onEventClick}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
