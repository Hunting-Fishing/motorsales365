import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { ComplianceViolation } from '@/types/phase5';

export function useCompliance() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchViolations();
    }
  }, [shopId]);

  const fetchViolations = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('compliance_violations')
        .select('*')
        .eq('shop_id', shopId)
        .order('violation_date', { ascending: false });

      if (error) throw error;
      setViolations(data as any || []); // Cast to handle severity enum mismatch
    } catch (error: any) {
      console.error('Error fetching compliance violations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load compliance violations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveViolation = async (violationId: string, resolutionNotes: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('compliance_violations')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: userData.user.id,
          resolution_notes: resolutionNotes
        })
        .eq('id', violationId);

      if (error) throw error;
      
      await fetchViolations();
      toast({
        title: 'Success',
        description: 'Violation resolved'
      });
    } catch (error: any) {
      console.error('Error resolving violation:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve violation',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    violations,
    resolveViolation,
    refetch: fetchViolations
  };
}
