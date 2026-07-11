import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Home, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { navSections } from './exportNavData';

interface ExportSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function ExportSidebar({ collapsed = false, onToggle }: ExportSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Dashboard is exact match; sections highlight if on hub OR any child page
  const isDashboardActive = currentPath === '/export';

  const isSectionActive = (section: typeof navSections[0]) => {
    if (currentPath === section.hubRoute) return true;
    return section.items.some(item => {
      if (item.href === '/export') return false; // skip dashboard from overview
      return currentPath.startsWith(item.href);
    });
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
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                <Globe className="h-5 w-5 text-white" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
              </div>
              <div>
                <h2 className="font-semibold text-white tracking-tight truncate max-w-[140px]">
                  Export Company
                </h2>
                <p className="text-xs text-slate-400">Management Module</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto relative p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <Globe className="h-5 w-5 text-white" />
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

      {/* Section Navigation */}
      <ScrollArea className="flex-1 px-2">
        <div className="py-4 space-y-1">
          {/* Dashboard - direct link */}
          <SectionButton
            title="Dashboard"
            icon={LayoutDashboard}
            color="from-emerald-500 to-teal-600"
            active={isDashboardActive}
            collapsed={collapsed}
            onClick={() => navigate('/export')}
          />

          {/* Section hubs */}
          {navSections.filter(s => s.title !== 'Overview' || true).map((section) => (
            <SectionButton
              key={section.hubRoute}
              title={section.title}
              icon={section.hubIcon}
              color={section.hubColor}
              active={isSectionActive(section)}
              collapsed={collapsed}
              onClick={() => navigate(section.hubRoute)}
            />
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
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Ambient glow */}
      <div className="absolute top-20 left-0 w-full h-32 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
    </div>
  );
}

interface SectionButtonProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}

function SectionButton({ title, icon: Icon, color, active, collapsed, onClick }: SectionButtonProps) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
        active
          ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-white shadow-lg shadow-emerald-500/10'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
      )}
      onClick={onClick}
      title={collapsed ? title : undefined}
    >
      <div className={cn(
        'p-2 rounded-lg transition-all duration-200',
        active
          ? `bg-gradient-to-br ${color} shadow-lg`
          : 'bg-slate-700/50 group-hover:bg-slate-600/50'
      )}>
        <Icon className={cn(
          'h-4 w-4 transition-all duration-200',
          active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
        )} />
      </div>
      {!collapsed && (
        <span className={cn('text-sm font-medium transition-all duration-200', active && 'text-white')}>
          {title}
        </span>
      )}
      {active && !collapsed && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 animate-pulse" />
      )}
    </button>
  );
}
