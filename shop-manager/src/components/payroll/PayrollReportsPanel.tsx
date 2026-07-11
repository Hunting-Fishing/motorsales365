import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { format, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns';
import { 
  FileText, 
  Download,
  Calendar,
  User,
  Clock,
  DollarSign
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function PayrollReportsPanel() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [reportType, setReportType] = useState('employee-summary');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Fetch report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['payroll-report', shopId, startDate, endDate],
    queryFn: async () => {
      if (!shopId) return null;
      
      const { data: timeCards } = await supabase
        .from('time_card_entries')
        .select(`
          *,
          profiles:employee_id (
            id,
            first_name,
            last_name,
            job_title
          )
        `)
        .eq('shop_id', shopId)
        .gte('clock_in_time', startDate)
        .lte('clock_in_time', endDate + 'T23:59:59');
      
      // Group by employee
      const employeeData: Record<string, any> = {};
      
      (timeCards || []).forEach(tc => {
        const empId = tc.employee_id;
        if (!employeeData[empId]) {
          employeeData[empId] = {
            employee: tc.profiles,
            totalHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            totalPay: 0,
            entries: [],
          };
        }
        
        employeeData[empId].totalHours += tc.total_hours || 0;
        employeeData[empId].regularHours += tc.regular_hours || 0;
        employeeData[empId].overtimeHours += tc.overtime_hours || 0;
        employeeData[empId].totalPay += tc.total_pay || 0;
        employeeData[empId].entries.push(tc);
      });
      
      return {
        employees: Object.values(employeeData),
        totals: {
          totalHours: Object.values(employeeData).reduce((sum: number, e: any) => sum + e.totalHours, 0),
          regularHours: Object.values(employeeData).reduce((sum: number, e: any) => sum + e.regularHours, 0),
          overtimeHours: Object.values(employeeData).reduce((sum: number, e: any) => sum + e.overtimeHours, 0),
          totalPay: Object.values(employeeData).reduce((sum: number, e: any) => sum + e.totalPay, 0),
        },
      };
    },
    enabled: !!shopId,
  });

  const handleExportPDF = () => {
    if (!reportData) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Payroll Report', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Period: ${format(new Date(startDate), 'MMM d, yyyy')} - ${format(new Date(endDate), 'MMM d, yyyy')}`, 14, 32);
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 40);
    
    // Employee Summary Table
    const tableData = reportData.employees.map((emp: any) => [
      `${emp.employee?.first_name || ''} ${emp.employee?.last_name || ''}`,
      emp.totalHours.toFixed(2),
      emp.regularHours.toFixed(2),
      emp.overtimeHours.toFixed(2),
      `$${emp.totalPay.toFixed(2)}`,
    ]);
    
    // Add totals row
    tableData.push([
      'TOTAL',
      reportData.totals.totalHours.toFixed(2),
      reportData.totals.regularHours.toFixed(2),
      reportData.totals.overtimeHours.toFixed(2),
      `$${reportData.totals.totalPay.toFixed(2)}`,
    ]);
    
    autoTable(doc, {
      head: [['Employee', 'Total Hours', 'Regular Hours', 'OT Hours', 'Total Pay']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    });
    
    doc.save(`payroll-report-${startDate}-to-${endDate}.pdf`);
    
    toast({
      title: 'Success',
      description: 'PDF report downloaded',
    });
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    
    const headers = ['Employee', 'Total Hours', 'Regular Hours', 'OT Hours', 'Total Pay'];
    const rows = reportData.employees.map((emp: any) => [
      `${emp.employee?.first_name || ''} ${emp.employee?.last_name || ''}`,
      emp.totalHours.toFixed(2),
      emp.regularHours.toFixed(2),
      emp.overtimeHours.toFixed(2),
      emp.totalPay.toFixed(2),
    ]);
    
    // Add totals
    rows.push([
      'TOTAL',
      reportData.totals.totalHours.toFixed(2),
      reportData.totals.regularHours.toFixed(2),
      reportData.totals.overtimeHours.toFixed(2),
      reportData.totals.totalPay.toFixed(2),
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-report-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: 'Success',
      description: 'CSV report downloaded',
    });
  };

  // Quick date presets
  const setDatePreset = (preset: string) => {
    const today = new Date();
    switch (preset) {
      case 'this-month':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'ytd':
        setStartDate(format(startOfYear(today), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Quick Select</Label>
              <Select onValueChange={setDatePreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select preset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleExportPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {reportData && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">{reportData.totals.totalHours.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Regular Hours</p>
                  <p className="text-2xl font-bold">{reportData.totals.regularHours.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Overtime Hours</p>
                  <p className="text-2xl font-bold">{reportData.totals.overtimeHours.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Pay</p>
                  <p className="text-2xl font-bold">${reportData.totals.totalPay.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Summary</CardTitle>
          <CardDescription>
            Hours and pay breakdown by employee for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {reportData?.employees.map((emp: any) => (
                <div 
                  key={emp.employee?.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {emp.employee?.first_name} {emp.employee?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {emp.entries.length} time entries
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-8 text-right">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-medium">{emp.totalHours.toFixed(2)} hrs</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Regular</p>
                      <p className="font-medium">{emp.regularHours.toFixed(2)} hrs</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">OT</p>
                      <p className="font-medium text-orange-500">{emp.overtimeHours.toFixed(2)} hrs</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pay</p>
                      <p className="font-bold text-green-600">${emp.totalPay.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {(!reportData?.employees || reportData.employees.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No data for the selected period
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
