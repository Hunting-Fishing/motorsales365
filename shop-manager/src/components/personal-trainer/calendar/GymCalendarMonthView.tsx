import { useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { GymEvent, GymEventCard } from './GymEventCard';

interface Props {
  currentDate: Date;
  events: GymEvent[];
  onEventClick: (event: GymEvent) => void;
  onDateClick: (date: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function GymCalendarMonthView({ currentDate, events, onEventClick, onDateClick }: Props) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
  }, [currentDate]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, GymEvent[]> = {};
    events.forEach(ev => {
      const dayKey = format(new Date(ev.start_time), 'yyyy-MM-dd');
      if (!map[dayKey]) map[dayKey] = [];
      map[dayKey].push(ev);
    });
    return map;
  }, [events]);

  return (
    <div className="flex flex-col h-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay[key] || [];
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <div
              key={key}
              onClick={() => onDateClick(day)}
              className={cn(
                'border border-border/50 p-1 min-h-[100px] cursor-pointer transition-colors hover:bg-accent/30',
                !inMonth && 'opacity-40 bg-muted/20',
                today && 'bg-primary/5 ring-1 ring-primary/30'
              )}
            >
              <div className={cn(
                'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                today && 'bg-primary text-primary-foreground',
                !today && 'text-foreground'
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map(ev => (
                  <GymEventCard
                    key={ev.id}
                    event={ev}
                    compact
                    onClick={(clickedEv) => onEventClick(clickedEv)}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1">
                    +{dayEvents.length - 3} more
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
