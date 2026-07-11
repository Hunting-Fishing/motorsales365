import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import type { AuditTrail } from '@/types/phase4';

export function useAuditTrail(filters?: {
  userId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditTrail[]>([]);

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_trail')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAuditLogs(data?.map(log => ({
        ...log,
        ip_address: String(log.ip_address || '')
      })) as any || []); // Cast ip_address to string
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    auditLogs,
    refetch: fetchAuditLogs
  };
}
