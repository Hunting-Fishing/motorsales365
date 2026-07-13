import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Calendar, Users, CheckCircle } from 'lucide-react';
import { usePayPeriods } from '@/hooks/usePayPeriods';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function PayrollManager() {
  const { loading, payPeriods, closePayPeriod } = usePayPeriods();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payroll Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'closed': return 'secondary';
      case 'processing': return 'outline';
      case 'open': return 'outline';
      default: return 'outline';
    }
  };

  const openPeriods = payPeriods.filter(p => p.status === 'open');
  const closedPeriods = payPeriods.filter(p => p.status !== 'open');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Periods</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPeriods.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {openPeriods.reduce((sum, p) => sum + (p.employee_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${openPeriods.reduce((sum, p) => sum + (p.total_cost || 0), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pay Periods List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pay Periods
          </CardTitle>
          <CardDescription>
            Manage and process employee pay periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payPeriods.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pay periods found
              </div>
            ) : (
              payPeriods.map((period) => (
                <div
                  key={period.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold mb-1">{period.period_name}</div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {format(new Date(period.start_date), 'MMM d')} - {format(new Date(period.end_date), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Badge variant={getStatusColor(period.status)}>
                          {period.status}
                        </Badge>
                        {period.total_hours && (
                          <span className="text-muted-foreground">
                            {period.total_hours.toFixed(1)}h total
                          </span>
                        )}
                        {period.employee_count && (
                          <span className="text-muted-foreground">
                            {period.employee_count} employees
                          </span>
                        )}
                      </div>
                      {period.total_cost && (
                        <div className="mt-2 text-sm font-semibold">
                          Total: ${period.total_cost.toFixed(2)}
                        </div>
                      )}
                    </div>
                    {period.status === 'open' && (
                      <Button
                        size="sm"
                        onClick={() => closePayPeriod(period.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Close Period
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
