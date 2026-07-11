import { supabase } from '@/integrations/supabase/client';

export interface Tool {
  id: string;
  name: string;
  category: string;
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  location: string;
  purchase_date: string;
  last_maintenance: string | null;
  next_maintenance: string | null;
  cost: number;
  serial_number?: string;
  notes?: string;
}

export interface ToolCategory {
  id: string;
  name: string;
  description: string;
  tool_count: number;
}

class ToolsService {
  async getTools(): Promise<Tool[]> {
    const { data, error } = await supabase
      .from('asset_tracking')
      .select('*')
      .eq('asset_type', 'tool')
      .order('asset_name', { ascending: true });

    if (error) throw error;

    return data?.map(asset => ({
      id: asset.id,
      name: asset.asset_name,
      category: asset.asset_type,
      status: asset.condition_status as Tool['status'] || 'available',
      location: asset.location || 'Unknown',
      purchase_date: asset.purchase_date || new Date().toISOString().split('T')[0],
      last_maintenance: null,
      next_maintenance: null,
      cost: asset.purchase_price || 0,
      serial_number: asset.asset_tag,
      notes: asset.notes,
    })) || [];
  }

  async getToolCategories(): Promise<ToolCategory[]> {
    const { data, error } = await supabase
      .from('asset_tracking')
      .select('asset_type')
      .eq('asset_type', 'tool');

    if (error) throw error;

    // Group by category and count
    const categories = data?.reduce((acc, item) => {
      const category = item.asset_type || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return Object.entries(categories).map(([name, count], index) => ({
      id: `cat-${index}`,
      name,
      description: `${name} category`,
      tool_count: count,
    }));
  }

  async addTool(tool: Omit<Tool, 'id'>): Promise<Tool> {
    // Get current user's shop_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    const { data, error } = await supabase
      .from('asset_tracking')
      .insert({
        asset_name: tool.name,
        asset_type: 'tool',
        condition_status: tool.status,
        location: tool.location,
        purchase_date: tool.purchase_date,
        purchase_price: tool.cost,
        asset_tag: tool.serial_number,
        notes: tool.notes,
        created_by: 'system',
        shop_id: profile?.shop_id || '',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.asset_name,
      category: data.asset_type,
      status: data.condition_status as Tool['status'],
      location: data.location || '',
      purchase_date: data.purchase_date || '',
      last_maintenance: null,
      next_maintenance: null,
      cost: data.purchase_price || 0,
      serial_number: data.asset_tag,
      notes: data.notes,
    };
  }

  async updateTool(id: string, updates: Partial<Tool>): Promise<void> {
    const { error } = await supabase
      .from('asset_tracking')
      .update({
        asset_name: updates.name,
        condition_status: updates.status,
        location: updates.location,
        purchase_price: updates.cost,
        asset_tag: updates.serial_number,
        notes: updates.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async deleteTool(id: string): Promise<void> {
    const { error } = await supabase
      .from('asset_tracking')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const toolsService = new ToolsService();