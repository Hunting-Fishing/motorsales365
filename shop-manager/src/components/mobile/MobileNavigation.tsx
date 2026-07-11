import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  MoreHorizontal,
  ChevronRight,
  Briefcase,
  Users,
  Package,
  MessageSquarePlus,
  Settings,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { useActiveModuleNavigation, getModuleGroupedSections } from '@/hooks/useActiveModuleNavigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SubmitChangeRequestDialog } from '@/components/gunsmith/SubmitChangeRequestDialog';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
}

export function MobileNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const [moreOpen, setMoreOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { slug: activeModuleSlug, config: activeModuleConfig, isInModule } = useActiveModuleNavigation();

  // Auto-detect module from current path
  const getDefaultModule = (): 'gunsmith' | 'power_washing' | 'automotive' | 'marine' | 'fuel_delivery' | 'export_company' | 'personal_trainer' | 'welding' | 'game_development' | 'general' => {
    const path = location.pathname;
    if (path.startsWith('/gunsmith')) return 'gunsmith';
    if (path.startsWith('/power-washing')) return 'power_washing';
    if (path.startsWith('/automotive')) return 'automotive';
    if (path.startsWith('/marine')) return 'marine';
    if (path.startsWith('/fuel-delivery')) return 'fuel_delivery';
    if (path.startsWith('/export')) return 'export_company';
    if (path.startsWith('/personal-trainer')) return 'personal_trainer';
    if (path.startsWith('/welding')) return 'welding';
    if (path.startsWith('/game-development')) return 'game_development';
    return 'general';
  };

  // Build nav items based on active module
  const navItems: NavItem[] = React.useMemo(() => {
    if (isInModule && activeModuleConfig) {
      // Module-specific navigation
      const sections = activeModuleConfig.sections;
      
      // Find key items for bottom nav (Dashboard, Jobs/Orders, Customers, Parts/Inventory)
      const dashboard = sections.find(s => s.title === 'Dashboard');
      const jobs = sections.find(s => s.title === 'All Jobs' || s.title === 'Orders');
      const customers = sections.find(s => s.title === 'Customers');
      const parts = sections.find(s => s.title === 'Parts' || s.title === 'Inventory');

      const items: NavItem[] = [];

      if (dashboard) {
        items.push({
          id: 'dashboard',
          label: 'Home',
          icon: Home,
          path: dashboard.href,
        });
      }

      if (jobs) {
        items.push({
          id: 'jobs',
          label: jobs.title === 'Orders' ? 'Orders' : 'Jobs',
          icon: jobs.icon as LucideIcon || Briefcase,
          path: jobs.href,
        });
      }

      if (customers) {
        items.push({
          id: 'customers',
          label: 'Customers',
          icon: customers.icon as LucideIcon || Users,
          path: customers.href,
        });
      }

      if (parts) {
        items.push({
          id: 'parts',
          label: parts.title,
          icon: parts.icon as LucideIcon || Package,
          path: parts.href,
        });
      }

      // Always add More button
      items.push({
        id: 'more',
        label: 'More',
        icon: MoreHorizontal,
        path: '',
      });

      return items;
    }

    // Default navigation (not in a module)
    return [
      { id: 'dashboard', label: 'Home', icon: Home, path: '/dashboard' },
      { id: 'more', label: 'More', icon: MoreHorizontal, path: '' },
    ];
  }, [isInModule, activeModuleConfig]);

  // Build "More" menu sections based on active module
  const moreMenuSections = React.useMemo(() => {
    if (isInModule && activeModuleConfig) {
      const groupedSections = getModuleGroupedSections(activeModuleConfig);
      
      return groupedSections
        .filter(([groupName]) => groupName !== 'Dashboard') // Don't show dashboard in "more"
        .map(([groupName, items]) => ({
          title: groupName,
          items: items.map(item => ({
            id: item.href,
            label: item.title,
            icon: item.icon as LucideIcon,
            path: item.href,
            description: (item as any).description,
          })),
        }));
    }

    // Default - show nothing (user not in module)
    return [];
  }, [isInModule, activeModuleConfig]);

  const handleNavigation = (path: string) => {
    if (path) {
      navigate(path);
      setMoreOpen(false);
    }
  };

  const isActive = (path: string) => {
    if (!path) return false;
    
    // Exact match for dashboard
    if (path === location.pathname) return true;
    
    // For non-dashboard routes, check if current path starts with the nav path
    // but only if it's not the dashboard path
    if (activeModuleConfig && path !== activeModuleConfig.dashboardRoute) {
      return location.pathname.startsWith(path);
    }
    
    return false;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.path ? isActive(item.path) : false;
          
          if (item.id === 'more') {
            return (
              <Sheet key={item.id} open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetTrigger asChild>
                  <button
                    className={cn(
                      "flex flex-col items-center justify-center min-w-0 flex-1 py-1 px-1 transition-colors relative",
                      moreOpen 
                        ? "text-primary" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5 mb-1" />
                      {unreadCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs font-medium truncate max-w-full">
                      {item.label}
                    </span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
                  <SheetHeader className="pb-4 border-b">
                    <SheetTitle>
                      {activeModuleConfig ? activeModuleConfig.name : 'More Options'}
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-full pb-20">
                    <div className="py-4 space-y-6">
                      {moreMenuSections.length > 0 ? (
                        moreMenuSections.map((section) => (
                          <div key={section.title}>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                              {section.title}
                            </h3>
                            <div className="space-y-1">
                              {section.items.map((menuItem) => {
                                const MenuIcon = menuItem.icon;
                                const isMenuActive = isActive(menuItem.path);
                                
                                return (
                                  <button
                                    key={menuItem.id}
                                    onClick={() => handleNavigation(menuItem.path)}
                                    className={cn(
                                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                                      isMenuActive 
                                        ? "bg-primary/10 text-primary" 
                                        : "hover:bg-muted"
                                    )}
                                  >
                                    <MenuIcon className="h-5 w-5 flex-shrink-0" />
                                    <div className="flex-1 text-left">
                                      <div className="font-medium">{menuItem.label}</div>
                                      {menuItem.description && (
                                        <div className="text-xs text-muted-foreground">
                                          {menuItem.description}
                                        </div>
                                      )}
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          <p>No additional options available</p>
                        </div>
                      )}

                      {/* Account section at bottom */}
                      <div className="border-t pt-4">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                          Account
                        </h3>
                        <div className="space-y-1">
                          <button
                            onClick={() => handleNavigation('/profile')}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted"
                          >
                            <Users className="h-5 w-5 flex-shrink-0" />
                            <span className="font-medium">Profile</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                          </button>
                          <button
                            onClick={() => {
                              setFeedbackOpen(true);
                              setMoreOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted"
                          >
                            <MessageSquarePlus className="h-5 w-5 flex-shrink-0" />
                            <span className="font-medium">Feedback</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                          </button>
                          <button
                            onClick={() => handleNavigation('/settings')}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted"
                          >
                            <Settings className="h-5 w-5 flex-shrink-0" />
                            <span className="font-medium">Settings</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center min-w-0 flex-1 py-1 px-1 transition-colors relative",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon 
                  className={cn(
                    "h-5 w-5 mb-1",
                    active && "text-primary"
                  )} 
                />
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-xs font-medium truncate max-w-full",
                active && "text-primary"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <SubmitChangeRequestDialog 
        open={feedbackOpen} 
        onOpenChange={setFeedbackOpen}
        defaultModule={getDefaultModule()}
      />
    </div>
  );
}
