import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Save, Package, Wrench, Calculator } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useVehicles } from '@/hooks/useVehicles';
import { useServiceData } from '@/hooks/useServiceData';
import { createQuote } from '@/services/quote/quoteService';
import { createQuoteItems } from '@/services/quote/quoteItemService';
import { QuoteItemFormValues, QuoteItemType } from '@/types/quote';

// Enhanced part type to match work order parts
interface ComprehensiveQuotePart {
  id?: string;
  name: string;
  part_number: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type?: QuoteItemType;
  // Advanced pricing fields from work order parts
  supplierCost?: number;
  markupPercentage?: number;
  customerPrice?: number;
  supplierSuggestedRetail?: number;
  // Classification and metadata
  part_type?: string;
  category?: string;
  status?: string;
  // Tax and charges
  isTaxable?: boolean;
  coreChargeAmount?: number;
  coreChargeApplied?: boolean;
  // Supplier and inventory
  supplierName?: string;
  supplierOrderRef?: string;
  invoiceNumber?: string;
  poLine?: string;
  inventoryItemId?: string;
  isStockItem?: boolean;
  // Warranty and installation
  warrantyDuration?: string;
  warrantyExpiryDate?: string;
  installDate?: string;
  installedBy?: string;
  estimatedArrivalDate?: string;
  // Notes
  notes?: string;
  notesInternal?: string;
}
import { SelectedService } from '@/types/selectedService';
import { formatCurrency } from '@/utils/formatters';
import { toast } from '@/hooks/use-toast';
import { IntegratedServiceSelector } from '@/components/work-orders/fields/services/IntegratedServiceSelector';
import { ComprehensiveQuotePartsSelector } from './ComprehensiveQuotePartsSelector';
import { useQuoteTaxCalculations } from '@/hooks/useQuoteTaxCalculations';
import { useShopId } from '@/hooks/useShopId';

interface EnhancedCreateQuoteDialogProps {
  children: React.ReactNode;
  onSuccess?: (quoteId: string) => void;
}

export function EnhancedCreateQuoteDialog({
  children,
  onSuccess
}: EnhancedCreateQuoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('details');

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  
  // Services and Parts state
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [selectedParts, setSelectedParts] = useState<ComprehensiveQuotePart[]>([]);

  const { customers, loading: customersLoading } = useCustomers();
  const { vehicles, loading: vehiclesLoading } = useVehicles(selectedCustomerId);
  const { sectors, isRefreshing: servicesLoading } = useServiceData();
  const { shopId } = useShopId();
  
  // Get customer data for tax calculations
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  
  // Convert services and parts to quote items format for tax calculation
  const quoteItems = [
    ...selectedServices.map(service => ({
      id: '',
      quote_id: '',
      name: service.name,
      description: service.description || '',
      category: service.category || '',
      quantity: 1,
      unit_price: service.total_amount || 0,
      total_price: service.total_amount || 0,
      item_type: 'labor' as const,
      display_order: 0,
      created_at: '',
      updated_at: ''
    })),
    ...selectedParts.map(part => ({
      id: '',
      quote_id: '',
      name: part.name,
      description: part.description || '',
      category: part.category || '',
      quantity: part.quantity,
      unit_price: part.unit_price,
      total_price: part.quantity * part.unit_price,
      item_type: 'part' as const,
      display_order: 0,
      created_at: '',
      updated_at: ''
    }))
  ];
  
  // Use centralized tax calculations
  const taxCalculations = useQuoteTaxCalculations({
    items: quoteItems,
    customer: selectedCustomer,
    shopId: shopId || undefined
  });

  // Calculate totals using centralized tax system
  const serviceTotal = selectedServices.reduce((sum, service) => sum + (service.total_amount || 0), 0);
  const partsTotal = selectedParts.reduce((sum, part) => sum + (part.total_price || part.quantity * part.unit_price), 0);
  const subtotal = serviceTotal + partsTotal;
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

  const handleServiceSelect = (service: any, categoryName: string, subcategoryName: string) => {
    console.log('Service selected:', service, categoryName, subcategoryName);
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };

  const handleUpdateServices = (services: SelectedService[]) => {
    setSelectedServices(services);
  };

  const handlePartsChange = (parts: ComprehensiveQuotePart[]) => {
    setSelectedParts(parts);
  };

  const resetForm = () => {
    setCustomerId('');
    setVehicleId('');
    setSelectedCustomerId('');
    setExpiryDate('');
    setNotes('');
    setTermsConditions('');
    setSelectedServices([]);
    setSelectedParts([]);
    setActiveTab('details');
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

    if (selectedServices.length === 0 && selectedParts.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one service or part to the quote.',
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

      // Convert services and parts to quote items
      const items: QuoteItemFormValues[] = [
        // Services
        ...selectedServices.map(service => ({
          name: service.name,
          description: service.description || '',
          category: service.category,
          quantity: 1,
          unit_price: service.total_amount || 0,
          item_type: 'service' as QuoteItemType
        })),
        // Parts - convert to QuoteItemFormValues
        ...selectedParts.map(part => ({
          name: part.name,
          description: part.description || '',
          category: part.category || '',
          quantity: part.quantity,
          unit_price: part.unit_price,
          item_type: 'part' as QuoteItemType
        }))
      ];

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden bg-gray-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Create New Quote
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive quote using our integrated service and parts selectors.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Quote Details</TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Services ({selectedServices.length})
            </TabsTrigger>
            <TabsTrigger value="parts" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Parts ({selectedParts.length})
            </TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="details" className="space-y-6 mt-6">
              <form className="space-y-6">
                {/* Customer and Vehicle Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer *</Label>
                    <Select onValueChange={handleCustomerChange} value={selectedCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customersLoading ? (
                          <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                        ) : (
                          customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.first_name} {customer.last_name} - {customer.email}
                            </SelectItem>
                          ))
                        )}
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
                        {vehiclesLoading ? (
                          <SelectItem value="loading" disabled>Loading vehicles...</SelectItem>
                        ) : vehicles.length === 0 ? (
                          <SelectItem value="none" disabled>No vehicles found</SelectItem>
                        ) : (
                          vehicles.map(vehicle => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Quote Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry_date">Expiry Date</Label>
                    <Input 
                      type="date" 
                      value={expiryDate} 
                      onChange={(e) => setExpiryDate(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea 
                      placeholder="Internal notes about this quote..." 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="terms_conditions">Terms & Conditions</Label>
                    <Textarea 
                      placeholder="Terms and conditions for this quote..." 
                      value={termsConditions} 
                      onChange={(e) => setTermsConditions(e.target.value)} 
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    onClick={() => setActiveTab('services')}
                    className="flex items-center gap-2"
                  >
                    Next: Add Services
                    <Wrench className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="services" className="mt-6">
              {servicesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading services...</span>
                </div>
              ) : (
                <IntegratedServiceSelector
                  sectors={sectors}
                  onServiceSelect={handleServiceSelect}
                  selectedServices={selectedServices}
                  onRemoveService={handleRemoveService}
                  onUpdateServices={handleUpdateServices}
                />
              )}
            </TabsContent>

            <TabsContent value="parts" className="mt-6">
              <ComprehensiveQuotePartsSelector
                selectedParts={selectedParts}
                onPartsChange={handlePartsChange}
              />
            </TabsContent>

            <TabsContent value="summary" className="mt-6">
              <div className="space-y-6">
                {/* Selected Services Summary */}
                {selectedServices.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        Selected Services ({selectedServices.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedServices.map(service => (
                          <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{service.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {service.category} › {service.subcategory}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{formatCurrency(service.total_amount || 0)}</div>
                              {service.estimatedTime && (
                                <div className="text-sm text-muted-foreground">
                                  {service.estimatedTime} min
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Selected Parts Summary */}
                {selectedParts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Selected Parts ({selectedParts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedParts.map((part, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{part.name}</div>
                              {part.description && (
                                <div className="text-sm text-muted-foreground">{part.description}</div>
                              )}
                               <div className="text-sm text-muted-foreground">
                                 {part.part_number && `Part #: ${part.part_number} • `}
                                 Qty: {part.quantity} × {formatCurrency(part.unit_price)}
                               </div>
                            </div>
                             <div className="font-bold">
                               {formatCurrency(part.total_price || part.quantity * part.unit_price)}
                             </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quote Totals */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quote Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Services Total:</span>
                        <span>{formatCurrency(serviceTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Parts Total:</span>
                        <span>{formatCurrency(partsTotal)}</span>
                      </div>
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
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Quote
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}