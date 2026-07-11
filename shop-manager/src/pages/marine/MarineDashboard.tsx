import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Anchor,
  FileText,
  Plus,
  ClipboardList,
  Package,
  Receipt,
  CreditCard,
  CalendarDays,
  Wrench,
  Ship,
  AlertTriangle,
  Settings,
  DollarSign,
  Calendar,
  Users,
  Waves,
  Snowflake,
  Shield,
  Navigation,
  Compass,
} from 'lucide-react';
import {
  ModuleDashboardHeader,
  ModuleDashboardStats,
  ModuleDashboardAlerts,
  ModuleDashboardQuickActions,
  ModuleDashboardRecentActivity,
} from '@/components/module-dashboard';
import { useMarineStats, useMarineWorkOrders, useMarineInspections } from '@/hooks/useMarineStats';

export default function MarineDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useMarineStats();
  const { data: recentWorkOrders, isLoading: workOrdersLoading } = useMarineWorkOrders();
  const { data: recentInspections, isLoading: inspectionsLoading } = useMarineInspections();

  const statCards = [
    {
      title: 'Pending Jobs',
      value: stats?.pendingJobs || 0,
      icon: ClipboardList,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'In Progress',
      value: stats?.inProgressJobs || 0,
      icon: Wrench,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Docked Vessels',
      value: stats?.dockedVessels || 0,
      icon: Anchor,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      title: 'Completed (MTD)',
      value: stats?.completedJobs || 0,
      icon: Calendar,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Revenue (MTD)',
      value: `$${(stats?.revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Scheduled Haul-Outs',
      value: stats?.scheduledHaulOuts || 0,
      icon: Ship,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Inspections (MTD)',
      value: stats?.inspectionsThisMonth || 0,
      icon: Shield,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
    {
      title: 'Winterizations Due',
      value: stats?.winterizationsDue || 0,
      icon: Snowflake,
      color: 'text-sky-500',
      bgColor: 'bg-sky-500/10',
    },
  ];

  const alerts: { type: 'warning' | 'critical'; message: string; action: () => void }[] = [];

  const quickActions = [
    { label: 'All Jobs', icon: ClipboardList, onClick: () => navigate('/work-orders') },
    { label: 'Vessels', icon: Ship, onClick: () => navigate('/fleet') },
    { label: 'Parts', icon: Package, onClick: () => navigate('/inventory') },
    { label: 'Quotes', icon: FileText, onClick: () => navigate('/quotes'), color: 'text-amber-500', borderColor: 'border-amber-500/30', hoverBg: 'hover:bg-amber-500/5' },
    { label: 'Invoices', icon: Receipt, onClick: () => navigate('/invoices'), color: 'text-green-500', borderColor: 'border-green-500/30', hoverBg: 'hover:bg-green-500/5' },
    { label: 'Payments', icon: CreditCard, onClick: () => navigate('/payments'), color: 'text-emerald-500', borderColor: 'border-emerald-500/30', hoverBg: 'hover:bg-emerald-500/5' },
    { label: 'Dock Schedule', icon: CalendarDays, onClick: () => navigate('/calendar'), color: 'text-blue-500', borderColor: 'border-blue-500/30', hoverBg: 'hover:bg-blue-500/5' },
    { label: 'Inspections', icon: Shield, onClick: () => navigate('/vessel-inspection'), color: 'text-purple-500', borderColor: 'border-purple-500/30', hoverBg: 'hover:bg-purple-500/5' },
    { label: 'Sea Trials', icon: Navigation, onClick: () => navigate('/work-orders'), color: 'text-cyan-500', borderColor: 'border-cyan-500/30', hoverBg: 'hover:bg-cyan-500/5' },
    { label: 'Haul-Outs', icon: Anchor, onClick: () => navigate('/work-orders'), color: 'text-orange-500', borderColor: 'border-orange-500/30', hoverBg: 'hover:bg-orange-500/5' },
    { label: 'Winterization', icon: Snowflake, onClick: () => navigate('/work-orders'), color: 'text-sky-500', borderColor: 'border-sky-500/30', hoverBg: 'hover:bg-sky-500/5' },
    { label: 'Customers', icon: Users, onClick: () => navigate('/customers'), color: 'text-indigo-500', borderColor: 'border-indigo-500/30', hoverBg: 'hover:bg-indigo-500/5' },
  ];

  const leftPanelItems = (recentWorkOrders || []).map((wo: any) => ({
    id: wo.id,
    title: wo.work_order_number || 'N/A',
    subtitle: `${wo.customers?.first_name || ''} ${wo.customers?.last_name || ''} - ${wo.vehicles?.year || ''} ${wo.vehicles?.make || ''} ${wo.vehicles?.model || ''}`.trim(),
    badge: {
      text: wo.status?.replace('_', ' ') || 'pending',
      variant: wo.status === 'completed' ? 'default' as const : wo.status === 'in_progress' ? 'secondary' as const : 'outline' as const,
    },
    onClick: () => navigate(`/work-orders/${wo.id}`),
  }));

  const rightPanelItems = (recentInspections || []).map((insp: any) => ({
    id: insp.id,
    title: insp.vessel_name || 'Unknown Vessel',
    subtitle: `Inspector: ${insp.inspector_name || 'N/A'}`,
    badge: {
      text: insp.overall_condition || 'N/A',
      variant: insp.overall_condition === 'good' ? 'default' as const : 'outline' as const,
    },
    meta: insp.inspection_date ? format(new Date(insp.inspection_date), 'MMM d, yyyy') : '',
    onClick: () => navigate('/vessel-inspection'),
  }));

  return (
    <div className="min-h-screen bg-background p-6">
      <ModuleDashboardHeader
        icon={Anchor}
        iconColor="text-cyan-600"
        title="Marine Services"
        description="Boat and watercraft maintenance and repair"
        actions={[
          { label: 'New Quote', icon: FileText, onClick: () => navigate('/quotes/new'), variant: 'outline' },
          { label: 'New Work Order', icon: Plus, onClick: () => navigate('/work-orders/new') },
        ]}
      />

      <ModuleDashboardAlerts alerts={alerts} />

      <ModuleDashboardStats stats={statCards} isLoading={statsLoading} />

      <ModuleDashboardQuickActions actions={quickActions} />

      <ModuleDashboardRecentActivity
        leftPanel={{
          title: 'Recent Work Orders',
          items: leftPanelItems,
          isLoading: workOrdersLoading,
          emptyIcon: Wrench,
          emptyMessage: 'No work orders yet',
          emptyActionLabel: 'Create your first work order',
          emptyActionOnClick: () => navigate('/work-orders/new'),
          viewAllOnClick: () => navigate('/work-orders'),
        }}
        rightPanel={{
          title: 'Recent Inspections',
          items: rightPanelItems,
          isLoading: inspectionsLoading,
          emptyIcon: Shield,
          emptyMessage: 'No inspections yet',
          emptyActionLabel: 'Start a vessel inspection',
          emptyActionOnClick: () => navigate('/vessel-inspection'),
          viewAllOnClick: () => navigate('/vessel-inspection-history'),
        }}
      />
    </div>
  );
}
