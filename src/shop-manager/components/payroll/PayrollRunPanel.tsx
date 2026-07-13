import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTimeCards } from '@/hooks/useTimeCards';
import { usePayPeriods } from '@/hooks/usePayPeriods';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { format, isWithinInterval } from 'date-fns';
import { 
  Play, 
  CheckCircle, 
  FileText,
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function PayrollRunPanel() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { timeCards } = useTimeCards();
  const { payPeriods } = usePayPeriods();
  
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees-for-payroll', shopId],
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

  // Fetch existing payroll runs
  const { data: payrollRuns, isLoading: runsLoading } = useQuery({
    queryKey: ['payroll-runs', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!shopId,
  });

  // Get employee rates from localStorage
  const getEmployeeRate = (employeeId: string) => {
    const ratesKey = `employee_rates_${shopId}`;
    const rates = JSON.parse(localStorage.getItem(ratesKey) || '{}');
    return rates[employeeId]?.hourly_rate || 0;
  };

  // Calculate payroll preview for selected period
  const payrollPreview = useMemo(() => {
    if (!selectedPeriod || !employees) return null;

    const period = payPeriods.find((p: any) => p.id === selectedPeriod);
    if (!period) return null;

    const periodStart = new Date(period.start_date);
    const periodEnd = new Date(period.end_date);

    // Get approved time cards for this period
    const periodCards = timeCards.filter((tc: any) => {
      const clockIn = new Date(tc.clock_in_time);
      return tc.status === 'approved' && 
        isWithinInterval(clockIn, { start: periodStart, end: periodEnd });
    });

    // Calculate per-employee totals
    const employeeTotals = employees.map((emp: any) => {
      const empCards = periodCards.filter((tc: any) => tc.employee_id === emp.id);
      const regularHours = empCards.reduce((sum: number, tc: any) => sum + (tc.regular_hours || 0), 0);
      const overtimeHours = empCards.reduce((sum: number, tc: any) => sum + (tc.overtime_hours || 0), 0);
      const hourlyRate = getEmployeeRate(emp.id);
      const overtimeRate = hourlyRate * 1.5;
      const grossPay = (regularHours * hourlyRate) + (overtimeHours * overtimeRate);

      return {
        employeeId: emp.id,
        employeeName: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        regularHours,
        overtimeHours,
        hourlyRate,
        overtimeRate,
        grossPay,
        timeCardCount: empCards.length,
      };
    }).filter(emp => emp.timeCardCount > 0);

    // Calculate totals
    const totalRegularHours = employeeTotals.reduce((sum, e) => sum + e.regularHours, 0);
    const totalOvertimeHours = employeeTotals.reduce((sum, e) => sum + e.overtimeHours, 0);
    const totalGrossPay = employeeTotals.reduce((sum, e) => sum + e.grossPay, 0);
    const totalRegularPay = employeeTotals.reduce((sum, e) => sum + (e.regularHours * e.hourlyRate), 0);
    const totalOvertimePay = employeeTotals.reduce((sum, e) => sum + (e.overtimeHours * e.overtimeRate), 0);

    return {
      period,
      employeeTotals,
      summary: {
        employeeCount: employeeTotals.length,
        totalRegularHours,
        totalOvertimeHours,
        totalGrossPay,
        totalRegularPay,
        totalOvertimePay,
        unapprovedCards: timeCards.filter((tc: any) => {
          const clockIn = new Date(tc.clock_in_time);
          return tc.status === 'completed' && 
            isWithinInterval(clockIn, { start: periodStart, end: periodEnd });
        }).length,
      },
    };
  }, [selectedPeriod, timeCards, employees, payPeriods, shopId]);

  // Process payroll mutation
  const processPayrollMutation = useMutation({
    mutationFn: async () => {
      if (!shopId || !payrollPreview) throw new Error('Missing data');

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Create payroll run
      const { data: payrollRun, error: runError } = await supabase
        .from('payroll_runs')
        .insert({
          shop_id: shopId,
          pay_period_id: selectedPeriod,
          status: 'processed',
          total_gross_pay: payrollPreview.summary.totalGrossPay,
          total_regular_pay: payrollPreview.summary.totalRegularPay,
          total_overtime_pay: payrollPreview.summary.totalOvertimePay,
          total_net_pay: payrollPreview.summary.totalGrossPay, // No deductions for now
          employee_count: payrollPreview.summary.employeeCount,
          processed_by: userData.user.id,
          processed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .select()
        .single();

      if (runError) throw runError;

      // Create payroll run details for each employee
      const details = payrollPreview.employeeTotals.map(emp => ({
        payroll_run_id: payrollRun.id,
        employee_id: emp.employeeId,
        regular_hours: emp.regularHours,
        overtime_hours: emp.overtimeHours,
        hourly_rate: emp.hourlyRate,
        overtime_rate: emp.overtimeRate,
        gross_pay: emp.grossPay,
        net_pay: emp.grossPay,
        deductions: 0,
      }));

      const { error: detailsError } = await supabase
        .from('payroll_run_details')
        .insert(details);

      if (detailsError) throw detailsError;

      return payrollRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      toast({
        title: 'Payroll Processed',
        description: 'Payroll has been successfully processed for this period.',
      });
      setShowConfirmDialog(false);
      setSelectedPeriod('');
      setNotes('');
    },
    onError: (error) => {
      console.error('Error processing payroll:', error);
      toast({
        title: 'Error',
        description: 'Failed to process payroll. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Check if period already has a payroll run
  const periodHasRun = (periodId: string) => {
    return payrollRuns?.some((run: any) => run.pay_period_id === periodId);
  };

  if (runsLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Run Payroll
          </CardTitle>
          <CardDescription>
            Select a pay period to calculate and process payroll
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Pay Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a pay period..." />
                </SelectTrigger>
                <SelectContent>
                  {payPeriods?.map((period: any) => (
                    <SelectItem 
                      key={period.id} 
                      value={period.id}
                      disabled={periodHasRun(period.id)}
                    >
                      {format(new Date(period.start_date), 'MMM d')} - {format(new Date(period.end_date), 'MMM d, yyyy')}
                      {periodHasRun(period.id) && ' (Already processed)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Preview */}
      {payrollPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Payroll Preview
            </CardTitle>
            <CardDescription>
              {format(new Date(payrollPreview.period.start_date), 'MMMM d')} - {format(new Date(payrollPreview.period.end_date), 'MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Warning for unapproved cards */}
            {payrollPreview.summary.unapprovedCards > 0 && (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">
                    {payrollPreview.summary.unapprovedCards} Unapproved Time Cards
                  </p>
                  <p className="text-sm text-yellow-700">
                    Only approved time cards are included in this payroll run.
                  </p>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Employees</span>
                  </div>
                  <p className="text-2xl font-bold">{payrollPreview.summary.employeeCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total Hours</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {(payrollPreview.summary.totalRegularHours + payrollPreview.summary.totalOvertimeHours).toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payrollPreview.summary.totalOvertimeHours.toFixed(1)}h overtime
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Regular Pay</span>
                  </div>
                  <p className="text-2xl font-bold">${payrollPreview.summary.totalRegularPay.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Total Gross</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    ${payrollPreview.summary.totalGrossPay.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Employee Breakdown */}
            <div>
              <h3 className="font-semibold mb-3">Employee Breakdown</h3>
              <div className="space-y-2">
                {payrollPreview.employeeTotals.map((emp) => (
                  <div key={emp.employeeId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{emp.employeeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {emp.regularHours.toFixed(1)}h regular + {emp.overtimeHours.toFixed(1)}h OT
                        {emp.hourlyRate > 0 && ` @ $${emp.hourlyRate.toFixed(2)}/hr`}
                      </p>
                    </div>
                    <p className="font-bold text-green-600">${emp.grossPay.toFixed(2)}</p>
                  </div>
                ))}

                {payrollPreview.employeeTotals.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No approved time cards for this period
                  </p>
                )}
              </div>
            </div>

            {/* Process Button */}
            {payrollPreview.employeeTotals.length > 0 && (
              <div className="flex justify-end">
                <Button 
                  size="lg" 
                  onClick={() => setShowConfirmDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Process Payroll (${payrollPreview.summary.totalGrossPay.toFixed(2)})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Payroll Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payroll Runs</CardTitle>
          <CardDescription>History of processed payroll</CardDescription>
        </CardHeader>
        <CardContent>
          {payrollRuns && payrollRuns.length > 0 ? (
            <div className="space-y-3">
              {payrollRuns.slice(0, 5).map((run: any) => {
                const period = payPeriods.find((p: any) => p.id === run.pay_period_id);
                return (
                  <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {period ? (
                          `${format(new Date(period.start_date), 'MMM d')} - ${format(new Date(period.end_date), 'MMM d, yyyy')}`
                        ) : 'Unknown Period'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {run.employee_count} employees • Processed {format(new Date(run.processed_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${run.total_gross_pay?.toFixed(2)}</p>
                      <Badge variant="secondary">{run.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No payroll runs yet</p>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payroll Processing</DialogTitle>
            <DialogDescription>
              You are about to process payroll for {payrollPreview?.summary.employeeCount} employees
              totaling ${payrollPreview?.summary.totalGrossPay.toFixed(2)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this payroll run..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => processPayrollMutation.mutate()}
              disabled={processPayrollMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {processPayrollMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirm & Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
