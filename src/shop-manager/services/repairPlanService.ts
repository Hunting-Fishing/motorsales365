import { supabase } from "@/integrations/supabase/client";
import { RepairPlan, RepairTask } from "@/types/repairPlan";

export interface RepairPlanWithTasks extends Omit<RepairPlan, 'tasks'> {
  tasks: RepairTask[];
}

export const repairPlanService = {
  async getRepairPlans(): Promise<RepairPlanWithTasks[]> {
    const { data: plans, error } = await supabase
      .from('repair_plans')
      .select(`
        *,
        repair_plan_tasks (
          id,
          task_name,
          description,
          estimated_duration_minutes,
          status,
          assigned_to,
          notes,
          completed_at,
          sequence_order
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return plans?.map(plan => ({
      id: plan.id,
      equipmentId: plan.work_order_id, // Using work_order_id as equipment reference
      title: plan.plan_name,
      description: plan.description || '',
      status: plan.status as RepairPlan['status'],
      priority: plan.priority as RepairPlan['priority'],
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
      scheduledDate: plan.started_at ? plan.started_at.split('T')[0] : undefined,
      completedDate: plan.completed_at ? plan.completed_at.split('T')[0] : undefined,
      estimatedDuration: plan.estimated_duration_hours ? Number(plan.estimated_duration_hours) : 0,
      actualDuration: plan.actual_duration_hours ? Number(plan.actual_duration_hours) : undefined,
      assignedTechnician: plan.assigned_technician_id,
      partsRequired: [], // Not available in current schema
      costEstimate: plan.estimated_cost ? Number(plan.estimated_cost) : undefined,
      customerApproved: true, // Not available in current schema, defaulting to true
      notes: '',
      tasks: plan.repair_plan_tasks?.map((task: any) => ({
        id: task.id,
        description: task.task_name || task.description,
        estimatedHours: task.estimated_duration_minutes ? Number(task.estimated_duration_minutes) / 60 : 0,
        completed: task.status === 'completed',
        assignedTo: task.assigned_to,
        notes: task.notes
      })) || []
    })) || [];
  },

  async createRepairPlan(repairPlan: Omit<RepairPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('repair_plans')
      .insert({
        work_order_id: repairPlan.equipmentId, // Using as work order reference
        plan_name: repairPlan.title,
        description: repairPlan.description,
        status: repairPlan.status,
        priority: repairPlan.priority,
        estimated_duration_hours: repairPlan.estimatedDuration,
        estimated_cost: repairPlan.costEstimate,
        assigned_technician_id: repairPlan.assignedTechnician,
        created_by: user.user?.id || ''
      })
      .select('id')
      .single();

    if (error) throw error;

    // Create tasks if any
    if (repairPlan.tasks && repairPlan.tasks.length > 0) {
      const tasksToInsert = repairPlan.tasks.map((task, index) => ({
        repair_plan_id: data.id,
        task_name: task.description,
        description: task.description,
        estimated_duration_minutes: Math.round(task.estimatedHours * 60),
        status: task.completed ? 'completed' : 'pending',
        assigned_to: task.assignedTo,
        notes: task.notes,
        sequence_order: index
      }));

      const { error: tasksError } = await supabase
        .from('repair_plan_tasks')
        .insert(tasksToInsert);

      if (tasksError) throw tasksError;
    }

    return data.id;
  },

  async updateRepairPlan(id: string, updates: Partial<RepairPlan>): Promise<void> {
    const updateData: any = {};
    
    if (updates.equipmentId) updateData.work_order_id = updates.equipmentId;
    if (updates.title) updateData.plan_name = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.status) updateData.status = updates.status;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.estimatedDuration) updateData.estimated_duration_hours = updates.estimatedDuration;
    if (updates.actualDuration) updateData.actual_duration_hours = updates.actualDuration;
    if (updates.assignedTechnician) updateData.assigned_technician_id = updates.assignedTechnician;
    if (updates.costEstimate) updateData.estimated_cost = updates.costEstimate;
    if (updates.completedDate) updateData.completed_at = updates.completedDate;

    const { error } = await supabase
      .from('repair_plans')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteRepairPlan(id: string): Promise<void> {
    const { error } = await supabase
      .from('repair_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateTask(taskId: string, updates: Partial<RepairTask>): Promise<void> {
    const updateData: any = {};
    
    if (updates.description) {
      updateData.task_name = updates.description;
      updateData.description = updates.description;
    }
    if (updates.estimatedHours) updateData.estimated_duration_minutes = Math.round(updates.estimatedHours * 60);
    if (updates.completed !== undefined) updateData.status = updates.completed ? 'completed' : 'pending';
    if (updates.assignedTo) updateData.assigned_to = updates.assignedTo;
    if (updates.notes) updateData.notes = updates.notes;
    if (updates.completed) updateData.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('repair_plan_tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) throw error;
  }
};