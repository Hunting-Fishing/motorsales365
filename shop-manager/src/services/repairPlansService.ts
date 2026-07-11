import { supabase } from '@/integrations/supabase/client';

export interface RepairPlan {
  id: string;
  work_order_id?: string;
  vehicle_id?: string;
  customer_id?: string;
  plan_name: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'on_hold';
  estimated_duration_hours?: number;
  estimated_cost?: number;
  actual_duration_hours?: number;
  actual_cost?: number;
  assigned_technician_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface RepairPlanTask {
  id: string;
  repair_plan_id: string;
  task_name: string;
  description?: string;
  sequence_order: number;
  estimated_duration_minutes?: number;
  actual_duration_minutes?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  required_tools?: string[];
  required_parts?: string[];
  instructions?: string;
  notes?: string;
  assigned_to?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export const repairPlansService = {
  // Get all repair plans
  async getRepairPlans(): Promise<RepairPlan[]> {
    const { data, error } = await supabase
      .from('repair_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching repair plans:', error);
      throw error;
    }

    return (data as RepairPlan[]) || [];
  },

  // Get repair plan by ID
  async getRepairPlan(id: string): Promise<RepairPlan | null> {
    const { data, error } = await supabase
      .from('repair_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching repair plan:', error);
      throw error;
    }

    return data as RepairPlan;
  },

  // Create new repair plan
  async createRepairPlan(repairPlan: Omit<RepairPlan, 'id' | 'created_at' | 'updated_at'>): Promise<RepairPlan> {
    const { data, error } = await supabase
      .from('repair_plans')
      .insert(repairPlan)
      .select()
      .single();

    if (error) {
      console.error('Error creating repair plan:', error);
      throw error;
    }

    return data as RepairPlan;
  },

  // Update repair plan
  async updateRepairPlan(id: string, updates: Partial<RepairPlan>): Promise<RepairPlan> {
    const { data, error } = await supabase
      .from('repair_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating repair plan:', error);
      throw error;
    }

    return data as RepairPlan;
  },

  // Delete repair plan
  async deleteRepairPlan(id: string): Promise<void> {
    const { error } = await supabase
      .from('repair_plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting repair plan:', error);
      throw error;
    }
  },

  // Get tasks for a repair plan
  async getRepairPlanTasks(repairPlanId: string): Promise<RepairPlanTask[]> {
    const { data, error } = await supabase
      .from('repair_plan_tasks')
      .select('*')
      .eq('repair_plan_id', repairPlanId)
      .order('sequence_order', { ascending: true });

    if (error) {
      console.error('Error fetching repair plan tasks:', error);
      throw error;
    }

    return (data as RepairPlanTask[]) || [];
  },

  // Create new task
  async createTask(task: Omit<RepairPlanTask, 'id' | 'created_at' | 'updated_at'>): Promise<RepairPlanTask> {
    const { data, error } = await supabase
      .from('repair_plan_tasks')
      .insert(task)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      throw error;
    }

    return data as RepairPlanTask;
  },

  // Update task
  async updateTask(id: string, updates: Partial<RepairPlanTask>): Promise<RepairPlanTask> {
    const { data, error } = await supabase
      .from('repair_plan_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }

    return data as RepairPlanTask;
  },

  // Delete task
  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('repair_plan_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  },

  // Get repair plans by work order
  async getRepairPlansByWorkOrder(workOrderId: string): Promise<RepairPlan[]> {
    const { data, error } = await supabase
      .from('repair_plans')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching repair plans by work order:', error);
      throw error;
    }

    return (data as RepairPlan[]) || [];
  },

  // Get repair plans by customer
  async getRepairPlansByCustomer(customerId: string): Promise<RepairPlan[]> {
    const { data, error } = await supabase
      .from('repair_plans')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching repair plans by customer:', error);
      throw error;
    }

    return (data as RepairPlan[]) || [];
  },

  // Start repair plan
  async startRepairPlan(id: string): Promise<RepairPlan> {
    return this.updateRepairPlan(id, {
      status: 'active',
      started_at: new Date().toISOString()
    });
  },

  // Complete repair plan
  async completeRepairPlan(id: string): Promise<RepairPlan> {
    return this.updateRepairPlan(id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  },

  // Start task
  async startTask(id: string): Promise<RepairPlanTask> {
    return this.updateTask(id, {
      status: 'in_progress',
      started_at: new Date().toISOString()
    });
  },

  // Complete task
  async completeTask(id: string, completedBy: string): Promise<RepairPlanTask> {
    return this.updateTask(id, {
      status: 'completed',
      completed_by: completedBy,
      completed_at: new Date().toISOString()
    });
  }
};