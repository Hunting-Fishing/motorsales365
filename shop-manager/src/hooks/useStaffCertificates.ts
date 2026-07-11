import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CertificateType {
  id: string;
  name: string;
  description: string | null;
  requires_renewal: boolean;
  default_validity_months: number | null;
}

export interface StaffCertificate {
  id: string;
  staff_id: string;
  certificate_type_id: string;
  certificate_number: string | null;
  issue_date: string;
  expiry_date: string | null;
  training_date: string | null;
  issuing_authority: string | null;
  status: 'active' | 'expired' | 'suspended' | 'revoked';
  notes: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
  staff_certificate_types?: CertificateType;
}

export function useStaffCertificates(staffId?: string) {
  const queryClient = useQueryClient();

  // Fetch certificate types
  const { data: certificateTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['certificate-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_certificate_types')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as CertificateType[];
    },
  });

  // Fetch staff certificates
  const { data: certificates, isLoading: certificatesLoading, error } = useQuery({
    queryKey: ['staff-certificates', staffId],
    queryFn: async () => {
      if (!staffId) return [];

      const { data, error } = await supabase
        .from('staff_certificates')
        .select(`
          *,
          staff_certificate_types (
            id,
            name,
            description,
            requires_renewal,
            default_validity_months
          )
        `)
        .eq('staff_id', staffId)
        .order('expiry_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as StaffCertificate[];
    },
    enabled: !!staffId,
  });

  // Fetch expiring certificates
  const { data: expiringCertificates } = useQuery({
    queryKey: ['expiring-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expiring_certificates')
        .select('*')
        .order('days_until_expiry', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Add certificate mutation
  const addCertificate = useMutation({
    mutationFn: async (certificate: Omit<StaffCertificate, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'staff_certificate_types'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('staff_certificates')
        .insert([{
          ...certificate,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-certificates'] });
      toast({
        title: 'Success',
        description: 'Certificate added successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add certificate',
        variant: 'destructive',
      });
    },
  });

  // Update certificate mutation
  const updateCertificate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffCertificate> & { id: string }) => {
      const { data, error } = await supabase
        .from('staff_certificates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-certificates'] });
      toast({
        title: 'Success',
        description: 'Certificate updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update certificate',
        variant: 'destructive',
      });
    },
  });

  // Delete certificate mutation
  const deleteCertificate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff_certificates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-certificates'] });
      toast({
        title: 'Success',
        description: 'Certificate deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete certificate',
        variant: 'destructive',
      });
    },
  });

  return {
    certificates,
    certificateTypes,
    expiringCertificates,
    isLoading: certificatesLoading || typesLoading,
    error,
    addCertificate: addCertificate.mutate,
    updateCertificate: updateCertificate.mutate,
    deleteCertificate: deleteCertificate.mutate,
    isAdding: addCertificate.isPending,
    isUpdating: updateCertificate.isPending,
    isDeleting: deleteCertificate.isPending,
  };
}
