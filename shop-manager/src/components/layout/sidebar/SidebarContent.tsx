import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/hooks/use-sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAllUserRoles } from '@/hooks/useAllUserRoles';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { hasRoutePermission } from '@/utils/routeGuards';
import { getSectionColorScheme } from '@/utils/sectionColors';
import { SidebarLogo } from './SidebarLogo';
import { ModuleIndicator } from './ModuleIndicator';
import { ModuleSections } from './ModuleSections';
import { navigation, NavigationItem } from './navigation';
import { useSidebarVisibility } from '@/hooks/useSidebarVisibility';
import { LayoutGrid, Code } from 'lucide-react';

export function SidebarContent() {
  const location = useLocation();
  const { setIsOpen } = useSidebar();
  const isMobile = useIsMobile();
  const { data: userRoles = [] } = useUserRoles();
  const { data: allRoles = [] } = useAllUserRoles();
  const isPlatformDeveloper = allRoles.some(r => r.source === 'developer');
  const { data: modulePermissions = {}, isLoading: permissionsLoading } = useModulePermissions();
  const { isVisible } = useSidebarVisibility();

  const handleLinkClick = (href: string) => {
    console.log('🔗 Sidebar navigation clicked:', href);
    console.log('📍 Current location:', location.pathname);
    if (isMobile) {
      setIsOpen(false);
    }
  };

  /**
   * Check if user has view permission for a navigation item
   * - If no permissionModule is specified, item is accessible to all
   * - If permissionModule is specified, check if user has view permission for that module
   * Note: Owner role gets full access via the get_user_effective_permissions RPC
   */
  const hasModuleViewPermission = (item: NavigationItem): boolean => {
    // If no permission module specified, allow access
    if (!item.permissionModule) {
      return true;
    }
    
    // While loading, hide items that require permissions to prevent flash of unauthorized content
    if (permissionsLoading) {
      return false;
    }
    
    // Check if user has view permission for this module
    const permission = modulePermissions[item.permissionModule];
    return permission?.view === true;
  };

  // Check if we're currently in a module route (e.g., /gunsmith/*, /automotive/*)
  const moduleRoutePatterns = ['/gunsmith', '/automotive', '/powersports', '/marine-services', '/power-washing', '/water-delivery', '/fuel-delivery', '/septic', '/personal-trainer', '/export', '/welding', '/game-development'];
  const isInModuleRoute = moduleRoutePatterns.some(pattern => 
    location.pathname === pattern || location.pathname.startsWith(pattern + '/')
  );

  // Check if we're on the module hub page
  const isOnModuleHub = location.pathname === '/module-hub';

  // Filter navigation based on:
  // 1. Hide entirely when inside a module or on module hub (module sections handle navigation)
  // 2. Shop-level visibility settings (hidden sections)
  // 3. Role-based section visibility
  // 4. Module-based view permissions for individual items
  // 5. Route-based role permissions (fallback)
  const filteredNavigation = (isInModuleRoute || isOnModuleHub) ? [] : navigation
    .filter(section => isVisible(section.title)) // Check shop-level and role-based visibility
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        // First check module-based permissions (primary check)
        if (!hasModuleViewPermission(item)) {
          return false;
        }
        // Then check route-based role permissions (secondary check)
        return hasRoutePermission(item.href, userRoles);
      })
    }))
    .filter(section => section.items.length > 0);

  return (
    <div className="flex h-full flex-col text-foreground">
      {/* Logo */}
      <div className="relative flex h-16 items-center justify-center px-6 border-b border-border bg-sidebar">
        <SidebarLogo />
      </div>

      {/* Active Module Indicator */}
      <div className="py-3 border-b border-border bg-muted/40">
        <ModuleIndicator />
      </div>

      {/* Navigation */}
      <nav data-lenis-prevent className="flex-1 space-y-2 p-3 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Module Hub Link */}
        <div className="mb-3 space-y-1">
          <Link
            to="/module-hub"
            onClick={() => handleLinkClick('/module-hub')}
            className={cn(
              'group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150',
              location.pathname === '/module-hub'
                ? 'bg-accent text-accent-foreground ring-1 ring-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <LayoutGrid className={cn(
              'mr-3 h-4 w-4 transition-colors',
              location.pathname === '/module-hub' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
            )} />
            All Modules
          </Link>
        </div>

        {/* Developer Sections - Platform Developer only */}
        {isPlatformDeveloper && (
          <div className="mb-3 space-y-1 pt-3 mt-2 border-t border-border">
            <span className="px-3 text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-[0.15em]">
              Developer
            </span>
            {[
              { href: '/water-delivery/developer', label: 'Water Delivery' },
              { href: '/automotive/developer', label: 'Automotive' },
              { href: '/gunsmith/developer', label: 'Gunsmith' },
              { href: '/marine-services/developer', label: 'Marine Services' },
              { href: '/fuel-delivery/developer', label: 'Fuel Delivery' },
              { href: '/power-washing/developer', label: 'Power Washing' },
              { href: '/septic/developer', label: 'Septic Services' },
            ].map((dev) => (
              <Link
                key={dev.href}
                to={dev.href}
                onClick={() => handleLinkClick(dev.href)}
                className={cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150',
                  location.pathname === dev.href
                    ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30'
                    : 'text-muted-foreground hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-500/10 dark:hover:text-orange-300'
                )}
              >
                <Code className="mr-3 h-4 w-4" />
                {dev.label}
              </Link>
            ))}
          </div>
        )}

        {/* Active Module Sections */}
        <ModuleSections />

        {filteredNavigation.map((section) => {
          return (
            <div key={section.title} className="mb-2">
              {/* Section Header */}
              <div className="px-3 pt-3 pb-1.5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  {section.title}
                </h3>
              </div>

              {/* Section Items */}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href ||
                    (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

                  const IconComponent = item.icon;

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => handleLinkClick(item.href)}
                      className={cn(
                        'group relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150',
                        isActive
                          ? 'bg-accent text-accent-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                      title={item.description || item.title}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-primary" />
                      )}
                      <IconComponent
                        className={cn(
                          'mr-3 h-4 w-4 flex-shrink-0 transition-colors',
                          isActive
                            ? 'text-primary'
                            : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      />
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
