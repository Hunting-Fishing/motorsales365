import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import type { BIReport, ReportExecution } from '@/types/phase4';

export function useBIReports() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<BIReport[]>([]);
  const [executions, setExecutions] = useState<ReportExecution[]>([]);

  useEffect(() => {
    fetchReports();
    fetchExecutions();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bi_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      console.error('Error fetching BI reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reports',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('report_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setExecutions(data as any || []); // Cast to handle status enum mismatch
    } catch (error: any) {
      console.error('Error fetching report executions:', error);
    }
  };

  const createReport = async (report: Partial<BIReport>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bi_reports')
        .insert([{ 
          ...report,
          name: report.name || 'Untitled Report', // Ensure name is provided
          query_config: report.query_config || {},
          created_by: userData.user.id 
        }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchReports();
      toast({
        title: 'Success',
        description: 'Report created successfully'
      });
      return data;
    } catch (error: any) {
      console.error('Error creating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to create report',
        variant: 'destructive'
      });
    }
  };

  const executeReport = async (reportId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('report_executions')
        .insert([{
          report_id: reportId,
          status: 'running',
          executed_by: userData.user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchExecutions();
      toast({
        title: 'Success',
        description: 'Report execution started'
      });
      return data;
    } catch (error: any) {
      console.error('Error executing report:', error);
      toast({
        title: 'Error',
        description: 'Failed to execute report',
        variant: 'destructive'
      });
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('bi_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      
      await fetchReports();
      toast({
        title: 'Success',
        description: 'Report deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting report:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete report',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    reports,
    executions,
    createReport,
    executeReport,
    deleteReport,
    refetch: () => {
      fetchReports();
      fetchExecutions();
    }
  };
}
