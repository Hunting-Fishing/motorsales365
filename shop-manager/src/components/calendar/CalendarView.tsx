
import { useState, useEffect } from "react";
import { CalendarEvent, CalendarViewType } from "@/types/calendar";
import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarWeekView } from "./CalendarWeekView";
import { CalendarDayView } from "./CalendarDayView";
import { CalendarEventDialog } from "./CalendarEventDialog";
import { CurrentTimeIndicator } from "./CurrentTimeIndicator";
import { ChatRoom } from "@/types/chat";

interface BusinessHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  view: CalendarViewType;
  loading?: boolean;
  shiftChats?: ChatRoom[];
  onDateClick?: (date: Date) => void;
  isCustomerView?: boolean;
  businessHours?: BusinessHour[];
  isBusinessDay?: (dayOfWeek: number) => boolean;
}

export function CalendarView({ 
  events, 
  currentDate, 
  view,
  loading = false,
  shiftChats = [],
  onDateClick,
  isCustomerView = false,
  businessHours = [],
  isBusinessDay = () => true
}: CalendarViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [now, setNow] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseDialog = () => {
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <div className="h-[800px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-t-blue-600 border-b-blue-600 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
          <div className="text-slate-500">Loading calendar events...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[800px] overflow-auto relative">
      {view === "month" && (
        <CalendarMonthView 
          currentDate={currentDate} 
          events={events} 
          onEventClick={handleEventClick}
          currentTime={now}
          shiftChats={shiftChats}
          onDateClick={onDateClick}
          isCustomerView={isCustomerView}
          businessHours={businessHours}
          isBusinessDay={isBusinessDay}
        />
      )}
      
      {view === "week" && (
        <>
          <CalendarWeekView 
            currentDate={currentDate} 
            events={events} 
            onEventClick={handleEventClick}
            currentTime={now}
            shiftChats={shiftChats}
            businessHours={businessHours}
            isBusinessDay={isBusinessDay}
          />
          <CurrentTimeIndicator currentTime={now} view="week" />
        </>
      )}
      
      {view === "day" && (
        <>
          <CalendarDayView 
            currentDate={currentDate} 
            events={events} 
            onEventClick={handleEventClick}
            currentTime={now}
            shiftChats={shiftChats}
            businessHours={businessHours}
            isBusinessDay={isBusinessDay}
          />
          <CurrentTimeIndicator currentTime={now} view="day" />
        </>
      )}

      {selectedEvent && (
        <CalendarEventDialog 
          event={selectedEvent} 
          isOpen={!!selectedEvent}
          onClose={handleCloseDialog} 
        />
      )}
    </div>
  );
}
