
import { format, isPast, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarEvent } from "@/types/calendar";
import { priorityMap } from "@/utils/workOrders";
import { ShiftChatIndicator } from "./ShiftChatIndicator";
import { ChatRoom } from "@/types/chat";
import { useNavigate } from "react-router-dom";
import { Clock, AlertTriangle } from "lucide-react";

interface BusinessHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface CalendarDayProps {
  date: Date;
  events: CalendarEvent[];
  isCurrentMonth?: boolean;
  isToday?: boolean;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  currentTime?: Date;
  shiftChats?: ChatRoom[];
  isCustomerView?: boolean;
  isBusinessDay?: boolean;
  businessHours?: BusinessHour[];
}

export function CalendarDay({ 
  date, 
  events, 
  isCurrentMonth = true, 
  isToday = false,
  onEventClick,
  onDateClick,
  currentTime = new Date(),
  shiftChats = [],
  isCustomerView = false,
  isBusinessDay = true,
  businessHours = []
}: CalendarDayProps) {
  const navigate = useNavigate();
  
  const isPastDate = isPast(startOfDay(date)) && !isToday;
  const dayOfWeek = date.getDay();
  const dayHours = businessHours.find(h => h.day_of_week === dayOfWeek);
  
  // Check if events are outside business hours
  const eventsOutsideHours = events.filter(event => {
    if (!dayHours || dayHours.is_closed) return false;
    
    const eventStart = new Date(event.start);
    const eventTime = eventStart.toTimeString().substring(0, 5);
    
    return eventTime < dayHours.open_time || eventTime > dayHours.close_time;
  });

  const sortedEvents = [...events].sort((a, b) => {
    const priorityOrder = { "high": 0, "medium": 1, "low": 2 };
    return priorityOrder[a.priority as keyof typeof priorityOrder] - 
           priorityOrder[b.priority as keyof typeof priorityOrder];
  });

  const maxVisibleEvents = 3;
  const visibleEvents = sortedEvents.slice(0, maxVisibleEvents);
  const hiddenEventsCount = sortedEvents.length - maxVisibleEvents;

  const handleShiftChatClick = (room: ChatRoom) => {
    navigate(`/chat/${room.id}`);
  };

  const handleDayClick = () => {
    if (onDateClick) {
      if (isCustomerView) {
        if (!isPastDate && isBusinessDay) {
          onDateClick(date);
        }
      } else {
        onDateClick(date);
      }
    }
  };

  return (
    <div 
      className={cn(
        "min-h-[120px] border p-1 relative",
        !isCurrentMonth && "bg-slate-50",
        isToday && "bg-blue-50",
        isPastDate && "bg-red-50 bg-opacity-30",
        !isBusinessDay && "bg-gray-100",
        onDateClick && "cursor-pointer hover:bg-blue-50/50",
        isCustomerView && !isPastDate && isBusinessDay && "hover:bg-blue-50"
      )}
      onClick={handleDayClick}
    >
      {/* Past date overlay */}
      {isPastDate && (
        <div className="absolute inset-0 bg-red-100 bg-opacity-20 pointer-events-none z-10">
          <div className="absolute top-1 right-1">
            <span className="text-xs text-red-500 font-medium px-1 rounded bg-white bg-opacity-70">
              Past
            </span>
          </div>
        </div>
      )}
      
      {/* Closed day overlay */}
      {!isBusinessDay && (
        <div className="absolute inset-0 bg-gray-200 bg-opacity-30 pointer-events-none z-10">
          <div className="absolute top-1 right-1">
            <span className="text-xs text-gray-600 font-medium px-1 rounded bg-white bg-opacity-70 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Closed
            </span>
          </div>
        </div>
      )}
      
      <div className="flex justify-between mb-1">
        <span 
          className={cn(
            "text-sm font-medium",
            !isCurrentMonth && "text-slate-400",
            isToday && "rounded-full bg-blue-600 text-white h-6 w-6 flex items-center justify-center"
          )}
        >
          {format(date, "d")}
        </span>
        
        {/* Business hours indicator */}
        {isBusinessDay && dayHours && !dayHours.is_closed && (
          <div className="flex items-center">
            <Clock className="h-3 w-3 text-green-500" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        {visibleEvents.map((event) => {
          const isOutsideHours = eventsOutsideHours.includes(event);
          
          return (
            <div 
              key={event.id}
              onClick={(e) => {
                e.stopPropagation();
                // On mobile, clicking an event opens the full day view
                // This makes it easier to see all events for that day
                handleDayClick();
              }}
              className={cn(
                "px-2 py-1 text-xs rounded truncate cursor-pointer relative z-20",
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

        {hiddenEventsCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDayClick();
            }}
            className="text-xs font-medium text-primary hover:text-primary/80 px-2 py-1 relative z-20 hover:underline transition-colors"
          >
            + {hiddenEventsCount} more
          </button>
        )}
      </div>
      
      <ShiftChatIndicator 
        date={date}
        chatRooms={shiftChats}
        onClick={(e, room) => {
          e.stopPropagation();
          handleShiftChatClick(room);
        }}
      />
      
      {/* Booking indicator for customer view */}
      {isCustomerView && !isPastDate && isBusinessDay && (
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full"></div>
      )}
    </div>
  );
}
