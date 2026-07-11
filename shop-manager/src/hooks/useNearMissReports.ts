import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';

export interface NearMissReport {
  id: string;
  shop_id: string;
  report_number: string | null;
  report_date: string;
  location: string | null;
  description: string;
  potential_severity: 'minor' | 'moderate' | 'serious' | 'catastrophic';
  category: string | null;
  contributing_factors: string[] | null;
  immediate_actions_taken: string | null;
  reported_by: string | null;
  is_anonymous: boolean;
  status: 'reported' | 'reviewed' | 'action_required' | 'closed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  linked_corrective_action_id: string | null;
  created_at: string;
  updated_at: string;
  reporter?: { first_name: string | null; last_name: string | null; email: string | null };
}

export function useNearMissReports() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<NearMissReport[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchReports();
    }
  }, [shopId]);

  const fetchReports = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('near_miss_reports')
        .select(`
          *,
          reporter:profiles!near_miss_reports_reported_by_fkey(first_name, last_name, email)
        `)
        .eq('shop_id', shopId)
        .order('report_date', { ascending: false });

      if (error) throw error;
      setReports(data as any || []);
    } catch (error: any) {
      console.error('Error fetching near miss reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load near miss reports',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createReport = async (data: Partial<NearMissReport>) => {
    if (!shopId) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Generate report number
      const { count } = await supabase
        .from('near_miss_reports')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId);
      
      const reportNumber = `NM-${String((count || 0) + 1).padStart(4, '0')}`;

      const { error } = await supabase
        .from('near_miss_reports')
        .insert([{
          description: data.description || '',
          location: data.location,
          potential_severity: data.potential_severity || 'minor',
          category: data.category,
          immediate_actions_taken: data.immediate_actions_taken,
          is_anonymous: data.is_anonymous,
          shop_id: shopId,
          report_number: reportNumber,
          reported_by: data.is_anonymous ? null : userData?.user?.id
        }]);

      if (error) throw error;
      
      await fetchReports();
      toast({
        title: 'Success',
        description: 'Near miss report submitted'
      });
      return true;
    } catch (error: any) {
      console.error('Error creating near miss report:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit near miss report',
        variant: 'destructive'
      });
      return false;
    }
  };

  const updateReport = async (id: string, data: Partial<NearMissReport>) => {
    try {
      const { error } = await supabase
        .from('near_miss_reports')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      await fetchReports();
      toast({
        title: 'Success',
        description: 'Near miss report updated'
      });
      return true;
    } catch (error: any) {
      console.error('Error updating near miss report:', error);
      toast({
        title: 'Error',
        description: 'Failed to update near miss report',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Get counts
  const totalThisMonth = reports.filter(r => {
    const date = new Date(r.report_date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const pendingReview = reports.filter(r => r.status === 'reported').length;

  return {
    loading,
    reports,
    totalThisMonth,
    pendingReview,
    createReport,
    updateReport,
    refetch: fetchReports
  };
}
