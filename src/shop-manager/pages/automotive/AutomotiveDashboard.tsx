import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Car, FileText, Plus, ClipboardList, Package, Receipt, CreditCard, CalendarDays,
  Wrench, History, AlertTriangle, Settings, DollarSign, Clock, Users,
  Truck, FileSearch, MessageSquare, Megaphone, Briefcase, Shield, Building2,
  ShoppingCart, Hammer, ChevronRight, AlertCircle, XCircle, Sparkles, Activity,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAutomotiveStats, useAutomotiveWorkOrders, useAutomotiveAppointments } from '@/hooks/useAutomotiveStats';
import {
  BentoStatCard,
  CategoryTile,
  ModuleHero,
  QuickActionRail,
  ActivityFeedCard,
} from '@/components/module-dashboard/bento';
import { Particles } from '@/components/ui/magicui/particles';
import heroCar from '@/assets/automotive-hero.jpg';

export default function AutomotiveDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useAutomotiveStats();
  const { data: recentWorkOrders, isLoading: workOrdersLoading } = useAutomotiveWorkOrders();
  const { data: upcomingAppointments, isLoading: appointmentsLoading } = useAutomotiveAppointments();

  const openJobs = (stats?.pendingJobs || 0) + (stats?.inProgressJobs || 0) + (stats?.awaitingPartsJobs || 0);

  const statCards = [
    { title: 'Revenue (MTD)', value: `$${(stats?.revenue || 0).toLocaleString()}`, icon: DollarSign, gradient: 'from-emerald-500 to-teal-600', featured: true, hint: 'Month-to-date earnings' },
    { title: 'Pending Jobs', value: stats?.pendingJobs ?? 0, icon: ClipboardList, gradient: 'from-amber-500 to-orange-600' },
    { title: 'In Progress', value: stats?.inProgressJobs ?? 0, icon: Wrench, gradient: 'from-blue-500 to-indigo-600' },
    { title: 'Awaiting Parts', value: stats?.awaitingPartsJobs ?? 0, icon: Package, gradient: 'from-yellow-500 to-amber-600' },
    { title: 'Completed (MTD)', value: stats?.completedJobs ?? 0, icon: CheckCircle2, gradient: 'from-green-500 to-emerald-600' },
    { title: "Today's Appts", value: stats?.todayAppointments ?? 0, icon: Clock, gradient: 'from-purple-500 to-fuchsia-600' },
    { title: 'Overdue Invoices', value: stats?.overdueInvoices ?? 0, icon: AlertTriangle, gradient: 'from-red-500 to-rose-600' },
    { title: 'Low Stock', value: stats?.lowStockParts ?? 0, icon: Package, gradient: 'from-orange-500 to-red-600' },
  ];

  const alerts: Array<{ type: 'warning' | 'critical'; message: string; onClick: () => void }> = [];
  if (stats?.lowStockParts && stats.lowStockParts > 0) {
    alerts.push({ type: 'warning', message: `${stats.lowStockParts} part(s) running low on stock`, onClick: () => navigate('/inventory') });
  }
  if (stats?.overdueInvoices && stats.overdueInvoices > 0) {
    alerts.push({ type: 'critical', message: `${stats.overdueInvoices} invoice(s) are overdue`, onClick: () => navigate('/invoices') });
  }

  const quickActions = [
    { label: 'All Jobs', icon: ClipboardList, onClick: () => navigate('/work-orders') },
    { label: 'Vehicles', icon: Car, onClick: () => navigate('/vehicles') },
    { label: 'Parts', icon: Package, onClick: () => navigate('/inventory') },
    { label: 'Quotes', icon: FileText, onClick: () => navigate('/quotes') },
    { label: 'Invoices', icon: Receipt, onClick: () => navigate('/invoices') },
    { label: 'Payments', icon: CreditCard, onClick: () => navigate('/payments') },
    { label: 'Appointments', icon: CalendarDays, onClick: () => navigate('/booking-management') },
    { label: 'History', icon: History, onClick: () => navigate('/automotive/vehicle-history') },
    { label: 'Diagnostics', icon: Settings, onClick: () => navigate('/automotive/diagnostics') },
    { label: 'Labor Rates', icon: DollarSign, onClick: () => navigate('/automotive/labor-rates') },
    { label: 'TSB & Recalls', icon: FileSearch, onClick: () => navigate('/automotive/recalls') },
    { label: 'Customers', icon: Users, onClick: () => navigate('/customers') },
  ];

  const categoryTiles = [
    { label: 'Services', icon: Briefcase, href: '/work-orders', gradient: 'from-blue-500 to-indigo-600', description: 'Jobs, quotes & invoices' },
    { label: 'Customers', icon: Users, href: '/customers', gradient: 'from-indigo-500 to-purple-600', description: 'Customer management' },
    { label: 'Inventory', icon: Package, href: '/inventory', gradient: 'from-amber-500 to-orange-600', description: 'Parts & stock' },
    { label: 'Scheduling', icon: CalendarDays, href: '/booking-management', gradient: 'from-purple-500 to-fuchsia-600', description: 'Appointments & calendar' },
    { label: 'Communications', icon: MessageSquare, href: '/customer-comms', gradient: 'from-cyan-500 to-blue-600', description: 'Customer messaging' },
    { label: 'Marketing', icon: Megaphone, href: '/email-campaigns', gradient: 'from-pink-500 to-rose-600', description: 'Campaigns & SMS' },
    { label: 'Operations', icon: ClipboardList, href: '/daily-logs', gradient: 'from-green-500 to-emerald-600', description: 'Daily logs & service board' },
    { label: 'Equipment & Tools', icon: Hammer, href: '/equipment', gradient: 'from-orange-500 to-red-600', description: 'Shop equipment' },
    { label: 'Fleet Operations', icon: Truck, href: '/fleet-management', gradient: 'from-teal-500 to-cyan-600', description: 'Fleet & vehicles' },
    { label: 'Safety & Compliance', icon: Shield, href: '/safety', gradient: 'from-red-500 to-rose-600', description: 'Inspections & safety' },
    { label: 'Company', icon: Building2, href: '/company-profile', gradient: 'from-slate-500 to-zinc-700', description: 'Business settings' },
    { label: 'Store', icon: ShoppingCart, href: '/shopping', gradient: 'from-emerald-500 to-green-600', description: 'Shop & products' },
  ];

  return (
    <div className="relative min-h-screen bg-background">
      <Particles className="absolute inset-0 -z-10 opacity-50" quantity={60} />
      <div className="relative mx-auto max-w-7xl space-y-8 p-4 md:p-6 lg:p-8">
        <ModuleHero
          eyebrow="Active Module"
          title="Automotive Repair"
          description="Full-service auto repair shop command center — jobs, parts, customers, and revenue all in one place."
          icon={Car}
          accentGradient="from-orange-500 to-amber-500"
          bgImage={heroCar}
          pills={[
            { icon: Wrench, label: 'Open Jobs', value: openJobs },
            { icon: Activity, label: 'Today', value: stats?.todayAppointments || 0 },
            { icon: DollarSign, label: 'MTD', value: `$${(stats?.revenue || 0).toLocaleString()}` },
          ]}
          actions={[
            { label: 'New Work Order', icon: Plus, onClick: () => navigate('/work-orders/new'), variant: 'primary' },
            { label: 'New Quote', icon: FileText, onClick: () => navigate('/quotes/new'), variant: 'secondary' },
          ]}
        />

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {alerts.map((alert, i) => (
              <button
                key={i}
                onClick={alert.onClick}
                className={cn(
                  'group flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all hover:shadow-md',
                  alert.type === 'critical'
                    ? 'border-rose-300/60 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200'
                    : 'border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
                )}
              >
                {alert.type === 'critical' ? <XCircle className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
                <span className="flex-1 text-sm font-medium">{alert.message}</span>
                <ChevronRight className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        )}

        {/* Bento Stats */}
        <section>
          <SectionHeader title="At a Glance" subtitle="Live operational metrics" icon={Sparkles} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {statsLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={cn('h-32 animate-pulse rounded-2xl bg-muted', i === 0 && 'md:col-span-2')} />
                ))
              : statCards.map((s, i) => (
                  <BentoStatCard key={s.title} {...s} delay={i * 40} />
                ))}
          </div>
        </section>

        {/* Quick Actions Rail */}
        <section>
          <SectionHeader title="Quick Actions" subtitle="One-tap shortcuts" icon={Wrench} />
          <QuickActionRail actions={quickActions} />
        </section>

        {/* Category Bento */}
        <section>
          <SectionHeader title="Workspaces" subtitle="Jump into any area" icon={Briefcase} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 md:gap-4">
            {categoryTiles.map((c, i) => (
              <CategoryTile
                key={c.label}
                label={c.label}
                description={c.description}
                icon={c.icon}
                gradient={c.gradient}
                onClick={() => navigate(c.href)}
                delay={i * 30}
              />
            ))}
          </div>
        </section>

        {/* Activity */}
        <section className="grid gap-4 lg:grid-cols-2">
          <ActivityFeedCard
            title="Recent Work Orders"
            description="Latest jobs in the shop"
            onViewAll={() => navigate('/work-orders')}
            items={(workOrdersLoading ? [] : recentWorkOrders || []).map((wo: any) => ({
              id: wo.id,
              icon: Wrench,
              iconGradient: 'from-blue-500 to-indigo-600',
              title: wo.work_order_number || 'N/A',
              subtitle: `${wo.customers?.first_name || ''} ${wo.customers?.last_name || ''} · ${wo.vehicles?.year || ''} ${wo.vehicles?.make || ''} ${wo.vehicles?.model || ''}`.trim(),
              badge: {
                label: (wo.status || 'pending').replace('_', ' '),
                tone: wo.status === 'completed' ? 'success' : wo.status === 'in_progress' ? 'default' : 'warning',
              },
              onClick: () => navigate(`/work-orders/${wo.id}`),
            }))}
            emptyLabel={workOrdersLoading ? 'Loading…' : 'No work orders yet'}
          />
          <ActivityFeedCard
            title="Upcoming Appointments"
            description="Next bookings on the calendar"
            onViewAll={() => navigate('/calendar')}
            items={(appointmentsLoading ? [] : upcomingAppointments || []).map((appt: any) => ({
              id: appt.id,
              icon: CalendarDays,
              iconGradient: 'from-purple-500 to-fuchsia-600',
              title: `${appt.customers?.first_name || ''} ${appt.customers?.last_name || ''}`.trim() || 'Unknown',
              subtitle: `${appt.vehicles?.year || ''} ${appt.vehicles?.make || ''} ${appt.vehicles?.model || ''}`.trim() || 'No vehicle',
              meta: appt.date ? format(new Date(appt.date), 'MMM d, h:mm a') : '',
              badge: { label: (appt.status || 'scheduled').replace('_', ' '), tone: 'default' },
              onClick: () => navigate('/calendar'),
            }))}
            emptyLabel={appointmentsLoading ? 'Loading…' : 'No upcoming appointments'}
          />
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
