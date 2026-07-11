import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Calendar, DollarSign, TrendingUp, AlertTriangle, Loader2, UserCheck, Clock, Wallet } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, Area, AreaChart,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

export default function PersonalTrainerReports() {
  const { shopId } = useShopId();

  // Revenue by month (last 6 months)
  const { data: revenueData = [], isLoading: revLoading } = useQuery({
    queryKey: ['pt-revenue-report', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const start = startOfMonth(d).toISOString();
        const end = endOfMonth(d).toISOString();
        const { data } = await (supabase as any).from('pt_invoices')
          .select('total').eq('shop_id', shopId).eq('status', 'paid')
          .gte('paid_date', start).lte('paid_date', end);
        const total = (data || []).reduce((s: number, r: any) => s + (r.total || 0), 0);
        months.push({ name: format(d, 'MMM'), revenue: total });
      }
      return months;
    },
    enabled: !!shopId,
  });

  // Session stats
  const { data: sessionStats = { completed: 0, canceled: 0, noshow: 0, scheduled: 0 } } = useQuery({
    queryKey: ['pt-session-stats', shopId],
    queryFn: async () => {
      if (!shopId) return { completed: 0, canceled: 0, noshow: 0, scheduled: 0 };
      const { data } = await (supabase as any).from('pt_sessions').select('status').eq('shop_id', shopId);
      const stats = { completed: 0, canceled: 0, noshow: 0, scheduled: 0 };
      (data || []).forEach((s: any) => {
        if (s.status === 'completed') stats.completed++;
        else if (s.status === 'canceled') stats.canceled++;
        else if (s.status === 'no_show') stats.noshow++;
        else stats.scheduled++;
      });
      return stats;
    },
    enabled: !!shopId,
  });

  // Client stats
  const { data: clientStats = { active: 0, inactive: 0, total: 0 } } = useQuery({
    queryKey: ['pt-client-stats', shopId],
    queryFn: async () => {
      if (!shopId) return { active: 0, inactive: 0, total: 0 };
      const { data } = await (supabase as any).from('pt_clients').select('membership_status').eq('shop_id', shopId);
      const active = (data || []).filter((c: any) => c.membership_status === 'active').length;
      return { active, inactive: (data || []).length - active, total: (data || []).length };
    },
    enabled: !!shopId,
  });

  // Trainer stats
  const { data: trainerStats = { active: 0, total: 0 } } = useQuery({
    queryKey: ['pt-trainer-stats', shopId],
    queryFn: async () => {
      if (!shopId) return { active: 0, total: 0 };
      const { data } = await (supabase as any).from('pt_trainers').select('is_active').eq('shop_id', shopId);
      const active = (data || []).filter((t: any) => t.is_active).length;
      return { active, total: (data || []).length };
    },
    enabled: !!shopId,
  });

  // Sessions per week (last 8 weeks)
  const { data: weeklySessionData = [] } = useQuery({
    queryKey: ['pt-weekly-sessions', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const weeks = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = subWeeks(new Date(), i);
        const weekEnd = subWeeks(new Date(), i - 1);
        const { data } = await (supabase as any).from('pt_sessions')
          .select('status').eq('shop_id', shopId)
          .gte('session_date', weekStart.toISOString()).lt('session_date', weekEnd.toISOString());
        const completed = (data || []).filter((s: any) => s.status === 'completed').length;
        const total = (data || []).length;
        weeks.push({ name: format(weekStart, 'MMM d'), completed, total });
      }
      return weeks;
    },
    enabled: !!shopId,
  });

  // Expiring packages
  const { data: expiringPkgs = [] } = useQuery({
    queryKey: ['pt-expiring-packages', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const inTwoWeeks = new Date();
      inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
      const { data } = await (supabase as any).from('pt_client_packages')
        .select('*, pt_clients(first_name, last_name), pt_packages(name)')
        .eq('shop_id', shopId).eq('status', 'active')
        .lte('end_date', inTwoWeeks.toISOString()).order('end_date');
      return data || [];
    },
    enabled: !!shopId,
  });

  // Overdue check-ins (clients who haven't checked in for 7+ days)
  const { data: overdueCheckIns = [] } = useQuery({
    queryKey: ['pt-overdue-checkins', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      // Get active clients
      const { data: activeClients } = await (supabase as any).from('pt_clients')
        .select('id, first_name, last_name').eq('shop_id', shopId).eq('membership_status', 'active');
      if (!activeClients || activeClients.length === 0) return [];
      // Get latest check-in per client
      const overdue: any[] = [];
      for (const client of activeClients.slice(0, 20)) {
        const { data: lastCheckIn } = await (supabase as any).from('pt_check_ins')
          .select('check_in_date').eq('client_id', client.id).order('check_in_date', { ascending: false }).limit(1);
        if (!lastCheckIn || lastCheckIn.length === 0 || new Date(lastCheckIn[0].check_in_date) < sevenDaysAgo) {
          overdue.push({ ...client, last_check_in: lastCheckIn?.[0]?.check_in_date || null });
        }
      }
      return overdue;
    },
    enabled: !!shopId,
  });

  const sessionPieData = [
    { name: 'Completed', value: sessionStats.completed },
    { name: 'Canceled', value: sessionStats.canceled },
    { name: 'No Show', value: sessionStats.noshow },
    { name: 'Scheduled', value: sessionStats.scheduled },
  ].filter(d => d.value > 0);

  const totalSessions = sessionStats.completed + sessionStats.canceled + sessionStats.noshow + sessionStats.scheduled;
  const attendanceRate = totalSessions > 0 ? Math.round((sessionStats.completed / totalSessions) * 100) : 0;
  const retentionRate = clientStats.total > 0 ? Math.round((clientStats.active / clientStats.total) * 100) : 0;
  const totalRevenue = revenueData.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground text-sm">Revenue, attendance, retention, and performance insights</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'from-green-500 to-emerald-600' },
          { label: 'Attendance', value: `${attendanceRate}%`, icon: Calendar, color: 'from-orange-500 to-red-500' },
          { label: 'Retention', value: `${retentionRate}%`, icon: TrendingUp, color: 'from-blue-500 to-cyan-500' },
          { label: 'Active Clients', value: clientStats.active, icon: Users, color: 'from-violet-500 to-purple-600' },
          { label: 'Active Trainers', value: trainerStats.active, icon: UserCheck, color: 'from-pink-500 to-rose-500' },
          { label: 'Overdue Check-ins', value: overdueCheckIns.length, icon: Clock, color: 'from-amber-500 to-orange-600' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-md">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${s.color} shadow-lg`}>
                <s.icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-orange-500" />Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            {revLoading ? <div className="h-56 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => [`$${v}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Session Breakdown Pie */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-orange-500" />Session Breakdown</CardTitle></CardHeader>
          <CardContent>
            {sessionPieData.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-16">No session data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sessionPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {sessionPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Weekly Session Trend */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" />Weekly Session Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weeklySessionData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="completed" stroke="#10b981" fill="#10b98133" name="Completed" />
                <Area type="monotone" dataKey="total" stroke="#8b5cf6" fill="#8b5cf633" name="Total" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client Retention Donut */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-violet-500" />Client Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={[{ name: 'Active', value: clientStats.active }, { name: 'Inactive', value: clientStats.inactive }].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Summary */}
      <PayrollSummarySection shopId={shopId} />

      {/* Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Packages */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Expiring Packages (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {expiringPkgs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No packages expiring soon ✅</p>
            ) : (
              <div className="space-y-2">
                {expiringPkgs.map((pkg: any) => (
                  <div key={pkg.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div><p className="font-medium text-sm">{pkg.pt_clients?.first_name} {pkg.pt_clients?.last_name}</p><p className="text-xs text-muted-foreground">{pkg.pt_packages?.name}</p></div>
                    <div className="text-right"><Badge variant="destructive" className="text-xs">Expires {format(new Date(pkg.end_date), 'MMM d')}</Badge><p className="text-xs text-muted-foreground mt-1">{pkg.remaining_sessions} sessions left</p></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Check-ins */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-red-500" />Overdue Check-Ins (7+ days)</CardTitle>
          </CardHeader>
          <CardContent>
            {overdueCheckIns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">All clients are up to date ✅</p>
            ) : (
              <div className="space-y-2">
                {overdueCheckIns.map((client: any) => (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">{client.first_name} {client.last_name}</p>
                    <Badge variant="destructive" className="text-xs">
                      {client.last_check_in ? `Last: ${format(new Date(client.last_check_in), 'MMM d')}` : 'Never'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PayrollSummarySection({ shopId }: { shopId: string | null }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const periodRange = useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    }
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }, [period]);

  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['pt-payroll-report', shopId, period],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('pt_time_entries')
        .select('*, pt_gym_staff(first_name, last_name, hourly_rate, role)')
        .eq('shop_id', shopId)
        .gte('clock_in', periodRange.start.toISOString())
        .lte('clock_in', periodRange.end.toISOString())
        .order('clock_in', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const summaries = useMemo(() => {
    const map: Record<string, { name: string; role: string; hours: number; rate: number; shifts: number }> = {};
    timeEntries.forEach((e: any) => {
      const key = e.staff_id || e.trainer_id || 'unknown';
      if (!map[key]) {
        const s = e.pt_gym_staff;
        map[key] = {
          name: s ? `${s.first_name} ${s.last_name}` : 'Unknown',
          role: s?.role || 'trainer',
          hours: 0,
          rate: Number(s?.hourly_rate || 0),
          shifts: 0,
        };
      }
      map[key].hours += Number(e.total_hours || 0);
      map[key].shifts += 1;
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [timeEntries]);

  const totalHours = summaries.reduce((s, r) => s + r.hours, 0);
  const totalPay = summaries.reduce((s, r) => s + r.hours * r.rate, 0);
  const totalShifts = summaries.reduce((s, r) => s + r.shifts, 0);

  const chartData = summaries.map(s => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
    hours: parseFloat(s.hours.toFixed(1)),
    pay: parseFloat((s.hours * s.rate).toFixed(2)),
  }));

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-green-500" />
            Payroll Summary
          </CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as 'week' | 'month')}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-lg font-bold text-foreground">{totalShifts}</p>
            <p className="text-[10px] text-muted-foreground">Total Shifts</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-lg font-bold text-foreground">{totalHours.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">Total Hours</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-lg font-bold text-foreground">${totalPay.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Est. Payroll</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : summaries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No time entries for this period</p>
        ) : (
          <Tabs defaultValue="table">
            <TabsList className="mb-3">
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
            </TabsList>
            <TabsContent value="table">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Shifts</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Est. Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{s.role.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{s.shifts}</TableCell>
                        <TableCell className="text-right">{s.hours.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${s.rate.toFixed(2)}/hr</TableCell>
                        <TableCell className="text-right font-semibold">${(s.hours * s.rate).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">{totalShifts}</TableCell>
                      <TableCell className="text-right">{totalHours.toFixed(2)}</TableCell>
                      <TableCell />
                      <TableCell className="text-right">${totalPay.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                  <Tooltip formatter={(v: number, name: string) => [name === 'pay' ? `$${v}` : `${v}h`, name === 'pay' ? 'Est. Pay' : 'Hours']} />
                  <Legend />
                  <Bar dataKey="hours" fill="#06b6d4" name="Hours" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="pay" fill="#10b981" name="Est. Pay ($)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
