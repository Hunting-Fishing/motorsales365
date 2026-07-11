import { supabase } from "@/integrations/supabase/client";

export interface DepartmentSubmission {
  id: string;
  department_name: string;
  description?: string;
  suggested_by: string;
  shop_id: string;
  status: string;
  review_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export const departmentSubmissionService = {
  async createSubmission(data: {
    department_name: string;
    description?: string;
    shop_id: string;
  }) {
    const { data: submission, error } = await supabase
      .from('department_submissions')
      .insert([{
        department_name: data.department_name,
        description: data.description,
        shop_id: data.shop_id,
        suggested_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    return submission;
  },

  async getUserSubmissions() {
    const { data, error } = await supabase
      .from('department_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getAllSubmissions() {
    const { data, error } = await supabase
      .from('department_submissions')
      .select(`
        *,
        profiles:suggested_by(first_name, last_name),
        shops:shop_id(name)
      `)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateSubmissionStatus(
    id: string, 
    status: 'approved' | 'rejected', 
    reviewNotes?: string
  ) {
    const { data, error } = await supabase
      .from('department_submissions')
      .update({
        status,
        review_notes: reviewNotes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async incrementUsageCount(departmentName: string) {
    // Get current count and increment
    const { data: current, error: fetchError } = await supabase
      .from('department_submissions')
      .select('usage_count')
      .eq('department_name', departmentName)
      .eq('status', 'approved')
      .single();

    if (fetchError || !current) return;

    const { error } = await supabase
      .from('department_submissions')
      .update({ usage_count: current.usage_count + 1 })
      .eq('department_name', departmentName)
      .eq('status', 'approved');

    if (error) console.error('Failed to increment usage count:', error);
  },

  async getPopularDepartments(limit = 10) {
    const { data, error } = await supabase
      .from('department_submissions')
      .select('department_name, usage_count, status')
      .eq('status', 'approved')
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};