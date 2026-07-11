import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Plus, 
  Trash2,
  Send,
  CheckCircle,
  FileText,
  Mail,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentMethodSelect } from '@/components/shared/PaymentMethodSelect';
import { RecordPaymentModal, PaymentData } from '@/components/shared/RecordPaymentModal';
import { InvoicePaymentHistory, PaymentRecord } from '@/components/shared/InvoicePaymentHistory';
import { SendInvoiceEmailModal } from '@/components/shared/SendInvoiceEmailModal';

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  terms: string | null;
  payment_method: string | null;
  shop_id?: string;
  customer_id?: string;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

export default function PowerWashingInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInvoice();
      fetchPayments();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const [invoiceRes, linesRes] = await Promise.all([
        supabase.from('power_washing_invoices').select('*, customers(id, first_name, last_name, email)').eq('id', id).single(),
        supabase.from('power_washing_invoice_lines').select('*').eq('invoice_id', id).order('sort_order'),
      ]);

      if (invoiceRes.error) throw invoiceRes.error;
      
      const invoiceData = invoiceRes.data;
      const customerData = invoiceData.customers as Customer | null;
      
      // Remove the nested customers object from invoice
      const { customers, ...invoiceWithoutCustomer } = invoiceData;
      
      setInvoice(invoiceWithoutCustomer as Invoice);
      setCustomer(customerData);
      setLines(linesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
      toast.error('Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPayments = async () => {
    if (!id) return;
    setIsLoadingPayments(true);
    try {
      const { data, error } = await supabase
        .from('power_washing_payments')
        .select('*')
        .eq('invoice_id', id)
        .order('transaction_date', { ascending: true });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const handleAddLine = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('power_washing_invoice_lines')
        .insert({
          invoice_id: id,
          description: 'New item',
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          sort_order: lines.length,
        })
        .select()
        .single();

      if (error) throw error;
      setLines([...lines, data]);
    } catch (error) {
      toast.error('Failed to add line');
    }
  };

  const handleUpdateLine = async (lineId: string, updates: Partial<InvoiceLine>) => {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;

    const newQuantity = updates.quantity ?? line.quantity;
    const newUnitPrice = updates.unit_price ?? line.unit_price;
    const newTotalPrice = newQuantity * newUnitPrice;

    const updatedLine = { 
      ...line, 
      ...updates, 
      quantity: newQuantity,
      unit_price: newUnitPrice,
      total_price: newTotalPrice 
    };

    setLines(lines.map(l => l.id === lineId ? updatedLine : l));

    try {
      const { error } = await supabase
        .from('power_washing_invoice_lines')
        .update({
          description: updatedLine.description,
          quantity: newQuantity,
          unit_price: newUnitPrice,
          total_price: newTotalPrice,
        })
        .eq('id', lineId);

      if (error) throw error;
      recalculateTotals();
    } catch (error) {
      toast.error('Failed to update line');
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    try {
      const { error } = await supabase
        .from('power_washing_invoice_lines')
        .delete()
        .eq('id', lineId);

      if (error) throw error;
      setLines(lines.filter(l => l.id !== lineId));
      recalculateTotals();
    } catch (error) {
      toast.error('Failed to delete line');
    }
  };

  const recalculateTotals = async () => {
    if (!invoice) return;

    const subtotal = lines.reduce((s, l) => s + l.total_price, 0);
    const taxAmount = subtotal * (invoice.tax_rate || 0);
    const total = subtotal + taxAmount - (invoice.discount_amount || 0);
    const balanceDue = total - (invoice.amount_paid || 0);

    try {
      const { error } = await supabase
        .from('power_washing_invoices')
        .update({ subtotal, tax_amount: taxAmount, total, balance_due: balanceDue })
        .eq('id', invoice.id);

      if (error) throw error;
      setInvoice({ ...invoice, subtotal, tax_amount: taxAmount, total, balance_due: balanceDue });
    } catch (error) {
      console.error('Failed to update totals');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;

    // For marking as paid, show the payment modal instead
    if (newStatus === 'paid') {
      setShowPaymentModal(true);
      return;
    }

    setIsSaving(true);
    try {
      const updates: Record<string, any> = { status: newStatus };

      const { error } = await supabase
        .from('power_washing_invoices')
        .update(updates)
        .eq('id', invoice.id);

      if (error) throw error;
      setInvoice({ ...invoice, ...updates });
      toast.success(`Invoice marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordPayment = async (paymentData: PaymentData) => {
    if (!invoice) return;

    setIsSaving(true);
    try {
      // 1. Insert payment record into power_washing_payments table
      const { data: newPayment, error: paymentError } = await supabase
        .from('power_washing_payments')
        .insert({
          invoice_id: invoice.id,
          shop_id: invoice.shop_id,
          customer_id: invoice.customer_id,
          amount: paymentData.amount,
          payment_method: paymentData.paymentMethod,
          reference_number: paymentData.reference || null,
          notes: paymentData.notes || null,
          status: 'completed',
          transaction_date: new Date().toISOString(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Calculate new totals
      const newAmountPaid = (invoice.amount_paid || 0) + paymentData.amount;
      const newBalanceDue = invoice.total - newAmountPaid;
      const newStatus = newBalanceDue <= 0 ? 'paid' : 'partial';

      // 3. Update invoice
      const updates: Record<string, any> = {
        status: newStatus,
        payment_method: paymentData.paymentMethod,
        amount_paid: newAmountPaid,
        balance_due: Math.max(0, newBalanceDue),
      };

      if (newStatus === 'paid') {
        updates.paid_date = format(new Date(), 'yyyy-MM-dd');
      }

      const { error: updateError } = await supabase
        .from('power_washing_invoices')
        .update(updates)
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      // 4. Update local state
      setInvoice({ ...invoice, ...updates });
      setPayments([...payments, newPayment]);
      setShowPaymentModal(false);
      toast.success(newStatus === 'paid' ? 'Invoice marked as paid' : 'Partial payment recorded');
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateInvoice = async (field: string, value: any) => {
    if (!invoice) return;

    try {
      const { error } = await supabase
        .from('power_washing_invoices')
        .update({ [field]: value })
        .eq('id', invoice.id);

      if (error) throw error;
      setInvoice({ ...invoice, [field]: value });
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
            <Button onClick={() => navigate('/power-washing/invoices')}>Back to Invoices</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing/invoices')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
              <p className="text-muted-foreground">
                Issued {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
              </p>
            </div>
            <Badge className={
              invoice.status === 'paid' ? 'bg-green-500/10 text-green-500' :
              invoice.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
              invoice.status === 'overdue' ? 'bg-red-500/10 text-red-500' :
              'bg-gray-500/10 text-gray-500'
            }>
              {invoice.status}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEmailModal(true)} disabled={isSaving}>
              <Mail className="h-4 w-4 mr-2" />
              Email Invoice
            </Button>
            {invoice.status === 'draft' && (
              <Button onClick={() => handleStatusChange('sent')} disabled={isSaving}>
                <Send className="h-4 w-4 mr-2" />
                Send Invoice
              </Button>
            )}
            {['sent', 'overdue', 'partial'].includes(invoice.status) && (
              <Button onClick={() => setShowPaymentModal(true)} disabled={isSaving}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {invoice.status === 'partial' ? 'Record Payment' : 'Mark as Paid'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Lines */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button size="sm" onClick={handleAddLine}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items yet. Click "Add Item" to add line items.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-2 text-right">Price</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>
                {lines.map(line => (
                  <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input
                        value={line.description}
                        onChange={(e) => handleUpdateLine(line.id, { description: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => handleUpdateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                        className="h-9 text-right"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) => handleUpdateLine(line.id, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="h-9 text-right"
                      />
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      ${line.total_price.toFixed(2)}
                    </div>
                    <div className="col-span-1 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteLine(line.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History - Below Line Items on larger screens */}
        <InvoicePaymentHistory
          payments={payments}
          invoiceTotal={invoice.total}
          isLoading={isLoadingPayments}
          onAddPayment={() => setShowPaymentModal(true)}
          showAddButton={invoice.balance_due > 0 && invoice.status !== 'paid'}
        />

        {/* Invoice Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tax Rate (%)</span>
                <Input
                  type="number"
                  step="0.01"
                  value={(invoice.tax_rate * 100).toFixed(2)}
                  onChange={(e) => {
                    const rate = (parseFloat(e.target.value) || 0) / 100;
                    handleUpdateInvoice('tax_rate', rate);
                  }}
                  className="w-20 h-8 text-right"
                />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>${invoice.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Discount</span>
                <Input
                  type="number"
                  step="0.01"
                  value={invoice.discount_amount}
                  onChange={(e) => handleUpdateInvoice('discount_amount', parseFloat(e.target.value) || 0)}
                  className="w-20 h-8 text-right"
                />
              </div>
              <div className="border-t pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${invoice.total.toFixed(2)}</span>
              </div>
              {invoice.balance_due > 0 && invoice.status !== 'paid' && (
                <div className="flex justify-between text-primary font-medium">
                  <span>Balance Due</span>
                  <span>${invoice.balance_due.toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Payment Method</Label>
                <PaymentMethodSelect
                  value={invoice.payment_method || ''}
                  onChange={(value) => handleUpdateInvoice('payment_method', value)}
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={invoice.due_date || ''}
                  onChange={(e) => handleUpdateInvoice('due_date', e.target.value || null)}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={invoice.notes || ''}
                  onChange={(e) => handleUpdateInvoice('notes', e.target.value)}
                  placeholder="Notes for customer..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Terms</Label>
                <Textarea
                  value={invoice.terms || ''}
                  onChange={(e) => handleUpdateInvoice('terms', e.target.value)}
                  placeholder="Payment terms..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Modal */}
      <RecordPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handleRecordPayment}
        invoiceTotal={invoice.total}
        balanceDue={invoice.balance_due}
        isLoading={isSaving}
      />

      {/* Email Invoice Modal */}
      <SendInvoiceEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        invoice={{
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          total: invoice.total,
          due_date: invoice.due_date || undefined,
        }}
        customer={{
          name: customer ? `${customer.first_name} ${customer.last_name}` : 'Customer',
          email: customer?.email || '',
        }}
        invoiceType="power_washing"
        companyName="Power Washing Services"
        onSuccess={fetchInvoice}
      />
    </div>
  );
}
