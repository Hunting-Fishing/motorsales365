import React from 'react';
import { format, addDays } from 'date-fns';
import type { WorkScheduleAssignment } from '@/types/scheduling';
import { DraggableScheduleItem } from './DraggableScheduleItem';
import { DroppableTimeSlot } from './DroppableTimeSlot';

interface ScheduleWeekViewProps {
  schedules: WorkScheduleAssignment[];
  weekStart: Date;
  enableDragDrop?: boolean;
}

export function ScheduleWeekView({ schedules, weekStart, enableDragDrop = false }: ScheduleWeekViewProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const timeSlots = Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

  const getSchedulesForDayAndTime = (dayOfWeek: number, timeSlot: string) => {
    const hour = parseInt(timeSlot.split(':')[0]);
    return schedules.filter(s => {
      if (s.day_of_week !== dayOfWeek) return false;
      const startHour = parseInt(s.shift_start.split(':')[0]);
      const endHour = parseInt(s.shift_end.split(':')[0]);
      return hour >= startHour && hour < endHour;
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-8 gap-2 min-w-[800px]">
        <div className="font-medium text-sm text-muted-foreground sticky left-0 bg-background">Time</div>
        {weekDays.map((day, i) => (
          <div key={i} className="text-center">
            <div className="font-medium">{format(day, 'EEE')}</div>
            <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
          </div>
        ))}

        {timeSlots.map((timeSlot, hour) => {
          return (
            <React.Fragment key={hour}>
              <div className="text-sm text-muted-foreground py-2 sticky left-0 bg-background">
                {timeSlot}
              </div>
              {weekDays.map((_, dayIndex) => {
                const schedulesInSlot = getSchedulesForDayAndTime(dayIndex, timeSlot);

                const content = (
                  <div className="space-y-1">
                    {schedulesInSlot.map(schedule => {
                      const scheduleItem = (
                        <div className="text-xs bg-primary/10 p-2 rounded">
                          <div className="font-medium">
                            {schedule.profiles?.first_name} {schedule.profiles?.last_name}
                          </div>
                          <div className="text-muted-foreground">
                            {schedule.shift_start} - {schedule.shift_end}
                          </div>
                          {schedule.schedule_name && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {schedule.schedule_name}
                            </div>
                          )}
                        </div>
                      );

                      return enableDragDrop ? (
                        <DraggableScheduleItem key={schedule.id} schedule={schedule}>
                          {scheduleItem}
                        </DraggableScheduleItem>
                      ) : (
                        <div key={schedule.id}>{scheduleItem}</div>
                      );
                    })}
                  </div>
                );

                return enableDragDrop ? (
                  <DroppableTimeSlot key={dayIndex} dayOfWeek={dayIndex} timeSlot={timeSlot}>
                    {content}
                  </DroppableTimeSlot>
                ) : (
                  <div key={dayIndex} className="border rounded-md p-2 min-h-[80px] bg-muted/30">
                    {content}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
