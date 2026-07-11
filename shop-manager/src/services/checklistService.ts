import { supabase } from '@/integrations/supabase/client';

export interface WorkOrderChecklist {
  id: string;
  work_order_id: string;
  checklist_name: string;
  checklist_type: 'general' | 'safety' | 'quality' | 'inspection' | 'delivery';
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completion_percentage: number;
  assigned_to?: string;
  completed_by?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  item_text: string;
  description?: string;
  sequence_order: number;
  is_required: boolean;
  item_type: 'checkbox' | 'text' | 'number' | 'photo' | 'signature';
  is_completed: boolean;
  completion_value?: string;
  completion_notes?: string;
  photo_urls?: string[];
  completed_by?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export const checklistService = {
  // Work Order Checklists
  async getWorkOrderChecklists(workOrderId: string): Promise<WorkOrderChecklist[]> {
    const { data, error } = await supabase
      .from('work_order_checklists')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching work order checklists:', error);
      throw error;
    }

    return (data as WorkOrderChecklist[]) || [];
  },

  async createWorkOrderChecklist(checklist: Omit<WorkOrderChecklist, 'id' | 'created_at' | 'updated_at'>): Promise<WorkOrderChecklist> {
    const { data, error } = await supabase
      .from('work_order_checklists')
      .insert(checklist)
      .select()
      .single();

    if (error) {
      console.error('Error creating work order checklist:', error);
      throw error;
    }

    return data as WorkOrderChecklist;
  },

  async updateWorkOrderChecklist(id: string, updates: Partial<WorkOrderChecklist>): Promise<WorkOrderChecklist> {
    const { data, error } = await supabase
      .from('work_order_checklists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating work order checklist:', error);
      throw error;
    }

    return data as WorkOrderChecklist;
  },

  async deleteWorkOrderChecklist(id: string): Promise<void> {
    const { error } = await supabase
      .from('work_order_checklists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting work order checklist:', error);
      throw error;
    }
  },

  // Checklist Items
  async getChecklistItems(checklistId: string): Promise<ChecklistItem[]> {
    const { data, error } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('checklist_id', checklistId)
      .order('sequence_order', { ascending: true });

    if (error) {
      console.error('Error fetching checklist items:', error);
      throw error;
    }

    return (data as ChecklistItem[]) || [];
  },

  async createChecklistItem(item: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'>): Promise<ChecklistItem> {
    const { data, error } = await supabase
      .from('checklist_items')
      .insert(item)
      .select()
      .single();

    if (error) {
      console.error('Error creating checklist item:', error);
      throw error;
    }

    return data as ChecklistItem;
  },

  async updateChecklistItem(id: string, updates: Partial<ChecklistItem>): Promise<ChecklistItem> {
    const { data, error } = await supabase
      .from('checklist_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating checklist item:', error);
      throw error;
    }

    return data as ChecklistItem;
  },

  async deleteChecklistItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting checklist item:', error);
      throw error;
    }
  },

  // Helper methods
  async completeChecklistItem(id: string, completedBy: string, value?: string, notes?: string): Promise<ChecklistItem> {
    return this.updateChecklistItem(id, {
      is_completed: true,
      completion_value: value,
      completion_notes: notes,
      completed_by: completedBy,
      completed_at: new Date().toISOString()
    });
  },

  async startChecklist(id: string): Promise<WorkOrderChecklist> {
    return this.updateWorkOrderChecklist(id, {
      status: 'in_progress',
      started_at: new Date().toISOString()
    });
  },

  async completeChecklist(id: string, completedBy: string): Promise<WorkOrderChecklist> {
    return this.updateWorkOrderChecklist(id, {
      status: 'completed',
      completion_percentage: 100,
      completed_by: completedBy,
      completed_at: new Date().toISOString()
    });
  },

  async updateChecklistProgress(checklistId: string): Promise<void> {
    // Get all items for this checklist
    const items = await this.getChecklistItems(checklistId);
    const completedItems = items.filter(item => item.is_completed);
    const completionPercentage = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;

    // Update the checklist with new progress
    await this.updateWorkOrderChecklist(checklistId, {
      completion_percentage: completionPercentage,
      status: completionPercentage === 100 ? 'completed' : 'in_progress'
    });
  },

  // Get checklist stats
  async getChecklistStats(workOrderId?: string): Promise<{
    totalChecklists: number;
    completedChecklists: number;
    inProgressChecklists: number;
    pendingChecklists: number;
    averageCompletion: number;
  }> {
    let query = supabase
      .from('work_order_checklists')
      .select('status, completion_percentage');

    if (workOrderId) {
      query = query.eq('work_order_id', workOrderId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching checklist stats:', error);
      throw error;
    }

    const checklists = data || [];
    const totalChecklists = checklists.length;
    const completedChecklists = checklists.filter(c => c.status === 'completed').length;
    const inProgressChecklists = checklists.filter(c => c.status === 'in_progress').length;
    const pendingChecklists = checklists.filter(c => c.status === 'pending').length;
    const averageCompletion = totalChecklists > 0 
      ? checklists.reduce((sum, c) => sum + (c.completion_percentage || 0), 0) / totalChecklists 
      : 0;

    return {
      totalChecklists,
      completedChecklists,
      inProgressChecklists,
      pendingChecklists,
      averageCompletion
    };
  }
};