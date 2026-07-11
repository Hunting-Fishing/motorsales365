import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Container,
  LayoutDashboard,
  ClipboardList,
  Users,
  MapPin,
  Package,
  Truck,
  UserCheck,
  Route,
  Receipt,
  Settings,
  Filter,
  FileText,
  DollarSign,
  Home,
  ChevronLeft,
  ChevronRight,
  Cog,
  ShoppingBag,
  Shield,
  Droplets,
  Wrench,
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
      { title: 'Dashboard', href: '/septic', icon: LayoutDashboard, color: 'from-stone-500 to-stone-700' },
      { title: 'Recommended Gear', href: '/septic/store', icon: ShoppingBag, color: 'from-amber-500 to-orange-600' },
    ],
  },
  {
    title: 'Jobs & Scheduling',
    items: [
      { title: 'Service Orders', href: '/septic/orders', icon: ClipboardList, color: 'from-blue-500 to-cyan-500' },
      { title: 'Routes', href: '/septic/routes', icon: Route, color: 'from-emerald-500 to-teal-500' },
      { title: 'Completions', href: '/septic/completions', icon: Truck, color: 'from-violet-500 to-purple-600' },
      { title: 'Quotes', href: '/septic/quotes', icon: FileText, color: 'from-pink-500 to-rose-500' },
    ],
  },
  {
    title: 'Customers & Properties',
    items: [
      { title: 'Customers', href: '/septic/customers', icon: Users, color: 'from-sky-500 to-blue-600' },
      { title: 'Locations', href: '/septic/locations', icon: MapPin, color: 'from-red-500 to-rose-600' },
    ],
  },
  {
    title: 'Fleet Management',
    items: [
      { title: 'Pump Trucks', href: '/septic/trucks', icon: Truck, color: 'from-slate-500 to-zinc-600' },
      { title: 'Employees', href: '/septic/staff', icon: Users, color: 'from-amber-500 to-orange-600' },
      { title: 'Drivers', href: '/septic/drivers', icon: UserCheck, color: 'from-green-500 to-emerald-600' },
      { title: 'Driver App', href: '/septic/driver-app', icon: Container, color: 'from-stone-500 to-stone-700' },
    ],
  },
  {
    title: 'Tanks & Systems',
    items: [
      { title: 'Septic Tanks', href: '/septic/tanks', icon: Container, color: 'from-indigo-500 to-violet-600' },
      { title: 'System Components', href: '/septic/tidy-tanks', icon: Package, color: 'from-fuchsia-500 to-pink-600' },
      { title: 'Pump-Outs', href: '/septic/tank-fills', icon: Droplets, color: 'from-cyan-500 to-blue-500' },
      { title: 'Equipment', href: '/septic/equipment', icon: Wrench, color: 'from-gray-500 to-slate-600' },
      { title: 'Filters', href: '/septic/equipment-filters', icon: Filter, color: 'from-lime-500 to-green-600' },
    ],
  },
  {
    title: 'Inventory & Purchasing',
    items: [
      { title: 'Inventory', href: '/septic/inventory', icon: Package, color: 'from-teal-500 to-cyan-600' },
      { title: 'Products', href: '/septic/products', icon: Container, color: 'from-stone-500 to-stone-600' },
      { title: 'Purchases', href: '/septic/purchases', icon: FileText, color: 'from-blue-500 to-indigo-500' },
      { title: 'Pricing', href: '/septic/pricing', icon: DollarSign, color: 'from-emerald-500 to-green-600' },
    ],
  },
  {
    title: 'Billing',
    items: [
      { title: 'Invoices', href: '/septic/invoices', icon: Receipt, color: 'from-purple-500 to-indigo-600' },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { title: 'Inspections', href: '/septic/inspections', icon: Shield, color: 'from-green-600 to-emerald-700' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { title: 'Settings', href: '/septic/settings', icon: Cog, color: 'from-slate-500 to-gray-600' },
    ],
  },
];

interface SepticSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function SepticSidebar({ collapsed = false, onToggle }: SepticSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'septic');

  const isActive = (href: string) => {
    if (href === '/septic') return currentPath === '/septic';
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
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-stone-500 to-stone-700 shadow-lg shadow-stone-500/25">
                <Container className="h-5 w-5 text-white" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
              </div>
              <div>
                <h2 className="font-semibold text-white tracking-tight truncate max-w-[140px]">
                  {moduleInfo?.displayName || 'Septic Services'}
                </h2>
                <p className="text-xs text-slate-400">Management Module</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto relative p-2.5 rounded-xl bg-gradient-to-br from-stone-500 to-stone-700 shadow-lg shadow-stone-500/25">
              <Container className="h-5 w-5 text-white" />
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
          {navSections.map((section) => (
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
                          ? 'bg-gradient-to-r from-stone-500/20 to-stone-600/10 text-white shadow-lg shadow-stone-500/10'
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
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-stone-400 to-stone-500 animate-pulse" />
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
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="absolute top-20 left-0 w-full h-32 bg-gradient-to-b from-stone-500/5 to-transparent pointer-events-none" />
    </div>
  );
}
