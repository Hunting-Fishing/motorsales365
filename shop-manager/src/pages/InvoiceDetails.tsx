import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, Mail, CreditCard, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { getInvoiceDetails, addPayment, type InvoiceDetails } from '@/services/invoice/invoiceDetailsService';
import { SendInvoiceEmailModal } from '@/components/shared/SendInvoiceEmailModal';

export default function InvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    if (id) {
      loadInvoiceDetails();
    }
  }, [id]);

  const loadInvoiceDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await getInvoiceDetails(id);
      setInvoice(data);
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!id || !paymentAmount || !paymentMethod) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const success = await addPayment(id, {
      amount,
      method: paymentMethod,
      reference: paymentReference || undefined
    });

    if (success) {
      toast.success('Payment added successfully');
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentMethod('');
      setPaymentReference('');
      loadInvoiceDetails();
    } else {
      toast.error('Failed to add payment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="animate-pulse bg-gray-200 h-8 w-64 rounded"></div>
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="bg-gray-200 h-4 w-full rounded"></div>
                  <div className="bg-gray-200 h-4 w-3/4 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Invoice Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">The requested invoice could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remainingBalance = (invoice.total_amount || invoice.total || 0) - (invoice.paid_amount || 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Invoice #{invoice.invoice_number || invoice.number}</h1>
            <p className="text-muted-foreground">
              Created {new Date(invoice.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(invoice.status || 'pending')}>
            {invoice.status || 'pending'}
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEmailModal(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Invoice Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Invoice Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bill To</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{invoice.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>
                  <p className="text-sm text-muted-foreground">{invoice.customer.phone}</p>
                  {invoice.customer.address && (
                    <p className="text-sm text-muted-foreground">{invoice.customer.address}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Issue Date:</span>
                    <span className="text-sm">{new Date(invoice.issue_date || invoice.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Due Date:</span>
                    <span className="text-sm">{new Date(invoice.due_date || invoice.created_at).toLocaleDateString()}</span>
                  </div>
                  {invoice.workOrder && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Work Order:</span>
                      <span className="text-sm">#{invoice.workOrder.id}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoice.items.length > 0 ? (
                  <>
                    <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                      <span className="col-span-2">Description</span>
                      <span>Quantity</span>
                      <span>Unit Price</span>
                      <span>Total</span>
                    </div>
                    {invoice.items.map((item) => (
                      <div key={item.id} className="grid grid-cols-5 gap-4 text-sm">
                        <span className="col-span-2">{item.description}</span>
                        <span>{item.quantity}</span>
                        <span>${item.price.toFixed(2)}</span>
                        <span>${item.total.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>${(invoice.subtotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax:</span>
                        <span>${(invoice.tax_amount || invoice.tax || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span>${(invoice.total_amount || invoice.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No items found for this invoice
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">${(invoice.total_amount || invoice.total || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Paid Amount:</span>
                  <span className="font-medium text-green-600">${(invoice.paid_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Balance Due:</span>
                  <span className={`font-medium ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${remainingBalance.toFixed(2)}
                  </span>
                </div>
              </div>
              
              {remainingBalance > 0 && (
                <Button 
                  onClick={() => setShowPaymentForm(true)}
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Add Payment Form */}
          {showPaymentForm && (
            <Card>
              <CardHeader>
                <CardTitle>Record Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Reference (Optional)</label>
                  <Input
                    placeholder="Transaction ID, check number, etc."
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleAddPayment} className="flex-1">
                    Add Payment
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPaymentForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payments.length > 0 ? (
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="border rounded p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium">${payment.amount.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(payment.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {payment.method.replace('_', ' ')}
                        {payment.reference && ` • ${payment.reference}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No payments recorded
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email Invoice Modal */}
      <SendInvoiceEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        invoice={{
          id: invoice.id,
          invoice_number: invoice.invoice_number || invoice.number || '',
          total: invoice.total_amount || invoice.total || 0,
          due_date: invoice.due_date,
        }}
        customer={{
          name: invoice.customer.name,
          email: invoice.customer.email,
        }}
        invoiceType="standard"
        companyName="Our Company"
        onSuccess={loadInvoiceDetails}
      />
    </div>
  );
}