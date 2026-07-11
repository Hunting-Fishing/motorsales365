import { useState } from 'react';
import { CalendarViewType } from '@/types/calendar';
import { CalendarHeader } from './CalendarHeader';
import { CalendarView } from './CalendarView';
import { CalendarFilters } from './CalendarFilters';
import { CalendarDayDetailDialog } from './CalendarDayDetailDialog';
import { useModuleCalendarEvents, ModuleType } from '@/hooks/useModuleCalendarEvents';
import { MODULE_ROUTES } from '@/config/moduleRoutes';
import { cn } from '@/lib/utils';

interface UnifiedModuleCalendarProps {
  moduleType?: ModuleType;
  title?: string;
  description?: string;
  onAddEvent?: () => void;
  showFilters?: boolean;
  className?: string;
}

export function UnifiedModuleCalendar({
  moduleType,
  title,
  description,
  onAddEvent,
  showFilters = true,
  className,
}: UnifiedModuleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>('week');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filters, setFilters] = useState({
    technician: '',
    status: '',
    search: '',
  });

  const { events, loading, moduleType: detectedModule } = useModuleCalendarEvents({
    moduleType,
    currentDate,
    view,
  });

  // Get module config for theming
  const moduleConfig = detectedModule ? MODULE_ROUTES[detectedModule] : null;

  // Filter events based on filters
  const filteredEvents = events.filter(event => {
    if (filters.technician && event.technician !== filters.technician) return false;
    if (filters.status && event.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTitle = event.title?.toLowerCase().includes(searchLower);
      const matchesCustomer = event.customer?.toLowerCase().includes(searchLower);
      const matchesDescription = event.description?.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesCustomer && !matchesDescription) return false;
    }
    return true;
  });

  // Get unique technicians and statuses for filters
  const technicians = [...new Set(events.map(e => e.technician).filter(Boolean))];
  const statuses = [...new Set(events.map(e => e.status).filter(Boolean))];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with module gradient accent */}
      <div className="flex flex-col gap-4">
        <CalendarHeader
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          view={view}
          setView={setView}
          onAddTask={onAddEvent}
        />

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <input
                type="text"
                placeholder="Search events..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Technician filter */}
            {technicians.length > 0 && (
              <select
                value={filters.technician}
                onChange={(e) => setFilters(prev => ({ ...prev, technician: e.target.value }))}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Technicians</option>
                {technicians.map(tech => (
                  <option key={tech} value={tech}>{tech}</option>
                ))}
              </select>
            )}

            {/* Status filter */}
            {statuses.length > 0 && (
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status} className="capitalize">
                    {status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            )}

            {/* Clear filters */}
            {(filters.search || filters.technician || filters.status) && (
              <button
                onClick={() => setFilters({ technician: '', status: '', search: '' })}
                className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Calendar View */}
      <div className="bg-card rounded-lg border shadow-sm">
        <CalendarView
          events={filteredEvents}
          currentDate={currentDate}
          view={view}
          loading={loading}
          onDateClick={(date) => setSelectedDate(date)}
        />
      </div>

      {/* Day Detail Dialog */}
      <CalendarDayDetailDialog
        date={selectedDate}
        events={filteredEvents.filter(e => {
          if (!selectedDate) return false;
          const eventDate = new Date(e.start);
          return eventDate.toDateString() === selectedDate.toDateString();
        })}
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        onEventClick={() => {}}
        onAddTask={onAddEvent}
      />
    </div>
  );
}
