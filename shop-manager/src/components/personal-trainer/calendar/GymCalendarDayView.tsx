import { useMemo } from 'react';
import { format, isSameDay, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { GymEvent, EVENT_TYPE_CONFIG } from './GymEventCard';
import { MapPin, Users } from 'lucide-react';

interface Props {
  currentDate: Date;
  events: GymEvent[];
  onEventClick: (event: GymEvent) => void;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

export function GymCalendarDayView({ currentDate, events, onEventClick }: Props) {
  const dayEvents = useMemo(
    () => events.filter(ev => isSameDay(new Date(ev.start_time), currentDate)),
    [events, currentDate]
  );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="grid grid-cols-[70px_1fr]">
        {HOURS.map(hour => (
          <div key={hour} className="contents">
            <div className="h-20 border-b border-border/50 pr-3 text-right pt-1">
              <span className="text-xs font-medium text-muted-foreground">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </span>
            </div>
            <div className="h-20 border-b border-border/50 relative">
              {dayEvents
                .filter(ev => new Date(ev.start_time).getHours() === hour)
                .map(ev => {
                  const evStart = new Date(ev.start_time);
                  const evEnd = new Date(ev.end_time);
                  const duration = Math.max(differenceInMinutes(evEnd, evStart), 30);
                  const topOffset = (evStart.getMinutes() / 60) * 80;
                  const height = Math.min((duration / 60) * 80, 240);
                  const config = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.event;

                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className={cn(
                        'absolute left-1 right-1 rounded-lg p-2 border-l-3 z-10 hover:shadow-lg transition-all text-left',
                        config.bg, config.color, config.border
                      )}
                      style={{ top: topOffset, minHeight: height }}
                    >
                      <div className="font-semibold text-sm">{ev.title}</div>
                      <div className="text-xs opacity-70">
                        {format(evStart, 'h:mm a')} – {format(evEnd, 'h:mm a')}
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-1 text-xs opacity-60 mt-0.5">
                          <MapPin className="h-3 w-3" />{ev.location}
                        </div>
                      )}
                      {ev.max_signups && (
                        <div className="flex items-center gap-1 text-xs opacity-60 mt-0.5">
                          <Users className="h-3 w-3" />{ev.current_signups}/{ev.max_signups}
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
