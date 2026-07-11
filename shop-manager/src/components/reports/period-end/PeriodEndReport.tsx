import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePeriodReports } from '@/hooks/usePeriodReports';
import { PeriodSelector } from './PeriodSelector';
import { FinancialSummaryCard } from './FinancialSummaryCard';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Download, FileText, DollarSign, Users, Wrench, FileCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export function PeriodEndReport() {
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data, loading, error, periodRange, refetch } = usePeriodReports(periodType, selectedDate);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const handleExportPDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.text(`${periodRange.label} Financial Report`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    // Financial Summary
    doc.setFontSize(14);
    doc.text('Financial Summary', 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    const summaryData = [
      ['Total Revenue', formatCurrency(data.totalRevenue)],
      ['Total Expenses', formatCurrency(data.totalExpenses)],
      ['Gross Profit', formatCurrency(data.grossProfit)],
      ['Profit Margin', `${data.profitMargin.toFixed(1)}%`],
      ['Revenue Change', `${data.revenueChangePercent >= 0 ? '+' : ''}${data.revenueChangePercent.toFixed(1)}%`]
    ];

    summaryData.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, 14, yPos);
      yPos += 6;
    });
    yPos += 10;

    // Work Orders
    doc.setFontSize(14);
    doc.text('Work Orders', 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    const woData = [
      ['Completed', data.workOrdersCompleted.toString()],
      ['Total', data.workOrdersTotal.toString()],
      ['Completion Rate', `${data.completionRate.toFixed(1)}%`],
      ['Avg Value', formatCurrency(data.averageWorkOrderValue)]
    ];

    woData.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, 14, yPos);
      yPos += 6;
    });
    yPos += 10;

    // Invoices
    doc.setFontSize(14);
    doc.text('Invoices', 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    const invData = [
      ['Issued', data.invoicesIssued.toString()],
      ['Paid', data.invoicesPaid.toString()],
      ['Outstanding', formatCurrency(data.outstandingAmount)]
    ];

    invData.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, 14, yPos);
      yPos += 6;
    });

    doc.save(`${periodRange.label.replace(' ', '_')}_Report.pdf`);
    toast.success('Report exported to PDF');
  };

  const handleExportCSV = () => {
    if (!data) return;

    const rows = [
      ['Metric', 'Value'],
      ['Period', periodRange.label],
      ['Total Revenue', data.totalRevenue],
      ['Total Expenses', data.totalExpenses],
      ['Gross Profit', data.grossProfit],
      ['Profit Margin %', data.profitMargin.toFixed(1)],
      ['Work Orders Completed', data.workOrdersCompleted],
      ['Work Orders Total', data.workOrdersTotal],
      ['Completion Rate %', data.completionRate.toFixed(1)],
      ['Average Work Order Value', data.averageWorkOrderValue],
      ['Invoices Issued', data.invoicesIssued],
      ['Invoices Paid', data.invoicesPaid],
      ['Outstanding Amount', data.outstandingAmount],
      ['New Customers', data.newCustomers],
      ['Total Customers', data.totalCustomers],
      ['Previous Period Revenue', data.previousPeriodRevenue],
      ['Revenue Change', data.revenueChange],
      ['Revenue Change %', data.revenueChangePercent.toFixed(1)]
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${periodRange.label.replace(' ', '_')}_Report.csv`;
    link.click();
    toast.success('Report exported to CSV');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-10 w-[200px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PeriodSelector
          periodType={periodType}
          selectedDate={selectedDate}
          onPeriodTypeChange={setPeriodType}
          onDateChange={setSelectedDate}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FinancialSummaryCard
          title="Total Revenue"
          value={data?.totalRevenue || 0}
          icon={<DollarSign className="h-4 w-4" />}
          trend={data && data.revenueChange >= 0 ? 'up' : 'down'}
          trendValue={`${data?.revenueChangePercent?.toFixed(1) || 0}% vs prev`}
        />
        <FinancialSummaryCard
          title="Gross Profit"
          value={data?.grossProfit || 0}
          icon={<DollarSign className="h-4 w-4" />}
          subtitle={`${data?.profitMargin?.toFixed(1) || 0}% margin`}
        />
        <FinancialSummaryCard
          title="Work Orders"
          value={`${data?.workOrdersCompleted || 0} / ${data?.workOrdersTotal || 0}`}
          icon={<Wrench className="h-4 w-4" />}
          subtitle={`${data?.completionRate?.toFixed(0) || 0}% completed`}
        />
        <FinancialSummaryCard
          title="Outstanding"
          value={data?.outstandingAmount || 0}
          icon={<FileCheck className="h-4 w-4" />}
          subtitle={`${data?.invoicesIssued || 0} invoices issued`}
        />
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Revenue over the period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data?.revenueByMonth || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} className="text-xs" />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
                <CardDescription>Revenue performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Average Work Order Value</span>
                    <span className="font-bold">{formatCurrency(data?.averageWorkOrderValue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Work Order Completion Rate</span>
                    <Badge variant="outline">{data?.completionRate?.toFixed(1) || 0}%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Invoices Paid</span>
                    <span className="font-bold">{data?.invoicesPaid || 0} / {data?.invoicesIssued || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Collection Rate</span>
                    <Badge variant="outline">
                      {data?.invoicesIssued ? ((data.invoicesPaid / data.invoicesIssued) * 100).toFixed(0) : 0}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>Breakdown of spending</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data?.expensesByCategory || []}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {(data?.expensesByCategory || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Details</CardTitle>
                <CardDescription>Top expense categories</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.expensesByCategory || []).slice(0, 5).map((exp, i) => (
                      <TableRow key={i}>
                        <TableCell>{exp.category}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(exp.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data?.expensesByCategory || data.expensesByCategory.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No expense data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Overview</CardTitle>
                <CardDescription>Customer metrics for the period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Total Customers
                    </span>
                    <span className="font-bold">{data?.totalCustomers || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>New Customers</span>
                    <Badge>{data?.newCustomers || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>By revenue this period</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.topCustomers || []).map((cust, i) => (
                      <TableRow key={i}>
                        <TableCell>{cust.name || 'Unknown'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(cust.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data?.topCustomers || data.topCustomers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No customer data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Period Comparison</CardTitle>
              <CardDescription>Current vs previous period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Previous Period Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(data?.previousPeriodRevenue || 0)}</p>
                </div>
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Current Period Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(data?.totalRevenue || 0)}</p>
                </div>
                <div className={`text-center p-6 rounded-lg ${(data?.revenueChange || 0) >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                  <p className="text-sm text-muted-foreground mb-2">Change</p>
                  <p className={`text-2xl font-bold ${(data?.revenueChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(data?.revenueChange || 0) >= 0 ? '+' : ''}{formatCurrency(data?.revenueChange || 0)}
                  </p>
                  <p className={`text-sm ${(data?.revenueChangePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(data?.revenueChangePercent || 0) >= 0 ? '+' : ''}{data?.revenueChangePercent?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
