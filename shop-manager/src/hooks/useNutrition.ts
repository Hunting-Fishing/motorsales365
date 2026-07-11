import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useNutritionProfile(clientId: string | undefined, shopId: string | undefined) {
  return useQuery({
    queryKey: ['nt-profile', clientId, shopId],
    queryFn: async () => {
      if (!clientId || !shopId) return null;
      const { data } = await (supabase as any).from('nt_nutrition_profiles')
        .select('*').eq('client_id', clientId).eq('shop_id', shopId).maybeSingle();
      return data;
    },
    enabled: !!clientId && !!shopId,
  });
}

export function useSaveNutritionProfile(shopId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (profile: any) => {
      const { data: existing } = await (supabase as any).from('nt_nutrition_profiles')
        .select('id').eq('client_id', profile.client_id).eq('shop_id', shopId).maybeSingle();
      if (existing) {
        const { error } = await (supabase as any).from('nt_nutrition_profiles')
          .update({ ...profile, updated_at: new Date().toISOString() }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('nt_nutrition_profiles')
          .insert({ ...profile, shop_id: shopId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nt-profile'] });
      toast({ title: 'Nutrition profile saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useNutritionGoals(clientId: string | undefined, shopId: string | undefined) {
  return useQuery({
    queryKey: ['nt-goals', clientId, shopId],
    queryFn: async () => {
      if (!clientId || !shopId) return null;
      const { data } = await (supabase as any).from('nt_fitness_goals')
        .select('*').eq('client_id', clientId).eq('shop_id', shopId).eq('is_active', true).maybeSingle();
      return data;
    },
    enabled: !!clientId && !!shopId,
  });
}

export function useSaveNutritionGoals(shopId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (goals: any) => {
      // Deactivate existing
      await (supabase as any).from('nt_fitness_goals')
        .update({ is_active: false }).eq('client_id', goals.client_id).eq('shop_id', shopId).eq('is_active', true);
      const { error } = await (supabase as any).from('nt_fitness_goals')
        .insert({ ...goals, shop_id: shopId, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nt-goals'] });
      toast({ title: 'Nutrition goals saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useFoodLogs(clientId: string | undefined, shopId: string | undefined) {
  return useQuery({
    queryKey: ['nt-food-logs', clientId, shopId],
    queryFn: async () => {
      if (!clientId || !shopId) return [];
      const { data } = await (supabase as any).from('nt_food_logs')
        .select('*').eq('client_id', clientId).eq('shop_id', shopId)
        .order('log_date', { ascending: false }).order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
    enabled: !!clientId && !!shopId,
  });
}

export function useLogFood(shopId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (log: any) => {
      const { error } = await (supabase as any).from('nt_food_logs').insert({ ...log, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nt-food-logs'] });
      toast({ title: 'Food logged' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useFoodSearch() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (query: string) => {
      const { data, error } = await supabase.functions.invoke('nutrition-food-lookup', {
        body: { action: 'search', query },
      });
      if (error) throw error;
      return data;
    },
    onError: (e: any) => toast({ title: 'Search Error', description: e.message, variant: 'destructive' }),
  });
}

export function useBarcodeLookup() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (barcode: string) => {
      const { data, error } = await supabase.functions.invoke('nutrition-food-lookup', {
        body: { action: 'barcode_lookup', barcode },
      });
      if (error) throw error;
      return data;
    },
    onError: (e: any) => toast({ title: 'Lookup Error', description: e.message, variant: 'destructive' }),
  });
}

export function useScoreFood() {
  return useMutation({
    mutationFn: async ({ productId, clientId, shopId }: { productId: string; clientId?: string; shopId?: string }) => {
      const { data, error } = await supabase.functions.invoke('nutrition-engine', {
        body: { action: 'score_food', productId, clientId, shopId },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useDailyTargets(clientId: string | undefined, shopId: string | undefined, dayType: string = 'moderate') {
  return useQuery({
    queryKey: ['nt-daily-targets', clientId, shopId, dayType],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('nutrition-engine', {
        body: { action: 'get_daily_targets', clientId, shopId, dayType },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && !!shopId,
  });
}

export function useGenerateMealPlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ clientId, shopId, dayType }: { clientId: string; shopId: string; dayType: string }) => {
      const { data, error } = await supabase.functions.invoke('nutrition-engine', {
        body: { action: 'generate_meal_plan', clientId, shopId, dayType },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nt-meal-plans'] });
      toast({ title: 'Meal plan generated!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useMealPlans(clientId: string | undefined, shopId: string | undefined) {
  return useQuery({
    queryKey: ['nt-meal-plans', clientId, shopId],
    queryFn: async () => {
      if (!clientId || !shopId) return [];
      const { data } = await (supabase as any).from('nt_meal_plans')
        .select('*').eq('client_id', clientId).eq('shop_id', shopId)
        .order('created_at', { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!clientId && !!shopId,
  });
}

export function useWorkoutDayTypes() {
  return useQuery({
    queryKey: ['nt-workout-day-types'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('nt_workout_day_types')
        .select('*').eq('is_default', true).order('calorie_bias');
      return data || [];
    },
  });
}

export function useBiometricSnapshots(clientId: string | undefined, shopId: string | undefined) {
  return useQuery({
    queryKey: ['nt-biometric-snapshots', clientId, shopId],
    queryFn: async () => {
      if (!clientId || !shopId) return [];
      const { data } = await (supabase as any).from('nt_biometric_snapshots')
        .select('*').eq('client_id', clientId).eq('shop_id', shopId)
        .order('recorded_at', { ascending: false }).limit(30);
      return data || [];
    },
    enabled: !!clientId && !!shopId,
  });
}

export function useRecipeSearch() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { query: string; diet?: string; maxCalories?: number; number?: number }) => {
      const { data, error } = await supabase.functions.invoke('spoonacular-recipes', {
        body: { action: 'search', ...params },
      });
      if (error) throw error;
      return data;
    },
    onError: (e: any) => toast({ title: 'Recipe Search Error', description: e.message, variant: 'destructive' }),
  });
}

export function useRecipeDetails() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (recipeId: number) => {
      const { data, error } = await supabase.functions.invoke('spoonacular-recipes', {
        body: { action: 'details', recipeId },
      });
      if (error) throw error;
      return data;
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useSpoonacularMealPlan() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { targetCalories: number; diet?: string }) => {
      const { data, error } = await supabase.functions.invoke('spoonacular-recipes', {
        body: { action: 'meal_plan', ...params },
      });
      if (error) throw error;
      return data;
    },
    onError: (e: any) => toast({ title: 'Meal Plan Error', description: e.message, variant: 'destructive' }),
  });
}

export function useSaveBiometricSnapshot(shopId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (snapshot: any) => {
      const { error } = await (supabase as any).from('nt_biometric_snapshots')
        .insert({ ...snapshot, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nt-biometric-snapshots'] });
      toast({ title: 'Biometric data saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useHydrationLogs(clientId: string | undefined, shopId: string | undefined) {
  return useQuery({
    queryKey: ['nt-hydration-logs', clientId, shopId],
    queryFn: async () => {
      if (!clientId || !shopId) return [];
      const { data } = await (supabase as any).from('nt_hydration_logs')
        .select('*').eq('client_id', clientId).eq('shop_id', shopId)
        .order('logged_at', { ascending: false }).limit(200);
      return data || [];
    },
    enabled: !!clientId && !!shopId,
  });
}

export function useLogHydration(shopId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (log: { client_id: string; amount_ml: number; source: string; log_date: string }) => {
      const { error } = await (supabase as any).from('nt_hydration_logs')
        .insert({ ...log, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nt-hydration-logs'] });
      toast({ title: 'Hydration logged 💧' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}
