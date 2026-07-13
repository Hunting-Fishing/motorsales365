import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { getCalendarEvents, getWorkOrderEvents } from '@/services/calendar/calendarEventService';
import { getMaintenanceRequestEvents } from '@/services/calendar/maintenanceRequestService';
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceEvent {
  id: string;
  title: string;
  date: Date;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  assetName: string;
  status?: string;
}

export function MaintenanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const monthStart = startOfWeek(startOfMonth(currentDate));
      const monthEnd = endOfWeek(endOfMonth(currentDate));
      const startDateStr = format(monthStart, 'yyyy-MM-dd');
      const endDateStr = format(monthEnd, 'yyyy-MM-dd');

      // Fetch all event types in parallel
      const [calendarEvents, workOrderEvents, maintenanceRequestEvents] = await Promise.all([
        getCalendarEvents(startDateStr, endDateStr),
        getWorkOrderEvents(startDateStr, endDateStr),
        getMaintenanceRequestEvents(startDateStr, endDateStr)
      ]);

      // Transform to MaintenanceEvent format
      const transformedEvents: MaintenanceEvent[] = [];

      // Add calendar events
      calendarEvents.forEach(event => {
        transformedEvents.push({
          id: event.id,
          title: event.title,
          date: new Date(event.start_time || event.start),
          type: event.event_type || 'event',
          priority: mapPriority(event.priority),
          estimatedDuration: calculateDuration(event.start_time || event.start, event.end_time || event.end),
          assetName: event.location || event.customer || 'N/A',
          status: event.status
        });
      });

      // Add work orders
      workOrderEvents.forEach(event => {
        transformedEvents.push({
          id: event.id,
          title: event.title || event.description || 'Work Order',
          date: new Date(event.start_time || event.start),
          type: 'work-order',
          priority: mapPriority(event.priority),
          estimatedDuration: calculateDuration(event.start_time || event.start, event.end_time || event.end),
          assetName: event.customer || event.location || 'N/A',
          status: event.status
        });
      });

      // Add maintenance requests
      maintenanceRequestEvents.forEach(event => {
        transformedEvents.push({
          id: event.id,
          title: event.title,
          date: new Date(event.start_time || event.start),
          type: 'maintenance-request',
          priority: mapPriority(event.priority),
          estimatedDuration: calculateDuration(event.start_time || event.start, event.end_time || event.end),
          assetName: event.location || event.customer || 'N/A',
          status: event.status
        });
      });

      setEvents(transformedEvents);
    } catch (err) {
      console.error('Error fetching maintenance events:', err);
      setError('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  // Map priority string to expected type
  function mapPriority(priority?: string): 'low' | 'medium' | 'high' | 'critical' {
    const p = priority?.toLowerCase();
    if (p === 'critical' || p === 'urgent') return 'critical';
    if (p === 'high') return 'high';
    if (p === 'low') return 'low';
    return 'medium';
  }

  // Calculate duration in minutes
  function calculateDuration(start?: string, end?: string): number {
    if (!start || !end) return 60;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.max(Math.round(diffMs / 60000), 15);
  }

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('maintenance-calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => fetchEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => fetchEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_requests' }, () => fetchEvents())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const daysInMonth = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-muted';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'work-order': return 'bg-primary';
      case 'maintenance-request': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Maintenance Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium min-w-[120px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">{error}</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {daysInMonth.map(day => {
                const dayEvents = getEventsForDate(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      min-h-[80px] p-2 rounded-lg border text-left transition-colors
                      ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}
                      ${isToday ? 'border-primary bg-primary/5' : 'border-border'}
                      ${isSelected ? 'ring-2 ring-primary' : ''}
                      hover:bg-muted/50
                    `}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${getTypeColor(event.type)} text-white`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Scheduled Maintenance for {format(selectedDate, 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getEventsForDate(selectedDate).length === 0 ? (
              <p className="text-muted-foreground">No maintenance scheduled for this date</p>
            ) : (
              <div className="space-y-3">
                {getEventsForDate(selectedDate).map(event => (
                  <div key={event.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium">{event.title}</h4>
                        <Badge variant={
                          event.priority === 'critical' ? 'destructive' :
                          event.priority === 'high' ? 'default' :
                          'secondary'
                        }>
                          {event.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {event.type.replace('-', ' ')}
                        </Badge>
                        {event.status && (
                          <Badge variant="outline" className="capitalize">
                            {event.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{event.assetName}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {event.estimatedDuration} minutes
                      </div>
                    </div>
                    <Button size="sm">View Details</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
