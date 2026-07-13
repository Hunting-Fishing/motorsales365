import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { createInvoice } from '@/services/invoiceService';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useShopId } from '@/hooks/useShopId';
import { calculateTax } from '@/utils/taxCalculations';
import { 
  FileText, 
  User, 
  DollarSign, 
  Calendar,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Calculator
} from 'lucide-react';

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceFormData {
  customerName: string;
  customerEmail: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  lineItems: InvoiceLineItem[];
}

const defaultFormData: InvoiceFormData = {
  customerName: '',
  customerEmail: '',
  invoiceNumber: `INV-${Date.now()}`,
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  notes: '',
  lineItems: [
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]
};

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<InvoiceFormData>(defaultFormData);
  const { userProfile } = useUserProfile();
  const { shopId } = useShopId();
  const { taxSettings, loading: taxSettingsLoading } = useTaxSettings(shopId || undefined);

  const updateFormData = (field: keyof Omit<InvoiceFormData, 'lineItems'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Recalculate total when quantity or unit price changes
          if (field === 'quantity' || field === 'unitPrice') {
            updated.total = updated.quantity * updated.unitPrice;
          }
          return updated;
        }
        return item;
      })
    }));
  };

  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem]
    }));
  };

  const removeLineItem = (id: string) => {
    if (formData.lineItems.length > 1) {
      setFormData(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter(item => item.id !== id)
      }));
    }
  };

  const calculateSubtotal = () => {
    return formData.lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTaxAmount = () => {
    if (!taxSettings || taxSettingsLoading) return calculateSubtotal() * 0.1; // Default fallback
    
    const taxCalculation = calculateTax({
      laborAmount: calculateSubtotal() * 0.6, // Assume 60% labor
      partsAmount: calculateSubtotal() * 0.4, // Assume 40% parts
      taxSettings,
      isCustomerTaxExempt: false
    });
    
    return taxCalculation.totalTax;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxAmount();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerEmail) {
      toast.error('Please fill in customer information');
      return;
    }

    if (formData.lineItems.some(item => !item.description)) {
      toast.error('Please fill in all line item descriptions');
      return;
    }

    try {
      const subtotal = calculateSubtotal();
      const tax = calculateTaxAmount();
      const total = calculateTotal();

      const invoiceData = {
        customer: formData.customerName,
        customer_email: formData.customerEmail,
        customer_id: '', // Could be linked to existing customer
        customer_address: '',
        date: formData.issueDate,
        due_date: formData.dueDate,
        status: 'pending' as const,
        subtotal,
        tax,
        total,
        notes: formData.notes,
        description: `Invoice ${formData.invoiceNumber}`,
        payment_method: null,
        work_order_id: null,
        created_by: userProfile?.email || 'unknown'
      };

      const newInvoice = await createInvoice(invoiceData);
      
      toast.success('Invoice created successfully!');
      navigate(`/invoices/${newInvoice.id}`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Invoice</h1>
          <p className="text-muted-foreground">Generate a new invoice for a customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Invoice Details */}
        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => updateFormData('customerName', e.target.value)}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Customer Email *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => updateFormData('customerEmail', e.target.value)}
                  placeholder="Enter customer email"
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => updateFormData('invoiceNumber', e.target.value)}
                  placeholder="Auto-generated"
                  disabled
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => updateFormData('issueDate', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => updateFormData('dueDate', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Line Items
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.lineItems.map((item, index) => (
                <div key={item.id} className="grid gap-4 md:grid-cols-12 items-end">
                  <div className="md:col-span-5 space-y-2">
                    {index === 0 && <Label>Description</Label>}
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-2">
                    {index === 0 && <Label>Quantity</Label>}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-2">
                    {index === 0 && <Label>Unit Price</Label>}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-2">
                    {index === 0 && <Label>Total</Label>}
                    <Input
                      value={`$${item.total.toFixed(2)}`}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  
                  <div className="md:col-span-1">
                    {formData.lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{taxSettings?.tax_description || 'Tax'}:</span>
                <span>${calculateTaxAmount().toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateFormData('notes', e.target.value)}
              placeholder="Add any additional notes or terms..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex gap-4 pt-6">
          <Button type="submit" className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}