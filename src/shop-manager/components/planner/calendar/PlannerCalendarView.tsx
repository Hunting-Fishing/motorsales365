import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { useWorkOrdersForPlanner } from '@/hooks/usePlannerData';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export function PlannerCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: workOrders } = useWorkOrdersForPlanner();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Group work orders by date
  const eventsByDate = useMemo(() => {
    const map: { [key: string]: typeof workOrders } = {};
    
    workOrders?.forEach((wo) => {
      if (!wo.start_time) return;
      const dateKey = format(parseISO(wo.start_time), 'yyyy-MM-dd');
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey]!.push(wo);
    });

    return map;
  }, [workOrders]);

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) =>
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const priorityColors = {
    urgent: 'bg-red-500 text-white',
    high: 'bg-amber-500 text-white',
    medium: 'bg-blue-500 text-white',
    low: 'bg-slate-400 text-white',
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-4">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 flex-1 h-[calc(100%-40px)]">
          {calendarDays.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[dateKey] || [];
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={idx}
                className={cn(
                  'border-b border-r border-border p-1 min-h-[100px] overflow-hidden',
                  !isCurrentMonth && 'bg-muted/20'
                )}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full',
                      isToday && 'bg-primary text-primary-foreground',
                      !isCurrentMonth && 'text-muted-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4">
                      {dayEvents.length}
                    </Badge>
                  )}
                </div>

                {/* Events */}
                <ScrollArea className="h-[calc(100%-28px)]">
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80',
                          priorityColors[event.priority as keyof typeof priorityColors] ||
                            'bg-primary text-primary-foreground'
                        )}
                        title={event.title}
                      >
                        {event.start_time && (
                          <span className="font-medium mr-1">
                            {format(parseISO(event.start_time), 'h:mm')}
                          </span>
                        )}
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
