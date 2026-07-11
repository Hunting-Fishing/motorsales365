import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Crosshair,
  Calendar,
  DollarSign,
  FileText,
  AlertTriangle,
  Plus,
  ClipboardList,
  Package,
  Users,
  Shield,
  ArrowRightLeft,
  Receipt,
  CreditCard,
  CalendarDays,
  ShoppingBag,
  BarChart3,
  Link,
  MessageSquarePlus
} from 'lucide-react';
import { useGunsmithStats, useGunsmithJobs, useGunsmithAppointments, useGunsmithConsignments, useGunsmithTransfers } from '@/hooks/useGunsmith';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

export default function GunsmithDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useGunsmithStats();
  const { data: recentJobs, isLoading: jobsLoading } = useGunsmithJobs();
  const { data: appointments, isLoading: appointmentsLoading } = useGunsmithAppointments();
  const { data: consignments, isLoading: consignmentsLoading } = useGunsmithConsignments();
  const { data: transfers, isLoading: transfersLoading } = useGunsmithTransfers();

  const upcomingAppointments = (appointments || [])
    .filter((appointment) => appointment.appointment_date)
    .filter((appointment) => appointment.status !== 'cancelled')
    .filter((appointment) => new Date(appointment.appointment_date) >= new Date())
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
    .slice(0, 5);

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
      icon: Crosshair,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Awaiting Parts',
      value: stats?.awaitingPartsJobs || 0,
      icon: Package,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Completed',
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
      title: 'Pending Transfers',
      value: transfers?.filter((transfer) => transfer.status !== 'completed').length || 0,
      icon: ArrowRightLeft,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Active Consignments',
      value: consignments?.filter((consignment) => consignment.status === 'active').length || 0,
      icon: ShoppingBag,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Licenses Expiring',
      value: stats?.expiringLicenses || 0,
      icon: Shield,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  const alerts = [];
  if (stats?.lowStockParts && stats.lowStockParts > 0) {
    alerts.push({
      type: 'warning',
      message: `${stats.lowStockParts} part(s) running low on stock`,
      action: () => navigate('/gunsmith/parts'),
    });
  }
  if (stats?.expiringLicenses && stats.expiringLicenses > 0) {
    alerts.push({
      type: 'critical',
      message: `${stats.expiringLicenses} customer license(s) expiring within 30 days`,
      action: () => navigate('/gunsmith/compliance'),
    });
  }

  return (
    <MobilePageContainer>
      {/* Header */}
      <MobilePageHeader
        title="Gunsmith"
        subtitle="Manage firearm repairs, compliance, transfers, and inventory"
        icon={<Crosshair className="h-6 w-6 md:h-8 md:w-8 text-amber-600" />}
        actions={
          <>
            <Button 
              variant="outline" 
              onClick={() => navigate('/gunsmith/quotes/new')}
              size="sm"
              className="flex-1 md:flex-none"
            >
              <FileText className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">New </span>Quote
            </Button>
            <Button 
              onClick={() => navigate('/gunsmith/jobs/new')}
              size="sm"
              className="flex-1 md:flex-none"
            >
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">New </span>Job
            </Button>
          </>
        }
      />

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4 md:mb-6 space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 md:p-4 border rounded-lg cursor-pointer transition-colors ${
                alert.type === 'critical' 
                  ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15' 
                  : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
              }`}
              onClick={alert.action}
            >
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <AlertTriangle className={`h-4 w-4 md:h-5 md:w-5 shrink-0 ${alert.type === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                <span className="text-foreground text-sm md:text-base truncate">{alert.message}</span>
              </div>
              <Badge variant="outline" className={`shrink-0 ml-2 text-xs ${alert.type === 'critical' ? 'text-red-500 border-red-500' : 'text-amber-500 border-amber-500'}`}>
                {alert.type === 'critical' ? 'Critical' : 'Action'}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid - 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">{stat.title}</p>
                  {statsLoading || consignmentsLoading || transfersLoading ? (
                    <Skeleton className="h-6 md:h-8 w-16 md:w-20 mt-1" />
                  ) : (
                    <p className="text-lg md:text-2xl font-bold text-foreground mt-0.5 md:mt-1 truncate">{stat.value}</p>
                  )}
                </div>
                <div className={`p-2 md:p-3 rounded-full ${stat.bgColor} shrink-0 ml-2`}>
                  <stat.icon className={`h-4 w-4 md:h-6 md:w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions - 3 cols on mobile, more on desktop */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 md:gap-4 mb-4 md:mb-8">
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2"
          onClick={() => navigate('/gunsmith/jobs')}
        >
          <ClipboardList className="h-5 w-5 md:h-6 md:w-6" />
          <span className="text-[10px] md:text-xs">Jobs</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2 border-indigo-500/30 hover:bg-indigo-500/5"
          onClick={() => navigate('/gunsmith/customers')}
        >
          <Users className="h-5 w-5 md:h-6 md:w-6 text-indigo-500" />
          <span className="text-[10px] md:text-xs">Customers</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2"
          onClick={() => navigate('/gunsmith/firearms')}
        >
          <Crosshair className="h-5 w-5 md:h-6 md:w-6" />
          <span className="text-[10px] md:text-xs">Firearms</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2"
          onClick={() => navigate('/gunsmith/parts')}
        >
          <Package className="h-5 w-5 md:h-6 md:w-6" />
          <span className="text-[10px] md:text-xs">Parts</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2 border-purple-500/30 hover:bg-purple-500/5"
          onClick={() => navigate('/gunsmith/inventory')}
        >
          <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />
          <span className="text-[10px] md:text-xs">Inventory</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2 border-amber-500/30 hover:bg-amber-500/5"
          onClick={() => navigate('/gunsmith/quotes')}
        >
          <FileText className="h-5 w-5 md:h-6 md:w-6 text-amber-500" />
          <span className="text-[10px] md:text-xs">Quotes</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2 border-green-500/30 hover:bg-green-500/5"
          onClick={() => navigate('/gunsmith/invoices')}
        >
          <Receipt className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
          <span className="text-[10px] md:text-xs">Invoices</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2 border-emerald-500/30 hover:bg-emerald-500/5"
          onClick={() => navigate('/gunsmith/payments')}
        >
          <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-emerald-500" />
          <span className="text-[10px] md:text-xs">Payments</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2 border-blue-500/30 hover:bg-blue-500/5"
          onClick={() => navigate('/gunsmith/appointments')}
        >
          <CalendarDays className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
          <span className="text-[10px] md:text-xs">Appts</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2 border-red-500/30 hover:bg-red-500/5"
          onClick={() => navigate('/gunsmith/compliance')}
        >
          <Shield className="h-5 w-5 md:h-6 md:w-6 text-red-500" />
          <span className="text-[10px] md:text-xs">Compliance</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2 border-purple-500/30 hover:bg-purple-500/5"
          onClick={() => navigate('/gunsmith/transfers')}
        >
          <ArrowRightLeft className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />
          <span className="text-[10px] md:text-xs">Transfers</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2 border-orange-500/30 hover:bg-orange-500/5"
          onClick={() => navigate('/gunsmith/consignments')}
        >
          <ShoppingBag className="h-5 w-5 md:h-6 md:w-6 text-orange-500" />
          <span className="text-[10px] md:text-xs">Consign</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2 border-cyan-500/30 hover:bg-cyan-500/5"
          onClick={() => navigate('/gunsmith/parts-on-order')}
        >
          <ShoppingBag className="h-5 w-5 md:h-6 md:w-6 text-cyan-500" />
          <span className="text-[10px] md:text-xs">On Order</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2 border-slate-500/30 hover:bg-slate-500/5"
          onClick={() => navigate('/gunsmith/resources')}
        >
          <Link className="h-5 w-5 md:h-6 md:w-6 text-slate-500" />
          <span className="text-[10px] md:text-xs">Resources</span>
        </Button>
        <Button
          variant="outline"
          className="h-16 md:h-24 flex flex-col gap-1 md:gap-2 p-1 md:p-2 border-yellow-500/30 hover:bg-yellow-500/5"
          onClick={() => navigate('/gunsmith/change-log')}
        >
          <MessageSquarePlus className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />
          <span className="text-[10px] md:text-xs">Feedback</span>
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Jobs */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 md:px-6">
            <CardTitle className="text-base md:text-lg font-semibold">Recent Jobs</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/gunsmith/jobs')}>
              View All
            </Button>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {jobsLoading ? (
              <div className="space-y-2 md:space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 md:h-16 w-full" />
                ))}
              </div>
            ) : recentJobs && recentJobs.length > 0 ? (
              <div className="space-y-2 md:space-y-3">
                {recentJobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="p-2 md:p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate(`/gunsmith/jobs/${job.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm md:text-base truncate">{job.job_number}</p>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {job.customers?.first_name} {job.customers?.last_name} - {job.job_type}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={
                          job.status === 'completed' ? 'default' : 
                          job.status === 'in_progress' ? 'secondary' : 
                          'outline'
                        } className="text-xs">
                          {job.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">
                          {job.gunsmith_firearms?.make} {job.gunsmith_firearms?.model}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Crosshair className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 opacity-50" />
                <p className="text-sm">No jobs yet</p>
                <Button variant="link" size="sm" onClick={() => navigate('/gunsmith/jobs/new')}>
                  Create your first job
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 md:px-6">
            <CardTitle className="text-base md:text-lg font-semibold">Upcoming Appointments</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/gunsmith/appointments')}>
              View All
            </Button>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {appointmentsLoading ? (
              <div className="space-y-2 md:space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 md:h-16 w-full" />
                ))}
              </div>
            ) : upcomingAppointments.length > 0 ? (
              <div className="space-y-2 md:space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-2 md:p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate('/gunsmith/appointments')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm md:text-base truncate">
                          {appointment.customers?.first_name} {appointment.customers?.last_name}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {appointment.appointment_type}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className="text-xs">{appointment.status.replace('_', ' ')}</Badge>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                          {format(new Date(appointment.appointment_date), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <CalendarDays className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 opacity-50" />
                <p className="text-sm">No upcoming appointments</p>
                <Button variant="link" size="sm" onClick={() => navigate('/gunsmith/appointments')}>
                  Schedule an appointment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobilePageContainer>
  );
}
