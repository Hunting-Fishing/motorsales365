import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTimeCards } from '@/hooks/useTimeCards';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { startOfWeek, endOfWeek, format, isWithinInterval } from 'date-fns';
import { 
  AlertTriangle, 
  Clock, 
  User,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface EmployeeOvertimeData {
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  weeklyHours: number;
  dailyHoursToday: number;
  overtimeHours: number;
  projectedWeeklyHours: number;
  status: 'safe' | 'warning' | 'overtime' | 'critical';
}

export function OvertimeAlertsPanel() {
  const { shopId } = useShopId();
  const { timeCards, loading: timeCardsLoading } = useTimeCards();

  // Get overtime config
  const overtimeConfig = useMemo(() => {
    if (!shopId) return { weeklyThreshold: 40, dailyThreshold: 8 };
    const stored = localStorage.getItem(`overtime_config_${shopId}`);
    if (stored) {
      const config = JSON.parse(stored);
      return {
        weeklyThreshold: config.weeklyThreshold || 40,
        dailyThreshold: config.dailyThreshold || 8,
      };
    }
    return { weeklyThreshold: 40, dailyThreshold: 8 };
  }, [shopId]);

  // Fetch employees
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-for-overtime', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('shop_id', shopId);
      return data || [];
    },
    enabled: !!shopId,
  });

  // Calculate overtime data for each employee
  const overtimeData = useMemo<EmployeeOvertimeData[]>(() => {
    if (!employees || !timeCards) return [];

    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const today = new Date();

    return employees.map((employee: any) => {
      // Filter time cards for this employee this week
      const employeeWeekCards = timeCards.filter((tc: any) => {
        if (tc.employee_id !== employee.id) return false;
        const clockIn = new Date(tc.clock_in_time);
        return isWithinInterval(clockIn, { start: weekStart, end: weekEnd });
      });

      // Calculate weekly hours
      const weeklyHours = employeeWeekCards.reduce((sum: number, tc: any) => {
        return sum + (tc.total_hours || 0);
      }, 0);

      // Add active time card hours if currently clocked in
      const activeCard = employeeWeekCards.find((tc: any) => tc.status === 'active');
      let activeHours = 0;
      if (activeCard) {
        const clockIn = new Date(activeCard.clock_in_time);
        activeHours = (today.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      }

      const totalWeeklyHours = weeklyHours + activeHours;

      // Calculate today's hours
      const todayCards = employeeWeekCards.filter((tc: any) => {
        const clockIn = new Date(tc.clock_in_time);
        return clockIn.toDateString() === today.toDateString();
      });

      const dailyHoursToday = todayCards.reduce((sum: number, tc: any) => {
        if (tc.status === 'active') {
          const clockIn = new Date(tc.clock_in_time);
          return sum + (today.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        }
        return sum + (tc.total_hours || 0);
      }, 0);

      // Calculate overtime hours
      const overtimeHours = Math.max(0, totalWeeklyHours - overtimeConfig.weeklyThreshold);

      // Project weekly hours (assuming similar daily hours for remaining days)
      const dayOfWeek = today.getDay(); // 0 = Sunday
      const daysWorkedThisWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      const avgDailyHours = totalWeeklyHours / Math.max(1, daysWorkedThisWeek);
      const remainingDays = 7 - daysWorkedThisWeek;
      const projectedWeeklyHours = totalWeeklyHours + (avgDailyHours * remainingDays);

      // Determine status
      let status: EmployeeOvertimeData['status'] = 'safe';
      const threshold = overtimeConfig.weeklyThreshold;
      
      if (totalWeeklyHours >= threshold * 1.25) {
        status = 'critical'; // 25%+ over threshold
      } else if (totalWeeklyHours >= threshold) {
        status = 'overtime'; // At or over threshold
      } else if (totalWeeklyHours >= threshold * 0.9 || projectedWeeklyHours >= threshold) {
        status = 'warning'; // 90%+ or projected to exceed
      }

      return {
        employeeId: employee.id,
        employeeName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
        jobTitle: employee.job_title || 'Employee',
        weeklyHours: totalWeeklyHours,
        dailyHoursToday,
        overtimeHours,
        projectedWeeklyHours,
        status,
      };
    }).sort((a, b) => b.weeklyHours - a.weeklyHours);
  }, [employees, timeCards, overtimeConfig]);

  // Group by status
  const criticalAlerts = overtimeData.filter(e => e.status === 'critical');
  const overtimeAlerts = overtimeData.filter(e => e.status === 'overtime');
  const warningAlerts = overtimeData.filter(e => e.status === 'warning');
  const safeEmployees = overtimeData.filter(e => e.status === 'safe');

  const isLoading = timeCardsLoading || employeesLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const StatusIcon = ({ status }: { status: EmployeeOvertimeData['status'] }) => {
    switch (status) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'overtime':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'warning':
        return <TrendingUp className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const StatusBadge = ({ status }: { status: EmployeeOvertimeData['status'] }) => {
    const variants: Record<string, { label: string; className: string }> = {
      critical: { label: 'Critical', className: 'bg-red-500 text-white' },
      overtime: { label: 'Overtime', className: 'bg-orange-500 text-white' },
      warning: { label: 'Warning', className: 'bg-yellow-500 text-white' },
      safe: { label: 'Safe', className: 'bg-green-500 text-white' },
    };
    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const EmployeeCard = ({ employee }: { employee: EmployeeOvertimeData }) => {
    const progressPercent = Math.min(100, (employee.weeklyHours / overtimeConfig.weeklyThreshold) * 100);
    
    return (
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-4">
          <StatusIcon status={employee.status} />
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{employee.employeeName}</p>
            <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-32">
            <div className="flex justify-between text-xs mb-1">
              <span>{employee.weeklyHours.toFixed(1)}h</span>
              <span className="text-muted-foreground">{overtimeConfig.weeklyThreshold}h</span>
            </div>
            <Progress 
              value={progressPercent} 
              className={`h-2 ${
                employee.status === 'critical' ? '[&>div]:bg-red-500' :
                employee.status === 'overtime' ? '[&>div]:bg-orange-500' :
                employee.status === 'warning' ? '[&>div]:bg-yellow-500' :
                '[&>div]:bg-green-500'
              }`}
            />
          </div>
          <div className="text-right min-w-[80px]">
            {employee.overtimeHours > 0 && (
              <p className="font-bold text-orange-500">
                +{employee.overtimeHours.toFixed(1)}h OT
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Today: {employee.dailyHoursToday.toFixed(1)}h
            </p>
          </div>
          <StatusBadge status={employee.status} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={criticalAlerts.length > 0 ? 'border-red-500 border-2' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{criticalAlerts.length}</div>
            <p className="text-xs text-muted-foreground">25%+ over threshold</p>
          </CardContent>
        </Card>

        <Card className={overtimeAlerts.length > 0 ? 'border-orange-500 border-2' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              In Overtime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{overtimeAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Over {overtimeConfig.weeklyThreshold}h threshold</p>
          </CardContent>
        </Card>

        <Card className={warningAlerts.length > 0 ? 'border-yellow-500 border-2' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-500" />
              Approaching
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{warningAlerts.length}</div>
            <p className="text-xs text-muted-foreground">90%+ of threshold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Safe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{safeEmployees.length}</div>
            <p className="text-xs text-muted-foreground">Under threshold</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Critical Overtime Alerts
            </CardTitle>
            <CardDescription>
              These employees have exceeded the overtime threshold by 25% or more
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalAlerts.map(employee => (
              <EmployeeCard key={employee.employeeId} employee={employee} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Overtime Alerts */}
      {overtimeAlerts.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Currently in Overtime
            </CardTitle>
            <CardDescription>
              These employees have exceeded the {overtimeConfig.weeklyThreshold}-hour weekly threshold
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overtimeAlerts.map(employee => (
              <EmployeeCard key={employee.employeeId} employee={employee} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warning Alerts */}
      {warningAlerts.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <TrendingUp className="h-5 w-5" />
              Approaching Overtime
            </CardTitle>
            <CardDescription>
              These employees are at 90%+ of the threshold or projected to exceed it this week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {warningAlerts.map(employee => (
              <EmployeeCard key={employee.employeeId} employee={employee} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Safe Employees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            All Employees This Week
          </CardTitle>
          <CardDescription>
            Weekly hours tracked for all employees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overtimeData.length > 0 ? (
            overtimeData.map(employee => (
              <EmployeeCard key={employee.employeeId} employee={employee} />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No time card data for this week
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
