import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';

export interface StaffCertificate {
  id: string;
  staff_id: string;
  certificate_type_id: string;
  certificate_number?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  staff?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  certificate_type?: {
    name: string;
    description?: string;
  };
}

export interface CertificateType {
  id: string;
  name: string;
  description?: string;
  requires_renewal?: boolean;
  default_validity_months?: number;
}

export function useSafetyCertifications() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<StaffCertificate[]>([]);
  const [certificateTypes, setCertificateTypes] = useState<CertificateType[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchCertificates();
      fetchCertificateTypes();
    }
  }, [shopId]);

  const fetchCertificates = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_certificates')
        .select(`
          *,
          profiles:staff_id (
            first_name,
            last_name,
            email
          ),
          staff_certificate_types:certificate_type_id (
            name,
            description,
            category
          )
        `)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      
      const mappedCertificates = (data || []).map((cert: any) => ({
        ...cert,
        staff: cert.profiles,
        certificate_type: cert.staff_certificate_types
      }));
      
      setCertificates(mappedCertificates);
    } catch (error: any) {
      console.error('Error fetching certificates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load certificates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificateTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_certificate_types')
        .select('id, name, description, requires_renewal, default_validity_months')
        .order('name');

      if (error) throw error;
      setCertificateTypes((data || []) as CertificateType[]);
    } catch (error: any) {
      console.error('Error fetching certificate types:', error);
    }
  };

  const getExpiredCertificates = () => {
    const today = new Date().toISOString().split('T')[0];
    return certificates.filter(c => c.expiry_date && c.expiry_date < today);
  };

  const getExpiringCertificates = (daysAhead: number = 30) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];
    
    return certificates.filter(c => 
      c.expiry_date && 
      c.expiry_date >= todayStr && 
      c.expiry_date <= futureStr
    );
  };

  const getValidCertificates = () => {
    const today = new Date().toISOString().split('T')[0];
    return certificates.filter(c => !c.expiry_date || c.expiry_date >= today);
  };

  const getCertificatesByStaff = (staffId: string) => {
    return certificates.filter(c => c.staff_id === staffId);
  };

  const getCertificatesByType = (typeId: string) => {
    return certificates.filter(c => c.certificate_type_id === typeId);
  };

  return {
    loading,
    certificates,
    certificateTypes,
    getExpiredCertificates,
    getExpiringCertificates,
    getValidCertificates,
    getCertificatesByStaff,
    getCertificatesByType,
    refetch: fetchCertificates
  };
}
