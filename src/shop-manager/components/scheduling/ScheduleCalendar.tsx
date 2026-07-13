import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ChevronLeft, ChevronRight, RefreshCw, Calendar, Layout, Users } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, endOfWeek } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { useScheduling } from '@/hooks/useScheduling';
import { useSchedulingConflicts } from '@/hooks/useSchedulingConflicts';
import { AddScheduleDialog } from './AddScheduleDialog';
import { ScheduleWeekView } from './ScheduleWeekView';
import { SchedulingStatsCard } from './SchedulingStatsCard';
import { ConflictsList } from './ConflictsList';
import { EmployeeScheduleSearch } from './EmployeeScheduleSearch';
import { ScheduleBulkActions } from './ScheduleBulkActions';
import { ScheduleExportButton } from './ScheduleExportButton';
import { ShiftTemplateManager } from './ShiftTemplateManager';
import { ScheduleCoverageView } from './ScheduleCoverageView';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { WorkScheduleAssignment } from '@/types/scheduling';

export function ScheduleCalendar() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [draggedSchedule, setDraggedSchedule] = useState<WorkScheduleAssignment | null>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('calendar');
  
  const { schedules, loading, refetch, createSchedule, deleteSchedule } = useScheduling();
  const { toast } = useToast();
  
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const { conflicts, loading: conflictsLoading, resolveConflict, detectConflicts } = 
    useSchedulingConflicts(currentWeek, weekEnd);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  // Filter schedules by selected employee
  const filteredSchedules = selectedEmployeeId
    ? schedules.filter(s => s.employee_id === selectedEmployeeId)
    : schedules;

  const handleDragStart = (event: any) => {
    const schedule = schedules.find(s => s.id === event.active.id);
    setDraggedSchedule(schedule || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedSchedule(null);

    if (!over) return;

    const scheduleId = active.id as string;
    const dropData = over.data.current as { dayOfWeek: number; timeSlot: string };
    
    if (!dropData) return;

    try {
      const [startHour] = dropData.timeSlot.split(':').map(Number);
      const endHour = startHour + 2; // Default 2-hour shift
      
      const { error } = await supabase
        .from('work_schedule_assignments')
        .update({
          day_of_week: dropData.dayOfWeek,
          shift_start: `${startHour.toString().padStart(2, '0')}:00`,
          shift_end: `${endHour.toString().padStart(2, '0')}:00`,
        })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Schedule updated successfully'
      });

      await refetch();
      await detectConflicts();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update schedule',
        variant: 'destructive'
      });
    }
  };

  const handleResolveConflict = async (conflictId: string) => {
    await resolveConflict(conflictId, 'Manually resolved by user');
  };

  const handleRefresh = async () => {
    await Promise.all([refetch(), detectConflicts()]);
    toast({
      title: 'Refreshed',
      description: 'Schedule data updated'
    });
  };

  const handleBulkDelete = async () => {
    if (selectedSchedules.length === 0) return;
    
    try {
      await Promise.all(selectedSchedules.map(id => deleteSchedule(id)));
      setSelectedSchedules([]);
      toast({
        title: 'Success',
        description: `Deleted ${selectedSchedules.length} schedules`
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
    }
  };

  const handleBulkCopy = async (targetDay: number) => {
    if (selectedSchedules.length === 0) return;

    try {
      const schedulesToCopy = schedules.filter(s => selectedSchedules.includes(s.id));
      
      await Promise.all(schedulesToCopy.map(schedule => 
        createSchedule({
          employee_id: schedule.employee_id,
          schedule_name: schedule.schedule_name,
          day_of_week: targetDay,
          shift_start: schedule.shift_start,
          shift_end: schedule.shift_end,
          is_recurring: schedule.is_recurring,
          effective_from: schedule.effective_from,
          effective_until: schedule.effective_until,
          notes: schedule.notes
        })
      ));

      setSelectedSchedules([]);
      toast({
        title: 'Success',
        description: `Copied ${schedulesToCopy.length} schedules`
      });
    } catch (error) {
      console.error('Bulk copy error:', error);
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Stats Dashboard */}
        <SchedulingStatsCard date={currentWeek} />

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1">
                <EmployeeScheduleSearch 
                  onEmployeeSelect={setSelectedEmployeeId}
                  selectedEmployeeId={selectedEmployeeId}
                />
              </div>
              <ScheduleExportButton schedules={filteredSchedules} />
            </div>
          </CardContent>
        </Card>

        {/* Conflicts List */}
        {!conflictsLoading && conflicts.length > 0 && (
          <ConflictsList 
            conflicts={conflicts} 
            onResolve={handleResolveConflict}
          />
        )}

        {/* Main Content Tabs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Work Schedule Management</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Schedule
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="coverage" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Coverage
                </TabsTrigger>
              </TabsList>

              <TabsContent value="calendar" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm font-medium">
                    Week of {format(currentWeek, 'MMM d, yyyy')}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <ScheduleBulkActions
                  selectedSchedules={selectedSchedules}
                  onClearSelection={() => setSelectedSchedules([])}
                  onBulkDelete={handleBulkDelete}
                  onBulkCopy={handleBulkCopy}
                  onBulkUpdateTime={(start, end) => {}}
                />

                {loading ? (
                  <div className="text-center py-8">Loading schedules...</div>
                ) : (
                  <ScheduleWeekView 
                    schedules={filteredSchedules} 
                    weekStart={currentWeek}
                    enableDragDrop={true}
                  />
                )}
              </TabsContent>

              <TabsContent value="templates">
                <ShiftTemplateManager />
              </TabsContent>

              <TabsContent value="coverage">
                <ScheduleCoverageView />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <AddScheduleDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      </div>

      <DragOverlay>
        {draggedSchedule && (
          <Card className="p-2 shadow-lg opacity-90">
            <div className="text-sm font-medium">
              {draggedSchedule.profiles?.first_name} {draggedSchedule.profiles?.last_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {draggedSchedule.shift_start} - {draggedSchedule.shift_end}
            </div>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
