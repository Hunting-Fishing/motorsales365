import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  CreditCard, 
  Plus, 
  Search,
  DollarSign,
  Banknote,
  CheckSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function PowerWashingPayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoice_id: '',
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ['power-washing-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_payments')
        .select('*, power_washing_invoices(invoice_number), customers(first_name, last_name)')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: invoices } = useQuery({
    queryKey: ['power-washing-invoices-unpaid'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_invoices')
        .select('id, invoice_number, total, balance_due, customers(first_name, last_name)')
        .in('status', ['sent', 'overdue'])
        .gt('balance_due', 0);
      if (error) throw error;
      return data;
    }
  });

  const createPayment = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('power_washing_payments')
        .insert({
          invoice_id: data.invoice_id || null,
          amount: parseFloat(data.amount),
          payment_method: data.payment_method,
          reference_number: data.reference_number || null,
          notes: data.notes || null,
          status: 'completed'
        });
      if (error) throw error;

      // Update invoice balance if linked
      if (data.invoice_id) {
        const invoice = invoices?.find(i => i.id === data.invoice_id);
        if (invoice) {
          const newBalance = Math.max(0, (invoice.balance_due || 0) - parseFloat(data.amount));
          await supabase
            .from('power_washing_invoices')
            .update({
              balance_due: newBalance,
              status: newBalance === 0 ? 'paid' : 'sent'
            })
            .eq('id', data.invoice_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-payments'] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-invoices-unpaid'] });
      toast({ title: 'Payment recorded successfully' });
      setIsDialogOpen(false);
      setFormData({ invoice_id: '', amount: '', payment_method: 'cash', reference_number: '', notes: '' });
    },
    onError: () => {
      toast({ title: 'Failed to record payment', variant: 'destructive' });
    }
  });

  const filteredPayments = payments?.filter(p => 
    p.power_washing_invoices?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'check': return <CheckSquare className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const totalReceived = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-green-500" />
            Payments
          </h1>
          <p className="text-muted-foreground mt-1">Track and record customer payments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Invoice (Optional)</Label>
                <Select value={formData.invoice_id} onValueChange={(v) => {
                  const invoice = invoices?.find(i => i.id === v);
                  setFormData({ 
                    ...formData, 
                    invoice_id: v,
                    amount: invoice?.balance_due?.toString() || formData.amount
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices?.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} - {inv.customers?.first_name} (${inv.balance_due?.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label>Payment Method *</Label>
                <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="ach">ACH/Bank Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference Number</Label>
                <Input
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="Check #, transaction ID, etc."
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => createPayment.mutate(formData)}
                disabled={!formData.amount || createPayment.isPending}
              >
                {createPayment.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Received</p>
              <p className="text-3xl font-bold text-green-600">${totalReceived.toFixed(2)}</p>
            </div>
            <DollarSign className="h-12 w-12 text-green-500/20" />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search payments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredPayments?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No payments found</p>
          ) : (
            <div className="space-y-3">
              {filteredPayments?.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-green-500/10">
                      {getMethodIcon(payment.payment_method)}
                    </div>
                    <div>
                      <p className="font-medium">
                        {payment.power_washing_invoices?.invoice_number || 'Manual Payment'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.customers?.first_name} {payment.customers?.last_name}
                        {payment.reference_number && ` • Ref: ${payment.reference_number}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">+${payment.amount?.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(payment.transaction_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
