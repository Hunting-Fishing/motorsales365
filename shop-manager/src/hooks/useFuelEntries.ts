import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';

export interface FuelEntry {
  id: string;
  shop_id: string;
  equipment_id?: string;
  fuel_amount: number;
  fuel_unit?: string;
  cost: number;
  odometer_reading?: number;
  hours_reading?: number;
  location?: string;
  notes?: string;
  entry_date: string;
  created_at: string;
  entered_by?: string;
}

export interface FuelStats {
  totalGallons: number;
  totalCost: number;
  avgCostPerGallon: number;
  entriesCount: number;
  byAsset: Record<string, { gallons: number; cost: number }>;
  byMonth: { month: string; gallons: number; cost: number }[];
}

export function useFuelEntries(startDate?: string, endDate?: string) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [stats, setStats] = useState<FuelStats>({
    totalGallons: 0,
    totalCost: 0,
    avgCostPerGallon: 0,
    entriesCount: 0,
    byAsset: {},
    byMonth: [],
  });

  useEffect(() => {
    if (shopId) {
      fetchEntries();
    }
  }, [shopId, startDate, endDate]);

  const fetchEntries = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('fuel_entries')
        .select('*')
        .eq('shop_id', shopId)
        .order('entry_date', { ascending: false });

      if (startDate) {
        query = query.gte('entry_date', startDate);
      }
      if (endDate) {
        query = query.lte('entry_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const entriesData = data || [];
      setEntries(entriesData as FuelEntry[]);
      calculateStats(entriesData as FuelEntry[]);
    } catch (error: any) {
      console.error('Error fetching fuel entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load fuel entries',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: FuelEntry[]) => {
    const totalGallons = data.reduce((sum, e) => sum + (e.fuel_amount || 0), 0);
    const totalCost = data.reduce((sum, e) => sum + (e.cost || 0), 0);
    
    // Group by asset
    const byAsset: Record<string, { gallons: number; cost: number }> = {};
    data.forEach(e => {
      const assetKey = e.equipment_id || 'unassigned';
      if (!byAsset[assetKey]) {
        byAsset[assetKey] = { gallons: 0, cost: 0 };
      }
      byAsset[assetKey].gallons += e.fuel_amount || 0;
      byAsset[assetKey].cost += e.cost || 0;
    });

    // Group by month
    const monthMap: Record<string, { gallons: number; cost: number }> = {};
    data.forEach(e => {
      const month = e.entry_date?.substring(0, 7) || 'unknown';
      if (!monthMap[month]) {
        monthMap[month] = { gallons: 0, cost: 0 };
      }
      monthMap[month].gallons += e.fuel_amount || 0;
      monthMap[month].cost += e.cost || 0;
    });

    const byMonth = Object.entries(monthMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    setStats({
      totalGallons,
      totalCost,
      avgCostPerGallon: totalGallons > 0 ? totalCost / totalGallons : 0,
      entriesCount: data.length,
      byAsset,
      byMonth,
    });
  };

  const addEntry = async (entry: Partial<FuelEntry>) => {
    if (!shopId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('fuel_entries').insert({
        shop_id: shopId,
        fuel_amount: entry.fuel_amount || 0,
        cost: entry.cost || 0,
        entry_date: entry.entry_date,
        location: entry.location,
        notes: entry.notes,
        entered_by: user.id,
      });

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Fuel entry added successfully',
      });
      
      await fetchEntries();
    } catch (error: any) {
      console.error('Error adding fuel entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to add fuel entry',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    entries,
    stats,
    refetch: fetchEntries,
    addEntry,
  };
}
