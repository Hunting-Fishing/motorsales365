import { useMemo } from 'react';
import { startOfWeek, addDays, format, isSameDay, isToday, differenceInMinutes, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { GymEvent, EVENT_TYPE_CONFIG } from './GymEventCard';

interface Props {
  currentDate: Date;
  events: GymEvent[];
  onEventClick: (event: GymEvent) => void;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am–9pm

export function GymCalendarWeekView({ currentDate, events, onEventClick }: Props) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-10 bg-background border-b border-border">
        <div className="p-2" />
        {weekDays.map(day => (
          <div
            key={day.toISOString()}
            className={cn(
              'p-2 text-center border-l border-border',
              isToday(day) && 'bg-primary/5'
            )}
          >
            <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
            <div className={cn(
              'text-lg font-bold w-8 h-8 mx-auto flex items-center justify-center rounded-full',
              isToday(day) && 'bg-primary text-primary-foreground'
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] flex-1 relative">
        {HOURS.map(hour => (
          <div key={hour} className="contents">
            <div className="h-16 border-b border-border/50 pr-2 text-right">
              <span className="text-[10px] text-muted-foreground relative -top-2">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </span>
            </div>
            {weekDays.map(day => (
              <div key={`${hour}-${day.toISOString()}`} className="h-16 border-b border-l border-border/50 relative">
                {/* Events */}
                {events
                  .filter(ev => {
                    const evStart = new Date(ev.start_time);
                    return isSameDay(evStart, day) && evStart.getHours() === hour;
                  })
                  .map(ev => {
                    const evStart = new Date(ev.start_time);
                    const evEnd = new Date(ev.end_time);
                    const duration = Math.max(differenceInMinutes(evEnd, evStart), 30);
                    const topOffset = (evStart.getMinutes() / 60) * 64;
                    const height = Math.min((duration / 60) * 64, 192);
                    const config = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.event;

                    return (
                      <button
                        key={ev.id}
                        onClick={() => onEventClick(ev)}
                        className={cn(
                          'absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[11px] font-medium overflow-hidden border-l-2 z-10 hover:shadow-md transition-shadow',
                          config.bg, config.color, config.border
                        )}
                        style={{ top: topOffset, height }}
                      >
                        <div className="truncate">{ev.title}</div>
                        <div className="truncate opacity-70">{format(evStart, 'h:mm a')}</div>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
