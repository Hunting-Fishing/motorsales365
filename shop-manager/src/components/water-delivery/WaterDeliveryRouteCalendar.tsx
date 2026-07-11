import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  format, 
  addDays, 
  addWeeks, 
  addMonths, 
  subDays, 
  subWeeks, 
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns';
import { useWaterRouteCalendarEvents } from '@/hooks/water-delivery/useWaterRouteCalendarEvents';
import { RouteCalendarEvent, RouteCalendarEventData } from './RouteCalendarEvent';
import { RouteCalendarLegend } from './RouteCalendarLegend';

export type CalendarViewMode = 'day' | 'week' | 'month';
export type PriorityFilter = 'all' | 'emergency' | 'high' | 'normal' | 'low';

interface WaterDeliveryRouteCalendarProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onCreateRoute: (date?: Date) => void;
  onEventClick?: (event: RouteCalendarEventData) => void;
}

export function WaterDeliveryRouteCalendar({
  viewMode,
  onViewModeChange,
  onCreateRoute,
  onEventClick,
}: WaterDeliveryRouteCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [showEmergencyOnly, setShowEmergencyOnly] = useState(false);

  const effectiveFilter = showEmergencyOnly ? 'emergency' : priorityFilter;

  const { events, eventsByDate, isLoading } = useWaterRouteCalendarEvents({
    viewDate: currentDate,
    viewMode,
    priorityFilter: effectiveFilter,
  });

  // Navigation handlers
  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    switch (viewMode) {
      case 'day': setCurrentDate(d => subDays(d, 1)); break;
      case 'week': setCurrentDate(d => subWeeks(d, 1)); break;
      case 'month': setCurrentDate(d => subMonths(d, 1)); break;
    }
  };

  const goToNext = () => {
    switch (viewMode) {
      case 'day': setCurrentDate(d => addDays(d, 1)); break;
      case 'week': setCurrentDate(d => addWeeks(d, 1)); break;
      case 'month': setCurrentDate(d => addMonths(d, 1)); break;
    }
  };

  // Get the date range label
  const getDateRangeLabel = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;
        }
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy');
    }
  };

  // Emergency count
  const emergencyCount = events.filter(e => e.priority === 'emergency').length;

  // Render day view
  const renderDayView = () => {
    const dateKey = format(currentDate, 'yyyy-MM-dd');
    const dayEvents = eventsByDate[dateKey] || [];

    return (
      <div className="space-y-3">
        {dayEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No routes scheduled for this day</p>
            <Button 
              variant="link" 
              className="text-cyan-600"
              onClick={() => onCreateRoute(currentDate)}
            >
              Schedule a route
            </Button>
          </div>
        ) : (
          dayEvents.map(event => (
            <RouteCalendarEvent 
              key={event.id} 
              event={event} 
              variant="full"
              onClick={() => onEventClick?.(event)}
            />
          ))
        )}
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate, { weekStartsOn: 0 }),
    });

    return (
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {days.map(day => (
          <div 
            key={day.toISOString()} 
            className={cn(
              'text-center p-2 rounded-t-lg font-medium text-sm',
              isToday(day) ? 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300' : 'bg-muted'
            )}
          >
            <div>{format(day, 'EEE')}</div>
            <div className={cn(
              'text-lg',
              isToday(day) ? 'text-cyan-600 font-bold' : ''
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}

        {/* Day content */}
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[dateKey] || [];

          return (
            <div 
              key={`content-${day.toISOString()}`}
              className={cn(
                'min-h-[200px] p-1 border rounded-b-lg',
                isToday(day) ? 'border-cyan-300 dark:border-cyan-700' : 'border-border'
              )}
            >
              <div className="space-y-1">
                {dayEvents.slice(0, 4).map(event => (
                  <RouteCalendarEvent 
                    key={event.id} 
                    event={event} 
                    variant="compact"
                    onClick={() => onEventClick?.(event)}
                  />
                ))}
                {dayEvents.length > 4 && (
                  <div className="text-xs text-center text-muted-foreground py-1">
                    +{dayEvents.length - 4} more
                  </div>
                )}
                {dayEvents.length === 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full h-8 text-xs text-muted-foreground hover:text-cyan-600"
                    onClick={() => onCreateRoute(day)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weeks: Date[][] = [];
    
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div>
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate[dateKey] || [];
                const isCurrentMonth = isSameMonth(day, currentDate);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'min-h-[100px] p-1 border rounded-lg transition-colors',
                      !isCurrentMonth && 'opacity-40',
                      isToday(day) && 'border-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/30',
                      !isToday(day) && 'border-border hover:border-muted-foreground/50'
                    )}
                  >
                    <div className={cn(
                      'text-xs font-medium mb-1',
                      isToday(day) ? 'text-cyan-600' : 'text-muted-foreground'
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(event => (
                        <RouteCalendarEvent 
                          key={event.id} 
                          event={event} 
                          variant="compact"
                          onClick={() => onEventClick?.(event)}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-center text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">{getDateRangeLabel()}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Emergency filter toggle */}
          <Button
            variant={showEmergencyOnly ? 'default' : 'outline'}
            size="sm"
            className={cn(
              showEmergencyOnly && 'bg-red-500 hover:bg-red-600 text-white'
            )}
            onClick={() => setShowEmergencyOnly(!showEmergencyOnly)}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Emergency
            {emergencyCount > 0 && (
              <Badge className="ml-1 bg-white text-red-500 h-5 px-1.5">
                {emergencyCount}
              </Badge>
            )}
          </Button>

          <Button 
            className="bg-cyan-600 hover:bg-cyan-700"
            size="sm"
            onClick={() => onCreateRoute(currentDate)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Route
          </Button>
        </div>
      </div>

      {/* Main content area with legend */}
      <div className="flex gap-4">
        {/* Calendar */}
        <Card className="flex-1">
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <>
                {viewMode === 'day' && renderDayView()}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'month' && renderMonthView()}
              </>
            )}
          </CardContent>
        </Card>

        {/* Legend sidebar */}
        <div className="hidden lg:block w-48 flex-shrink-0">
          <RouteCalendarLegend />
        </div>
      </div>

      {/* Mobile legend */}
      <div className="lg:hidden">
        <RouteCalendarLegend collapsed />
      </div>
    </div>
  );
}
