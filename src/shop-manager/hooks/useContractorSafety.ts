import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';

export interface SafetyContractor {
  id: string;
  shop_id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  trade_type: string | null;
  status: 'pending' | 'approved' | 'expired' | 'suspended';
  insurance_expiry: string | null;
  insurance_policy_number: string | null;
  insurance_provider: string | null;
  liability_coverage_amount: number | null;
  workers_comp_expiry: string | null;
  safety_rating: number | null;
  notes: string | null;
  created_at: string;
}

export interface ContractorCertification {
  id: string;
  contractor_id: string;
  certification_name: string;
  certification_number: string | null;
  issuing_authority: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  document_url: string | null;
  status: 'valid' | 'expired' | 'pending_renewal';
}

export interface ContractorSiteAccess {
  id: string;
  contractor_id: string;
  shop_id: string;
  access_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  work_area: string | null;
  work_description: string | null;
  safety_briefing_completed: boolean;
  ppe_verified: boolean;
  jsa_completed: boolean;
  contractor?: SafetyContractor;
}

export const useContractorSafety = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  const contractorsQuery = useQuery({
    queryKey: ['safety-contractors', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('safety_contractors')
        .select('*')
        .eq('shop_id', shopId)
        .order('company_name');
      if (error) throw error;
      return data as SafetyContractor[];
    },
    enabled: !!shopId,
  });

  const siteAccessQuery = useQuery({
    queryKey: ['contractor-site-access', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('contractor_site_access')
        .select('*, contractor:safety_contractors(*)')
        .eq('shop_id', shopId)
        .order('access_date', { ascending: false });
      if (error) throw error;
      return data as ContractorSiteAccess[];
    },
    enabled: !!shopId,
  });

  const createContractor = useMutation({
    mutationFn: async (contractor: Partial<SafetyContractor>) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await supabase
        .from('safety_contractors')
        .insert({
          shop_id: shopId,
          company_name: contractor.company_name || '',
          contact_name: contractor.contact_name,
          contact_email: contractor.contact_email,
          contact_phone: contractor.contact_phone,
          trade_type: contractor.trade_type,
          insurance_provider: contractor.insurance_provider,
          insurance_expiry: contractor.insurance_expiry,
          workers_comp_expiry: contractor.workers_comp_expiry,
          notes: contractor.notes,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-contractors'] });
      toast({ title: 'Contractor added successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add contractor', description: error.message, variant: 'destructive' });
    },
  });

  const updateContractor = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyContractor> & { id: string }) => {
      const { data, error } = await supabase
        .from('safety_contractors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-contractors'] });
      toast({ title: 'Contractor updated' });
    },
  });

  const logSiteAccess = useMutation({
    mutationFn: async (access: Partial<ContractorSiteAccess>) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await supabase
        .from('contractor_site_access')
        .insert({
          shop_id: shopId,
          contractor_id: access.contractor_id,
          access_date: access.access_date || new Date().toISOString().split('T')[0],
          check_in_time: access.check_in_time,
          work_area: access.work_area,
          work_description: access.work_description,
          safety_briefing_completed: access.safety_briefing_completed,
          ppe_verified: access.ppe_verified,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-site-access'] });
      toast({ title: 'Site access logged' });
    },
  });

  const approvedCount = contractorsQuery.data?.filter(c => c.status === 'approved').length || 0;
  const expiredCount = contractorsQuery.data?.filter(c => c.status === 'expired').length || 0;
  const pendingCount = contractorsQuery.data?.filter(c => c.status === 'pending').length || 0;

  return {
    contractors: contractorsQuery.data || [],
    siteAccess: siteAccessQuery.data || [],
    isLoading: contractorsQuery.isLoading,
    approvedCount,
    expiredCount,
    pendingCount,
    createContractor,
    updateContractor,
    logSiteAccess,
  };
};
