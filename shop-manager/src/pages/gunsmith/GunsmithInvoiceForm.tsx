import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, FileText, Save, Plus, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PaymentMethodSelect } from '@/components/shared/PaymentMethodSelect';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function GunsmithInvoiceForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job_id');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    customer_id: '',
    job_id: jobId || '',
    due_date: '',
    tax_rate: '0',
    notes: '',
    payment_method: ''
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0 }
  ]);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .order('first_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: jobs } = useQuery({
    queryKey: ['gunsmith-jobs-for-invoice'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_jobs')
        .select('id, job_number, customer_id, labor_hours, labor_rate, parts_cost, total_cost, customers(first_name, last_name)')
        .in('status', ['completed', 'in_progress'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Auto-populate from job if job_id is provided
  useEffect(() => {
    if (jobId && jobs) {
      const job = jobs.find((j: any) => j.id === jobId);
      if (job) {
        setFormData(prev => ({ ...prev, customer_id: job.customer_id || '', job_id: jobId }));
        const items: LineItem[] = [];
        if (job.labor_hours && job.labor_rate) {
          items.push({
            description: `Labor - ${job.job_number}`,
            quantity: job.labor_hours,
            unit_price: job.labor_rate
          });
        }
        if (job.parts_cost) {
          items.push({
            description: 'Parts',
            quantity: 1,
            unit_price: job.parts_cost
          });
        }
        if (items.length > 0) {
          setLineItems(items);
        }
      }
    }
  }, [jobId, jobs]);

  const createInvoice = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase as any)
        .from('gunsmith_invoices')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-invoices'] });
      toast({ title: 'Invoice created' });
      navigate('/gunsmith/invoices');
    },
    onError: () => {
      toast({ title: 'Failed to create invoice', variant: 'destructive' });
    }
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxRate = parseFloat(formData.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = () => {
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    
    createInvoice.mutate({
      invoice_number: invoiceNumber,
      customer_id: formData.customer_id || null,
      job_id: formData.job_id || null,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      status: 'draft',
      due_date: formData.due_date || null,
      notes: formData.notes || null,
      payment_method: formData.payment_method || null,
      line_items: lineItems.filter(item => item.description)
    });
  };

  const isValid = lineItems.some(item => item.description && item.unit_price > 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith/invoices')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-amber-600" />
              New Invoice
            </h1>
            <p className="text-muted-foreground mt-1">Create a new invoice</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer</Label>
                  <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Related Job</Label>
                  <Select value={formData.job_id} onValueChange={(v) => setFormData({ ...formData, job_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select job (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs?.map((j: any) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.job_number} - {j.customers?.first_name} {j.customers?.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Payment Method</Label>
                <PaymentMethodSelect
                  value={formData.payment_method}
                  onChange={(v) => setFormData({ ...formData, payment_method: v })}
                  placeholder="Select preferred payment method"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={index} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="w-24">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-32">
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-24 text-right">
                    <Label>Total</Label>
                    <p className="py-2 font-medium">${(item.quantity * item.unit_price).toFixed(2)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Separator className="my-4" />

              <div className="space-y-2 text-right">
                <div className="flex justify-end gap-8">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="w-24">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-end gap-8">
                  <span className="text-muted-foreground">Tax ({taxRate}%):</span>
                  <span className="w-24">${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-end gap-8 font-bold text-lg">
                  <span>Total:</span>
                  <span className="w-24">${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Payment terms, additional notes..."
                rows={3}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate('/gunsmith/invoices')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || createInvoice.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
