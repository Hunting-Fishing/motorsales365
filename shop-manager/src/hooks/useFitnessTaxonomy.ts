import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FitnessCategory {
  id: string;
  name: string;
  display_order: number;
  icon: string | null;
  color: string | null;
  description: string | null;
  slug: string | null;
  parent_id: string | null;
}

export interface FitnessSubcategory {
  id: string;
  category_id: string;
  name: string;
  display_order: number;
  slug: string | null;
  description: string | null;
  difficulty_hint: string | null;
  equipment_level: string | null;
  training_style: string | null;
}

export interface FitnessGoal {
  id: string;
  name: string;
  display_order: number;
  icon: string | null;
}

export interface ClientFitnessProfile {
  id: string;
  client_id: string;
  shop_id: string;
  primary_interests: string[];
  specific_interests: string[];
  goal_tags: string[];
  experience_level: string;
  training_environment: string[];
  equipment_access: string[];
  injuries_limitations: string | null;
  motivation_style: string | null;
  preferred_session_length: string | null;
  training_frequency: string | null;
  interest_intensity: Record<string, number>;
  interest_experience_levels: Record<string, string>;
  commitment_level: string | null;
  intake_completed: boolean;
  intake_completed_at: string | null;
}

export interface FitnessScores {
  id: string;
  client_id: string;
  shop_id: string;
  strength_affinity: number;
  endurance_affinity: number;
  aesthetics_affinity: number;
  competition_affinity: number;
  recovery_need: number;
  beginner_support_need: number;
  equipment_richness: number;
  coaching_intensity: number;
  computed_at: string;
}

export const useFitnessCategories = () => {
  return useQuery({
    queryKey: ['pt-fitness-categories'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pt_fitness_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data || []) as FitnessCategory[];
    },
  });
};

export const useFitnessSubcategories = (categoryIds?: string[]) => {
  return useQuery({
    queryKey: ['pt-fitness-subcategories', categoryIds],
    queryFn: async () => {
      let query = (supabase as any)
        .from('pt_fitness_subcategories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (categoryIds && categoryIds.length > 0) {
        query = query.in('category_id', categoryIds);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as FitnessSubcategory[];
    },
    enabled: !categoryIds || categoryIds.length > 0,
  });
};

export const useFitnessGoals = () => {
  return useQuery({
    queryKey: ['pt-fitness-goals'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pt_fitness_goals')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data || []) as FitnessGoal[];
    },
  });
};

export const useClientFitnessProfile = (clientId?: string, shopId?: string) => {
  return useQuery({
    queryKey: ['pt-client-fitness-profile', clientId, shopId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pt_client_fitness_profiles')
        .select('*')
        .eq('client_id', clientId)
        .eq('shop_id', shopId)
        .maybeSingle();
      if (error) throw error;
      return data as ClientFitnessProfile | null;
    },
    enabled: !!clientId && !!shopId,
  });
};

export const useFitnessScores = (clientId?: string, shopId?: string) => {
  return useQuery({
    queryKey: ['pt-fitness-scores', clientId, shopId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pt_client_fitness_scores')
        .select('*')
        .eq('client_id', clientId)
        .eq('shop_id', shopId)
        .maybeSingle();
      if (error) throw error;
      return data as FitnessScores | null;
    },
    enabled: !!clientId && !!shopId,
  });
};

export const useSaveFitnessProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profile: Partial<ClientFitnessProfile> & { client_id: string; shop_id: string }) => {
      const payload = {
        ...profile,
        updated_at: new Date().toISOString(),
      };

      // 1. Save to legacy monolithic profile
      const { data: existing } = await (supabase as any)
        .from('pt_client_fitness_profiles')
        .select('id')
        .eq('client_id', profile.client_id)
        .eq('shop_id', profile.shop_id)
        .maybeSingle();

      let savedProfile;
      if (existing) {
        const { data, error } = await (supabase as any)
          .from('pt_client_fitness_profiles')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        savedProfile = data;
      } else {
        const { data, error } = await (supabase as any)
          .from('pt_client_fitness_profiles')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        savedProfile = data;
      }

      // 2. Write normalized interests
      if (profile.primary_interests || profile.specific_interests) {
        // Delete old interests
        await (supabase as any)
          .from('pt_user_fitness_interests')
          .delete()
          .eq('client_id', profile.client_id)
          .eq('shop_id', profile.shop_id);

        const interests: any[] = [];
        (profile.primary_interests || []).forEach((id, idx) => {
          interests.push({
            client_id: profile.client_id,
            shop_id: profile.shop_id,
            interest_id: id,
            interest_type: 'category',
            interest_rank: idx + 1,
            experience_level: profile.interest_experience_levels?.[id] || 'curious',
            commitment_level: profile.commitment_level || 'exploring',
          });
        });
        (profile.specific_interests || []).forEach((id, idx) => {
          interests.push({
            client_id: profile.client_id,
            shop_id: profile.shop_id,
            interest_id: id,
            interest_type: 'subcategory',
            interest_rank: idx + 1,
            experience_level: profile.interest_experience_levels?.[id] || 'curious',
            commitment_level: profile.commitment_level || 'exploring',
          });
        });

        if (interests.length > 0) {
          await (supabase as any).from('pt_user_fitness_interests').insert(interests);
        }
      }

      // 3. Write normalized goals (use _goalNames if provided, otherwise goal_tags as fallback)
      const goalNames: string[] = (profile as any)._goalNames || profile.goal_tags || [];
      if (goalNames.length > 0) {
        await (supabase as any)
          .from('pt_user_fitness_goals')
          .delete()
          .eq('client_id', profile.client_id)
          .eq('shop_id', profile.shop_id);

        const goalRows = goalNames.map((name, idx) => ({
          client_id: profile.client_id,
          shop_id: profile.shop_id,
          goal_name: name,
          priority_rank: idx + 1,
        }));

        await (supabase as any).from('pt_user_fitness_goals').insert(goalRows);
      }

      // 4. Write training context
      const motivStyles = profile.motivation_style
        ? profile.motivation_style.split(',').filter(Boolean)
        : [];
      const contextPayload = {
        client_id: profile.client_id,
        shop_id: profile.shop_id,
        environment_preference: profile.training_environment || [],
        equipment_access: profile.equipment_access || [],
        session_length: profile.preferred_session_length || null,
        weekly_frequency: profile.training_frequency || null,
        injury_notes: profile.injuries_limitations || null,
        motivation_style: motivStyles,
        updated_at: new Date().toISOString(),
      };

      const { data: existingCtx } = await (supabase as any)
        .from('pt_user_training_context')
        .select('id')
        .eq('client_id', profile.client_id)
        .eq('shop_id', profile.shop_id)
        .maybeSingle();

      if (existingCtx) {
        await (supabase as any)
          .from('pt_user_training_context')
          .update(contextPayload)
          .eq('id', existingCtx.id);
      } else {
        await (supabase as any)
          .from('pt_user_training_context')
          .insert(contextPayload);
      }

      // 5. Compute fitness scores via RPC
      await (supabase as any).rpc('compute_fitness_profile_scores', {
        p_client_id: profile.client_id,
        p_shop_id: profile.shop_id,
      });

      return savedProfile;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pt-client-fitness-profile', variables.client_id, variables.shop_id] });
      queryClient.invalidateQueries({ queryKey: ['pt-fitness-scores', variables.client_id, variables.shop_id] });
    },
  });
};
