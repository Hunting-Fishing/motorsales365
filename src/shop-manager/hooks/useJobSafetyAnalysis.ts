import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface JSATemplate {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  job_category?: string;
  default_hazards: DefaultHazard[];
  required_ppe: string[];
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DefaultHazard {
  task_step: string;
  hazard_description: string;
  control_measures: string[];
}

export interface JobSafetyAnalysis {
  id: string;
  shop_id: string;
  template_id?: string;
  work_order_id?: string;
  jsa_number: string;
  job_title: string;
  job_description?: string;
  location?: string;
  date_performed: string;
  supervisor_id?: string;
  supervisor_name?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  overall_risk_level?: 'low' | 'medium' | 'high' | 'critical';
  required_ppe: string[];
  special_precautions?: string;
  emergency_procedures?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface JSAHazard {
  id: string;
  jsa_id: string;
  step_number: number;
  task_step: string;
  hazard_description: string;
  likelihood: number;
  severity: number;
  risk_score: number;
  control_measures: string[];
  responsible_person?: string;
  residual_risk_level?: string;
  created_at: string;
}

export function useJSATemplates() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['jsa-templates', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('jsa_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        default_hazards: (Array.isArray(t.default_hazards) ? t.default_hazards : []) as unknown as DefaultHazard[],
      })) as JSATemplate[];
    },
    enabled: !!shopId,
  });

  const createTemplate = useMutation({
    mutationFn: async (input: Partial<JSATemplate>) => {
      if (!shopId) throw new Error('No shop ID');
      const insertData = {
        name: input.name || '',
        shop_id: shopId,
        description: input.description,
        job_category: input.job_category,
        default_hazards: JSON.parse(JSON.stringify(input.default_hazards || [])),
        required_ppe: input.required_ppe || [],
      };
      const { data, error } = await supabase
        .from('jsa_templates')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jsa-templates'] });
      toast.success('Template created');
    },
  });

  return { templates, isLoading, createTemplate };
}

export function useJobSafetyAnalyses() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  const { data: jsaList = [], isLoading } = useQuery({
    queryKey: ['job-safety-analyses', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('job_safety_analyses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as JobSafetyAnalysis[];
    },
    enabled: !!shopId,
  });

  const createJSA = useMutation({
    mutationFn: async (input: Partial<JobSafetyAnalysis>) => {
      if (!shopId) throw new Error('No shop ID');
      
      // Generate JSA number
      const { data: existing } = await supabase
        .from('job_safety_analyses')
        .select('jsa_number')
        .order('created_at', { ascending: false })
        .limit(1);
      
      const lastNum = existing?.[0]?.jsa_number?.replace('JSA-', '') || '0';
      const nextNum = (parseInt(lastNum, 10) + 1).toString().padStart(4, '0');
      
      const insertData = {
        shop_id: shopId,
        jsa_number: `JSA-${nextNum}`,
        job_title: input.job_title || '',
        job_description: input.job_description,
        location: input.location,
        date_performed: input.date_performed || new Date().toISOString().split('T')[0],
        supervisor_id: input.supervisor_id,
        supervisor_name: input.supervisor_name,
        template_id: input.template_id,
        work_order_id: input.work_order_id,
        required_ppe: input.required_ppe || [],
        special_precautions: input.special_precautions,
        emergency_procedures: input.emergency_procedures,
      };
      
      const { data, error } = await supabase
        .from('job_safety_analyses')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-safety-analyses'] });
      toast.success('JSA created');
    },
  });

  const updateJSA = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<JobSafetyAnalysis> & { id: string }) => {
      const { data, error } = await supabase
        .from('job_safety_analyses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-safety-analyses'] });
      toast.success('JSA updated');
    },
  });

  const deleteJSA = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('job_safety_analyses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-safety-analyses'] });
      toast.success('JSA deleted');
    },
  });

  return { jsaList, isLoading, createJSA, updateJSA, deleteJSA };
}

export function useJSAHazards(jsaId: string | null) {
  const queryClient = useQueryClient();

  const { data: hazards = [], isLoading } = useQuery({
    queryKey: ['jsa-hazards', jsaId],
    queryFn: async () => {
      if (!jsaId) return [];
      const { data, error } = await supabase
        .from('jsa_hazards')
        .select('*')
        .eq('jsa_id', jsaId)
        .order('step_number');
      
      if (error) throw error;
      return data as JSAHazard[];
    },
    enabled: !!jsaId,
  });

  const addHazard = useMutation({
    mutationFn: async (input: Omit<JSAHazard, 'id' | 'risk_score' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('jsa_hazards')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jsa-hazards', jsaId] });
    },
  });

  const updateHazard = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<JSAHazard> & { id: string }) => {
      const { data, error } = await supabase
        .from('jsa_hazards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jsa-hazards', jsaId] });
    },
  });

  const removeHazard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('jsa_hazards')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jsa-hazards', jsaId] });
    },
  });

  return { hazards, isLoading, addHazard, updateHazard, removeHazard };
}
