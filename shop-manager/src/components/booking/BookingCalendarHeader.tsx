import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Search, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export type CalendarViewType = 'month' | 'week' | 'day';

interface BookingCalendarHeaderProps {
  currentDate: Date;
  view: CalendarViewType;
  searchQuery: string;
  onViewChange: (view: CalendarViewType) => void;
  onDateChange: (date: Date) => void;
  onSearchChange: (query: string) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function BookingCalendarHeader({
  currentDate,
  view,
  searchQuery,
  onViewChange,
  onDateChange,
  onSearchChange,
  onToday,
  onPrevious,
  onNext,
}: BookingCalendarHeaderProps) {
  const getDateRangeText = () => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      }
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-muted p-1">
            <Button
              variant={view === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('month')}
              className="gap-1.5"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Month</span>
            </Button>
            <Button
              variant={view === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('week')}
              className="gap-1.5"
            >
              <CalendarRange className="h-4 w-4" />
              <span className="hidden sm:inline">Week</span>
            </Button>
            <Button
              variant={view === 'day' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('day')}
              className="gap-1.5"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Day</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">{getDateRangeText()}</h3>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search appointments..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
    </div>
  );
}
