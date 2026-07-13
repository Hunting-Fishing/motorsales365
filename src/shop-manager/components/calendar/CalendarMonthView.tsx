
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay
} from "date-fns";
import { CalendarDay } from "./CalendarDay";
import { CalendarEvent } from "@/types/calendar";
import { ChatRoom } from "@/types/chat";

interface BusinessHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface CalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  currentTime?: Date;
  shiftChats?: ChatRoom[];
  onDateClick?: (date: Date) => void;
  isCustomerView?: boolean;
  businessHours?: BusinessHour[];
  isBusinessDay?: (dayOfWeek: number) => boolean;
}

export function CalendarMonthView({ 
  currentDate, 
  events, 
  onEventClick,
  currentTime = new Date(),
  shiftChats = [],
  onDateClick,
  isCustomerView = false,
  businessHours = [],
  isBusinessDay = () => true
}: CalendarMonthViewProps) {
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
    <div className="w-full">
      <div className="grid grid-cols-7 border-b text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2 font-medium">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr">
        {daysInMonth.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const dayOfWeek = day.getDay();
          const isBusinessDayForDate = isBusinessDay(dayOfWeek);
          
          return (
            <CalendarDay
              key={i}
              date={day}
              events={dayEvents}
              isCurrentMonth={isSameMonth(day, monthStart)}
              isToday={isToday(day)}
              onEventClick={onEventClick}
              onDateClick={onDateClick}
              currentTime={currentTime}
              shiftChats={shiftChats}
              isCustomerView={isCustomerView}
              isBusinessDay={isBusinessDayForDate}
              businessHours={businessHours}
            />
          );
        })}
      </div>
    </div>
  );
}
