import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ArrowLeft, Receipt, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function WaterDeliveryInvoices() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { shopId } = useShopId();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['water-delivery-invoices', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('water_delivery_invoices')
        .select(`
          *,
          water_delivery_customers (company_name, first_name, last_name)
        `)
        .eq('shop_id', shopId)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const filteredInvoices = invoices?.filter(invoice => 
    invoice.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    invoice.water_delivery_customers?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    invoice.water_delivery_customers?.first_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-green-500">Paid</Badge>;
      case 'partial': return <Badge className="bg-amber-500">Partial</Badge>;
      case 'sent': return <Badge className="bg-blue-500">Sent</Badge>;
      case 'draft': return <Badge variant="outline">Draft</Badge>;
      case 'overdue': return <Badge variant="destructive">Overdue</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/water-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Receipt className="h-8 w-8 text-cyan-600" />
              Invoices
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage billing and invoices
            </p>
          </div>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredInvoices && filteredInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      {invoice.water_delivery_customers?.company_name || `${invoice.water_delivery_customers?.first_name || ''} ${invoice.water_delivery_customers?.last_name || ''}`.trim()}
                    </TableCell>
                    <TableCell>
                      {invoice.invoice_date 
                        ? format(new Date(invoice.invoice_date), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {invoice.due_date 
                        ? format(new Date(invoice.due_date), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${invoice.total_amount?.toLocaleString() || '0.00'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-amber-600">
                      ${invoice.balance_due?.toLocaleString() || '0.00'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No invoices found</p>
              <Button variant="link">Create your first invoice</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
