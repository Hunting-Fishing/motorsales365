import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NavigationSection, NavigationItem, UserNavigationPreferences, NavigationSectionWithItems } from '@/types/navigation';

export function useNavigationSections() {
  return useQuery({
    queryKey: ['navigation-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('navigation_sections')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as NavigationSection[];
    },
  });
}

export function useNavigationItems() {
  return useQuery({
    queryKey: ['navigation-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('navigation_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as NavigationItem[];
    },
  });
}

export function useUserNavigationPreferences() {
  return useQuery({
    queryKey: ['user-navigation-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_navigation_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserNavigationPreferences | null;
    },
  });
}

export function useUpdateUserNavigationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<UserNavigationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_navigation_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-navigation-preferences'] });
    },
  });
}

export function useNavigationWithRoles(userRoles: string[] = []) {
  const { data: sections } = useNavigationSections();
  const { data: items } = useNavigationItems();
  const { data: preferences } = useUserNavigationPreferences();

  const filteredNavigation = React.useMemo(() => {
    if (!sections || !items) return [];

    // Filter items based on user roles
    const filteredItems = items.filter(item => {
      if (item.required_roles.length === 0) return true;
      return item.required_roles.some(role => userRoles.includes(role));
    });

    // Group items by section and apply user preferences
    const navigationWithItems: NavigationSectionWithItems[] = sections
      .filter(section => !preferences?.hidden_sections.includes(section.id))
      .map(section => ({
        ...section,
        items: filteredItems
          .filter(item => 
            item.section_id === section.id && 
            !preferences?.hidden_items.includes(item.id)
          )
          .sort((a, b) => a.display_order - b.display_order)
      }))
      .filter(section => section.items.length > 0)
      .sort((a, b) => a.display_order - b.display_order);

    return navigationWithItems;
  }, [sections, items, preferences, userRoles]);

  return filteredNavigation;
}