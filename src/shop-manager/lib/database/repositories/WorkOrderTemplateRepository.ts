
// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

// Simple database row type that matches what we actually get from the database
interface DatabaseWorkOrderTemplate {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string | null;
  technician: string | null;
  notes: string | null;
  usage_count: number;
  last_used: string | null;
  created_at: string;
  location?: string | null;
}

// Application interface with optional fields
export interface WorkOrderTemplate {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority?: string;
  technician?: string;
  notes?: string;
  usage_count: number;
  last_used?: string;
  created_at: string;
  location?: string;
  inventory_items?: WorkOrderInventoryItem[];
}

export interface CreateWorkOrderTemplateInput {
  name: string;
  description?: string;
  status: string;
  priority?: string;
  technician?: string;
  notes?: string;
}

export interface UpdateWorkOrderTemplateInput {
  name?: string;
  description?: string;
  status?: string;
  priority?: string;
  technician?: string;
  notes?: string;
}

export interface WorkOrderInventoryItem {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  quantity: number;
  unit_price: number;
}

// Helper function to convert database row to application type
function mapToWorkOrderTemplate(row: any): WorkOrderTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    status: row.status,
    priority: row.priority || undefined,
    technician: row.technician || undefined,
    notes: row.notes || undefined,
    usage_count: row.usage_count || 0,
    last_used: row.last_used || undefined,
    created_at: row.created_at,
    location: row.location || undefined,
    inventory_items: []
  };
}

export class WorkOrderTemplateRepository {
  async findActive(): Promise<WorkOrderTemplate[]> {
    const { data, error } = await supabase
      .from('work_order_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw this.handleError(error);
    if (!data) return [];
    
    return data.map(mapToWorkOrderTemplate);
  }

  async findById(id: string): Promise<WorkOrderTemplate | null> {
    const { data, error } = await supabase
      .from('work_order_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw this.handleError(error);
    if (!data) return null;
    
    return mapToWorkOrderTemplate(data);
  }

  async findByCategory(categoryId: string): Promise<WorkOrderTemplate[]> {
    const { data, error } = await supabase
      .from('work_order_templates')
      .select('*')
      .eq('category_id', categoryId)
      .order('usage_count', { ascending: false });
    
    if (error) throw this.handleError(error);
    if (!data) return [];
    
    return data.map(mapToWorkOrderTemplate);
  }

  async getMostUsed(limit: number = 10): Promise<WorkOrderTemplate[]> {
    const { data, error } = await supabase
      .from('work_order_templates')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(limit);
    
    if (error) throw this.handleError(error);
    if (!data) return [];
    
    return data.map(mapToWorkOrderTemplate);
  }

  async create(templateData: CreateWorkOrderTemplateInput): Promise<WorkOrderTemplate> {
    const insertData = {
      name: templateData.name,
      description: templateData.description || null,
      status: templateData.status,
      priority: templateData.priority || null,
      technician: templateData.technician || null,
      notes: templateData.notes || null,
      usage_count: 0
    };

    const { data, error } = await supabase
      .from('work_order_templates')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw this.handleError(error);
    if (!data) throw new Error('Failed to create work order template');
    
    return mapToWorkOrderTemplate(data);
  }

  async update(id: string, updates: UpdateWorkOrderTemplateInput): Promise<WorkOrderTemplate> {
    const { data, error } = await supabase
      .from('work_order_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw this.handleError(error);
    if (!data) throw new Error('Failed to update work order template');
    
    return mapToWorkOrderTemplate(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('work_order_templates')
      .delete()
      .eq('id', id);
    
    if (error) throw this.handleError(error);
  }

  async incrementUsage(id: string): Promise<WorkOrderTemplate> {
    // First get current template
    const { data: currentTemplate, error: fetchError } = await supabase
      .from('work_order_templates')
      .select('usage_count')
      .eq('id', id)
      .single();

    if (fetchError) throw this.handleError(fetchError);
    if (!currentTemplate) throw new Error('Template not found');

    // Update the usage count and last_used timestamp
    const { data, error } = await supabase
      .from('work_order_templates')
      .update({ 
        usage_count: (currentTemplate.usage_count || 0) + 1,
        last_used: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw this.handleError(error);
    if (!data) throw new Error('Failed to increment template usage');
    
    return mapToWorkOrderTemplate(data);
  }

  private handleError(error: PostgrestError): Error {
    console.error('WorkOrderTemplateRepository error:', error);
    return new Error(`Database error: ${error.message}`);
  }
}
