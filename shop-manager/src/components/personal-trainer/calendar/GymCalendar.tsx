import { useState, useCallback, useEffect } from 'react';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { GymCalendarMonthView } from './GymCalendarMonthView';
import { GymCalendarWeekView } from './GymCalendarWeekView';
import { GymCalendarDayView } from './GymCalendarDayView';
import { CreateGymEventDialog } from './CreateGymEventDialog';
import { GymEventDetailDialog } from './GymEventDetailDialog';
import { GymEvent } from './GymEventCard';
import { cn } from '@/lib/utils';

type ViewType = 'month' | 'week' | 'day';

export function GymCalendar() {
  const { shopId } = useShopId();
  const [view, setView] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<GymEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<GymEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('pt_gym_events')
        .select('*')
        .eq('shop_id', shopId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to fetch gym events:', err);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Realtime
  useEffect(() => {
    if (!shopId) return;
    const channel = supabase
      .channel('pt-gym-events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pt_gym_events' }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shopId, fetchEvents]);

  const navigate = (dir: 'prev' | 'next') => {
    const fn = dir === 'next'
      ? view === 'month' ? addMonths : view === 'week' ? addWeeks : addDays
      : view === 'month' ? subMonths : view === 'week' ? subWeeks : subDays;
    setCurrentDate(prev => fn(prev, 1));
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };

  const handleCreateFromDate = (date?: Date) => {
    setCreateDefaultDate(date);
    setCreateOpen(true);
  };

  const headerText = view === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : view === 'week'
      ? `Week of ${format(currentDate, 'MMM d, yyyy')}`
      : format(currentDate, 'EEEE, MMMM d, yyyy');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <h2 className="text-lg font-bold text-foreground ml-2">{headerText}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['month', 'week', 'day'] as ViewType[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                  view === v
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-accent'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => handleCreateFromDate(currentDate)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Event
          </Button>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden min-h-[600px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-3 border-t-primary border-b-primary border-l-transparent border-r-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Loading events...</span>
            </div>
          </div>
        ) : view === 'month' ? (
          <GymCalendarMonthView currentDate={currentDate} events={events} onEventClick={setSelectedEvent} onDateClick={handleDateClick} />
        ) : view === 'week' ? (
          <GymCalendarWeekView currentDate={currentDate} events={events} onEventClick={setSelectedEvent} />
        ) : (
          <GymCalendarDayView currentDate={currentDate} events={events} onEventClick={setSelectedEvent} />
        )}
      </div>

      {/* Dialogs */}
      <CreateGymEventDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchEvents}
        defaultDate={createDefaultDate}
      />
      <GymEventDetailDialog
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDeleted={fetchEvents}
      />
    </div>
  );
}
