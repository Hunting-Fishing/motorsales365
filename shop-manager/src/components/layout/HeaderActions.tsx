import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthUser } from '@/hooks/useAuthUser';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  User, 
  Plus, 
  FileText, 
  Receipt, 
  Calendar,
  Settings as SettingsIcon,
  UserCircle,
  BarChart3,
  Users,
  Brain,
  AlertCircle,
  ClipboardList,
  Code,
  MessageSquarePlus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { usePrimaryRoleInfo } from '@/hooks/useAllUserRoles';
import { useUserRoles } from '@/hooks/useUserRoles';
import { hasRoutePermission } from '@/utils/routeGuards';
import { cleanupAuthState } from '@/utils/authCleanup';
import { useEnabledModules, useUserShopId } from '@/hooks/useEnabledModules';
import { MODULE_ROUTES } from '@/config/moduleRoutes';
import { useQuery } from '@tanstack/react-query';
import { SubmitChangeRequestDialog } from '@/components/gunsmith/SubmitChangeRequestDialog';

export function HeaderActions() {
  const { isAuthenticated, userName, isLoading } = useAuthUser();
  const { primaryRole, allRoles, isDeveloper, isLoading: roleLoading } = usePrimaryRoleInfo();
  const { data: userRoles = [] } = useUserRoles();
  const { modules, getEnabledModuleSlugs } = useEnabledModules();
  const { data: shopId } = useUserShopId();
  const navigate = useNavigate();
  const location = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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

  type AccountMenuSettings = {
    hidden_items?: string[];
    item_overrides?: Record<string, { enabled?: boolean; modules?: string[]; roles?: string[] }>;
  };

  const { data: accountMenuSettings } = useQuery({
    queryKey: ['account-menu-settings', shopId],
    queryFn: async () => {
      if (!shopId) return null;
      const { data, error } = await supabase
        .from('company_settings')
        .select('settings_value')
        .eq('shop_id', shopId)
        .eq('settings_key', 'account_menu')
        .maybeSingle();
      if (error) throw error;
      return (data?.settings_value ?? null) as AccountMenuSettings | null;
    },
    enabled: !!shopId,
  });

  const handleSignOut = async () => {
    try {
      console.log('Initiating sign out...');
      
      // Clean up auth state first
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Global signout error (ignoring):', err);
      }
      
      // Force page reload for clean state
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, redirect to login
      window.location.href = '/login';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/login')}>
          Sign In
        </Button>
      </div>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'default';
      case 'admin':
      case 'administrator':
        return 'destructive';
      case 'manager':
        return 'secondary';
      case 'technician':
        return 'outline';
      case 'customer':
        return 'secondary';
      case 'developer':
        return 'default'; // Special variant for developers
      default:
        return 'outline';
    }
  };

  // Display all roles (e.g., "Owner, Developer")
  const displayRoles = allRoles.map(r => r.displayName).join(', ') || 'User';
  const primaryDisplayRole = primaryRole?.displayName || 'User';
  const enabledSlugs = getEnabledModuleSlugs();
  const enabledModulesWithConfig = enabledSlugs
    .map((slug) => ({
      slug,
      module: modules.find((item) => item.slug === slug),
      config: MODULE_ROUTES[slug],
    }))
    .filter((item) => item.config);
  // Detect module from current path - check module prefix first
  const getModuleFromPath = () => {
    const path = location.pathname;
    if (path.startsWith('/gunsmith')) return 'gunsmith';
    if (path.startsWith('/power-washing')) return 'power_washing';
    if (path.startsWith('/automotive')) return 'automotive';
    if (path.startsWith('/marine')) return 'marine';
    if (path.startsWith('/fuel-delivery')) return 'fuel_delivery';
    return null;
  };
  
  const pathBasedModule = getModuleFromPath();
  const activeModuleSlug = pathBasedModule ?? Object.keys(MODULE_ROUTES).find((slug) => {
    const config = MODULE_ROUTES[slug];
    return (
      location.pathname === config.dashboardRoute ||
      location.pathname.startsWith(`${config.dashboardRoute}/`)
    );
  });
  const moduleContext = activeModuleSlug ?? enabledModulesWithConfig[0]?.slug ?? null;
  const quickActions = moduleContext === 'gunsmith'
    ? [
        { label: 'Create Job', path: '/gunsmith/jobs/new', icon: Plus },
        { label: 'Create Quote', path: '/gunsmith/quotes/new', icon: FileText },
        { label: 'Create Invoice', path: '/gunsmith/invoices/new', icon: Receipt },
        { label: 'Schedule Appointment', path: '/gunsmith/appointments/new', icon: Calendar },
        { label: 'Start Transfer', path: '/gunsmith/transfers/new', icon: ClipboardList },
      ]
    : moduleContext === 'power_washing'
      ? [
          { label: 'Create Job', path: '/power-washing/jobs/new', icon: Plus },
          { label: 'Create Quote', path: '/power-washing/quotes/new', icon: FileText },
          { label: 'Schedule Appointment', path: '/power-washing/schedule', icon: Calendar },
        ]
      : [
          { label: 'Create Work Order', path: '/work-orders/new', icon: Plus, permission: '/work-orders' },
          { label: 'Create Quote', path: '/quotes/new', icon: FileText, permission: '/quotes' },
          { label: 'Create Invoice', path: '/invoices/new', icon: Receipt, permission: '/invoices' },
          { label: 'Schedule Appointment', path: '/calendar', icon: Calendar, permission: '/calendar' },
          { label: 'Maintenance Request', path: '/maintenance-requests', icon: AlertCircle, permission: '/maintenance-requests' },
          { label: 'Daily Logs', path: '/daily-logs', icon: ClipboardList, permission: '/daily-logs' },
        ];

  // Build dynamic team path based on active module
  const teamPath = moduleContext === 'gunsmith' 
    ? '/gunsmith/team'
    : moduleContext === 'power_washing'
      ? '/power-washing/team'
      : '/team';

  // Build account items - add Developer Portal for platform developers
  const accountItems = [
    { id: 'profile', label: 'Profile', path: '/profile', icon: UserCircle },
    { id: 'feedback', label: 'Feedback', path: null, icon: MessageSquarePlus, action: 'openFeedback' },
    { id: 'settings', label: 'Settings', path: '/settings', icon: SettingsIcon },
    ...(isDeveloper ? [{ id: 'developer_portal', label: 'Developer Portal', path: '/developer', icon: Code }] : []),
    { id: 'ai_hub', label: 'AI Hub', path: '/ai-hub', icon: Brain, permission: '/ai-hub' },
    { id: 'reports', label: 'Reports', path: '/reports', icon: BarChart3, permission: '/reports' },
    { id: 'team', label: 'Team', path: teamPath, icon: Users, permission: '/team' },
  ];

  const accountMenuOverrides = accountMenuSettings?.item_overrides ?? {};
  const hiddenAccountItems = new Set(accountMenuSettings?.hidden_items ?? []);
  const isAccountItemVisible = (item: typeof accountItems[number]) => {
    if (hiddenAccountItems.has(item.id)) return false;
    if (item.permission && !hasRoutePermission(item.permission, userRoles)) return false;

    const overrides = accountMenuOverrides[item.id];
    if (overrides?.enabled === false) return false;
    if (overrides?.roles && !overrides.roles.some((role) => userRoles.includes(role))) {
      return false;
    }
    if (overrides?.modules && moduleContext && !overrides.modules.includes(moduleContext)) {
      return false;
    }
    return true;
  };

  return (
    <div className="flex items-center space-x-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center space-x-2 h-auto py-2">
            <User className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{userName || 'User'}</span>
              {!roleLoading && (
                <div className="flex items-center gap-1 flex-wrap">
                  {allRoles.map((role) => (
                    <Badge 
                      key={role.id}
                      variant={getRoleBadgeVariant(role.displayName)} 
                      className="text-xs h-4 px-1"
                    >
                      {role.source === 'developer' && <Code className="w-3 h-3 mr-0.5" />}
                      {role.displayName}
                    </Badge>
                  ))}
                  {allRoles.length === 0 && (
                    <Badge variant="outline" className="text-xs h-4 px-1">User</Badge>
                  )}
                </div>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>My Account</span>
              {!roleLoading && (
                <span className="text-xs text-muted-foreground font-normal">
                  Roles: {displayRoles}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Quick Actions */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Quick Actions
            </DropdownMenuLabel>
            {quickActions.map((action) => {
              if (action.permission && !hasRoutePermission(action.permission, userRoles)) {
                return null;
              }
              const Icon = action.icon;
              return (
                <DropdownMenuItem key={action.path} onClick={() => navigate(action.path)}>
                  <Icon className="mr-2 h-4 w-4" />
                  {action.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          {/* Navigation Links */}
          <DropdownMenuGroup>
            {accountItems.filter(isAccountItemVisible).map((item) => {
              const Icon = item.icon;
              const handleClick = () => {
                if ((item as any).action === 'openFeedback') {
                  setFeedbackOpen(true);
                } else if (item.path) {
                  navigate(item.path);
                }
              };
              return (
                <DropdownMenuItem key={item.id} onClick={handleClick}>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SubmitChangeRequestDialog 
        open={feedbackOpen} 
        onOpenChange={setFeedbackOpen}
        defaultModule={getDefaultModule()}
      />
    </div>
  );
}
