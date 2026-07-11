import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useVehicles } from '@/hooks/useVehicles';
import { createQuote } from '@/services/quote/quoteService';
import { createQuoteItems } from '@/services/quote/quoteItemService';
import { QuoteItemFormValues, QUOTE_ITEM_TYPES } from '@/types/quote';
import { formatCurrency } from '@/utils/formatters';
import { toast } from '@/hooks/use-toast';
import { useQuoteTaxCalculations } from '@/hooks/useQuoteTaxCalculations';
import { useShopId } from '@/hooks/useShopId';
interface CreateQuoteDialogProps {
  children: React.ReactNode;
  onSuccess?: (quoteId: string) => void;
}
export function CreateQuoteDialog({
  children,
  onSuccess
}: CreateQuoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [items, setItems] = useState<QuoteItemFormValues[]>([{
    name: '',
    description: '',
    category: '',
    quantity: 1,
    unit_price: 0,
    item_type: 'service'
  }]);
  const { customers, loading: customersLoading } = useCustomers();
  const { vehicles, loading: vehiclesLoading } = useVehicles(selectedCustomerId);
  const { shopId } = useShopId();
  
  // Get customer data for tax calculations
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  
  // Convert form items to quote items format for tax calculation
  const quoteItems = items.map(item => ({
    id: '',
    quote_id: '',
    name: item.name,
    description: item.description || '',
    category: item.category || '',
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.quantity * item.unit_price,
    item_type: item.item_type,
    display_order: 0,
    created_at: '',
    updated_at: ''
  }));
  
  // Use centralized tax calculations
  const taxCalculations = useQuoteTaxCalculations({
    items: quoteItems,
    customer: selectedCustomer,
    shopId: shopId || undefined
  });

  // Calculate totals using centralized tax system
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = taxCalculations.totalTax;
  const totalAmount = taxCalculations.grandTotal;

  // Set expiry date to 30 days from now by default
  useEffect(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    setExpiryDate(thirtyDaysFromNow.toISOString().split('T')[0]);
  }, []);
  const handleCustomerChange = (customerIdValue: string) => {
    setSelectedCustomerId(customerIdValue);
    setCustomerId(customerIdValue);
    setVehicleId(''); // Reset vehicle when customer changes
  };
  const addItem = () => {
    setItems([...items, {
      name: '',
      description: '',
      category: '',
      quantity: 1,
      unit_price: 0,
      item_type: 'service'
    }]);
  };
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };
  const updateItem = (index: number, field: keyof QuoteItemFormValues, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setItems(updatedItems);
  };
  const resetForm = () => {
    setCustomerId('');
    setVehicleId('');
    setSelectedCustomerId('');
    setExpiryDate('');
    setNotes('');
    setTermsConditions('');
    setItems([{
      name: '',
      description: '',
      category: '',
      quantity: 1,
      unit_price: 0,
      item_type: 'service'
    }]);
  };
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast({
        title: 'Error',
        description: 'Please select a customer.',
        variant: 'destructive'
      });
      return;
    }
    if (items.some(item => !item.name || item.quantity <= 0 || item.unit_price < 0)) {
      toast({
        title: 'Error',
        description: 'Please fill in all required item fields correctly.',
        variant: 'destructive'
      });
      return;
    }
    setIsSubmitting(true);
    try {
      // Create the quote
      const quote = await createQuote({
        customer_id: customerId,
        vehicle_id: vehicleId || undefined,
        status: 'draft',
        subtotal,
        tax_rate: taxCalculations.taxBreakdown.laborTaxRate / 100,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        expiry_date: expiryDate || undefined,
        notes: notes || undefined,
        terms_conditions: termsConditions || undefined
      });

      // Create quote items
      await createQuoteItems(quote.id, items);
      toast({
        title: 'Quote Created',
        description: `Quote #${quote.quote_number || quote.id.slice(0, 8)} has been created successfully.`
      });
      setOpen(false);
      resetForm();
      if (onSuccess) {
        onSuccess(quote.id);
      }
    } catch (error) {
      console.error('Error creating quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to create quote. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50">
        <DialogHeader>
          <DialogTitle>Create New Quote</DialogTitle>
          <DialogDescription>
            Create a new quote for a customer with detailed items and pricing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Customer and Vehicle Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <Select onValueChange={handleCustomerChange} value={selectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customersLoading ? <SelectItem value="loading" disabled>Loading customers...</SelectItem> : customers.map(customer => <SelectItem key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name} - {customer.email}
                      </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle (Optional)</Label>
              <Select onValueChange={setVehicleId} value={vehicleId} disabled={!selectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehiclesLoading ? <SelectItem value="loading" disabled>Loading vehicles...</SelectItem> : vehicles.length === 0 ? <SelectItem value="none" disabled>No vehicles found</SelectItem> : vehicles.map(vehicle => <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quote Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea placeholder="Internal notes about this quote..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          {/* Quote Items */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Quote Items</CardTitle>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {items.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Item Name *</Label>
                      <Input placeholder="Service or part name" value={item.name} onChange={e => updateItem(index, 'name', e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select onValueChange={value => updateItem(index, 'item_type', value)} value={item.item_type}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUOTE_ITEM_TYPES.map(type => <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input placeholder="Optional category" value={item.category || ''} onChange={e => updateItem(index, 'category', e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input type="number" min="1" step="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} />
                    </div>

                    <div className="space-y-2">
                      <Label>Unit Price *</Label>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={item.unit_price} onChange={e => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} />
                    </div>

                    <div className="space-y-2">
                      <Label>Total</Label>
                      <div className="p-2 bg-muted rounded-md">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Detailed description of the item..." value={item.description || ''} onChange={e => updateItem(index, 'description', e.target.value)} rows={2} />
                  </div>
                </div>)}
            </CardContent>
          </Card>

          {/* Quote Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{taxCalculations.taxBreakdown.taxDescription}:</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <div className="space-y-2">
            <Label htmlFor="terms_conditions">Terms & Conditions</Label>
            <Textarea placeholder="Terms and conditions for this quote..." value={termsConditions} onChange={e => setTermsConditions(e.target.value)} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </> : <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Quote
                </>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>;
}