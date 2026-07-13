import { supabase } from '@/integrations/supabase/client';

export interface TaskActivity {
  id: string;
  task_id: string;
  action: string;
  user_id: string | null;
  user_name: string | null;
  notes: string | null;
  is_note: boolean;
  created_at: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  assignee_id: string;
  assignee_name: string | null;
  assigned_by: string | null;
  assigned_by_name: string | null;
  assigned_at: string;
  unassigned_at: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface TaskTimeEntry {
  id: string;
  task_id: string;
  employee_id: string | null;
  employee_name: string | null;
  start_time: string | null;
  end_time: string | null;
  duration: number | null;
  notes: string | null;
  created_at: string;
}

export interface TaskPart {
  id: string;
  task_id: string;
  part_name: string;
  part_number: string | null;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  notes: string | null;
  added_by: string | null;
  added_by_name: string | null;
  created_at: string;
}

// Task Activities
export async function getTaskActivities(taskId: string): Promise<TaskActivity[]> {
  const { data, error } = await supabase
    .from('task_activities')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addTaskNote(
  taskId: string,
  notes: string,
  userId: string,
  userName: string
): Promise<TaskActivity> {
  const { data, error } = await supabase
    .from('task_activities')
    .insert({
      task_id: taskId,
      action: 'Note added',
      user_id: userId,
      user_name: userName,
      notes,
      is_note: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function logTaskActivity(
  taskId: string,
  action: string,
  userId: string,
  userName: string,
  notes?: string
): Promise<TaskActivity> {
  const { data, error } = await supabase
    .from('task_activities')
    .insert({
      task_id: taskId,
      action,
      user_id: userId,
      user_name: userName,
      notes,
      is_note: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Task Assignments
export async function getTaskAssignees(taskId: string): Promise<TaskAssignment[]> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('task_id', taskId)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function assignToTask(
  taskId: string,
  assigneeId: string,
  assigneeName: string,
  assignedBy: string,
  assignedByName: string
): Promise<TaskAssignment> {
  const { data, error } = await supabase
    .from('task_assignments')
    .insert({
      task_id: taskId,
      assignee_id: assigneeId,
      assignee_name: assigneeName,
      assigned_by: assignedBy,
      assigned_by_name: assignedByName,
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await logTaskActivity(taskId, `${assigneeName} assigned to task`, assignedBy, assignedByName);

  return data;
}

export async function unassignFromTask(
  taskId: string,
  assignmentId: string,
  userId: string,
  userName: string
): Promise<void> {
  const { data: assignment } = await supabase
    .from('task_assignments')
    .select('assignee_name')
    .eq('id', assignmentId)
    .single();

  const { error } = await supabase
    .from('task_assignments')
    .update({
      is_active: false,
      unassigned_at: new Date().toISOString(),
    })
    .eq('id', assignmentId);

  if (error) throw error;

  // Log activity
  await logTaskActivity(taskId, `${assignment?.assignee_name || 'User'} unassigned from task`, userId, userName);
}

// Task Time Entries
export async function getTaskTimeEntries(taskId: string): Promise<TaskTimeEntry[]> {
  const { data, error } = await supabase
    .from('task_time_entries')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function clockInToTask(
  taskId: string,
  employeeId: string,
  employeeName: string
): Promise<TaskTimeEntry> {
  const { data, error } = await supabase
    .from('task_time_entries')
    .insert({
      task_id: taskId,
      employee_id: employeeId,
      employee_name: employeeName,
      start_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  await logTaskActivity(taskId, `${employeeName} clocked in`, employeeId, employeeName);

  return data;
}

export async function clockOutFromTask(
  taskId: string,
  entryId: string,
  employeeId: string,
  employeeName: string
): Promise<TaskTimeEntry> {
  const endTime = new Date();
  
  const { data: entry } = await supabase
    .from('task_time_entries')
    .select('start_time')
    .eq('id', entryId)
    .single();

  const startTime = entry?.start_time ? new Date(entry.start_time) : endTime;
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  const { data, error } = await supabase
    .from('task_time_entries')
    .update({
      end_time: endTime.toISOString(),
      duration,
    })
    .eq('id', entryId)
    .select()
    .single();

  if (error) throw error;

  await logTaskActivity(taskId, `${employeeName} clocked out (${duration} min)`, employeeId, employeeName);

  return data;
}

export async function addManualTimeEntry(
  taskId: string,
  employeeId: string,
  employeeName: string,
  startTime: string,
  endTime: string,
  notes?: string
): Promise<TaskTimeEntry> {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = Math.round((end.getTime() - start.getTime()) / 60000);

  const { data, error } = await supabase
    .from('task_time_entries')
    .insert({
      task_id: taskId,
      employee_id: employeeId,
      employee_name: employeeName,
      start_time: startTime,
      end_time: endTime,
      duration,
      notes,
    })
    .select()
    .single();

  if (error) throw error;

  await logTaskActivity(taskId, `${employeeName} added ${duration} min time entry`, employeeId, employeeName);

  return data;
}

export async function deleteTaskTimeEntry(
  taskId: string,
  entryId: string,
  userId: string,
  userName: string
): Promise<void> {
  const { error } = await supabase
    .from('task_time_entries')
    .delete()
    .eq('id', entryId);

  if (error) throw error;

  await logTaskActivity(taskId, `Time entry deleted`, userId, userName);
}

// Task Parts
export async function getTaskParts(taskId: string): Promise<TaskPart[]> {
  const { data, error } = await supabase
    .from('task_parts')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addTaskPart(
  taskId: string,
  partName: string,
  quantity: number,
  unitCost: number | null,
  addedBy: string,
  addedByName: string,
  partNumber?: string,
  notes?: string
): Promise<TaskPart> {
  const totalCost = unitCost ? unitCost * quantity : null;

  const { data, error } = await supabase
    .from('task_parts')
    .insert({
      task_id: taskId,
      part_name: partName,
      part_number: partNumber,
      quantity,
      unit_cost: unitCost,
      total_cost: totalCost,
      notes,
      added_by: addedBy,
      added_by_name: addedByName,
    })
    .select()
    .single();

  if (error) throw error;

  await logTaskActivity(taskId, `Part added: ${partName} (x${quantity})`, addedBy, addedByName);

  return data;
}

export async function updateTaskPart(
  taskId: string,
  partId: string,
  updates: Partial<TaskPart>,
  userId: string,
  userName: string
): Promise<TaskPart> {
  const { data, error } = await supabase
    .from('task_parts')
    .update(updates)
    .eq('id', partId)
    .select()
    .single();

  if (error) throw error;

  await logTaskActivity(taskId, `Part updated`, userId, userName);

  return data;
}

export async function deleteTaskPart(
  taskId: string,
  partId: string,
  userId: string,
  userName: string
): Promise<void> {
  const { data: part } = await supabase
    .from('task_parts')
    .select('part_name')
    .eq('id', partId)
    .single();

  const { error } = await supabase
    .from('task_parts')
    .delete()
    .eq('id', partId);

  if (error) throw error;

  await logTaskActivity(taskId, `Part removed: ${part?.part_name || 'Unknown'}`, userId, userName);
}

// Task Status Updates
export async function updateTaskStatus(
  taskId: string,
  status: string,
  userId: string,
  userName: string
): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .update({ status })
    .eq('id', taskId);

  if (error) throw error;

  await logTaskActivity(taskId, `Status changed to ${status}`, userId, userName);
}

export async function completeTask(
  taskId: string,
  userId: string,
  userName: string
): Promise<void> {
  await updateTaskStatus(taskId, 'completed', userId, userName);
}
