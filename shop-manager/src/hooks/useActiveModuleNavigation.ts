import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MODULE_ROUTES, ModuleRouteConfig } from '@/config/moduleRoutes';
import { useEnabledModules } from '@/hooks/useEnabledModules';

export type ModuleSlug = keyof typeof MODULE_ROUTES;

export interface ActiveModuleInfo {
  slug: ModuleSlug | null;
  config: ModuleRouteConfig | null;
  isInModule: boolean;
  isSingleModuleUser: boolean;
  isLoading: boolean;
}

/**
 * Detects the active module based on:
 * 1. Current route (primary)
 * 2. User's enabled modules (if single module user, treat that as active globally)
 */
export function useActiveModuleNavigation(): ActiveModuleInfo {
  const location = useLocation();
  const { getEnabledModuleSlugs, isLoading } = useEnabledModules();

  return useMemo(() => {
    const path = location.pathname;
    const enabledSlugs = getEnabledModuleSlugs();
    const isSingleModuleUser = enabledSlugs.length === 1;

    // Check each module's routes to see if we're in one
    for (const [slug, config] of Object.entries(MODULE_ROUTES)) {
      // Check if current path starts with the module's dashboard route
      if (path.startsWith(config.dashboardRoute)) {
        return {
          slug: slug as ModuleSlug,
          config: config as ModuleRouteConfig,
          isInModule: true,
          isSingleModuleUser,
          isLoading,
        };
      }
    }

    // Not in a module route - check if user has exactly one enabled module
    if (isSingleModuleUser) {
      const singleModuleSlug = enabledSlugs[0] as ModuleSlug;
      const moduleConfig = MODULE_ROUTES[singleModuleSlug];
      if (moduleConfig) {
        return {
          slug: singleModuleSlug,
          config: moduleConfig as ModuleRouteConfig,
          isInModule: true, // Treat single-module users as always "in" their module
          isSingleModuleUser: true,
          isLoading,
        };
      }
    }

    // Not in any module and not a single-module user
    return {
      slug: null,
      config: null,
      isInModule: false,
      isSingleModuleUser: false,
      isLoading,
    };
  }, [location.pathname, getEnabledModuleSlugs, isLoading]);
}

/**
 * Gets grouped sections for a module's navigation
 */
export function getModuleGroupedSections(config: ModuleRouteConfig) {
  const groups: Record<string, typeof config.sections> = {};
  
  for (const section of config.sections) {
    const group = (section as any).group || 'General';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(section);
  }

  // Define group order
  const groupOrder = [
    'Dashboard',
    'Services',
    'Customers',
    'Inventory',
    'Billing',
    'Compliance',
    'Resources',
    'General',
  ];

  // Sort groups by defined order
  const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
    const aIndex = groupOrder.indexOf(a);
    const bIndex = groupOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  return sortedGroups;
}
