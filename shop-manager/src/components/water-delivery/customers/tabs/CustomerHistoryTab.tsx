import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { History, TrendingUp, Droplet, Calendar, Truck, ArrowUpRight, ArrowDownRight, Pencil, ChevronDown, User, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, differenceInDays, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EditDeliveryDialog } from '../EditDeliveryDialog';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface CustomerHistoryTabProps {
  customerId: string;
}

interface DeliveryCompletion {
  id: string;
  delivery_date: string;
  gallons_delivered: number | null;
  tank_level_before: number | null;
  tank_level_after: number | null;
  notes: string | null;
  total_amount: number | null;
  price_per_gallon: number | null;
  payment_method: string | null;
  customer_id: string | null;
  water_delivery_orders: {
    order_number: string;
  } | null;
  water_delivery_drivers: {
    first_name: string;
    last_name: string;
  } | null;
}

interface AuditLogEntry {
  id: string;
  action: string;
  changed_by_name: string | null;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

export function CustomerHistoryTab({ customerId }: CustomerHistoryTabProps) {
  const [editingDelivery, setEditingDelivery] = useState<DeliveryCompletion | null>(null);
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);
  const { formatVolume, getVolumeLabel, getPriceLabel, convertFromGallons } = useWaterUnits();

  // Fetch delivery completions for this customer
  const { data: completions, isLoading } = useQuery({
    queryKey: ['water-delivery-history', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_delivery_completions')
        .select(`
          id,
          delivery_date,
          gallons_delivered,
          tank_level_before,
          tank_level_after,
          notes,
          total_amount,
          price_per_gallon,
          payment_method,
          customer_id,
          water_delivery_orders (
            order_number
          ),
          water_delivery_drivers (
            first_name,
            last_name
          )
        `)
        .eq('customer_id', customerId)
        .order('delivery_date', { ascending: false });
      
      if (error) throw error;
      return (data || []) as DeliveryCompletion[];
    },
    enabled: !!customerId,
  });

  // Fetch audit logs for delivery completions
  const { data: auditLogs } = useQuery({
    queryKey: ['water-delivery-audit-log', customerId],
    queryFn: async () => {
      if (!completions || completions.length === 0) return {};

      const deliveryIds = completions.map(c => c.id);
      const { data, error } = await supabase
        .from('water_delivery_audit_log')
        .select('*')
        .eq('entity_type', 'delivery_completion')
        .in('entity_id', deliveryIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group by entity_id
      const grouped: Record<string, AuditLogEntry[]> = {};
      (data || []).forEach(log => {
        const entityId = log.entity_id;
        if (!grouped[entityId]) grouped[entityId] = [];
        grouped[entityId].push(log as AuditLogEntry);
      });
      
      return grouped;
    },
    enabled: !!completions && completions.length > 0,
  });

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!completions || completions.length === 0) {
      return {
        totalDeliveries: 0,
        totalGallons: 0,
        avgGallons: 0,
        avgDaysBetween: 0,
        thisYearGallons: 0,
        lastYearGallons: 0,
        yearOverYearChange: 0,
      };
    }

    const now = new Date();
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

    const totalGallons = completions.reduce((sum, c) => sum + (c.gallons_delivered || 0), 0);
    const avgGallons = totalGallons / completions.length;

    // Calculate avg days between deliveries
    let totalDays = 0;
    let intervals = 0;
    for (let i = 1; i < completions.length; i++) {
      const days = differenceInDays(
        parseISO(completions[i - 1].delivery_date),
        parseISO(completions[i].delivery_date)
      );
      totalDays += days;
      intervals++;
    }
    const avgDaysBetween = intervals > 0 ? totalDays / intervals : 0;

    // Year over year
    const thisYearGallons = completions
      .filter(c => parseISO(c.delivery_date) >= thisYearStart)
      .reduce((sum, c) => sum + (c.gallons_delivered || 0), 0);

    const lastYearGallons = completions
      .filter(c => {
        const date = parseISO(c.delivery_date);
        return date >= lastYearStart && date <= lastYearEnd;
      })
      .reduce((sum, c) => sum + (c.gallons_delivered || 0), 0);

    const yearOverYearChange = lastYearGallons > 0
      ? ((thisYearGallons - lastYearGallons) / lastYearGallons) * 100
      : 0;

    return {
      totalDeliveries: completions.length,
      totalGallons,
      avgGallons,
      avgDaysBetween,
      thisYearGallons,
      lastYearGallons,
      yearOverYearChange,
    };
  }, [completions]);

  // Prepare monthly chart data (last 12 months)
  const chartData = React.useMemo(() => {
    if (!completions) return [];

    const months: { [key: string]: number } = {};
    const now = new Date();

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(now, i);
      const key = format(month, 'MMM yyyy');
      months[key] = 0;
    }

    // Aggregate gallons by month
    completions.forEach(c => {
      const date = parseISO(c.delivery_date);
      const key = format(date, 'MMM yyyy');
      if (months[key] !== undefined) {
        months[key] += c.gallons_delivered || 0;
      }
    });

    return Object.entries(months).map(([month, gallons]) => ({
      month,
      volume: Math.round(convertFromGallons(gallons)),
    }));
  }, [completions, convertFromGallons]);

  const getDriverName = (driver: DeliveryCompletion['water_delivery_drivers']) => {
    if (!driver) return '-';
    return `${driver.first_name} ${driver.last_name}`;
  };

  const getChangedFields = (prev: Record<string, unknown> | null, next: Record<string, unknown> | null) => {
    if (!prev || !next) return [];
    const changes: string[] = [];
    
    const fieldLabels: Record<string, string> = {
      delivery_date: 'Delivery Date',
      gallons_delivered: 'Gallons',
      tank_level_before: 'Tank Before',
      tank_level_after: 'Tank After',
      price_per_gallon: 'Price/Gallon',
      payment_method: 'Payment Method',
      notes: 'Notes',
    };

    Object.keys(next).forEach(key => {
      if (prev[key] !== next[key]) {
        const label = fieldLabels[key] || key;
        changes.push(`${label}: ${prev[key] ?? '-'} → ${next[key] ?? '-'}`);
      }
    });

    return changes;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
                <p className="text-2xl font-bold">{stats.totalDeliveries}</p>
              </div>
              <Truck className="h-8 w-8 text-cyan-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Delivery Size</p>
                <p className="text-2xl font-bold">{formatVolume(stats.avgGallons, 0)}</p>
              </div>
              <Droplet className="h-8 w-8 text-cyan-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Frequency</p>
                <p className="text-2xl font-bold">{Math.round(stats.avgDaysBetween)} days</p>
              </div>
              <Calendar className="h-8 w-8 text-cyan-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Year-over-Year</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {stats.yearOverYearChange >= 0 ? '+' : ''}{stats.yearOverYearChange.toFixed(1)}%
                  </p>
                  {stats.yearOverYearChange >= 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-cyan-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-cyan-600" />
            Monthly Usage Trend (Last 12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 && stats.totalDeliveries > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorGallons" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    className="text-muted-foreground"
                    tickFormatter={(value) => `${value.toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} ${getVolumeLabel(false).toLowerCase()}`, 'Delivered']}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGallons)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No delivery data available for chart
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-cyan-600" />
            Delivery History
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {completions && completions.length > 0 ? (
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>{getVolumeLabel(false)}</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Tank Level</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completions.map((completion) => {
                  const deliveryAuditLogs = auditLogs?.[completion.id] || [];
                  const hasAuditLogs = deliveryAuditLogs.length > 0;
                  
                  return (
                    <React.Fragment key={completion.id}>
                      <TableRow>
                        <TableCell>
                          {format(parseISO(completion.delivery_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {completion.water_delivery_orders?.order_number || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {completion.gallons_delivered ? formatVolume(completion.gallons_delivered, 0) : '-'}
                        </TableCell>
                        <TableCell>{getDriverName(completion.water_delivery_drivers)}</TableCell>
                        <TableCell>
                          {completion.tank_level_before != null && completion.tank_level_after != null ? (
                            <span className="text-sm">
                              {completion.tank_level_before}% → {completion.tank_level_after}%
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          ${completion.total_amount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={completion.notes || ''}>
                          {completion.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingDelivery(completion)}
                              title="Edit delivery"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {hasAuditLogs && (
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setExpandedDeliveryId(
                                      expandedDeliveryId === completion.id ? null : completion.id
                                    )}
                                    title="View change history"
                                  >
                                    <ChevronDown className={`h-4 w-4 transition-transform ${
                                      expandedDeliveryId === completion.id ? 'rotate-180' : ''
                                    }`} />
                                  </Button>
                                </CollapsibleTrigger>
                              </Collapsible>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {hasAuditLogs && expandedDeliveryId === completion.id && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-muted-foreground">Change History</p>
                              {deliveryAuditLogs.map((log) => (
                                <div key={log.id} className="border rounded-lg p-3 bg-background">
                                  <div className="flex items-center gap-3 text-sm">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <User className="h-3 w-3" />
                                      <span className="font-medium">{log.changed_by_name || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>{format(parseISO(log.created_at), 'MMM d, yyyy h:mm a')}</span>
                                    </div>
                                    <Badge variant="outline" className="capitalize">
                                      {log.action}
                                    </Badge>
                                  </div>
                                  {log.notes && (
                                    <p className="mt-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-950/20 p-2 rounded">
                                      <strong>Reason:</strong> {log.notes}
                                    </p>
                                  )}
                                  {log.previous_values && log.new_values && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      {getChangedFields(
                                        log.previous_values as Record<string, unknown>,
                                        log.new_values as Record<string, unknown>
                                      ).map((change, i) => (
                                        <div key={i} className="py-0.5">{change}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Alert>
              <AlertDescription>
                No delivery history found for this customer. Completed deliveries will appear here.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Edit Delivery Dialog */}
      <EditDeliveryDialog
        open={!!editingDelivery}
        onOpenChange={(open) => !open && setEditingDelivery(null)}
        delivery={editingDelivery}
      />
    </div>
  );
}