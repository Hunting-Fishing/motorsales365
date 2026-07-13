import React, { useState } from 'react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, CalendarRange, RefreshCw, Plus } from 'lucide-react';
import { useStaffScheduleCalendar } from '@/hooks/useStaffScheduleCalendar';
import { StaffCalendarFilters } from './StaffCalendarFilters';
import { StaffCalendarMonthView } from './StaffCalendarMonthView';
import { StaffCalendarWeekView } from './StaffCalendarWeekView';
import { StaffCalendarDayView } from './StaffCalendarDayView';
import { StaffScheduleEvent, StaffCalendarViewType } from '@/types/staffScheduleCalendar';
import { AddAssetAssignmentDialog } from './AddAssetAssignmentDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Ship, Wrench, Truck, Clock, User } from 'lucide-react';

export function StaffSchedulingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<StaffCalendarViewType>('month');
  const [selectedEvent, setSelectedEvent] = useState<StaffScheduleEvent | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const {
    loading,
    events,
    employees,
    vessels,
    equipment,
    vehicles,
    filters,
    setFilters,
    refetch,
  } = useStaffScheduleCalendar(currentDate);

  const navigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const modifier = direction === 'next' ? 1 : -1;
    
    switch (view) {
      case 'month':
        setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
        break;
      case 'day':
        setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
        break;
    }
  };

  const getDateTitle = () => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week':
        return `Week of ${format(currentDate, 'MMM d, yyyy')}`;
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddDialog(true);
  };

  const handleEventClick = (event: StaffScheduleEvent) => {
    setSelectedEvent(event);
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'vessel':
        return <Ship className="h-4 w-4" />;
      case 'equipment':
        return <Wrench className="h-4 w-4" />;
      case 'vehicle':
        return <Truck className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Staff Schedule Calendar
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('today')}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <span className="text-lg font-semibold min-w-[200px] text-center">
              {getDateTitle()}
            </span>
            
            <Tabs value={view} onValueChange={(v) => setView(v as StaffCalendarViewType)}>
              <TabsList>
                <TabsTrigger value="month" className="gap-1">
                  <CalendarRange className="h-4 w-4" />
                  <span className="hidden sm:inline">Month</span>
                </TabsTrigger>
                <TabsTrigger value="week" className="gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Week</span>
                </TabsTrigger>
                <TabsTrigger value="day" className="gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Day</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Assignment</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <StaffCalendarFilters
          filters={filters}
          onFiltersChange={setFilters}
          employees={employees}
          vessels={vessels}
          equipment={equipment}
          vehicles={vehicles}
        />

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground font-medium">Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[hsl(221,83%,53%)]" />
            <Ship className="h-3 w-3 text-[hsl(221,83%,53%)]" />
            <span>Vessels</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[hsl(142,71%,45%)]" />
            <Wrench className="h-3 w-3 text-[hsl(142,71%,45%)]" />
            <span>Equipment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[hsl(47,96%,53%)]" />
            <Truck className="h-3 w-3 text-[hsl(47,96%,53%)]" />
            <span>Vehicles</span>
          </div>
          <div className="border-l pl-4 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-1 h-4 rounded bg-green-500" />
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1 h-4 rounded bg-blue-500" />
              <span>Scheduled</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1 h-4 rounded bg-gray-400" />
              <span>Completed</span>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {view === 'month' && (
              <StaffCalendarMonthView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
              />
            )}
            {view === 'week' && (
              <StaffCalendarWeekView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
              />
            )}
            {view === 'day' && (
              <StaffCalendarDayView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
              />
            )}
          </>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{events.length}</div>
            <div className="text-sm text-muted-foreground">Total Assignments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {events.filter(e => e.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {events.filter(e => e.status === 'scheduled').length}
            </div>
            <div className="text-sm text-muted-foreground">Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">
              {new Set(events.map(e => e.employee.id)).size}
            </div>
            <div className="text-sm text-muted-foreground">Employees Assigned</div>
          </div>
        </div>
      </CardContent>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent?.asset && getAssetIcon(selectedEvent.asset.type)}
              {selectedEvent?.asset?.name || selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Employee</label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{selectedEvent.employee.name}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={
                      selectedEvent.status === 'active' ? 'default' :
                      selectedEvent.status === 'scheduled' ? 'secondary' :
                      selectedEvent.status === 'completed' ? 'outline' : 'destructive'
                    }>
                      {selectedEvent.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Time</label>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(selectedEvent.start, 'MMM d, yyyy h:mm a')} - {format(selectedEvent.end, 'h:mm a')}
                  </span>
                </div>
              </div>
              
              {selectedEvent.asset && (
                <div>
                  <label className="text-sm text-muted-foreground">Asset Type</label>
                  <div className="flex items-center gap-2 mt-1 capitalize">
                    {getAssetIcon(selectedEvent.asset.type)}
                    <span>{selectedEvent.asset.type}</span>
                  </div>
                </div>
              )}
              
              {selectedEvent.notes && (
                <div>
                  <label className="text-sm text-muted-foreground">Notes</label>
                  <p className="mt-1">{selectedEvent.notes}</p>
                </div>
              )}
              
              {selectedEvent.isRecurring && (
                <Badge variant="outline" className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Recurring Assignment
                </Badge>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Assignment Dialog */}
      <AddAssetAssignmentDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) refetch();
        }}
      />
    </Card>
  );
}
