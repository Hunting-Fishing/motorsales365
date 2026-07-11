import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dumbbell, Calendar, DollarSign, Users, Plus, ClipboardList, Activity, Package, Target, UserPlus,
  AlertTriangle, Clock, MessageSquare, TrendingDown, CheckCircle2, Zap, Bell, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth } from 'date-fns';

export default function PersonalTrainerDashboard() {
  const navigate = useNavigate();
  const { shopId } = useShopId();

  const { data: clientCount = 0 } = useQuery({
    queryKey: ['pt-client-count', shopId],
    queryFn: async () => {
      if (!shopId) return 0;
      const { count } = await (supabase as any).from('pt_clients').select('*', { count: 'exact', head: true }).eq('shop_id', shopId).eq('membership_status', 'active');
      return count || 0;
    },
    enabled: !!shopId,
  });

  const { data: todaySessions = [] } = useQuery({
    queryKey: ['pt-today-sessions', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data } = await (supabase as any).from('pt_sessions')
        .select('*, pt_clients(first_name, last_name)')
        .eq('shop_id', shopId)
        .gte('session_date', today + 'T00:00:00')
        .lte('session_date', today + 'T23:59:59')
        .order('session_date');
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: programCount = 0 } = useQuery({
    queryKey: ['pt-program-count', shopId],
    queryFn: async () => {
      if (!shopId) return 0;
      const { count } = await (supabase as any).from('pt_workout_programs').select('*', { count: 'exact', head: true }).eq('shop_id', shopId);
      return count || 0;
    },
    enabled: !!shopId,
  });

  const { data: activePackages = 0 } = useQuery({
    queryKey: ['pt-active-packages', shopId],
    queryFn: async () => {
      if (!shopId) return 0;
      const { count } = await (supabase as any).from('pt_packages').select('*', { count: 'exact', head: true }).eq('shop_id', shopId).eq('is_active', true);
      return count || 0;
    },
    enabled: !!shopId,
  });

  // Revenue this month
  const { data: monthlyRevenue = 0 } = useQuery({
    queryKey: ['pt-monthly-revenue', shopId],
    queryFn: async () => {
      if (!shopId) return 0;
      const monthStart = startOfMonth(new Date()).toISOString();
      const { data } = await (supabase as any).from('pt_invoices')
        .select('amount').eq('shop_id', shopId).eq('status', 'paid')
        .gte('created_at', monthStart);
      return (data || []).reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
    },
    enabled: !!shopId,
  });

  // New leads (clients added in last 30 days)
  const { data: newLeads = 0 } = useQuery({
    queryKey: ['pt-new-leads', shopId],
    queryFn: async () => {
      if (!shopId) return 0;
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { count } = await (supabase as any).from('pt_clients').select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId).gte('created_at', thirtyDaysAgo);
      return count || 0;
    },
    enabled: !!shopId,
  });

  // Overdue check-ins (clients who haven't checked in for 7+ days)
  const { data: overdueCheckIns = [] } = useQuery({
    queryKey: ['pt-dashboard-overdue-checkins', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const sevenDaysAgo = subDays(new Date(), 7);
      const { data: activeClients } = await (supabase as any).from('pt_clients')
        .select('id, first_name, last_name').eq('shop_id', shopId).eq('membership_status', 'active');
      if (!activeClients?.length) return [];
      const overdue: any[] = [];
      for (const client of activeClients.slice(0, 10)) {
        const { data: lastCheckIn } = await (supabase as any).from('pt_check_ins')
          .select('check_in_date').eq('client_id', client.id).order('check_in_date', { ascending: false }).limit(1);
        if (!lastCheckIn?.length || new Date(lastCheckIn[0].check_in_date) < sevenDaysAgo) {
          overdue.push({ ...client, last_check_in: lastCheckIn?.[0]?.check_in_date || null });
        }
      }
      return overdue;
    },
    enabled: !!shopId,
  });

  // Expiring packages (within 14 days)
  const { data: expiringPkgs = [] } = useQuery({
    queryKey: ['pt-dashboard-expiring', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const inTwoWeeks = new Date();
      inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
      const { data } = await (supabase as any).from('pt_client_packages')
        .select('*, pt_clients(first_name, last_name), pt_packages(name)')
        .eq('shop_id', shopId).eq('status', 'active')
        .lte('end_date', inTwoWeeks.toISOString()).order('end_date').limit(5);
      return data || [];
    },
    enabled: !!shopId,
  });

  // Missed sessions (no-show or canceled in last 7 days)
  const { data: missedSessions = [] } = useQuery({
    queryKey: ['pt-dashboard-missed', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const weekAgo = subDays(new Date(), 7).toISOString();
      const { data } = await (supabase as any).from('pt_sessions')
        .select('*, pt_clients(first_name, last_name)')
        .eq('shop_id', shopId)
        .in('status', ['canceled', 'no_show'])
        .gte('session_date', weekAgo)
        .order('session_date', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!shopId,
  });

  // Unread messages
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['pt-dashboard-unread', shopId],
    queryFn: async () => {
      if (!shopId) return 0;
      const { count } = await (supabase as any).from('pt_messages')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId).eq('is_read', false);
      return count || 0;
    },
    enabled: !!shopId,
  });

  // Unread notifications count
  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ['pt-dashboard-notif-count', shopId],
    queryFn: async () => {
      if (!shopId) return 0;
      const { count } = await (supabase as any).from('pt_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId).eq('is_read', false);
      return count || 0;
    },
    enabled: !!shopId,
  });

  const stats = [
    { label: 'Active Clients', value: clientCount, icon: Users, color: 'from-blue-500 to-cyan-500' },
    { label: "Today's Sessions", value: todaySessions.length, icon: Calendar, color: 'from-orange-500 to-red-500' },
    { label: 'Revenue (Month)', value: `$${monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: 'from-emerald-500 to-green-500' },
    { label: 'New Leads (30d)', value: newLeads, icon: UserPlus, color: 'from-violet-500 to-purple-600' },
    { label: 'Unread Messages', value: unreadCount, icon: MessageSquare, color: 'from-rose-500 to-pink-600' },
    { label: 'Overdue Check-ins', value: overdueCheckIns.length, icon: Clock, color: 'from-amber-500 to-orange-600' },
  ];

  const quickActions = [
    { label: 'Add Client', icon: UserPlus, onClick: () => navigate('/personal-trainer/clients'), color: 'from-blue-500 to-cyan-500' },
    { label: 'Book Session', icon: Calendar, onClick: () => navigate('/personal-trainer/sessions'), color: 'from-orange-500 to-red-500' },
    { label: 'New Program', icon: ClipboardList, onClick: () => navigate('/personal-trainer/programs'), color: 'from-violet-500 to-purple-600' },
    { label: 'Automations', icon: Zap, onClick: () => navigate('/personal-trainer/automations'), color: 'from-yellow-500 to-orange-500' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Trainer Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Your daily control center</p>
        </div>
        <div className="flex gap-2">
          {unreadNotifications > 0 && (
            <Button variant="outline" size="sm" onClick={() => navigate('/personal-trainer/automations')} className="relative">
              <Bell className="h-4 w-4 mr-1" />
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">{unreadNotifications}</span>
            </Button>
          )}
          <Button onClick={() => navigate('/personal-trainer/clients')} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg">
            <Plus className="h-4 w-4 mr-2" />
            New Client
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Button key={action.label} variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:shadow-md transition-all" onClick={action.onClick}>
            <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color}`}>
              <action.icon className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium">{action.label}</span>
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Sessions */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-orange-500" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaySessions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No sessions scheduled today</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/personal-trainer/sessions')}>Book Session</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {todaySessions.map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                        <Dumbbell className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{session.pt_clients?.first_name} {session.pt_clients?.last_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.session_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {session.duration_minutes}min
                        </p>
                      </div>
                    </div>
                    <Badge variant={session.status === 'completed' ? 'default' : session.status === 'canceled' ? 'destructive' : 'secondary'} className="text-xs">
                      {session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clients Needing Review (Overdue Check-Ins) */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-amber-500" />
              Clients Needing Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueCheckIns.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30 text-green-500" />
                <p className="text-sm">All clients are up to date ✅</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueCheckIns.map((client: any) => (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => navigate(`/personal-trainer/clients/${client.id}`)}>
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

        {/* Expiring Packages */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Expiring Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringPkgs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No packages expiring soon</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expiringPkgs.map((pkg: any) => (
                  <div key={pkg.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{pkg.pt_clients?.first_name} {pkg.pt_clients?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{pkg.pt_packages?.name} · {pkg.remaining_sessions} sessions left</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {pkg.end_date ? format(new Date(pkg.end_date), 'MMM d') : 'Soon'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Missed Sessions */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Missed Sessions (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missedSessions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30 text-green-500" />
                <p className="text-sm">No missed sessions 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {missedSessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{s.pt_clients?.first_name} {s.pt_clients?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(s.session_date), 'MMM d, h:mm a')}</p>
                    </div>
                    <Badge variant={s.status === 'no_show' ? 'destructive' : 'secondary'} className="text-xs">{s.status === 'no_show' ? 'No Show' : 'Canceled'}</Badge>
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
