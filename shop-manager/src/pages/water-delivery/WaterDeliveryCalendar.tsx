import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { WaterDeliveryLayout } from '@/components/water-delivery/WaterDeliveryLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
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
  isToday,
} from 'date-fns';
import {
  useWaterDeliveryCalendarEvents,
  EventType,
  EventStatus,
  EventPriority,
} from '@/hooks/water-delivery/useWaterDeliveryCalendarEvents';
import { WaterDeliveryCalendarEventComponent } from '@/components/water-delivery/calendar/WaterDeliveryCalendarEvent';
import { WaterDeliveryCalendarLegend } from '@/components/water-delivery/calendar/WaterDeliveryCalendarLegend';
import { WaterDeliveryCalendarFilters } from '@/components/water-delivery/calendar/WaterDeliveryCalendarFilters';
import { WaterDeliveryCalendarStats } from '@/components/water-delivery/calendar/WaterDeliveryCalendarStats';
import { WaterDeliveryEventDialog } from '@/components/water-delivery/calendar/WaterDeliveryEventDialog';
import { WaterDeliveryCalendarEvent } from '@/hooks/water-delivery/useWaterDeliveryCalendarEvents';

type ViewMode = 'day' | 'week' | 'month';

export default function WaterDeliveryCalendar() {
  const { shopId } = useShopId();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<WaterDeliveryCalendarEvent | null>(null);

  // Filters
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [selectedTrucks, setSelectedTrucks] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<EventStatus[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<EventPriority[]>([]);

  // Fetch drivers and trucks for filters
  const { data: drivers = [] } = useQuery({
    queryKey: ['water-delivery-drivers-list', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await supabase
        .from('water_delivery_drivers')
        .select('id, first_name, last_name')
        .eq('shop_id', shopId)
        .eq('is_active', true);
      return (data || []).map(d => ({ id: d.id, label: `${d.first_name} ${d.last_name}` }));
    },
    enabled: !!shopId,
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['water-delivery-trucks-list', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await supabase
        .from('water_delivery_trucks')
        .select('id, truck_number')
        .eq('shop_id', shopId)
        .eq('is_active', true);
      return (data || []).map(t => ({ id: t.id, label: t.truck_number }));
    },
    enabled: !!shopId,
  });

  const { events, eventsByDate, stats, isLoading } = useWaterDeliveryCalendarEvents({
    viewDate: currentDate,
    viewMode,
    driverFilter: selectedDrivers,
    truckFilter: selectedTrucks,
    typeFilter: selectedTypes,
    statusFilter: selectedStatuses,
    priorityFilter: selectedPriorities,
  });

  // Navigation
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

  const getDateRangeLabel = () => {
    switch (viewMode) {
      case 'day': return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month': return format(currentDate, 'MMMM yyyy');
    }
  };

  const clearAllFilters = () => {
    setSelectedDrivers([]);
    setSelectedTrucks([]);
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedPriorities([]);
  };

  // Render month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
          ))}
        </div>
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
                    <div className={cn('text-xs font-medium mb-1', isToday(day) ? 'text-cyan-600' : 'text-muted-foreground')}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(event => (
                        <WaterDeliveryCalendarEventComponent
                          key={event.id}
                          event={event}
                          variant="compact"
                          onClick={() => setSelectedEvent(event)}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-center text-muted-foreground">+{dayEvents.length - 3} more</div>
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

  // Render week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 0 }) });

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => (
          <div key={day.toISOString()} className={cn('text-center p-2 rounded-t-lg font-medium text-sm', isToday(day) ? 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300' : 'bg-muted')}>
            <div>{format(day, 'EEE')}</div>
            <div className={cn('text-lg', isToday(day) ? 'text-cyan-600 font-bold' : '')}>{format(day, 'd')}</div>
          </div>
        ))}
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[dateKey] || [];
          return (
            <div key={`content-${day.toISOString()}`} className={cn('min-h-[200px] p-1 border rounded-b-lg', isToday(day) ? 'border-cyan-300 dark:border-cyan-700' : 'border-border')}>
              <div className="space-y-1">
                {dayEvents.slice(0, 5).map(event => (
                  <WaterDeliveryCalendarEventComponent key={event.id} event={event} variant="compact" onClick={() => setSelectedEvent(event)} />
                ))}
                {dayEvents.length > 5 && <div className="text-xs text-center text-muted-foreground py-1">+{dayEvents.length - 5} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dateKey = format(currentDate, 'yyyy-MM-dd');
    const dayEvents = eventsByDate[dateKey] || [];

    return (
      <div className="space-y-3">
        {dayEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No events scheduled for this day</p>
          </div>
        ) : (
          dayEvents.map(event => (
            <WaterDeliveryCalendarEventComponent key={event.id} event={event} variant="full" onClick={() => setSelectedEvent(event)} />
          ))
        )}
      </div>
    );
  };

  return (
    <WaterDeliveryLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Delivery Calendar</h1>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <WaterDeliveryCalendarStats {...stats} />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPrevious}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
            <Button variant="outline" size="sm" onClick={goToNext}><ChevronRight className="h-4 w-4" /></Button>
            <h2 className="text-lg font-semibold ml-2">{getDateRangeLabel()}</h2>
          </div>
          <WaterDeliveryCalendarFilters
            drivers={drivers}
            trucks={trucks}
            selectedDrivers={selectedDrivers}
            selectedTrucks={selectedTrucks}
            selectedTypes={selectedTypes}
            selectedStatuses={selectedStatuses}
            selectedPriorities={selectedPriorities}
            onDriversChange={setSelectedDrivers}
            onTrucksChange={setSelectedTrucks}
            onTypesChange={setSelectedTypes}
            onStatusesChange={setSelectedStatuses}
            onPrioritiesChange={setSelectedPriorities}
            onClearAll={clearAllFilters}
          />
        </div>

        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="p-4">
              {isLoading ? (
                <div className="space-y-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
              ) : (
                <>
                  {viewMode === 'day' && renderDayView()}
                  {viewMode === 'week' && renderWeekView()}
                  {viewMode === 'month' && renderMonthView()}
                </>
              )}
            </CardContent>
          </Card>
          <div className="hidden lg:block w-48 flex-shrink-0">
            <WaterDeliveryCalendarLegend />
          </div>
        </div>

        <div className="lg:hidden">
          <WaterDeliveryCalendarLegend collapsed />
        </div>

        <WaterDeliveryEventDialog event={selectedEvent} isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} />
      </div>
    </WaterDeliveryLayout>
  );
}
