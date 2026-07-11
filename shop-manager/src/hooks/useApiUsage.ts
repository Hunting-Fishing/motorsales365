import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ApiUsage {
  openai_calls: number;
  openai_tokens: number;
  sms_count: number;
  voice_minutes: number;
  emails_sent: number;
}

export interface TierLimits {
  tier_slug: string;
  tier_name: string;
  openai_calls_limit: number;
  openai_tokens_limit: number;
  sms_limit: number;
  voice_minutes_limit: number;
  email_limit: number;
}

export interface UsageWithLimits {
  usage: ApiUsage;
  limits: TierLimits;
  percentages: {
    openai: number;
    sms: number;
    voice: number;
    email: number;
  };
}

export const useApiUsage = (shopId?: string, tierSlug?: string) => {
  return useQuery({
    queryKey: ["api-usage", shopId, tierSlug],
    queryFn: async (): Promise<UsageWithLimits | null> => {
      if (!shopId) return null;

      // Get current period usage
      const { data: usageData, error: usageError } = await supabase
        .rpc("get_current_period_usage", { p_shop_id: shopId });

      if (usageError) {
        console.error("Error fetching usage:", usageError);
        throw usageError;
      }

      // Get tier limits
      const effectiveTier = tierSlug || "starter";
      const { data: limitsData, error: limitsError } = await supabase
        .from("tier_api_limits")
        .select("*")
        .eq("tier_slug", effectiveTier)
        .single();

      if (limitsError) {
        console.error("Error fetching limits:", limitsError);
        // Fall back to starter limits
        const { data: fallbackLimits } = await supabase
          .from("tier_api_limits")
          .select("*")
          .eq("tier_slug", "starter")
          .single();
        
        if (!fallbackLimits) throw limitsError;
      }

      const usage: ApiUsage = usageData?.[0] || {
        openai_calls: 0,
        openai_tokens: 0,
        sms_count: 0,
        voice_minutes: 0,
        emails_sent: 0,
      };

      const limits: TierLimits = limitsData || {
        tier_slug: "starter",
        tier_name: "Starter",
        openai_calls_limit: 50,
        openai_tokens_limit: 50000,
        sms_limit: 100,
        voice_minutes_limit: 10,
        email_limit: 500,
      };

      const percentages = {
        openai: Math.round((usage.openai_calls / limits.openai_calls_limit) * 100),
        sms: Math.round((usage.sms_count / limits.sms_limit) * 100),
        voice: Math.round((usage.voice_minutes / limits.voice_minutes_limit) * 100),
        email: Math.round((usage.emails_sent / limits.email_limit) * 100),
      };

      return { usage, limits, percentages };
    },
    enabled: !!shopId,
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useTierLimits = () => {
  return useQuery({
    queryKey: ["tier-limits"],
    queryFn: async (): Promise<TierLimits[]> => {
      const { data, error } = await supabase
        .from("tier_api_limits")
        .select("*")
        .order("openai_calls_limit", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};
