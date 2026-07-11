import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bell, 
  Search, 
  Menu,
  Settings,
  User,
  LogOut,
  Plus,
  FileText,
  Receipt,
  Calendar,
  UserCircle,
  MessageSquarePlus,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useUserRoles } from '@/hooks/useUserRoles';
import { hasRoutePermission } from '@/utils/routeGuards';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useActiveModuleNavigation, getModuleGroupedSections } from '@/hooks/useActiveModuleNavigation';
import { SubmitChangeRequestDialog } from '@/components/gunsmith/SubmitChangeRequestDialog';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showMenu?: boolean;
  onSearch?: () => void;
  rightAction?: React.ReactNode;
}

export function MobileHeader({
  title,
  showBack = false,
  showSearch = false,
  showNotifications = true,
  showMenu = true,
  onSearch,
  rightAction
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { user } = useAuthUser();
  const { data: userRoles = [] } = useUserRoles();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { slug: activeModuleSlug, config: activeModuleConfig, isInModule } = useActiveModuleNavigation();

  // Auto-detect module from current path
  const getDefaultModule = (): 'gunsmith' | 'power_washing' | 'automotive' | 'marine' | 'fuel_delivery' | 'general' => {
    const path = location.pathname;
    if (path.startsWith('/gunsmith')) return 'gunsmith';
    if (path.startsWith('/power-washing')) return 'power_washing';
    if (path.startsWith('/automotive')) return 'automotive';
    if (path.startsWith('/marine')) return 'marine';
    if (path.startsWith('/fuel-delivery')) return 'fuel_delivery';
    return 'general';
  };

  const getPageTitle = () => {
    if (title) return title;
    
    const path = location.pathname;
    
    // Module-specific titles
    if (isInModule && activeModuleConfig) {
      // Find matching section for current path
      const matchingSection = activeModuleConfig.sections.find(s => 
        path === s.href || (path.startsWith(s.href) && s.href !== activeModuleConfig.dashboardRoute)
      );
      
      if (matchingSection) {
        return matchingSection.title;
      }
      
      // Dashboard
      if (path === activeModuleConfig.dashboardRoute) {
        return `${activeModuleConfig.name}`;
      }
    }
    
    // Default titles
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/work-orders')) return 'Work Orders';
    if (path.startsWith('/customers')) return 'Customers';
    if (path.startsWith('/inventory')) return 'Inventory';
    if (path.startsWith('/invoices')) return 'Invoices';
    if (path.startsWith('/calendar')) return 'Service Calendar';
    if (path.startsWith('/scheduling')) return 'Staff Scheduling';
    if (path.startsWith('/shopping')) return 'Shop';
    if (path.startsWith('/ai')) return 'AI Hub';
    return 'All Business 365';
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleNotifications = () => {
    navigate('/notifications');
  };

  // Build navigation sections based on active module
  const navigationSections = React.useMemo(() => {
    if (isInModule && activeModuleConfig) {
      // Module-specific navigation
      const groupedSections = getModuleGroupedSections(activeModuleConfig);
      
      return groupedSections.map(([groupName, items]) => ({
        title: groupName,
        items: items.map(item => ({
          label: item.title,
          icon: item.icon as LucideIcon,
          path: item.href,
          requiredPath: item.href,
        })),
      }));
    }

    // Not in a module - show minimal navigation
    return [];
  }, [isInModule, activeModuleConfig]);

  // Quick Actions based on module
  const quickActions = React.useMemo(() => {
    if (isInModule && activeModuleConfig) {
      const sections = activeModuleConfig.sections;
      const actions: Array<{ label: string; icon: LucideIcon; path: string }> = [];
      
      // Find jobs/orders section for "New Job" action
      const jobs = sections.find(s => s.title === 'All Jobs' || s.title === 'Orders');
      if (jobs) {
        actions.push({
          label: jobs.title === 'Orders' ? 'New Order' : 'New Job',
          icon: Plus,
          path: `${jobs.href}/new`,
        });
      }
      
      // Find quotes section
      const quotes = sections.find(s => s.title === 'Quotes');
      if (quotes) {
        actions.push({
          label: 'New Quote',
          icon: FileText,
          path: `${quotes.href}/new`,
        });
      }

      return actions;
    }

    // Default quick actions
    return [
      { label: 'Create Work Order', icon: Plus, path: '/work-orders/new' },
      { label: 'Create Quote', icon: FileText, path: '/quotes/new' },
    ].filter(item => hasRoutePermission(item.path, userRoles));
  }, [isInModule, activeModuleConfig, userRoles]);

  // User Profile items
  const profileItems = [
    { label: 'Profile', icon: UserCircle, path: '/profile' },
    { label: 'Feedback', icon: MessageSquarePlus, path: null, action: 'openFeedback' },
    { label: 'Notifications', icon: Bell, path: '/notifications' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleMenuItemClick = (path: string | null, action?: string) => {
    if (action === 'openFeedback') {
      setFeedbackOpen(true);
      setIsMenuOpen(false);
      return;
    }
    if (path) {
      console.log('📱 Mobile menu navigation clicked:', path);
      console.log('📍 Current location:', location.pathname);
      console.log('🔑 User roles:', userRoles);
      navigate(path);
      setIsMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left Section */}
        <div className="flex items-center flex-1 min-w-0">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mr-2 p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <h1 className="text-lg font-semibold truncate">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {showSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSearch}
              className="p-2"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          {showNotifications && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNotifications}
              className="relative p-2"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          )}

          {rightAction}

          {showMenu && (
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 overflow-y-auto">
                <div className="flex flex-col h-full">
                  {/* User Info */}
                  <div className="border-b border-border pb-4 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {user?.email || 'User'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          All Business 365
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <nav className="flex-1 overflow-y-auto">
                    {/* Quick Actions */}
                    {quickActions.length > 0 && (
                      <div className="mb-6">
                        <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Quick Actions
                        </h3>
                        <div className="space-y-1">
                          {quickActions.map((item) => (
                            <button
                              key={item.path}
                              onClick={() => handleMenuItemClick(item.path)}
                              className="w-full flex items-center space-x-3 px-3 py-2.5 text-left rounded-md hover:bg-accent transition-colors"
                            >
                              <item.icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Navigation Sections */}
                    {navigationSections.map((section) => (
                      <div key={section.title} className="mb-6">
                        <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {section.title}
                        </h3>
                        <div className="space-y-1">
                          {section.items.map((item) => (
                            <button
                              key={item.path}
                              onClick={() => handleMenuItemClick(item.path)}
                              className={cn(
                                "w-full flex items-center space-x-3 px-3 py-2.5 text-left rounded-md hover:bg-accent transition-colors",
                                location.pathname === item.path && "bg-accent text-accent-foreground"
                              )}
                            >
                              <item.icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Divider */}
                    <div className="border-t border-border my-4" />

                    {/* User Profile Section */}
                    <div className="mb-4">
                      <div className="space-y-1">
                        {profileItems.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => handleMenuItemClick(item.path, (item as any).action)}
                            className={cn(
                              "w-full flex items-center space-x-3 px-3 py-2.5 text-left rounded-md hover:bg-accent transition-colors",
                              item.path && location.pathname === item.path && "bg-accent text-accent-foreground"
                            )}
                          >
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </nav>

                  {/* Sign Out */}
                  <div className="border-t border-border pt-4">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 px-3 py-3 text-left rounded-md hover:bg-accent transition-colors text-destructive"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      <SubmitChangeRequestDialog 
        open={feedbackOpen} 
        onOpenChange={setFeedbackOpen}
        defaultModule={getDefaultModule()}
      />
    </header>
  );
}