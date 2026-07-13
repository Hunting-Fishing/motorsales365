import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, Receipt, ArrowLeft } from 'lucide-react';
import { useFuelDeliveryInvoices } from '@/hooks/useFuelDelivery';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';

export default function FuelDeliveryInvoices() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: invoices, isLoading } = useFuelDeliveryInvoices();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'fuel_delivery');

  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      invoice.fuel_delivery_customers?.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-green-500">Paid</Badge>;
      case 'sent': return <Badge className="bg-blue-500">Sent</Badge>;
      case 'overdue': return <Badge variant="destructive">Overdue</Badge>;
      case 'draft': return <Badge variant="outline">Draft</Badge>;
      case 'partial': return <Badge className="bg-amber-500">Partial</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/fuel-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Receipt className="h-8 w-8 text-emerald-600" />
              {moduleInfo?.displayName || 'Fuel Delivery'} Invoices
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage invoices and billing
            </p>
          </div>
          <Button onClick={() => navigate('/fuel-delivery/invoices/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id} 
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      {invoice.fuel_delivery_customers?.company_name || invoice.fuel_delivery_customers?.contact_name}
                    </TableCell>
                    <TableCell>{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="font-medium">${invoice.total_amount?.toLocaleString() || '0'}</TableCell>
                    <TableCell className="text-green-600">${invoice.amount_paid?.toLocaleString() || '0'}</TableCell>
                    <TableCell className={invoice.balance_due && invoice.balance_due > 0 ? 'text-red-600' : ''}>
                      ${invoice.balance_due?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No invoices found</p>
              <Button variant="link" onClick={() => navigate('/fuel-delivery/invoices/new')}>
                Create your first invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
