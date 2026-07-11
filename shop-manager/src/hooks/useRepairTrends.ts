import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';

export interface RepairTrendData {
  serviceType: string;
  count: number;
  totalCost: number;
  avgCost: number;
}

export interface MonthlyRepairData {
  month: string;
  count: number;
  totalCost: number;
}

export interface TopCostDriver {
  assetId: string;
  assetName: string;
  repairCount: number;
  totalCost: number;
}

export interface RepairTrendsStats {
  totalRepairs: number;
  totalCost: number;
  avgRepairCost: number;
  byServiceType: RepairTrendData[];
  monthlyTrends: MonthlyRepairData[];
  topCostDrivers: TopCostDriver[];
}

export function useRepairTrends(months: number = 12) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RepairTrendsStats>({
    totalRepairs: 0,
    totalCost: 0,
    avgRepairCost: 0,
    byServiceType: [],
    monthlyTrends: [],
    topCostDrivers: [],
  });

  useEffect(() => {
    if (shopId) {
      fetchRepairTrends();
    }
  }, [shopId, months]);

  const fetchRepairTrends = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data: workOrders, error } = await supabase
        .from('work_orders')
        .select('id, service_type, total_cost, created_at, equipment_id, vehicle_id, status')
        .eq('shop_id', shopId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('status', ['completed', 'invoiced']);

      if (error) throw error;

      const orders = workOrders || [];
      
      // Calculate totals
      const totalRepairs = orders.length;
      const totalCost = orders.reduce((sum, o) => sum + (o.total_cost || 0), 0);
      const avgRepairCost = totalRepairs > 0 ? totalCost / totalRepairs : 0;

      // Group by service type
      const serviceTypeMap: Record<string, { count: number; totalCost: number }> = {};
      orders.forEach(o => {
        const type = o.service_type || 'General';
        if (!serviceTypeMap[type]) {
          serviceTypeMap[type] = { count: 0, totalCost: 0 };
        }
        serviceTypeMap[type].count += 1;
        serviceTypeMap[type].totalCost += o.total_cost || 0;
      });

      const byServiceType = Object.entries(serviceTypeMap)
        .map(([serviceType, data]) => ({
          serviceType,
          count: data.count,
          totalCost: data.totalCost,
          avgCost: data.count > 0 ? data.totalCost / data.count : 0,
        }))
        .sort((a, b) => b.totalCost - a.totalCost);

      // Group by month
      const monthMap: Record<string, { count: number; totalCost: number }> = {};
      orders.forEach(o => {
        const month = o.created_at?.substring(0, 7) || 'unknown';
        if (!monthMap[month]) {
          monthMap[month] = { count: 0, totalCost: 0 };
        }
        monthMap[month].count += 1;
        monthMap[month].totalCost += o.total_cost || 0;
      });

      const monthlyTrends = Object.entries(monthMap)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Top cost drivers by asset
      const assetMap: Record<string, { count: number; totalCost: number }> = {};
      orders.forEach(o => {
        const assetId = o.equipment_id || o.vehicle_id || 'unassigned';
        if (!assetMap[assetId]) {
          assetMap[assetId] = { count: 0, totalCost: 0 };
        }
        assetMap[assetId].count += 1;
        assetMap[assetId].totalCost += o.total_cost || 0;
      });

      const topCostDrivers = Object.entries(assetMap)
        .map(([assetId, data]) => ({
          assetId,
          assetName: assetId === 'unassigned' ? 'Unassigned' : `Asset ${assetId.slice(0, 8)}`,
          repairCount: data.count,
          totalCost: data.totalCost,
        }))
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 10);

      setStats({
        totalRepairs,
        totalCost,
        avgRepairCost,
        byServiceType,
        monthlyTrends,
        topCostDrivers,
      });
    } catch (error: any) {
      console.error('Error fetching repair trends:', error);
      toast({
        title: 'Error',
        description: 'Failed to load repair trends',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    stats,
    refetch: fetchRepairTrends,
  };
}
