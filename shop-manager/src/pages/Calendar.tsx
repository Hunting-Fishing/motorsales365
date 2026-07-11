
import React, { useState } from 'react';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarView } from '@/components/calendar/CalendarView';
import { CalendarFilters } from '@/components/calendar/CalendarFilters';
import { CalendarDayDetailDialog } from '@/components/calendar/CalendarDayDetailDialog';
import { AddTaskDialog } from '@/components/calendar/AddTaskDialog';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { CalendarViewType, CalendarEvent } from '@/types/calendar';
import { Card } from '@/components/ui/card';
import { isSameDay } from 'date-fns';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>("month");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [taskDialogDate, setTaskDialogDate] = useState<Date | undefined>(undefined);

  const { events, shiftChats, overdueEvents, isLoading, error } = useCalendarEvents(currentDate, view);
  const { businessHours, isBusinessDay } = useBusinessHours();

  // Filter events based on selected filters
  const filteredEvents = events.filter(event => {
    // Search filter - check multiple fields
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        event.title,
        event.description,
        event.customer,
        event.location,
        event.technician
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }
    
    // Technician filter (using technician_id now instead of name)
    if (technicianFilter !== "all" && event.technician_id !== technicianFilter) {
      return false;
    }
    
    // Equipment filter - check if event has equipment in title or description
    if (equipmentFilter !== "all") {
      const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
      if (!eventText.includes(equipmentFilter.toLowerCase())) {
        return false;
      }
    }
    
    // Status filter
    if (statusFilter.length > 0 && event.status && !statusFilter.includes(event.status)) {
      return false;
    }
    
    return true;
  });

  // Get events for selected date
  const selectedDateEvents = selectedDate 
    ? filteredEvents.filter(event => 
        isSameDay(new Date(event.start), selectedDate)
      )
    : [];

  // Use overdue events from hook (fetched separately regardless of date range)
  const carryOverEvents = selectedDate ? overdueEvents : [];

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCloseDetailDialog = () => {
    setSelectedDate(null);
  };

  const handleEventClickFromDetail = (event: CalendarEvent) => {
    // This will open the regular event dialog through CalendarView
    setSelectedDate(null);
  };

  const handleAddTask = (date?: Date) => {
    setTaskDialogDate(date || currentDate);
    setShowAddTaskDialog(true);
    setSelectedDate(null); // Close day detail dialog if open
  };

  const handleTaskCreated = () => {
    // Events will auto-refresh via useCalendarEvents hook
  };

  if (error) {
    return (
      <div className="w-full p-6">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Calendar</h2>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      <CalendarHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        view={view}
        setView={setView}
        onAddTask={() => handleAddTask()}
      />
      
      <div className="space-y-4">
        <CalendarFilters
          technicianFilter={technicianFilter}
          setTechnicianFilter={setTechnicianFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          equipmentFilter={equipmentFilter}
          setEquipmentFilter={setEquipmentFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          businessHours={businessHours}
          currentDate={currentDate}
        />
        
        <CalendarView
          events={filteredEvents}
          currentDate={currentDate}
          view={view}
          loading={isLoading}
          shiftChats={shiftChats}
          businessHours={businessHours}
          isBusinessDay={isBusinessDay}
          onDateClick={handleDateClick}
        />
      </div>

      <CalendarDayDetailDialog
        date={selectedDate}
        events={selectedDateEvents}
        carryOverEvents={carryOverEvents}
        isOpen={!!selectedDate}
        onClose={handleCloseDetailDialog}
        onEventClick={handleEventClickFromDetail}
        onAddTask={handleAddTask}
      />

      <AddTaskDialog
        isOpen={showAddTaskDialog}
        onClose={() => setShowAddTaskDialog(false)}
        selectedDate={taskDialogDate}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}
