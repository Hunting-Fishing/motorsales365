import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useEnabledModules } from '@/hooks/useEnabledModules';
import { MODULE_ROUTES, getAllModuleRoutes } from '@/config/moduleRoutes';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, AlertCircle, Rocket, Zap } from 'lucide-react';

export function ModuleIndicator() {
  const { modules, hasShop, getEnabledModuleSlugs, isLoading } = useEnabledModules();
  const location = useLocation();
  const currentPath = location.pathname;

  if (isLoading) {
    return (
      <div className="px-3 py-2 mx-2 rounded-lg bg-muted/50 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded" />
      </div>
    );
  }

  // No shop - prompt to complete onboarding
  if (!hasShop) {
    return (
      <Link
        to="/shop-setup"
        className="mx-2 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors block"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Rocket className="h-4 w-4" />
          <span>Complete Setup</span>
        </div>
        <p className="text-xs text-primary/70 mt-0.5">Set up your shop to get started</p>
      </Link>
    );
  }

  const enabledSlugs = getEnabledModuleSlugs();
  
  // Get enabled modules with their configs
  const enabledModulesWithConfig = enabledSlugs
    .map(slug => ({
      slug,
      module: modules.find(m => m.slug === slug),
      config: MODULE_ROUTES[slug]
    }))
    .filter(m => m.config);

  // Has shop but no modules configured
  if (enabledModulesWithConfig.length === 0) {
    return (
      <Link
        to="/module-hub"
        className="mx-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 hover:bg-amber-500/20 transition-colors block dark:text-amber-400"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="h-4 w-4" />
          <span>Set Up Modules</span>
        </div>
        <p className="text-xs opacity-80 mt-0.5">Choose which services you offer</p>
      </Link>
    );
  }

  // Find active module based on current route
  const activeModuleSlug = Object.keys(MODULE_ROUTES).find(slug => {
    const config = MODULE_ROUTES[slug];
    return currentPath === config.dashboardRoute || currentPath.startsWith(config.dashboardRoute + '/');
  });

  // Get the active module config, or fall back to first enabled
  const activeConfig = activeModuleSlug ? MODULE_ROUTES[activeModuleSlug] : enabledModulesWithConfig[0]?.config;
  
  if (!activeConfig) {
    return null;
  }

  const Icon = activeConfig.icon;

  return (
    <div className="mx-2 space-y-1">
      {/* Primary Module */}
      <Link
        to={activeConfig.dashboardRoute}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          "bg-gradient-to-r shadow-sm hover:shadow-md",
          activeConfig.gradientFrom,
          activeConfig.gradientTo,
          "text-white"
        )}
      >
        <div className="p-1.5 bg-white/20 rounded-md">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{activeConfig.name}</p>
          <p className="text-xs text-white/80 truncate">Active Module</p>
        </div>
        <ChevronRight className="h-4 w-4 opacity-60" />
      </Link>

      {/* Additional Modules Count */}
      {enabledModulesWithConfig.length > 1 && (
        <Link
          to="/module-hub"
          className="flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
        >
          <span>+{enabledModulesWithConfig.length - 1} more module{enabledModulesWithConfig.length > 2 ? 's' : ''}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Switch
          </Badge>
        </Link>
      )}

      {/* Platform total */}
      <Link
        to="/module-hub"
        className="flex items-center gap-1.5 px-3 py-1 text-[10px] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        <Zap className="h-3 w-3" />
        <span>{getAllModuleRoutes().length} live modules on platform</span>
      </Link>
    </div>
  );
}
