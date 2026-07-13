
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Certificate {
  id: string;
  profile_id: string;
  certificate_name: string;
  certificate_type: string;
  issuing_organization: string;
  issue_date: string;
  expiry_date: string | null;
  certificate_number: string | null;
  verification_url: string | null;
  document_url: string | null;
  status: 'active' | 'expired' | 'revoked' | 'pending';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useTeamMemberCertificates(memberId: string) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCertificates = async () => {
    if (!memberId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('team_member_certificates')
        .select('*')
        .eq('profile_id', memberId)
        .order('issue_date', { ascending: false });

      if (fetchError) throw fetchError;

      setCertificates((data || []).map(cert => ({
        ...cert,
        status: cert.status as 'active' | 'expired' | 'revoked' | 'pending'
      })));
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError('Failed to load certificates');
      toast.error('Failed to load certificates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [memberId]);

  const addCertificate = async (certificate: Omit<Certificate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('team_member_certificates')
        .insert([certificate])
        .select()
        .single();

      if (insertError) throw insertError;

      setCertificates(prev => [{ ...data, status: data.status as 'active' | 'expired' | 'revoked' | 'pending' }, ...prev]);
      toast.success('Certificate added successfully');
      return { success: true, data };
    } catch (err) {
      console.error('Error adding certificate:', err);
      toast.error('Failed to add certificate');
      return { success: false, error: err };
    }
  };

  const updateCertificate = async (id: string, updates: Partial<Certificate>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('team_member_certificates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setCertificates(prev => prev.map(cert => cert.id === id ? { ...data, status: data.status as 'active' | 'expired' | 'revoked' | 'pending' } : cert));
      toast.success('Certificate updated successfully');
      return { success: true, data };
    } catch (err) {
      console.error('Error updating certificate:', err);
      toast.error('Failed to update certificate');
      return { success: false, error: err };
    }
  };

  const deleteCertificate = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('team_member_certificates')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setCertificates(prev => prev.filter(cert => cert.id !== id));
      toast.success('Certificate deleted successfully');
      return { success: true };
    } catch (err) {
      console.error('Error deleting certificate:', err);
      toast.error('Failed to delete certificate');
      return { success: false, error: err };
    }
  };

  return {
    certificates,
    isLoading,
    error,
    addCertificate,
    updateCertificate,
    deleteCertificate,
    refetch: fetchCertificates
  };
}
