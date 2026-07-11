import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAllUserRoles } from '@/hooks/useAllUserRoles';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  MessageSquare,
  ClipboardCheck,
  BarChart3 as BarChartIcon,
  UserCog,
  Users,
  Calendar,
  ClipboardList,
  CreditCard,
  Activity,
  Settings,
  Home,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Package,
  BarChart3,
  Target,
  Trophy,
  Gift,
  Palette,
  Utensils,
  Zap,
  Bot,
  Clapperboard,
  UsersRound,
  Clock,
  Pill,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', href: '/personal-trainer', icon: LayoutDashboard, color: 'from-orange-500 to-red-600' },
      { title: 'Reports', href: '/personal-trainer/reports', icon: BarChartIcon, color: 'from-teal-500 to-cyan-600' },
    ],
  },
  {
    title: 'Team',
    items: [
      { title: 'Trainers', href: '/personal-trainer/trainers', icon: UserCog, color: 'from-indigo-500 to-blue-600' },
    ],
  },
  {
    title: 'Clients',
    items: [
      { title: 'All Clients', href: '/personal-trainer/clients', icon: Users, color: 'from-blue-500 to-cyan-500' },
      { title: 'Check-Ins', href: '/personal-trainer/check-ins', icon: ClipboardCheck, color: 'from-lime-500 to-green-600' },
      { title: 'Body Metrics', href: '/personal-trainer/metrics', icon: Activity, color: 'from-emerald-500 to-teal-500' },
      { title: 'Messages', href: '/personal-trainer/messages', icon: MessageSquare, color: 'from-rose-500 to-pink-600' },
    ],
  },
  {
    title: 'Training',
    items: [
      { title: 'Workout Programs', href: '/personal-trainer/programs', icon: ClipboardList, color: 'from-violet-500 to-purple-600' },
      { title: 'Exercise Library', href: '/personal-trainer/exercises', icon: Target, color: 'from-pink-500 to-rose-500' },
      { title: 'Nutrition', href: '/personal-trainer/nutrition', icon: Utensils, color: 'from-green-500 to-emerald-500' },
      { title: 'AI Coach', href: '/personal-trainer/ai-chat', icon: Bot, color: 'from-orange-500 to-red-600' },
      { title: 'Supplements', href: '/personal-trainer/supplements', icon: Pill, color: 'from-emerald-500 to-teal-600' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { title: 'Wearables', href: '/personal-trainer/wearables', icon: Activity, color: 'from-cyan-500 to-blue-500' },
    ],
  },
  {
    title: 'Scheduling',
    items: [
      { title: 'Sessions', href: '/personal-trainer/sessions', icon: Calendar, color: 'from-sky-500 to-blue-600' },
      { title: 'Calendar', href: '/personal-trainer/calendar', icon: CalendarDays, color: 'from-teal-500 to-emerald-600' },
    ],
  },
  {
    title: 'Billing',
    items: [
      { title: 'Packages', href: '/personal-trainer/packages', icon: Package, color: 'from-amber-500 to-orange-600' },
      { title: 'Client Billing', href: '/personal-trainer/billing', icon: CreditCard, color: 'from-green-500 to-emerald-600' },
    ],
  },
  {
    title: 'Business',
    items: [
      { title: 'Gym Staff', href: '/personal-trainer/staff', icon: UsersRound, color: 'from-blue-500 to-indigo-600' },
      { title: 'Time Tracking', href: '/personal-trainer/time-tracking', icon: Clock, color: 'from-green-500 to-teal-600' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { title: 'Social Feed', href: '/personal-trainer/social-feed', icon: Clapperboard, color: 'from-rose-500 to-orange-500' },
      { title: 'Automations', href: '/personal-trainer/automations', icon: Zap, color: 'from-yellow-500 to-orange-600' },
      { title: 'Community', href: '/personal-trainer/community', icon: Users, color: 'from-blue-500 to-indigo-600' },
      { title: 'Challenges', href: '/personal-trainer/challenges', icon: Trophy, color: 'from-amber-500 to-yellow-600' },
      { title: 'Referrals', href: '/personal-trainer/referrals', icon: Gift, color: 'from-pink-500 to-rose-600' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { title: 'Branding', href: '/personal-trainer/branding', icon: Palette, color: 'from-violet-500 to-purple-600' },
      { title: 'Settings', href: '/personal-trainer/settings', icon: Settings, color: 'from-slate-500 to-gray-600' },
      { title: 'About', href: '/personal-trainer/about', icon: Info, color: 'from-blue-500 to-indigo-600' },
    ],
  },
];

interface PersonalTrainerSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function PersonalTrainerSidebar({ collapsed = false, onToggle }: PersonalTrainerSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'personal_trainer');
  const { data: roles = [] } = useAllUserRoles();
  const isOwnerOrAdmin = roles.some(r => ['owner', 'admin'].includes(r.name));

  const filteredSections = useMemo(
    () => navSections.filter(s => s.title !== 'Business' || isOwnerOrAdmin),
    [isOwnerOrAdmin]
  );

  const isActive = (href: string) => {
    if (href === '/personal-trainer') {
      return currentPath === '/personal-trainer';
    }
    return currentPath.startsWith(href);
  };

  return (
    <div
      className={cn(
        'fixed top-0 left-0 z-40 h-full transition-all duration-300 flex flex-col',
        'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-700/50',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25">
                <Dumbbell className="h-5 w-5 text-white" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
              </div>
              <div>
                <h2 className="font-semibold text-white tracking-tight text-sm leading-tight max-w-[140px] break-words line-clamp-2">
                  {moduleInfo?.displayName || 'Personal Trainer'}
                </h2>
                <p className="text-xs text-slate-400">Fitness Module</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto relative p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25">
              <Dumbbell className="h-5 w-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Back to Main */}
      <div className="p-3 border-b border-slate-700/50">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn(
            'w-full group transition-all duration-200',
            'text-slate-300 hover:text-white hover:bg-slate-800/50',
            collapsed ? 'justify-center' : 'justify-start gap-2'
          )}
          onClick={() => navigate('/module-hub')}
        >
          <div className="p-1.5 rounded-lg bg-slate-700/50 group-hover:bg-slate-600/50 transition-colors">
            <Home className="h-4 w-4" />
          </div>
          {!collapsed && <span className="text-sm">Back to Main</span>}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <div className="py-4 space-y-6">
          {filteredSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <h3 className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <button
                      key={item.href}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                        active
                          ? 'bg-gradient-to-r from-orange-500/20 to-red-500/10 text-white shadow-lg shadow-orange-500/10'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      )}
                      onClick={() => navigate(item.href)}
                      title={collapsed ? item.title : undefined}
                    >
                      <div
                        className={cn(
                          'p-2 rounded-lg transition-all duration-200',
                          active
                            ? `bg-gradient-to-br ${item.color} shadow-lg`
                            : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'h-4 w-4 transition-all duration-200',
                            active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                          )}
                        />
                      </div>
                      {!collapsed && (
                        <span className={cn(
                          'text-sm font-medium transition-all duration-200',
                          active && 'text-white'
                        )}>
                          {item.title}
                        </span>
                      )}
                      {active && !collapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-red-400 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Toggle Button */}
      <div className="p-3 border-t border-slate-700/50">
        <Button
          variant="ghost"
          size="icon"
          className="w-full text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200"
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Ambient glow effect */}
      <div className="absolute top-20 left-0 w-full h-32 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none" />
    </div>
  );
}
