import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ComplianceStats {
  early: number;
  onTime: number;
  late: number;
  breakdown: number;
  total: number;
}

export interface EmployeePerformance {
  id: string;
  name: string;
  email: string;
  totalMaintenance: number;
  earlyCount: number;
  onTimeCount: number;
  lateCount: number;
  complianceRate: number;
  overdueCount: number;
}

export interface BreakdownSummary {
  totalBreakdowns: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byRootCause: Record<string, number>;
  preventableCount: number;
  totalDowntimeHours: number;
  totalRepairCost: number;
}

export interface TrendDataPoint {
  date: string;
  early: number;
  onTime: number;
  late: number;
  breakdowns: number;
}

export function useMaintenanceTrends(dateRange: { from: string; to: string }) {
  // Compliance statistics (uses log_date not maintenance_date)
  const complianceQuery = useQuery({
    queryKey: ['maintenance-compliance', dateRange],
    queryFn: async (): Promise<ComplianceStats> => {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select('completion_status')
        .gte('log_date', dateRange.from)
        .lte('log_date', dateRange.to)
        .not('completion_status', 'is', null);

      if (error) throw error;

      const stats: ComplianceStats = {
        early: 0,
        onTime: 0,
        late: 0,
        breakdown: 0,
        total: data?.length || 0
      };

      data?.forEach(log => {
        switch (log.completion_status) {
          case 'early': stats.early++; break;
          case 'on_time': stats.onTime++; break;
          case 'late': stats.late++; break;
          case 'breakdown': stats.breakdown++; break;
        }
      });

      return stats;
    }
  });

  // Employee performance
  const employeeQuery = useQuery({
    queryKey: ['employee-maintenance-performance', dateRange],
    queryFn: async (): Promise<EmployeePerformance[]> => {
      // Get maintenance logs with performer info (uses log_date)
      const { data: logs, error: logsError } = await supabase
        .from('maintenance_logs')
        .select(`
          performed_by,
          completion_status
        `)
        .gte('log_date', dateRange.from)
        .lte('log_date', dateRange.to)
        .not('performed_by', 'is', null);

      if (logsError) throw logsError;

      // Get overdue intervals per employee
      const { data: overdueIntervals } = await supabase
        .from('maintenance_interval_tracking')
        .select('*')
        .eq('is_active', true);

      // Get employee profiles
      const performerIds = [...new Set(logs?.map(l => l.performed_by).filter(Boolean))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', performerIds);

      // Aggregate by employee
      const employeeMap = new Map<string, EmployeePerformance>();

      logs?.forEach(log => {
        if (!log.performed_by) return;
        
        if (!employeeMap.has(log.performed_by)) {
          const profile = profiles?.find(p => p.id === log.performed_by);
          employeeMap.set(log.performed_by, {
            id: log.performed_by,
            name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email : 'Unknown',
            email: profile?.email || '',
            totalMaintenance: 0,
            earlyCount: 0,
            onTimeCount: 0,
            lateCount: 0,
            complianceRate: 0,
            overdueCount: 0
          });
        }

        const emp = employeeMap.get(log.performed_by)!;
        emp.totalMaintenance++;
        
        switch (log.completion_status) {
          case 'early': emp.earlyCount++; break;
          case 'on_time': emp.onTimeCount++; break;
          case 'late': emp.lateCount++; break;
        }
      });

      // Calculate compliance rates
      employeeMap.forEach(emp => {
        const onTimeOrEarly = emp.earlyCount + emp.onTimeCount;
        emp.complianceRate = emp.totalMaintenance > 0 
          ? Math.round((onTimeOrEarly / emp.totalMaintenance) * 100) 
          : 0;
      });

      return Array.from(employeeMap.values()).sort((a, b) => b.totalMaintenance - a.totalMaintenance);
    }
  });

  // Breakdown statistics
  const breakdownQuery = useQuery({
    queryKey: ['breakdown-stats', dateRange],
    queryFn: async (): Promise<BreakdownSummary> => {
      const { data, error } = await supabase
        .from('equipment_breakdowns')
        .select('*')
        .gte('breakdown_date', dateRange.from)
        .lte('breakdown_date', dateRange.to);

      if (error) throw error;

      const summary: BreakdownSummary = {
        totalBreakdowns: data?.length || 0,
        byType: {},
        bySeverity: {},
        byRootCause: {},
        preventableCount: 0,
        totalDowntimeHours: 0,
        totalRepairCost: 0
      };

      data?.forEach(bd => {
        // By type
        summary.byType[bd.breakdown_type] = (summary.byType[bd.breakdown_type] || 0) + 1;
        
        // By severity
        summary.bySeverity[bd.severity] = (summary.bySeverity[bd.severity] || 0) + 1;
        
        // By root cause
        if (bd.root_cause_category) {
          summary.byRootCause[bd.root_cause_category] = (summary.byRootCause[bd.root_cause_category] || 0) + 1;
        }
        
        // Preventable
        if (bd.preventable) summary.preventableCount++;
        
        // Totals
        summary.totalDowntimeHours += bd.downtime_hours || 0;
        summary.totalRepairCost += bd.repair_cost || 0;
      });

      return summary;
    }
  });

  // Trend data over time (uses log_date)
  const trendQuery = useQuery({
    queryKey: ['maintenance-trend-data', dateRange],
    queryFn: async (): Promise<TrendDataPoint[]> => {
      // Get maintenance logs grouped by date
      const { data: maintLogs } = await supabase
        .from('maintenance_logs')
        .select('log_date, completion_status')
        .gte('log_date', dateRange.from)
        .lte('log_date', dateRange.to)
        .not('completion_status', 'is', null);

      // Get breakdowns grouped by date
      const { data: breakdowns } = await supabase
        .from('equipment_breakdowns')
        .select('breakdown_date')
        .gte('breakdown_date', dateRange.from)
        .lte('breakdown_date', dateRange.to);

      // Group by date
      const dateMap = new Map<string, TrendDataPoint>();

      maintLogs?.forEach(log => {
        const dateKey = log.log_date.split('T')[0];
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, { date: dateKey, early: 0, onTime: 0, late: 0, breakdowns: 0 });
        }
        const point = dateMap.get(dateKey)!;
        switch (log.completion_status) {
          case 'early': point.early++; break;
          case 'on_time': point.onTime++; break;
          case 'late': point.late++; break;
        }
      });

      breakdowns?.forEach(bd => {
        const dateKey = bd.breakdown_date.split('T')[0];
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, { date: dateKey, early: 0, onTime: 0, late: 0, breakdowns: 0 });
        }
        dateMap.get(dateKey)!.breakdowns++;
      });

      return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
  });

  return {
    compliance: complianceQuery.data,
    isLoadingCompliance: complianceQuery.isLoading,
    employees: employeeQuery.data || [],
    isLoadingEmployees: employeeQuery.isLoading,
    breakdowns: breakdownQuery.data,
    isLoadingBreakdowns: breakdownQuery.isLoading,
    trendData: trendQuery.data || [],
    isLoadingTrends: trendQuery.isLoading,
    refetchAll: () => {
      complianceQuery.refetch();
      employeeQuery.refetch();
      breakdownQuery.refetch();
      trendQuery.refetch();
    }
  };
}
