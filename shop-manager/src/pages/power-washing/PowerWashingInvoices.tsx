import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Plus, 
  Search,
  FileText,
  DollarSign,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Download
} from 'lucide-react';
import { generateInvoicePDF } from '@/utils/power-washing/generateInvoicePDF';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  total: number;
  balance_due: number;
  job_id: string | null;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  draft: { color: 'bg-gray-500/10 text-gray-500', icon: <FileText className="h-3 w-3" /> },
  sent: { color: 'bg-blue-500/10 text-blue-500', icon: <Send className="h-3 w-3" /> },
  paid: { color: 'bg-green-500/10 text-green-500', icon: <CheckCircle className="h-3 w-3" /> },
  overdue: { color: 'bg-red-500/10 text-red-500', icon: <AlertTriangle className="h-3 w-3" /> },
  cancelled: { color: 'bg-gray-500/10 text-gray-500', icon: <Clock className="h-3 w-3" /> },
};

export default function PowerWashingInvoices() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shopId, setShopId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('shop_id').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (data?.shop_id) {
            setShopId(data.shop_id);
            fetchInvoices(data.shop_id);
          }
        });
    }
  }, [user]);

  const fetchInvoices = async (shopId: string) => {
    try {
      const { data, error } = await supabase
        .from('power_washing_invoices')
        .select('*')
        .eq('shop_id', shopId)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!shopId) return;

    try {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('power_washing_invoices')
        .insert({
          shop_id: shopId,
          invoice_number: invoiceNumber,
          status: 'draft',
          issue_date: format(new Date(), 'yyyy-MM-dd'),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Invoice created');
      navigate(`/power-washing/invoices/${data.id}`);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !searchQuery || 
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalRevenue: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
    outstanding: invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.balance_due || 0), 0),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
            <p className="text-muted-foreground">Manage invoices for power washing jobs</p>
          </div>
          <Button onClick={handleCreateInvoice}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold">${stats.outstanding.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold">{stats.paid}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'draft', 'sent', 'paid', 'overdue'].map(status => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Invoices Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Create your first invoice'}
            </p>
            <Button onClick={handleCreateInvoice}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredInvoices.map(invoice => {
                const config = statusConfig[invoice.status] || statusConfig.draft;
                
                return (
                  <div 
                    key={invoice.id}
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/power-washing/invoices/${invoice.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">
                            Issued {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                            {invoice.due_date && ` • Due ${format(new Date(invoice.due_date), 'MMM d')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateInvoicePDF(invoice);
                          }}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <div className="text-right">
                          <p className="font-bold">${(invoice.total || 0).toLocaleString()}</p>
                          {invoice.balance_due > 0 && invoice.status !== 'paid' && (
                            <p className="text-sm text-muted-foreground">
                              ${invoice.balance_due.toLocaleString()} due
                            </p>
                          )}
                        </div>
                        <Badge className={`${config.color} gap-1`}>
                          {config.icon}
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
