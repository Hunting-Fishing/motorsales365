import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface JSATemplate {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  job_category: string | null;
  default_hazards: any;
  required_ppe: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JSARecord {
  id: string;
  shop_id: string;
  template_id: string | null;
  work_order_id: string | null;
  job_title: string;
  job_description: string | null;
  work_location: string | null;
  assessment_date: string;
  conducted_by: string | null;
  supervisor_id: string | null;
  supervisor_approval_date: string | null;
  supervisor_signature: string | null;
  required_ppe: string[] | null;
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical' | null;
  additional_controls: string | null;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'expired';
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export function useJSA() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ['jsa-templates', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('jsa_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as JSATemplate[];
    },
    enabled: !!shopId,
  });

  const recordsQuery = useQuery({
    queryKey: ['jsa-records', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await (supabase as any)
        .from('jsa_records')
        .select('*')
        .order('assessment_date', { ascending: false });
      if (error) throw error;
      return (data || []) as JSARecord[];
    },
    enabled: !!shopId,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: { name: string; description?: string; job_category?: string; required_ppe?: string[] }) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await supabase
        .from('jsa_templates')
        .insert({
          name: template.name,
          description: template.description || null,
          job_category: template.job_category || null,
          required_ppe: template.required_ppe || [],
          shop_id: shopId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jsa-templates'] });
      toast.success('JSA template created');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const createRecord = useMutation({
    mutationFn: async (record: { job_title: string; job_description?: string; work_location?: string; overall_risk_level?: string }) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await (supabase as any)
        .from('jsa_records')
        .insert({
          job_title: record.job_title,
          job_description: record.job_description || null,
          work_location: record.work_location || null,
          overall_risk_level: record.overall_risk_level || 'medium',
          shop_id: shopId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jsa-records'] });
      toast.success('JSA record created');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateRecordStatus = useMutation({
    mutationFn: async ({ id, status, supervisor_signature, supervisor_approval_date }: { 
      id: string; 
      status: string; 
      supervisor_signature?: string;
      supervisor_approval_date?: string;
    }) => {
      const { error } = await (supabase as any)
        .from('jsa_records')
        .update({ status, supervisor_signature, supervisor_approval_date })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jsa-records'] });
      toast.success('JSA status updated');
    },
  });

  return {
    templates: templatesQuery.data || [],
    records: recordsQuery.data || [],
    isLoading: templatesQuery.isLoading || recordsQuery.isLoading,
    createTemplate,
    createRecord,
    updateRecordStatus,
  };
}
