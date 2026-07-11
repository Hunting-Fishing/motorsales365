import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  onSuccess?: () => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  invoiceId,
  onSuccess,
}: RecordPaymentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'check',
    reference_number: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    invoice_id: invoiceId || '',
    notes: '',
  });

  // Fetch unpaid invoices
  const { data: invoices } = useQuery({
    queryKey: ['water-delivery-unpaid-invoices', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_delivery_invoices')
        .select('id, invoice_number, total_amount, balance_due')
        .eq('customer_id', customerId)
        .gt('balance_due', 0)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!customerId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!shopId) throw new Error('Shop ID required');

      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      // Insert payment
      const { data: payment, error } = await supabase
        .from('water_delivery_payments')
        .insert({
          shop_id: shopId,
          customer_id: customerId,
          invoice_id: data.invoice_id || null,
          amount,
          payment_method: data.payment_method,
          reference_number: data.reference_number || null,
          payment_date: data.payment_date,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // If invoice selected, update the invoice balance
      if (data.invoice_id) {
        const invoice = invoices?.find(i => i.id === data.invoice_id);
        if (invoice) {
          const newBalance = Math.max(0, (invoice.balance_due || 0) - amount);
          await supabase
            .from('water_delivery_invoices')
            .update({
              balance_due: newBalance,
              status: newBalance === 0 ? 'paid' : 'partial',
            })
            .eq('id', data.invoice_id);
        }
      }

      return payment;
    },
    onSuccess: () => {
      toast({ title: 'Payment recorded successfully' });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-customer-stats'] });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-payments'] });
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error recording payment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      amount: '',
      payment_method: 'check',
      reference_number: '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      invoice_id: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{customerName}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="debit_card">Debit Card</SelectItem>
                <SelectItem value="ach">ACH/Bank Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference / Check Number</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
              placeholder="Check #12345"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Payment Date</Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
            />
          </div>

          {invoices && invoices.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="invoice_id">Apply to Invoice (optional)</Label>
              <Select
                value={formData.invoice_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, invoice_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an invoice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific invoice</SelectItem>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} - Balance: {formatCurrency(inv.balance_due || 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
