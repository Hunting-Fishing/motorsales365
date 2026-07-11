import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText, Save, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGunsmithFirearms } from '@/hooks/useGunsmith';
import { useToast } from '@/hooks/use-toast';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function GunsmithQuoteForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  const [formData, setFormData] = useState({
    customer_id: '',
    firearm_id: '',
    valid_until: '',
    notes: ''
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

  const { data: customerFirearms } = useGunsmithFirearms(selectedCustomerId || undefined);

  const createQuote = useMutation({
    mutationFn: async () => {
      const quoteNumber = `Q-${Date.now().toString(36).toUpperCase()}`;
      const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const tax = subtotal * 0.13; // 13% HST
      const total = subtotal + tax;

      const { data, error } = await (supabase as any)
        .from('gunsmith_quotes')
        .insert({
          quote_number: quoteNumber,
          customer_id: formData.customer_id || null,
          firearm_id: formData.firearm_id || null,
          status: 'draft',
          subtotal,
          tax,
          total,
          valid_until: formData.valid_until || null,
          notes: formData.notes || null,
          line_items: lineItems.filter(item => item.description)
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-quotes'] });
      toast({ title: 'Quote created successfully' });
      navigate('/gunsmith/quotes');
    },
    onError: () => {
      toast({ title: 'Failed to create quote', variant: 'destructive' });
    }
  });

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setFormData({ ...formData, customer_id: customerId, firearm_id: '' });
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const tax = subtotal * 0.13;
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith/quotes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-amber-500" />
              New Quote
            </h1>
            <p className="text-muted-foreground mt-1">Create a service quote</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Customer & Firearm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer</Label>
                  <Select value={formData.customer_id} onValueChange={handleCustomerChange}>
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
                  <Label>Firearm (Optional)</Label>
                  <Select 
                    value={formData.firearm_id} 
                    onValueChange={(v) => setFormData({ ...formData, firearm_id: v })}
                    disabled={!selectedCustomerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select firearm" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerFirearms?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.make} {f.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex-1">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Service or part description"
                      />
                    </div>
                    <div className="w-24">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="w-32">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-28 text-right pt-8">
                      <span className="font-medium">${(item.quantity * item.unit_price).toFixed(2)}</span>
                    </div>
                    <div className="pt-8">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="border-t pt-4 mt-6">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">HST (13%)</span>
                        <span>${tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes for the customer..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate('/gunsmith/quotes')}>
              Cancel
            </Button>
            <Button 
              onClick={() => createQuote.mutate()}
              disabled={lineItems.filter(i => i.description).length === 0 || createQuote.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createQuote.isPending ? 'Creating...' : 'Create Quote'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
