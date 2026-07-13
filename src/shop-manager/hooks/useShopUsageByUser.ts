import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

interface UserUsageData {
  user_id: string;
  user_name: string;
  user_email: string;
  openai_calls: number;
  openai_tokens: number;
  sms_count: number;
  voice_minutes: number;
  email_count: number;
  total_cost_cents: number;
}

interface ShopUsageByUser {
  users: UserUsageData[];
  totals: {
    openai_calls: number;
    openai_tokens: number;
    sms_count: number;
    voice_minutes: number;
    email_count: number;
    total_cost_cents: number;
  };
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useShopUsageByUser(
  startDate?: Date,
  endDate?: Date
): ShopUsageByUser {
  const { user } = useAuthUser();
  const [users, setUsers] = useState<UserUsageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user.id)
        .single();

      if (!profile?.shop_id) {
        setError('No shop associated with user');
        setIsLoading(false);
        return;
      }

      // Calculate date range
      const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

      // Fetch usage logs grouped by user
      const { data: usageLogs, error: usageError } = await supabase
        .from('api_usage_logs')
        .select('user_id, api_service, tokens_used, estimated_cost_cents')
        .eq('shop_id', profile.shop_id)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      if (usageError) throw usageError;

      // Get unique user IDs
      const userIds = [...new Set(usageLogs?.map(log => log.user_id).filter(Boolean))];

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Aggregate by user
      const userUsageMap = new Map<string, UserUsageData>();

      usageLogs?.forEach(log => {
        if (!log.user_id) return;
        
        const existing = userUsageMap.get(log.user_id) || {
          user_id: log.user_id,
          user_name: '',
          user_email: '',
          openai_calls: 0,
          openai_tokens: 0,
          sms_count: 0,
          voice_minutes: 0,
          email_count: 0,
          total_cost_cents: 0,
        };

        const profile = profileMap.get(log.user_id);
        if (profile) {
          existing.user_name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown';
          existing.user_email = profile.email || '';
        }

        switch (log.api_service) {
          case 'openai':
            existing.openai_calls += 1;
            existing.openai_tokens += log.tokens_used || 0;
            break;
          case 'twilio_sms':
            existing.sms_count += 1;
            break;
          case 'twilio_voice':
            existing.voice_minutes += 1; // Each log = 1 minute tracked
            break;
          case 'resend_email':
            existing.email_count += 1;
            break;
        }

        existing.total_cost_cents += log.estimated_cost_cents || 0;
        userUsageMap.set(log.user_id, existing);
      });

      setUsers(Array.from(userUsageMap.values()).sort((a, b) => 
        b.total_cost_cents - a.total_cost_cents
      ));
    } catch (err) {
      console.error('Error fetching shop usage:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [user, startDate?.getTime(), endDate?.getTime()]);

  const totals = users.reduce(
    (acc, user) => ({
      openai_calls: acc.openai_calls + user.openai_calls,
      openai_tokens: acc.openai_tokens + user.openai_tokens,
      sms_count: acc.sms_count + user.sms_count,
      voice_minutes: acc.voice_minutes + user.voice_minutes,
      email_count: acc.email_count + user.email_count,
      total_cost_cents: acc.total_cost_cents + user.total_cost_cents,
    }),
    { openai_calls: 0, openai_tokens: 0, sms_count: 0, voice_minutes: 0, email_count: 0, total_cost_cents: 0 }
  );

  return {
    users,
    totals,
    isLoading,
    error,
    refetch: fetchUsage,
  };
}
