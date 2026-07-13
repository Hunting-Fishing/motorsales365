
import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface BusinessHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface BusinessHoursInfoProps {
  businessHours: BusinessHour[];
  currentDate: Date;
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export function BusinessHoursInfo({ businessHours, currentDate }: BusinessHoursInfoProps) {
  const todayIndex = currentDate.getDay();
  const todayHours = businessHours.find(h => h.day_of_week === todayIndex);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 font-semibold text-lg">
        <Clock className="h-5 w-5" />
        Business Hours
      </div>
      
      {/* Today's Hours */}
      <div className="p-3 bg-primary/10 rounded-lg">
        <div className="font-medium text-sm mb-1">Today ({DAYS_OF_WEEK[todayIndex]})</div>
        {todayHours?.is_closed ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Closed</span>
          </div>
        ) : (
          <div className="text-sm text-primary">
            {formatTime(todayHours?.open_time || '09:00')} - {formatTime(todayHours?.close_time || '17:00')}
          </div>
        )}
      </div>

      {/* All Week Hours */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Weekly Schedule</div>
        {DAYS_OF_WEEK.map((day, index) => {
          const dayHours = businessHours.find(h => h.day_of_week === index);
          const isToday = index === todayIndex;
          
          return (
            <div 
              key={day} 
              className={`flex justify-between items-center py-1 px-2 rounded text-sm ${
                isToday ? 'bg-primary/10' : ''
              }`}
            >
              <span className={isToday ? 'font-medium' : ''}>{day}</span>
              {dayHours?.is_closed ? (
                <span className="text-destructive">Closed</span>
              ) : (
                <span className="text-muted-foreground">
                  {formatTime(dayHours?.open_time || '09:00')} - {formatTime(dayHours?.close_time || '17:00')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Business Hours Note */}
      <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
        Events scheduled outside business hours will be highlighted in the calendar
      </div>
    </div>
  );
}
