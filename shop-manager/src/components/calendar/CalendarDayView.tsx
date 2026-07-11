
import { format, isSameDay, isPast, set } from "date-fns";
import { CalendarEvent } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { priorityMap } from "@/utils/workOrders";
import { ChatRoom } from "@/types/chat";
import { AlertTriangle } from "lucide-react";

interface BusinessHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface CalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  currentTime?: Date;
  shiftChats?: ChatRoom[];
  businessHours?: BusinessHour[];
  isBusinessDay?: (dayOfWeek: number) => boolean;
}

export function CalendarDayView({ 
  currentDate, 
  events, 
  onEventClick,
  currentTime = new Date(),
  shiftChats = [],
  businessHours = [],
  isBusinessDay = () => true
}: CalendarDayViewProps) {
  const dayEvents = events.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    return (
      (eventStart <= currentDate && eventEnd >= currentDate) ||
      isSameDay(eventStart, currentDate) ||
      isSameDay(eventEnd, currentDate)
    );
  });

  const dayOfWeek = currentDate.getDay();
  const dayHours = businessHours.find(h => h.day_of_week === dayOfWeek);
  const isBusinessDayForDate = isBusinessDay(dayOfWeek);

  const getEventsForHour = (hour: number) => {
    return dayEvents.filter(event => {
      const eventHour = new Date(event.start).getHours();
      return eventHour === hour;
    });
  };

  const isWithinBusinessHours = (hour: number) => {
    if (!dayHours || dayHours.is_closed) return false;
    
    const openHour = parseInt(dayHours.open_time.split(':')[0]);
    const closeHour = parseInt(dayHours.close_time.split(':')[0]);
    
    return hour >= openHour && hour < closeHour;
  };

  const timeSlots = Array.from({ length: 11 }, (_, i) => 8 + i);
  
  const now = currentTime;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return (
    <div className="w-full">
      <div className="py-4 text-center font-bold text-lg border-b">
        {format(currentDate, "EEEE, MMMM d, yyyy")}
        {!isBusinessDayForDate && (
          <div className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Business Closed
          </div>
        )}
      </div>

      <div>
        {timeSlots.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          const isFullyPastHour = isSameDay(currentDate, now) && hour < currentHour;
          const isCurrentHour = isSameDay(currentDate, now) && hour === currentHour;
          const isBusinessHour = isWithinBusinessHours(hour);
          
          return (
            <div key={hour} className="grid grid-cols-12 border-b">
              <div className={cn(
                "col-span-1 p-3 text-right",
                isFullyPastHour ? "text-gray-400" : "text-slate-500"
              )}>
                {hour}:00
              </div>

              <div 
                className={cn(
                  "col-span-11 p-2 min-h-[100px] border-l relative",
                  isFullyPastHour && "bg-red-50 bg-opacity-20",
                  !isBusinessHour && "bg-gray-50 bg-opacity-50"
                )}
              >
                {/* Business hours indicator */}
                {!isBusinessHour && isBusinessDayForDate && (
                  <div className="absolute top-1 right-1 text-xs text-gray-500 bg-white px-1 rounded">
                    Outside hours
                  </div>
                )}
                
                {/* Current hour partial overlay */}
                {isCurrentHour && (
                  <div 
                    className="absolute left-0 top-0 bg-red-50 bg-opacity-20 pointer-events-none"
                    style={{
                      width: '100%',
                      height: `${(currentMinute / 60) * 100}%`
                    }}
                  />
                )}
                
                {/* Fully past hour overlay */}
                {isFullyPastHour && (
                  <div className="absolute inset-0 bg-red-100 bg-opacity-20 pointer-events-none" />
                )}
                
                {hourEvents.map((event) => {
                  const isOutsideHours = !isBusinessHour;
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                    className={cn(
                      "px-3 py-2 text-sm rounded mb-2 cursor-pointer relative z-10",
                      (priorityMap[event.priority]?.classes || "bg-gray-100 text-gray-800 border-gray-200").replace("text-xs font-medium", ""),
                      isOutsideHours && "ring-1 ring-orange-400 ring-opacity-50"
                    )}
                    >
                      <div className="font-medium flex items-center gap-1">
                        {isOutsideHours && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                        {event.title}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>{event.customer}</span>
                        <span>{event.technician}</span>
                      </div>
                    </div>
                  );
                })}

                {hourEvents.length === 0 && (
                  <div className="h-full flex items-center justify-center text-slate-300 italic">
                    No scheduled events
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
