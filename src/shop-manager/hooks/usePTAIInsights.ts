import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type InsightType = 'program' | 'class' | 'trainer' | 'upsell' | 'community' | 'progression';

export interface AIRecommendation {
  id: string;
  client_id: string;
  shop_id: string;
  type: string;
  content: { text: string; generated_at: string };
  confidence: number | null;
  expires_at: string | null;
  acted_on: boolean;
  created_at: string;
}

export const usePTAIRecommendations = (clientId?: string, shopId?: string, type?: InsightType) => {
  return useQuery({
    queryKey: ['pt-ai-recommendations', clientId, shopId, type],
    queryFn: async () => {
      let query = (supabase as any)
        .from('pt_ai_recommendations')
        .select('*')
        .eq('client_id', clientId)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AIRecommendation[];
    },
    enabled: !!clientId && !!shopId,
  });
};

const ACTION_MAP: Record<InsightType, string> = {
  program: 'generate_hybrid_program',
  class: 'suggest_classes',
  trainer: 'match_trainer',
  upsell: 'suggest_upsells',
  community: 'suggest_community',
  progression: 'analyze_progression',
};

export const useGenerateInsight = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, shopId, type }: { clientId: string; shopId: string; type: InsightType }) => {
      const { data, error } = await supabase.functions.invoke('pt-ai-assistant', {
        body: { action: ACTION_MAP[type], clientId, shopId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pt-ai-recommendations', variables.clientId, variables.shopId] });
      toast({ title: 'AI insight generated' });
    },
    onError: (e: any) => {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    },
  });
};

export const useSaveBiometricSnapshot = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, shopId, syncData, source }: {
      clientId: string; shopId: string;
      syncData: { steps?: number; heart_rate?: number; calories_burned?: number; sleep_hours?: number };
      source: string;
    }) => {
      const { error } = await (supabase as any).from('pt_biometric_history').insert({
        client_id: clientId,
        shop_id: shopId,
        steps: syncData.steps || null,
        heart_rate_avg: syncData.heart_rate || null,
        calories_burned: syncData.calories_burned || null,
        sleep_hours: syncData.sleep_hours || null,
        source,
        recorded_at: new Date().toISOString(),
      });
      if (error) throw error;

      // Re-compute scores with wearable data
      await (supabase as any).rpc('compute_fitness_profile_scores', {
        p_client_id: clientId,
        p_shop_id: shopId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pt-fitness-scores', variables.clientId, variables.shopId] });
      toast({ title: 'Biometrics saved & scores updated' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
};
