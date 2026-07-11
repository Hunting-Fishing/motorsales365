import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

export interface ModuleWorkType {
  id: string;
  module_type: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  display_order: number;
}

export type ActiveModule = 'gunsmith' | 'power_washing' | 'default';

export function useActiveModule(): ActiveModule {
  const location = useLocation();
  
  return useMemo(() => {
    if (location.pathname.includes('/gunsmith')) return 'gunsmith';
    if (location.pathname.includes('/power-washing')) return 'power_washing';
    return 'default';
  }, [location.pathname]);
}

export function useModuleWorkTypes(moduleType?: ActiveModule) {
  const activeModule = useActiveModule();
  const module = moduleType || activeModule;

  const { data: workTypes, isLoading, error } = useQuery({
    queryKey: ['module-work-types', module],
    queryFn: async () => {
      if (module === 'default') {
        // For default modules (marine/automotive), return empty - they use activity_types
        return [];
      }

      const { data, error } = await supabase
        .from('module_work_types')
        .select('*')
        .eq('module_type', module)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as ModuleWorkType[];
    },
    enabled: module !== 'default',
  });

  return {
    workTypes: workTypes || [],
    isLoading,
    error,
    activeModule: module,
    isModuleSpecific: module !== 'default',
  };
}
