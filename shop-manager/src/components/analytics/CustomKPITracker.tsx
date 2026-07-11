import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Target, TrendingUp, TrendingDown, MoreVertical, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CustomKPITrackerProps {
  data: any;
  isLoading: boolean;
  onKPIClick: (kpi: string) => void;
}

interface KPI {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  category: string;
  trend: 'up' | 'down';
  change: number;
  status: string;
  lastUpdated: string;
}

export function CustomKPITracker({ data, isLoading, onKPIClick }: CustomKPITrackerProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      setLoading(true);
      try {
        // Fetch real data from multiple tables
        const [workOrdersRes, invoicesRes, inventoryRes] = await Promise.all([
          supabase.from('work_orders').select('id, status, created_at'),
          supabase.from('invoices').select('id, total, status, created_at'),
          supabase.from('inventory_items').select('id, quantity, reorder_point')
        ]);

        const workOrders = workOrdersRes.data || [];
        const invoices = invoicesRes.data || [];
        const inventory = inventoryRes.data || [];

        // Calculate real KPIs
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Revenue this month
        const thisMonthInvoices = invoices.filter(i => new Date(i.created_at) >= thisMonth);
        const lastMonthInvoices = invoices.filter(i => {
          const d = new Date(i.created_at);
          return d >= lastMonth && d < thisMonth;
        });
        const currentRevenue = thisMonthInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
        const previousRevenue = lastMonthInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
        const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        // Work order completion
        const completedOrders = workOrders.filter(wo => wo.status === 'completed').length;
        const totalOrders = workOrders.length;
        const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

        // Parts availability
        const inStockItems = inventory.filter(i => (i.quantity || 0) > (i.reorder_point || 0)).length;
        const partsAvailability = inventory.length > 0 ? (inStockItems / inventory.length) * 100 : 0;

        const calculatedKpis: KPI[] = [
          {
            id: 'revenue_target',
            name: 'Monthly Revenue',
            current: currentRevenue,
            target: 100000,
            unit: 'currency',
            category: 'financial',
            trend: revenueChange >= 0 ? 'up' : 'down',
            change: Math.abs(revenueChange),
            status: currentRevenue >= 75000 ? 'on-track' : currentRevenue >= 50000 ? 'warning' : 'behind',
            lastUpdated: 'just now'
          },
          {
            id: 'work_order_completion',
            name: 'Work Order Completion Rate',
            current: Number(completionRate.toFixed(0)),
            target: 95,
            unit: 'percentage',
            category: 'operational',
            trend: completionRate >= 90 ? 'up' : 'down',
            change: 0,
            status: completionRate >= 95 ? 'ahead' : completionRate >= 85 ? 'on-track' : 'behind',
            lastUpdated: 'just now'
          },
          {
            id: 'parts_availability',
            name: 'Parts Availability',
            current: Number(partsAvailability.toFixed(0)),
            target: 98,
            unit: 'percentage',
            category: 'inventory',
            trend: partsAvailability >= 90 ? 'up' : 'down',
            change: 0,
            status: partsAvailability >= 95 ? 'on-track' : partsAvailability >= 80 ? 'warning' : 'behind',
            lastUpdated: 'just now'
          }
        ];

        setKpis(calculatedKpis);
      } catch (error) {
        console.error('Error fetching KPIs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  if (isLoading || loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  const categories = [
    { value: 'all', label: 'All KPIs' },
    { value: 'financial', label: 'Financial' },
    { value: 'operational', label: 'Operational' },
    { value: 'inventory', label: 'Inventory' }
  ];

  const filteredKPIs = selectedCategory === 'all' 
    ? kpis 
    : kpis.filter(kpi => kpi.category === selectedCategory);

  const formatValue = (value: number, unit: string) => {
    switch (unit) {
      case 'currency': return `$${value.toLocaleString()}`;
      case 'percentage': return `${value}%`;
      case 'rating': return `${value.toFixed(1)} ★`;
      default: return value.toString();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ahead': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'on-track': return <Target className="h-4 w-4 text-primary" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'behind': return <AlertTriangle className="h-4 w-4 text-error" />;
      default: return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead': return 'success';
      case 'on-track': return 'default';
      case 'warning': return 'warning';
      case 'behind': return 'destructive';
      default: return 'secondary';
    }
  };

  const getProgressValue = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {categories.map(category => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add KPI
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredKPIs.map((kpi) => {
          const progressValue = getProgressValue(kpi.current, kpi.target);
          return (
            <Card key={kpi.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onKPIClick(kpi.id)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(kpi.status)}
                  <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onKPIClick(kpi.id)}>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit Target</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold">{formatValue(kpi.current, kpi.unit)}</span>
                  <Badge variant={getStatusColor(kpi.status) as any}>{kpi.status.replace('-', ' ')}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target:</span>
                    <span>{formatValue(kpi.target, kpi.unit)}</span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{progressValue.toFixed(0)}% of target</span>
                    {kpi.change > 0 && (
                      <div className="flex items-center gap-1">
                        {kpi.trend === 'up' ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-error" />}
                        <span className={kpi.trend === 'up' ? 'text-success' : 'text-error'}>{kpi.change.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">KPI Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div><p className="text-2xl font-bold text-success">{kpis.filter(k => k.status === 'ahead').length}</p><p className="text-sm text-muted-foreground">Ahead</p></div>
            <div><p className="text-2xl font-bold text-primary">{kpis.filter(k => k.status === 'on-track').length}</p><p className="text-sm text-muted-foreground">On Track</p></div>
            <div><p className="text-2xl font-bold text-warning">{kpis.filter(k => k.status === 'warning').length}</p><p className="text-sm text-muted-foreground">Warning</p></div>
            <div><p className="text-2xl font-bold text-error">{kpis.filter(k => k.status === 'behind').length}</p><p className="text-sm text-muted-foreground">Behind</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
