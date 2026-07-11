import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, Download, Eye, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

interface PayrollRun {
  id: string;
  pay_period_id: string;
  run_date: string;
  status: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_employees: number;
  processed_by: string;
  processed_by_name?: string;
  notes: string | null;
  created_at: string;
  pay_period?: {
    name: string;
    start_date: string;
    end_date: string;
  };
}

interface PayrollRunDetail {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_name?: string;
  regular_hours: number;
  overtime_hours: number;
  regular_pay: number;
  overtime_pay: number;
  gross_pay: number;
  deductions: number;
  additions: number;
  net_pay: number;
}

export function PayrollHistoryPanel() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [runDetails, setRunDetails] = useState<PayrollRunDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const { shopId } = useShopId();
  const { toast } = useToast();

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  useEffect(() => {
    if (shopId) {
      fetchPayrollHistory();
    }
  }, [shopId, yearFilter]);

  const fetchPayrollHistory = async () => {
    setLoading(true);
    try {
      const startOfYear = `${yearFilter}-01-01`;
      const endOfYear = `${yearFilter}-12-31`;

      const { data, error } = await supabase
        .from('payroll_runs')
        .select(`
          *,
          pay_period:pay_periods(name, start_date, end_date)
        `)
        .eq('shop_id', shopId)
        .gte('run_date', startOfYear)
        .lte('run_date', endOfYear)
        .order('run_date', { ascending: false });

      if (error) throw error;

      // Fetch processor names
      const processorIds = [...new Set(data?.map(d => d.processed_by) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', processorIds);

      const profileMap = new Map(profiles?.map(p => [
        p.id,
        p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.email || 'Unknown'
      ]));

      setPayrollRuns((data || []).map((run: any) => ({
        id: run.id,
        pay_period_id: run.pay_period_id,
        run_date: run.run_date,
        status: run.status,
        total_gross: run.total_gross || 0,
        total_deductions: run.total_deductions || 0,
        total_net: run.total_net || 0,
        total_employees: run.employee_count || 0,
        processed_by: run.processed_by,
        processed_by_name: profileMap.get(run.processed_by) || 'Unknown',
        notes: run.notes,
        created_at: run.created_at,
        pay_period: run.pay_period,
      })));
    } catch (error) {
      console.error('Error fetching payroll history:', error);
      toast({ title: 'Error', description: 'Failed to load payroll history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const viewRunDetails = async (run: PayrollRun) => {
    setSelectedRun(run);
    setDetailsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('payroll_run_details')
        .select('*')
        .eq('payroll_run_id', run.id);

      if (error) throw error;

      // Fetch employee names
      const employeeIds = [...new Set(data?.map(d => d.employee_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', employeeIds);

      const profileMap = new Map(profiles?.map(p => [
        p.id,
        p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.email || 'Unknown'
      ]));

      setRunDetails((data || []).map((detail: any) => ({
        id: detail.id,
        payroll_run_id: detail.payroll_run_id,
        employee_id: detail.employee_id,
        employee_name: profileMap.get(detail.employee_id) || 'Unknown',
        regular_hours: detail.regular_hours || 0,
        overtime_hours: detail.overtime_hours || 0,
        regular_pay: (detail.regular_hours || 0) * (detail.hourly_rate || 0),
        overtime_pay: (detail.overtime_hours || 0) * (detail.overtime_rate || 0),
        gross_pay: detail.gross_pay || 0,
        deductions: detail.deductions || 0,
        additions: 0,
        net_pay: detail.net_pay || 0,
      })));
    } catch (error) {
      console.error('Error fetching run details:', error);
      toast({ title: 'Error', description: 'Failed to load payroll details', variant: 'destructive' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const exportToCSV = (run: PayrollRun) => {
    if (runDetails.length === 0) return;

    const headers = ['Employee', 'Regular Hours', 'OT Hours', 'Regular Pay', 'OT Pay', 'Gross', 'Deductions', 'Additions', 'Net Pay'];
    const rows = runDetails.map(d => [
      d.employee_name,
      d.regular_hours,
      d.overtime_hours,
      d.regular_pay.toFixed(2),
      d.overtime_pay.toFixed(2),
      d.gross_pay.toFixed(2),
      d.deductions.toFixed(2),
      d.additions.toFixed(2),
      d.net_pay.toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${run.pay_period?.name || run.id}-${format(new Date(run.run_date), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Summary stats
  const totalGrossYTD = payrollRuns.reduce((sum, r) => sum + (r.total_gross || 0), 0);
  const totalNetYTD = payrollRuns.reduce((sum, r) => sum + (r.total_net || 0), 0);
  const totalRuns = payrollRuns.length;

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading payroll history...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Payroll History
        </CardTitle>
        <CardDescription>View past payroll runs and detailed breakdowns</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Year Filter and Summary */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1 flex flex-wrap gap-4 justify-end">
            <Card className="p-3 min-w-32">
              <p className="text-xs text-muted-foreground">Payroll Runs</p>
              <p className="text-xl font-bold">{totalRuns}</p>
            </Card>
            <Card className="p-3 min-w-32">
              <p className="text-xs text-muted-foreground">YTD Gross</p>
              <p className="text-xl font-bold text-green-600">${totalGrossYTD.toLocaleString()}</p>
            </Card>
            <Card className="p-3 min-w-32">
              <p className="text-xs text-muted-foreground">YTD Net</p>
              <p className="text-xl font-bold">${totalNetYTD.toLocaleString()}</p>
            </Card>
          </div>
        </div>

        {/* Payroll Runs List */}
        <Accordion type="single" collapsible className="space-y-2">
          {payrollRuns.map(run => (
            <AccordionItem key={run.id} value={run.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 text-left">
                    <p className="font-medium">{run.pay_period?.name || 'Payroll Run'}</p>
                    <p className="text-sm text-muted-foreground">
                      {run.pay_period && format(new Date(run.pay_period.start_date), 'MMM d')} - {' '}
                      {run.pay_period && format(new Date(run.pay_period.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant={run.status === 'completed' ? 'default' : 'secondary'}>
                    {run.status}
                  </Badge>
                  <div className="text-right">
                    <p className="font-medium">${run.total_net?.toLocaleString() || 0}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {run.total_employees} employees
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Run Date</p>
                      <p className="font-medium">{format(new Date(run.run_date), 'PPP')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Gross</p>
                      <p className="font-medium text-green-600">${run.total_gross?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Deductions</p>
                      <p className="font-medium text-destructive">${run.total_deductions?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Processed By</p>
                      <p className="font-medium">{run.processed_by_name}</p>
                    </div>
                  </div>
                  {run.notes && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">{run.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => viewRunDetails(run)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {payrollRuns.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payroll runs found for {yearFilter}</p>
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Payroll Details: {selectedRun?.pay_period?.name}</span>
                <Button size="sm" variant="outline" onClick={() => selectedRun && exportToCSV(selectedRun)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            {detailsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading details...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Reg Hours</TableHead>
                    <TableHead className="text-right">OT Hours</TableHead>
                    <TableHead className="text-right">Reg Pay</TableHead>
                    <TableHead className="text-right">OT Pay</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Additions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runDetails.map(detail => (
                    <TableRow key={detail.id}>
                      <TableCell className="font-medium">{detail.employee_name}</TableCell>
                      <TableCell className="text-right">{detail.regular_hours.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{detail.overtime_hours.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${detail.regular_pay.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${detail.overtime_pay.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">${detail.gross_pay.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-destructive">-${detail.deductions.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-blue-600">+${detail.additions.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">${detail.net_pay.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {runDetails.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No detail records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
