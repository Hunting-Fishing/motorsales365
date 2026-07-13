import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTimeCards } from '@/hooks/useTimeCards';
import { usePayPeriods } from '@/hooks/usePayPeriods';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { format, differenceInHours, startOfWeek, endOfWeek } from 'date-fns';
import { 
  DollarSign, 
  Clock, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  Calendar
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function PayrollDashboard() {
  const { shopId } = useShopId();
  const { timeCards, loading: timeCardsLoading } = useTimeCards();
  const { payPeriods, loading: payPeriodsLoading } = usePayPeriods();

  // Get active clock-ins
  const activeClockIns = timeCards.filter(tc => tc.status === 'active');
  
  // Get pending approvals
  const pendingApprovals = timeCards.filter(tc => tc.status === 'completed');

  // Calculate current week overtime
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const thisWeekCards = timeCards.filter(tc => {
    const clockIn = new Date(tc.clock_in_time);
    return clockIn >= weekStart && clockIn <= weekEnd;
  });

  // Get current pay period
  const currentPayPeriod = payPeriods.find(pp => pp.status === 'open');

  // Calculate totals for current period
  const periodCards = currentPayPeriod 
    ? timeCards.filter(tc => {
        const clockIn = new Date(tc.clock_in_time);
        return clockIn >= new Date(currentPayPeriod.start_date) && 
               clockIn <= new Date(currentPayPeriod.end_date);
      })
    : [];

  const totalHours = periodCards.reduce((sum, tc) => sum + (tc.total_hours || 0), 0);
  const totalOvertimeHours = periodCards.reduce((sum, tc) => sum + (tc.overtime_hours || 0), 0);
  const totalPay = periodCards.reduce((sum, tc) => sum + (tc.total_pay || 0), 0);

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['recent-payroll-activity', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('time_card_entries')
        .select(`
          *,
          profiles:employee_id (
            first_name,
            last_name
          )
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  if (timeCardsLoading || payPeriodsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Period Labor</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPay.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {totalHours.toFixed(1)} hours total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clock-Ins</CardTitle>
            <PlayCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClockIns.length}</div>
            <p className="text-xs text-muted-foreground">
              Employees currently working
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals.length}</div>
            <p className="text-xs text-muted-foreground">
              Time cards awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overtime This Week</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOvertimeHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Above 40 hours/week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Pay Period Info */}
      {currentPayPeriod && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Current Pay Period
            </CardTitle>
            <CardDescription>
              {format(new Date(currentPayPeriod.start_date), 'MMM d')} - {format(new Date(currentPayPeriod.end_date), 'MMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Overtime Hours</p>
                <p className="text-2xl font-bold text-orange-500">{totalOvertimeHours.toFixed(1)}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold text-green-600">${totalPay.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest clock-ins and clock-outs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity?.slice(0, 5).map((activity: any) => (
              <div key={activity.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  {activity.status === 'active' ? (
                    <PlayCircle className="h-5 w-5 text-green-500" />
                  ) : activity.status === 'approved' ? (
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                  ) : (
                    <PauseCircle className="h-5 w-5 text-gray-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {activity.profiles?.first_name} {activity.profiles?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(activity.clock_in_time), 'MMM d, h:mm a')}
                      {activity.clock_out_time && ` - ${format(new Date(activity.clock_out_time), 'h:mm a')}`}
                    </p>
                  </div>
                </div>
                <Badge variant={
                  activity.status === 'active' ? 'default' :
                  activity.status === 'approved' ? 'secondary' :
                  'outline'
                }>
                  {activity.status}
                </Badge>
              </div>
            ))}
            {(!recentActivity || recentActivity.length === 0) && (
              <p className="text-center text-muted-foreground py-4">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
