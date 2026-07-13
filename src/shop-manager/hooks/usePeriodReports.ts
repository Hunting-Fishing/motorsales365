import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns';

export interface PeriodReportData {
  // Revenue
  totalRevenue: number;
  revenueByMonth: { month: string; revenue: number }[];
  
  // Expenses
  totalExpenses: number;
  expensesByCategory: { category: string; amount: number }[];
  
  // Profit
  grossProfit: number;
  profitMargin: number;
  
  // Work Orders
  workOrdersCompleted: number;
  workOrdersTotal: number;
  completionRate: number;
  averageWorkOrderValue: number;
  
  // Customers
  totalCustomers: number;
  newCustomers: number;
  topCustomers: { name: string; revenue: number }[];
  
  // Invoices
  invoicesIssued: number;
  invoicesPaid: number;
  outstandingAmount: number;
  
  // Comparison
  previousPeriodRevenue: number;
  revenueChange: number;
  revenueChangePercent: number;
}

export interface PeriodRange {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
}

export function usePeriodReports(
  periodType: 'month' | 'quarter' | 'year',
  selectedDate: Date = new Date()
) {
  const [data, setData] = useState<PeriodReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getPeriodRange = useCallback((): PeriodRange => {
    let start: Date, end: Date, previousStart: Date, previousEnd: Date, label: string;

    switch (periodType) {
      case 'month':
        start = startOfMonth(selectedDate);
        end = endOfMonth(selectedDate);
        previousStart = startOfMonth(subMonths(selectedDate, 1));
        previousEnd = endOfMonth(subMonths(selectedDate, 1));
        label = format(selectedDate, 'MMMM yyyy');
        break;
      case 'quarter':
        start = startOfQuarter(selectedDate);
        end = endOfQuarter(selectedDate);
        previousStart = startOfQuarter(subQuarters(selectedDate, 1));
        previousEnd = endOfQuarter(subQuarters(selectedDate, 1));
        const quarter = Math.ceil((selectedDate.getMonth() + 1) / 3);
        label = `Q${quarter} ${selectedDate.getFullYear()}`;
        break;
      case 'year':
        start = startOfYear(selectedDate);
        end = endOfYear(selectedDate);
        previousStart = startOfYear(subYears(selectedDate, 1));
        previousEnd = endOfYear(subYears(selectedDate, 1));
        label = selectedDate.getFullYear().toString();
        break;
    }

    return { start, end, previousStart, previousEnd, label };
  }, [periodType, selectedDate]);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const range = getPeriodRange();
      const startStr = format(range.start, 'yyyy-MM-dd');
      const endStr = format(range.end, 'yyyy-MM-dd');
      const prevStartStr = format(range.previousStart, 'yyyy-MM-dd');
      const prevEndStr = format(range.previousEnd, 'yyyy-MM-dd');

      // Fetch work orders for revenue
      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('id, total_cost, status, created_at, customer_id')
        .gte('created_at', startStr)
        .lte('created_at', endStr);

      if (woError) throw woError;

      // Fetch previous period work orders for comparison
      const { data: prevWorkOrders, error: prevWoError } = await supabase
        .from('work_orders')
        .select('total_cost')
        .gte('created_at', prevStartStr)
        .lte('created_at', prevEndStr);

      if (prevWoError) throw prevWoError;

      // Fetch invoices
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id, total, status, created_at')
        .gte('created_at', startStr)
        .lte('created_at', endStr);

      if (invError) throw invError;

      // Fetch financial transactions (expenses)
      const { data: transactions, error: txError } = await supabase
        .from('financial_transactions')
        .select('amount, description, transaction_type')
        .gte('transaction_date', startStr)
        .lte('transaction_date', endStr);

      if (txError) throw txError;

      // Fetch customers
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, created_at');

      if (custError) throw custError;

      // Calculate metrics
      const totalRevenue = (workOrders || []).reduce((sum, wo) => sum + (wo.total_cost || 0), 0);
      const previousPeriodRevenue = (prevWorkOrders || []).reduce((sum, wo) => sum + (wo.total_cost || 0), 0);
      
      const expenses = (transactions || []).filter(t => t.transaction_type === 'expense');
      const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
      
      const grossProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      const completedWOs = (workOrders || []).filter(wo => wo.status === 'completed');
      const workOrdersCompleted = completedWOs.length;
      const workOrdersTotal = (workOrders || []).length;
      const completionRate = workOrdersTotal > 0 ? (workOrdersCompleted / workOrdersTotal) * 100 : 0;
      const averageWorkOrderValue = workOrdersTotal > 0 ? totalRevenue / workOrdersTotal : 0;

      const periodCustomers = (customers || []).filter(c => {
        const created = new Date(c.created_at);
        return created >= range.start && created <= range.end;
      });
      const newCustomers = periodCustomers.length;
      const totalCustomers = (customers || []).length;

      const invoicesData = invoices || [];
      const invoicesIssued = invoicesData.length;
      const invoicesPaid = invoicesData.filter(i => i.status === 'paid').length;
      const outstandingAmount = invoicesData
        .filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + (i.total || 0), 0);

      // Expenses by category (using description as category proxy)
      const expenseMap = new Map<string, number>();
      expenses.forEach((t: any) => {
        const cat = t.description?.split(' ')[0] || 'Other';
        expenseMap.set(cat, (expenseMap.get(cat) || 0) + Math.abs(t.amount || 0));
      });
      const expensesByCategory = Array.from(expenseMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

      // Revenue by month (for charts)
      const revenueByMonthMap = new Map<string, number>();
      (workOrders || []).forEach(wo => {
        const month = format(new Date(wo.created_at), 'MMM');
        revenueByMonthMap.set(month, (revenueByMonthMap.get(month) || 0) + (wo.total_cost || 0));
      });
      const revenueByMonth = Array.from(revenueByMonthMap.entries())
        .map(([month, revenue]) => ({ month, revenue }));

      // Top customers
      const customerRevenueMap = new Map<string, { name: string; revenue: number }>();
      (workOrders || []).forEach(wo => {
        if (wo.customer_id) {
          const customer = customers?.find(c => c.id === wo.customer_id);
          const name = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'Unknown';
          const existing = customerRevenueMap.get(wo.customer_id) || { name, revenue: 0 };
          customerRevenueMap.set(wo.customer_id, {
            name,
            revenue: existing.revenue + (wo.total_cost || 0)
          });
        }
      });
      const topCustomers = Array.from(customerRevenueMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const revenueChange = totalRevenue - previousPeriodRevenue;
      const revenueChangePercent = previousPeriodRevenue > 0 
        ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
        : 0;

      setData({
        totalRevenue,
        revenueByMonth,
        totalExpenses,
        expensesByCategory,
        grossProfit,
        profitMargin,
        workOrdersCompleted,
        workOrdersTotal,
        completionRate,
        averageWorkOrderValue,
        totalCustomers,
        newCustomers,
        topCustomers,
        invoicesIssued,
        invoicesPaid,
        outstandingAmount,
        previousPeriodRevenue,
        revenueChange,
        revenueChangePercent
      });

    } catch (err) {
      console.error('Error fetching period report:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  }, [getPeriodRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return {
    data,
    loading,
    error,
    periodRange: getPeriodRange(),
    refetch: fetchReportData
  };
}
