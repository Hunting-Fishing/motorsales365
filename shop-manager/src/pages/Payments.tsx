import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { PaymentHistoryList } from '@/components/payments/PaymentHistoryList';
import { PaymentMethodsList } from '@/components/payments/PaymentMethodsList';
import { AddPaymentMethodDialog } from '@/components/payments/AddPaymentMethodDialog';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { Payment, PaymentStatus, PaymentType } from '@/types/payment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  pendingPayments: number;
  failedPayments: number;
  refundedPayments: number;
  monthlyGrowth: number;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface PaymentWithCustomer extends Omit<Payment, 'payment_type' | 'status'> {
  payment_type: string;
  status: string;
  customers?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const Payments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState('30days');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentWithCustomer[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalPayments: 0,
    totalAmount: 0,
    pendingPayments: 0,
    failedPayments: 0,
    refundedPayments: 0,
    monthlyGrowth: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [addMethodDialogOpen, setAddMethodDialogOpen] = useState(false);

  const { 
    payments: customerPayments, 
    isLoading: isLoadingCustomerPayments, 
    refetch: refetchCustomerPayments 
  } = usePaymentHistory(selectedCustomerId);

  const { 
    paymentMethods, 
    isLoading: isLoadingMethods, 
    refetch: refetchMethods 
  } = usePaymentMethods(selectedCustomerId);

  // Fetch all customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email')
          .order('first_name');

        if (error) throw error;
        setCustomers(data || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast({
          title: "Error",
          description: "Failed to load customers",
          variant: "destructive",
        });
      }
    };

    fetchCustomers();
  }, []);

  // Fetch all payments and calculate stats
  useEffect(() => {
    const fetchAllPayments = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('payments')
          .select(`
            *,
            customers(first_name, last_name, email)
          `)
          .order('transaction_date', { ascending: false });

        // Apply date filter
        if (dateRange !== 'all') {
          let startDate: Date;
          const endDate = new Date();
          
          switch (dateRange) {
            case '7days':
              startDate = subDays(endDate, 7);
              break;
            case '30days':
              startDate = subDays(endDate, 30);
              break;
            case 'thismonth':
              startDate = startOfMonth(endDate);
              break;
            default:
              startDate = subDays(endDate, 30);
          }
          
          query = query.gte('transaction_date', startDate.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;

        const payments = (data || []) as PaymentWithCustomer[];
        setAllPayments(payments);

        // Calculate stats
        const totalAmount = payments.reduce((sum, payment) => {
          if (payment.status === 'refunded' || payment.payment_type === 'refund') {
            return sum - payment.amount;
          }
          return sum + payment.amount;
        }, 0);

        const pendingCount = payments.filter(p => p.status === 'pending').length;
        const failedCount = payments.filter(p => p.status === 'failed').length;
        const refundedCount = payments.filter(p => p.status === 'refunded' || p.payment_type === 'refund').length;

        // Calculate monthly growth (simplified)
        const thisMonth = payments.filter(p => {
          const paymentDate = new Date(p.transaction_date);
          const now = new Date();
          return paymentDate.getMonth() === now.getMonth() && 
                 paymentDate.getFullYear() === now.getFullYear();
        });

        const lastMonth = payments.filter(p => {
          const paymentDate = new Date(p.transaction_date);
          const lastMonthDate = new Date();
          lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
          return paymentDate.getMonth() === lastMonthDate.getMonth() && 
                 paymentDate.getFullYear() === lastMonthDate.getFullYear();
        });

        const thisMonthAmount = thisMonth.reduce((sum, p) => sum + p.amount, 0);
        const lastMonthAmount = lastMonth.reduce((sum, p) => sum + p.amount, 0);
        const monthlyGrowth = lastMonthAmount > 0 ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100 : 0;

        setStats({
          totalPayments: payments.length,
          totalAmount,
          pendingPayments: pendingCount,
          failedPayments: failedCount,
          refundedPayments: refundedCount,
          monthlyGrowth
        });

      } catch (error) {
        console.error('Error fetching payments:', error);
        toast({
          title: "Error",
          description: "Failed to load payment data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPayments();
  }, [dateRange]);

  // Filter payments based on search and status
  const filteredPayments = allPayments.filter(payment => {
    const matchesSearch = searchTerm === '' || 
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.amount.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = () => {
    window.location.reload();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'refunded':
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'processed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'refunded':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Manage payments, methods, and view analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.monthlyGrowth >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1 text-success" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1 text-destructive" />
              )}
              {Math.abs(stats.monthlyGrowth).toFixed(1)}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayments}</div>
            <p className="text-xs text-muted-foreground">Total transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedPayments}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customer-payments">Customer Payments</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>View and filter all payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 flex-1">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by transaction ID, amount, or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PaymentStatus | 'all')}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[180px]">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="thismonth">This month</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payments List */}
              {isLoading ? (
                <div className="text-center py-8">Loading payments...</div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payments found matching your criteria
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(payment.status)}
                        <div>
                          <p className="font-medium">
                            ${payment.amount.toFixed(2)} 
                            <Badge variant={getStatusBadgeVariant(payment.status)} className="ml-2">
                              {payment.status}
                            </Badge>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {payment.customers ? 
                              `${payment.customers.first_name} ${payment.customers.last_name}` : 
                              'Unknown Customer'
                            } • {format(new Date(payment.transaction_date), 'MMM d, yyyy')}
                          </p>
                          {payment.transaction_id && (
                            <p className="text-xs text-muted-foreground">ID: {payment.transaction_id}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">{payment.payment_type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer-payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Payment History</CardTitle>
              <CardDescription>View payments for a specific customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name} ({customer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCustomerId ? (
                <PaymentHistoryList 
                  customerId={selectedCustomerId} 
                  allowAddPayment={true}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a customer to view their payment history
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods Management</CardTitle>
              <CardDescription>Manage customer payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name} ({customer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCustomerId ? (
                <PaymentMethodsList
                  customerId={selectedCustomerId}
                  paymentMethods={paymentMethods}
                  onPaymentMethodAdded={refetchMethods}
                  onPaymentMethodUpdated={refetchMethods}
                  onPaymentMethodDeleted={refetchMethods}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a customer to manage their payment methods
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payments;