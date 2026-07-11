import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Wrench, Package, Receipt, TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';
import { useRealtime } from '@/hooks/useRealtime';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardStats {
  totalCustomers: number;
  activeWorkOrders: number;
  inventoryItems: number;
  totalInvoices: number;
  completedToday: number;
  pendingWorkOrders: number;
  lowStockItems: number;
  monthlyRevenue: number;
  previousMonthRevenue: number;
}

interface StatTrend {
  value: number;
  change: number;
  isPositive: boolean;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date();
  const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
  const lastMonthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 0);

  const [
    customersResult,
    activeWorkOrdersResult,
    inventoryResult,
    invoicesResult,
    completedTodayResult,
    pendingWorkOrdersResult,
    lowStockResult,
    monthlyRevenueResult,
    previousMonthRevenueResult
  ] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('work_orders').select('id', { count: 'exact', head: true }).in('status', ['in_progress', 'assigned']),
    supabase.from('inventory_items').select('id', { count: 'exact', head: true }),
    supabase.from('invoices').select('id', { count: 'exact', head: true }),
    supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('updated_at', today),
    supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('inventory_items').select('id', { count: 'exact', head: true }).lt('quantity', 10),
    supabase.from('invoices').select('total').gte('created_at', thisMonth.toISOString()),
    supabase.from('invoices').select('total').gte('created_at', lastMonth.toISOString()).lt('created_at', lastMonthEnd.toISOString())
  ]);

  const monthlyRevenue = monthlyRevenueResult.data?.reduce((sum, invoice) => sum + (invoice.total || 0), 0) || 0;
  const previousMonthRevenue = previousMonthRevenueResult.data?.reduce((sum, invoice) => sum + (invoice.total || 0), 0) || 0;

  return {
    totalCustomers: customersResult.count || 0,
    activeWorkOrders: activeWorkOrdersResult.count || 0,
    inventoryItems: inventoryResult.count || 0,
    totalInvoices: invoicesResult.count || 0,
    completedToday: completedTodayResult.count || 0,
    pendingWorkOrders: pendingWorkOrdersResult.count || 0,
    lowStockItems: lowStockResult.count || 0,
    monthlyRevenue,
    previousMonthRevenue,
  };
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  color = 'default',
  animate = false 
}: {
  title: string;
  value: number | string;
  icon: any;
  description: string;
  trend?: StatTrend;
  color?: 'default' | 'success' | 'warning' | 'danger';
  animate?: boolean;
}) {
  const colorClasses = {
    default: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
  };

  return (
    <motion.div
      initial={animate ? { scale: 0.95, opacity: 0 } : false}
      animate={animate ? { scale: 1, opacity: 1 } : {}}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${colorClasses[color]}`} />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={value}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-2xl font-bold"
                >
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </motion.div>
              </AnimatePresence>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            
            {trend && (
              <div className="flex items-center space-x-1">
                {trend.isPositive ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <Badge variant={trend.isPositive ? 'default' : 'destructive'} className="text-xs">
                  {Math.abs(trend.change)}%
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
        
        {/* Animated background indicator */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 to-primary/5" />
      </Card>
    </motion.div>
  );
}

export function RealTimeDashboardStats() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Real-time subscriptions
  useRealtime('work_orders', {
    invalidateQueries: ['dashboard-stats'],
    enabled: true,
  });

  useRealtime('customers', {
    invalidateQueries: ['dashboard-stats'],
    enabled: true,
  });

  useRealtime('inventory_items', {
    invalidateQueries: ['dashboard-stats'],
    enabled: true,
  });

  useRealtime('invoices', {
    invalidateQueries: ['dashboard-stats'],
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-1"></div>
              <div className="h-3 bg-muted rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center justify-center space-x-2 text-destructive">
            <Activity className="h-4 w-4" />
            <p>Error loading dashboard statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const revenueChange = stats?.previousMonthRevenue 
    ? ((stats.monthlyRevenue - stats.previousMonthRevenue) / stats.previousMonthRevenue) * 100
    : 0;

  const getWorkOrderColor = (): 'default' | 'success' | 'warning' | 'danger' => {
    if (!stats?.activeWorkOrders) return 'default';
    return stats.activeWorkOrders > 10 ? 'warning' : 'success';
  };

  const getLowStockColor = (): 'default' | 'success' | 'warning' | 'danger' => {
    if (!stats?.lowStockItems) return 'success';
    return stats.lowStockItems > 5 ? 'danger' : 'warning';
  };

  const statsCards = [
    {
      title: "Total Customers",
      value: stats?.totalCustomers || 0,
      icon: Users,
      description: "Registered customers",
      color: 'default' as const,
    },
    {
      title: "Active Work Orders", 
      value: stats?.activeWorkOrders || 0,
      icon: Wrench,
      description: "In progress + assigned",
      color: getWorkOrderColor(),
    },
    {
      title: "Monthly Revenue",
      value: `$${(stats?.monthlyRevenue || 0).toLocaleString()}`,
      icon: Receipt,
      description: "This month's revenue",
      color: 'success' as const,
      trend: {
        value: stats?.monthlyRevenue || 0,
        change: Math.round(Math.abs(revenueChange)),
        isPositive: revenueChange >= 0,
      },
    },
    {
      title: "Low Stock Items",
      value: stats?.lowStockItems || 0,
      icon: Package,
      description: "Items below threshold",
      color: getLowStockColor(),
    }
  ];

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <StatCard
            key={stat.title}
            {...stat}
            animate={true}
          />
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Completed Today"
          value={stats?.completedToday || 0}
          icon={Activity}
          description="Work orders completed today"
          color="success"
        />
        
        <StatCard
          title="Pending Orders"
          value={stats?.pendingWorkOrders || 0}
          icon={Clock}
          description="Awaiting assignment"
          color={stats?.pendingWorkOrders ? (stats.pendingWorkOrders > 5 ? 'warning' : 'default') : 'default'}
        />
        
        <StatCard
          title="Total Invoices"
          value={stats?.totalInvoices || 0}
          icon={Receipt}
          description="All time invoices"
          color="default"
        />
      </div>
    </div>
  );
}