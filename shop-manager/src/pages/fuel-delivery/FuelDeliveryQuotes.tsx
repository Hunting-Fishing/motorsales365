import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Filter, FileText, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { useFuelDeliveryQuotes, useCreateFuelDeliveryQuote, useFuelDeliveryCustomers, useFuelDeliveryProducts, useConvertQuoteToOrder } from '@/hooks/useFuelDelivery';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';

interface QuoteLine {
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export default function FuelDeliveryQuotes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: quotes, isLoading } = useFuelDeliveryQuotes();
  const { data: customers } = useFuelDeliveryCustomers();
  const { data: products } = useFuelDeliveryProducts();
  const createQuote = useCreateFuelDeliveryQuote();
  const convertToOrder = useConvertQuoteToOrder();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'fuel_delivery');

  const [formData, setFormData] = useState({
    customer_id: '',
    valid_until: '',
    notes: '',
    terms: '',
  });

  const [lines, setLines] = useState<QuoteLine[]>([
    { product_id: '', description: '', quantity: 0, unit_price: 0 }
  ]);

  const filteredQuotes = quotes?.filter(quote => {
    const matchesSearch = 
      quote.quote_number.toLowerCase().includes(search.toLowerCase()) ||
      quote.fuel_delivery_customers?.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <Badge className="bg-green-500">Accepted</Badge>;
      case 'sent': return <Badge className="bg-blue-500">Sent</Badge>;
      case 'expired': return <Badge variant="destructive">Expired</Badge>;
      case 'draft': return <Badge variant="outline">Draft</Badge>;
      case 'declined': return <Badge variant="secondary">Declined</Badge>;
      case 'converted': return <Badge className="bg-emerald-600">Converted</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const addLine = () => {
    setLines([...lines, { product_id: '', description: '', quantity: 0, unit_price: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof QuoteLine, value: string | number) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill price from product
    if (field === 'product_id' && value) {
      const product = products?.find(p => p.id === value);
      if (product) {
        updated[index].description = product.product_name;
        updated[index].unit_price = product.base_price_per_unit || 0;
      }
    }
    
    setLines(updated);
  };

  const calculateTotal = () => {
    return lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validLines = lines.filter(l => l.quantity > 0 && l.unit_price > 0);
    if (validLines.length === 0) {
      toast({ title: 'Please add at least one line item', variant: 'destructive' });
      return;
    }

    const subtotal = calculateTotal();
    
    createQuote.mutate({
      ...formData,
      quote_number: `QT-${Date.now().toString().slice(-6)}`,
      quote_date: new Date().toISOString().split('T')[0],
      subtotal,
      total_amount: subtotal,
      status: 'draft',
      lines: validLines.map((l, i) => ({
        ...l,
        total_price: l.quantity * l.unit_price,
        sort_order: i
      }))
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({ customer_id: '', valid_until: '', notes: '', terms: '' });
        setLines([{ product_id: '', description: '', quantity: 0, unit_price: 0 }]);
      }
    });
  };

  const handleConvert = (quoteId: string) => {
    convertToOrder.mutate(quoteId);
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
              <FileText className="h-8 w-8 text-blue-600" />
              {moduleInfo?.displayName || 'Fuel Delivery'} Quotes
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage quotes
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Quote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Quote</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer</Label>
                    <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.company_name || c.contact_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valid Until</Label>
                    <Input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Line Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="h-4 w-4 mr-1" /> Add Line
                    </Button>
                  </div>
                  
                  {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Select value={line.product_id} onValueChange={(v) => updateLine(index, 'product_id', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products?.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input
                          placeholder="Description"
                          value={line.description}
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={line.quantity || ''}
                          onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={line.unit_price || ''}
                          onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(index)}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="text-right font-semibold text-lg">
                    Total: ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>

                <div>
                  <Label>Terms & Conditions</Label>
                  <Textarea
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    placeholder="Payment terms, delivery conditions..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createQuote.isPending}>
                    {createQuote.isPending ? 'Creating...' : 'Create Quote'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotes..."
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
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredQuotes && filteredQuotes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow key={quote.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{quote.quote_number}</TableCell>
                    <TableCell>
                      {quote.fuel_delivery_customers?.company_name || quote.fuel_delivery_customers?.contact_name || '-'}
                    </TableCell>
                    <TableCell>{format(new Date(quote.quote_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {quote.valid_until ? format(new Date(quote.valid_until), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="font-medium">${quote.total_amount?.toLocaleString() || '0'}</TableCell>
                    <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    <TableCell>
                      {quote.status === 'accepted' && !quote.converted_to_order_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConvert(quote.id)}
                          disabled={convertToOrder.isPending}
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Convert to Order
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No quotes found</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                Create your first quote
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
