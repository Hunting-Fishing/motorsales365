import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useIsPlatformDeveloper } from '@/hooks/usePlatformDeveloper';
import { MODULE_CONFIGS, TIER_CONFIGS, TierSlug } from '@/config/moduleSubscriptions';
import { toast } from 'sonner';

export interface ModuleSubscription {
  module_slug: string;
  subscription_id: string;
  current_period_end: string;
  status: string;
  tier: TierSlug;
  product_id: string;
}

export interface ModuleSubscriptionStatus {
  subscriptions: ModuleSubscription[];
  trial_active: boolean;
  trial_ends_at: string | null;
  enabled_modules: string[];
}

export function useModuleSubscriptions() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['module-subscriptions', user?.id],
    queryFn: async (): Promise<ModuleSubscriptionStatus> => {
      const { data, error } = await supabase.functions.invoke('check-module-subscriptions');
      
      if (error) throw error;
      return data as ModuleSubscriptionStatus;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
}

export function useSubscribeToModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleSlug, tier }: { moduleSlug: string; tier: Exclude<TierSlug, 'free'> }) => {
      const config = MODULE_CONFIGS[moduleSlug];
      if (!config) throw new Error('Module not found');

      const tierPricing = config.tiers[tier];
      if (!tierPricing) throw new Error('Invalid tier');

      const { data, error } = await supabase.functions.invoke('create-module-checkout', {
        body: {
          moduleSlug,
          tier,
          priceId: tierPricing.priceId,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-subscriptions'] });
    },
    onError: (error) => {
      toast.error('Failed to start checkout: ' + error.message);
    },
  });
}

export function useModuleAccess() {
  const { data: subscriptionStatus, isLoading } = useModuleSubscriptions();
  const { data: isPlatformDeveloper, isLoading: isDevLoading } = useIsPlatformDeveloper();

  const hasModuleAccess = (moduleSlug: string): boolean => {
    // Platform developers have access to ALL modules
    if (isPlatformDeveloper) return true;
    
    if (!subscriptionStatus) return false;
    
    // Must be in enabled_modules list first
    const enabledModules = subscriptionStatus.enabled_modules || [];
    if (enabledModules.length > 0 && !enabledModules.includes(moduleSlug)) {
      return false;
    }
    
    // Trial is active - grant access to enabled modules at Pro tier
    if (subscriptionStatus.trial_active) return true;
    
    // Check for active subscription
    return subscriptionStatus.subscriptions.some(
      sub => sub.module_slug === moduleSlug && sub.status === 'active'
    );
  };

  const getSubscriptionForModule = (moduleSlug: string): ModuleSubscription | undefined => {
    return subscriptionStatus?.subscriptions.find(sub => sub.module_slug === moduleSlug);
  };

  const getModuleTier = (moduleSlug: string): TierSlug => {
    // Platform developers get business tier access
    if (isPlatformDeveloper) return 'business';
    
    if (!subscriptionStatus) return 'free';
    
    // Trial gives Pro tier access
    if (subscriptionStatus.trial_active) return 'pro';
    
    const subscription = getSubscriptionForModule(moduleSlug);
    return subscription?.tier ?? 'free';
  };

  const getActiveSubscriptionCount = (): number => {
    return subscriptionStatus?.subscriptions.filter(sub => sub.status === 'active').length ?? 0;
  };

  return {
    hasModuleAccess,
    getSubscriptionForModule,
    getModuleTier,
    getActiveSubscriptionCount,
    trialActive: subscriptionStatus?.trial_active ?? false,
    trialEndsAt: subscriptionStatus?.trial_ends_at ?? null,
    subscriptions: subscriptionStatus?.subscriptions ?? [],
    isPlatformDeveloper: isPlatformDeveloper ?? false,
    isLoading: isLoading || isDevLoading,
  };
}
