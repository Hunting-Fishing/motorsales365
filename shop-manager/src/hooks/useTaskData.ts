import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  getTaskActivities,
  getTaskAssignees,
  getTaskTimeEntries,
  getTaskParts,
  addTaskNote,
  logTaskActivity,
  assignToTask,
  unassignFromTask,
  clockInToTask,
  clockOutFromTask,
  addManualTimeEntry,
  deleteTaskTimeEntry,
  addTaskPart,
  updateTaskPart,
  deleteTaskPart,
  updateTaskStatus,
  completeTask,
  TaskActivity,
  TaskAssignment,
  TaskTimeEntry,
  TaskPart,
} from '@/services/calendar/taskService';
import { CalendarEvent } from '@/types/calendar/events';
import { toast } from 'sonner';

export function useTaskData(taskId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch user profile for name
  const profileQuery = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const profile = profileQuery.data;
  const userName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.email || user?.email || 'Unknown';

  // Task Query
  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', taskId)
        .single();
      if (error) throw error;
      // Map database fields to CalendarEvent interface
      return {
        ...data,
        start: data.start_time,
        end: data.end_time,
      } as CalendarEvent;
    },
    enabled: !!taskId,
  });

  // Activities Query
  const activitiesQuery = useQuery({
    queryKey: ['task-activities', taskId],
    queryFn: () => getTaskActivities(taskId!),
    enabled: !!taskId,
  });

  // Assignees Query
  const assigneesQuery = useQuery({
    queryKey: ['task-assignees', taskId],
    queryFn: () => getTaskAssignees(taskId!),
    enabled: !!taskId,
  });

  // Time Entries Query
  const timeEntriesQuery = useQuery({
    queryKey: ['task-time-entries', taskId],
    queryFn: () => getTaskTimeEntries(taskId!),
    enabled: !!taskId,
  });

  // Parts Query
  const partsQuery = useQuery({
    queryKey: ['task-parts', taskId],
    queryFn: () => getTaskParts(taskId!),
    enabled: !!taskId,
  });

  // Team Members Query
  const teamMembersQuery = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    queryClient.invalidateQueries({ queryKey: ['task-activities', taskId] });
    queryClient.invalidateQueries({ queryKey: ['task-assignees', taskId] });
    queryClient.invalidateQueries({ queryKey: ['task-time-entries', taskId] });
    queryClient.invalidateQueries({ queryKey: ['task-parts', taskId] });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
  };

  // Mutations
  const addNoteMutation = useMutation({
    mutationFn: (notes: string) => addTaskNote(taskId!, notes, user?.id!, userName),
    onSuccess: () => {
      invalidateAll();
      toast.success('Note added');
    },
    onError: () => toast.error('Failed to add note'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ assigneeId, assigneeName }: { assigneeId: string; assigneeName: string }) =>
      assignToTask(taskId!, assigneeId, assigneeName, user?.id!, userName),
    onSuccess: () => {
      invalidateAll();
      toast.success('Assignee added');
    },
    onError: () => toast.error('Failed to add assignee'),
  });

  const unassignMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      unassignFromTask(taskId!, assignmentId, user?.id!, userName),
    onSuccess: () => {
      invalidateAll();
      toast.success('Assignee removed');
    },
    onError: () => toast.error('Failed to remove assignee'),
  });

  const clockInMutation = useMutation({
    mutationFn: () => clockInToTask(taskId!, user?.id!, userName),
    onSuccess: () => {
      invalidateAll();
      toast.success('Clocked in');
    },
    onError: () => toast.error('Failed to clock in'),
  });

  const clockOutMutation = useMutation({
    mutationFn: (entryId: string) => clockOutFromTask(taskId!, entryId, user?.id!, userName),
    onSuccess: () => {
      invalidateAll();
      toast.success('Clocked out');
    },
    onError: () => toast.error('Failed to clock out'),
  });

  const addTimeEntryMutation = useMutation({
    mutationFn: (data: { startTime: string; endTime: string; notes?: string }) =>
      addManualTimeEntry(taskId!, user?.id!, userName, data.startTime, data.endTime, data.notes),
    onSuccess: () => {
      invalidateAll();
      toast.success('Time entry added');
    },
    onError: () => toast.error('Failed to add time entry'),
  });

  const deleteTimeEntryMutation = useMutation({
    mutationFn: (entryId: string) => deleteTaskTimeEntry(taskId!, entryId, user?.id!, userName),
    onSuccess: () => {
      invalidateAll();
      toast.success('Time entry deleted');
    },
    onError: () => toast.error('Failed to delete time entry'),
  });

  const addPartMutation = useMutation({
    mutationFn: (data: { partName: string; quantity: number; unitCost: number | null; partNumber?: string; notes?: string }) =>
      addTaskPart(taskId!, data.partName, data.quantity, data.unitCost, user?.id!, userName, data.partNumber, data.notes),
    onSuccess: () => {
      invalidateAll();
      toast.success('Part added');
    },
    onError: () => toast.error('Failed to add part'),
  });

  const deletePartMutation = useMutation({
    mutationFn: (partId: string) => deleteTaskPart(taskId!, partId, user?.id!, userName),
    onSuccess: () => {
      invalidateAll();
      toast.success('Part removed');
    },
    onError: () => toast.error('Failed to remove part'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => updateTaskStatus(taskId!, status, user?.id!, userName),
    onSuccess: () => {
      invalidateAll();
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const completeTaskMutation = useMutation({
    mutationFn: () => completeTask(taskId!, user?.id!, userName),
    onSuccess: () => {
      invalidateAll();
      toast.success('Task completed');
    },
    onError: () => toast.error('Failed to complete task'),
  });

  // Calculate totals
  const totalTimeMinutes = timeEntriesQuery.data?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;
  const totalPartsCost = partsQuery.data?.reduce((sum, part) => sum + (part.total_cost || 0), 0) || 0;

  // Check if user is clocked in
  const activeTimeEntry = timeEntriesQuery.data?.find(
    (entry) => entry.employee_id === user?.id && !entry.end_time
  );

  return {
    task: taskQuery.data,
    activities: activitiesQuery.data || [],
    assignees: assigneesQuery.data || [],
    timeEntries: timeEntriesQuery.data || [],
    parts: partsQuery.data || [],
    teamMembers: teamMembersQuery.data || [],
    isLoading: taskQuery.isLoading,
    totalTimeMinutes,
    totalPartsCost,
    activeTimeEntry,
    currentUserId: user?.id,
    currentUserName: userName,
    addNote: addNoteMutation.mutate,
    assign: assignMutation.mutate,
    unassign: unassignMutation.mutate,
    clockIn: clockInMutation.mutate,
    clockOut: clockOutMutation.mutate,
    addTimeEntry: addTimeEntryMutation.mutate,
    deleteTimeEntry: deleteTimeEntryMutation.mutate,
    addPart: addPartMutation.mutate,
    deletePart: deletePartMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    completeTask: completeTaskMutation.mutate,
    invalidateAll,
  };
}
