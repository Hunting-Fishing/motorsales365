import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';

export interface SafetyPointsConfig {
  id: string;
  shop_id: string;
  action_type: string;
  points_value: number;
  description: string | null;
  is_active: boolean;
}

export interface SafetyPointsLedger {
  id: string;
  shop_id: string;
  employee_id: string;
  action_type: string;
  points: number;
  description: string | null;
  created_at: string;
  employee?: { first_name: string | null; last_name: string | null };
}

export interface SafetyReward {
  id: string;
  shop_id: string;
  reward_name: string;
  description: string | null;
  points_required: number;
  reward_type: 'badge' | 'prize' | 'recognition' | 'time_off';
  is_active: boolean;
}

export interface EmployeePoints {
  employee_id: string;
  employee_name: string;
  total_points: number;
}

export const useSafetyGamification = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  const configQuery = useQuery({
    queryKey: ['safety-points-config', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('safety_points_config')
        .select('*')
        .eq('shop_id', shopId);
      if (error) throw error;
      return data as SafetyPointsConfig[];
    },
    enabled: !!shopId,
  });

  const ledgerQuery = useQuery({
    queryKey: ['safety-points-ledger', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('safety_points_ledger')
        .select('*, employee:profiles!safety_points_ledger_employee_id_fkey(first_name, last_name)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as SafetyPointsLedger[];
    },
    enabled: !!shopId,
  });

  const rewardsQuery = useQuery({
    queryKey: ['safety-rewards', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('safety_rewards')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true);
      if (error) throw error;
      return data as SafetyReward[];
    },
    enabled: !!shopId,
  });

  const leaderboardQuery = useQuery({
    queryKey: ['safety-leaderboard', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('safety_points_ledger')
        .select('employee_id, employee:profiles!safety_points_ledger_employee_id_fkey(first_name, last_name)')
        .eq('shop_id', shopId);
      if (error) throw error;
      
      // Aggregate points by employee
      const pointsMap = new Map<string, { name: string; points: number }>();
      data.forEach((entry: any) => {
        const id = entry.employee_id;
        const name = entry.employee ? `${entry.employee.first_name || ''} ${entry.employee.last_name || ''}`.trim() : 'Unknown';
        if (!pointsMap.has(id)) {
          pointsMap.set(id, { name, points: 0 });
        }
      });

      // Get actual points sum
      const { data: sumData } = await supabase
        .from('safety_points_ledger')
        .select('employee_id, points')
        .eq('shop_id', shopId);
      
      sumData?.forEach((entry: any) => {
        const existing = pointsMap.get(entry.employee_id);
        if (existing) {
          existing.points += entry.points;
        }
      });

      return Array.from(pointsMap.entries())
        .map(([id, data]) => ({ employee_id: id, employee_name: data.name, total_points: data.points }))
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 10);
    },
    enabled: !!shopId,
  });

  const awardPoints = useMutation({
    mutationFn: async (entry: { employee_id: string; action_type: string; points: number; description?: string }) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await supabase
        .from('safety_points_ledger')
        .insert({ ...entry, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-points-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['safety-leaderboard'] });
      toast({ title: 'Points awarded!' });
    },
  });

  const createReward = useMutation({
    mutationFn: async (reward: Partial<SafetyReward>) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await supabase
        .from('safety_rewards')
        .insert({
          shop_id: shopId,
          reward_name: reward.reward_name || '',
          points_required: reward.points_required || 100,
          reward_type: reward.reward_type || 'badge',
          description: reward.description,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-rewards'] });
      toast({ title: 'Reward created' });
    },
  });

  const totalPointsAwarded = ledgerQuery.data?.reduce((sum, entry) => sum + entry.points, 0) || 0;

  return {
    config: configQuery.data || [],
    ledger: ledgerQuery.data || [],
    rewards: rewardsQuery.data || [],
    leaderboard: leaderboardQuery.data || [],
    isLoading: configQuery.isLoading,
    totalPointsAwarded,
    awardPoints,
    createReward,
  };
};
