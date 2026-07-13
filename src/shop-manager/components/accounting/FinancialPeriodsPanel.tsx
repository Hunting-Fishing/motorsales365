import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Lock, Trash2, RefreshCw, Calendar, CheckCircle } from 'lucide-react';
import { useFinancialPeriods } from '@/hooks/useFinancialPeriods';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, addMonths, addQuarters, addYears } from 'date-fns';

const PERIOD_TYPES = [
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Annual' },
];

export function FinancialPeriodsPanel() {
  const { periods, isLoading, createPeriod, closePeriod, deletePeriod } = useFinancialPeriods();
  const [showDialog, setShowDialog] = useState(false);

  const today = new Date();
  const [form, setForm] = useState({
    period_name: '',
    period_type: 'month' as 'month' | 'quarter' | 'year',
    start_date: format(startOfMonth(today), 'yyyy-MM-dd'),
    end_date: format(endOfMonth(today), 'yyyy-MM-dd'),
    fiscal_year: today.getFullYear(),
    notes: '',
  });

  const handlePeriodTypeChange = (type: 'month' | 'quarter' | 'year') => {
    let start: Date, end: Date, name: string;
    switch (type) {
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        name = format(start, 'MMMM yyyy');
        break;
      case 'quarter':
        start = startOfQuarter(today);
        end = endOfQuarter(today);
        const quarter = Math.ceil((today.getMonth() + 1) / 3);
        name = `Q${quarter} ${today.getFullYear()}`;
        break;
      case 'year':
        start = startOfYear(today);
        end = endOfYear(today);
        name = `FY ${today.getFullYear()}`;
        break;
    }
    setForm({
      ...form,
      period_type: type,
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd'),
      period_name: name,
    });
  };

  const handleSubmit = () => {
    createPeriod.mutate({
      period_name: form.period_name,
      period_type: form.period_type,
      start_date: form.start_date,
      end_date: form.end_date,
      fiscal_year: form.fiscal_year,
      notes: form.notes || undefined,
    });
    setShowDialog(false);
    setForm({
      period_name: '',
      period_type: 'month',
      start_date: format(startOfMonth(today), 'yyyy-MM-dd'),
      end_date: format(endOfMonth(today), 'yyyy-MM-dd'),
      fiscal_year: today.getFullYear(),
      notes: '',
    });
  };

  const generateNextPeriods = () => {
    // Find the most recent period of each type
    const latestMonth = periods.find(p => p.period_type === 'month' && !p.is_closed);
    const latestQuarter = periods.find(p => p.period_type === 'quarter' && !p.is_closed);

    // Generate next month if no open month period
    if (!latestMonth) {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      createPeriod.mutate({
        period_name: format(start, 'MMMM yyyy'),
        period_type: 'month',
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end, 'yyyy-MM-dd'),
        fiscal_year: today.getFullYear(),
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Financial Periods</h2>
          <p className="text-sm text-muted-foreground">Manage accounting periods and period closing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={generateNextPeriods}>
            <RefreshCw className="h-4 w-4 mr-2" />Generate Periods
          </Button>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Period</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Financial Period</DialogTitle>
                <DialogDescription>Define a new accounting period</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Period Type</Label>
                  <Select value={form.period_type} onValueChange={v => handlePeriodTypeChange(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIOD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Period Name</Label>
                  <Input value={form.period_name} onChange={e => setForm({ ...form, period_name: e.target.value })} placeholder="January 2024" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Fiscal Year</Label>
                  <Input type="number" value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!form.period_name || !form.start_date || !form.end_date}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Fiscal Year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Closed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map(period => (
              <TableRow key={period.id}>
                <TableCell className="font-medium">{period.period_name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{period.period_type}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(period.start_date), 'MMM d')} - {format(new Date(period.end_date), 'MMM d, yyyy')}
                  </div>
                </TableCell>
                <TableCell>{period.fiscal_year}</TableCell>
                <TableCell>
                  {period.is_closed ? (
                    <Badge className="bg-muted text-muted-foreground">
                      <Lock className="h-3 w-3 mr-1" />Closed
                    </Badge>
                  ) : (
                    <Badge className="bg-green-500">Open</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {period.closed_at ? format(new Date(period.closed_at), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!period.is_closed && (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <CheckCircle className="h-4 w-4 mr-1" />Close Period
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Close Financial Period?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will close the period "{period.period_name}" and create any necessary closing entries. 
                                You won't be able to post new journal entries to this period after closing.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => closePeriod.mutate(period.id)}>Close Period</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button size="sm" variant="ghost" onClick={() => deletePeriod.mutate(period.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {periods.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No financial periods yet. Create one or click "Generate Periods" to auto-create.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
