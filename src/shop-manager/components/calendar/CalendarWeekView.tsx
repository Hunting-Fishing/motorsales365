
import { format, startOfWeek, addDays, isSameDay, isPast } from "date-fns";
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

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  currentTime?: Date;
  shiftChats?: ChatRoom[];
  businessHours?: BusinessHour[];
  isBusinessDay?: (dayOfWeek: number) => boolean;
}

export function CalendarWeekView({ 
  currentDate, 
  events, 
  onEventClick,
  currentTime = new Date(),
  shiftChats = [],
  businessHours = [],
  isBusinessDay = () => true
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  const getEventsForDayAndHour = (date: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventHour = eventStart.getHours();
      
      return isSameDay(eventStart, date) && eventHour === hour;
    });
  };

  const isWithinBusinessHours = (dayOfWeek: number, hour: number) => {
    const dayHours = businessHours.find(h => h.day_of_week === dayOfWeek);
    if (!dayHours || dayHours.is_closed) return false;
    
    const openHour = parseInt(dayHours.open_time.split(':')[0]);
    const closeHour = parseInt(dayHours.close_time.split(':')[0]);
    
    return hour >= openHour && hour < closeHour;
  };

  const timeSlots = Array.from({ length: 11 }, (_, i) => 8 + i);
  
  const now = currentTime;
  const currentHour = now.getHours();

  return (
    <div className="w-full">
      {/* Week header */}
      <div className="grid grid-cols-8 border-b">
        <div className="p-3 text-center font-medium">Time</div>
        {weekDays.map((day, index) => {
          const dayOfWeek = day.getDay();
          const isBusinessDayForDate = isBusinessDay(dayOfWeek);
          
          return (
            <div key={index} className="p-3 text-center">
              <div className="font-medium">{format(day, "EEE")}</div>
              <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                {format(day, "d")}
                {!isBusinessDayForDate && (
                  <AlertTriangle className="h-3 w-3 text-gray-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time slots */}
      <div>
        {timeSlots.map((hour) => {
          return (
            <div key={hour} className="grid grid-cols-8 border-b min-h-[80px]">
              <div className="p-3 text-right text-sm text-gray-500">
                {hour}:00
              </div>
              
              {weekDays.map((day, dayIndex) => {
                const dayOfWeek = day.getDay();
                const hourEvents = getEventsForDayAndHour(day, hour);
                const isCurrentHour = isSameDay(day, now) && hour === currentHour;
                const isBusinessHour = isWithinBusinessHours(dayOfWeek, hour);
                const isBusinessDayForDate = isBusinessDay(dayOfWeek);
                
                return (
                  <div 
                    key={dayIndex}
                    className={cn(
                      "p-2 border-l relative",
                      isCurrentHour && "bg-blue-50",
                      !isBusinessHour && "bg-gray-50 bg-opacity-50"
                    )}
                  >
                    {/* Business hours indicator */}
                    {!isBusinessHour && isBusinessDayForDate && (
                      <div className="absolute top-1 right-1 text-xs text-gray-400">
                        Closed
                      </div>
                    )}
                    
                    {hourEvents.map((event) => {
                      const isOutsideHours = !isBusinessHour;
                      
                      return (
                        <div
                          key={event.id}
                          onClick={() => onEventClick(event)}
                        className={cn(
                          "px-2 py-1 text-xs rounded mb-1 cursor-pointer",
                          (priorityMap[event.priority]?.classes || "bg-gray-100 text-gray-800 border-gray-200").replace("text-xs font-medium", ""),
                          isOutsideHours && "ring-1 ring-orange-400 ring-opacity-50"
                        )}
                        >
                          <div className="font-medium truncate flex items-center gap-1">
                            {isOutsideHours && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                            {event.title}
                          </div>
                          <div className="text-[10px] truncate">{event.technician}</div>
                        </div>
                      );
                    })}
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
