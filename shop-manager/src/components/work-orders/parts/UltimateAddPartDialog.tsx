import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { WorkOrderPartFormValues, PART_TYPES, WORK_ORDER_PART_STATUSES } from '@/types/workOrderPart';
import { WorkOrderJobLine } from '@/types/jobLine';
import { createWorkOrderPart } from '@/services/workOrder/workOrderPartsService';
import { useInventoryItems } from '@/hooks/inventory/useInventoryItems';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Package, DollarSign, Truck, Shield, Settings, Search, Calculator, Calendar } from 'lucide-react';
import { PartsCategorySelector } from './PartsCategorySelector';
import { PartsSuppliersSelector } from './PartsSuppliersSelector';
import { InteractiveMarkupSlider } from './InteractiveMarkupSlider';
const ultimatePartSchema = z.object({
  // Basic Information
  name: z.string().min(1, 'Part name is required'),
  part_number: z.string().min(1, 'Part number is required'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  part_type: z.enum(['inventory', 'non-inventory', 'special-order']),
  // Quantity and Pricing
  quantity: z.number().min(1, 'Quantity must be at least 1').default(1),
  unit_price: z.number().min(0, 'Price cannot be negative').default(0),
  total_price: z.number().optional(),
  // Advanced Pricing
  supplierCost: z.number().optional(),
  supplierSuggestedRetail: z.number().optional(),
  customerPrice: z.number().optional(),
  markupPercentage: z.number().optional(),
  // Supplier Information
  supplierName: z.string().optional(),
  supplier_id: z.string().optional(),
  supplierOrderRef: z.string().optional(),
  invoiceNumber: z.string().optional(),
  poLine: z.string().optional(),
  estimatedArrivalDate: z.string().optional(),
  // Inventory Integration
  inventoryItemId: z.string().optional(),
  isStockItem: z.boolean().optional(),
  // Warranty & Installation
  warrantyDuration: z.string().optional(),
  warrantyExpiryDate: z.string().optional(),
  installDate: z.string().optional(),
  installedBy: z.string().optional(),
  // Core Charges & Tax
  isTaxable: z.boolean().optional(),
  coreChargeAmount: z.number().optional(),
  coreChargeApplied: z.boolean().optional(),
  ecoFee: z.number().optional(),
  ecoFeeApplied: z.boolean().optional(),
  // Status & Assignment
  status: z.string().optional().default('pending'),
  job_line_id: z.string().optional(),
  // Notes
  notes: z.string().optional(),
  notesInternal: z.string().optional()
});
interface UltimateAddPartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  jobLines: WorkOrderJobLine[];
  onPartAdded: () => Promise<void>;
  preSelectedJobLineId?: string;
}
export function UltimateAddPartDialog({
  open,
  onOpenChange,
  workOrderId,
  jobLines,
  onPartAdded,
  preSelectedJobLineId
}: UltimateAddPartDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    items: inventoryItems
  } = useInventoryItems();
  const form = useForm({
    resolver: zodResolver(ultimatePartSchema),
    defaultValues: {
      name: '',
      part_number: '',
      description: '',
      category_id: undefined,
      part_type: 'inventory',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      supplierCost: 0,
      supplierSuggestedRetail: 0,
      customerPrice: 0,
      markupPercentage: 0,
      supplierName: '',
      supplierOrderRef: '',
      invoiceNumber: '',
      poLine: '',
      estimatedArrivalDate: '',
      inventoryItemId: '',
      isStockItem: false,
      warrantyDuration: '',
      warrantyExpiryDate: '',
      installDate: '',
      installedBy: '',
      isTaxable: true,
      coreChargeAmount: 0,
      coreChargeApplied: false,
      ecoFee: 0,
      ecoFeeApplied: false,
      status: 'pending',
      job_line_id: preSelectedJobLineId || '',
      notes: '',
      notesInternal: ''
    }
  });

  // Watch values for calculations
  const quantity = form.watch('quantity');
  const unitPrice = form.watch('unit_price');
  const supplierCost = form.watch('supplierCost');
  const markupPercentage = form.watch('markupPercentage');

  // Auto-calculate total price
  useEffect(() => {
    if (quantity && unitPrice) {
      form.setValue('total_price', quantity * unitPrice);
    }
  }, [quantity, unitPrice, form]);

  // Auto-calculate customer price from supplier cost + markup
  useEffect(() => {
    if (supplierCost && markupPercentage) {
      const customerPrice = supplierCost * (1 + markupPercentage / 100);
      form.setValue('customerPrice', Math.round(customerPrice * 100) / 100);
      form.setValue('unit_price', Math.round(customerPrice * 100) / 100);
    }
  }, [supplierCost, markupPercentage, form]);
  const handleInventoryItemSelect = (itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      form.setValue('inventoryItemId', itemId);
      form.setValue('name', item.name);
      form.setValue('part_number', item.sku || '');
      form.setValue('description', item.description || '');
      // Note: inventory items don't have category_id, so we'll leave it empty for now
      form.setValue('unit_price', item.price || 0);
      form.setValue('isStockItem', true);
      form.setValue('part_type', 'inventory');
    }
  };
  const handleSubmit = async (values: any) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const partData = {
        ...values,
        work_order_id: workOrderId,
        total_price: values.total_price || values.quantity * values.unit_price,
        job_line_id: values.job_line_id === 'none' ? null : values.job_line_id
      };
      await createWorkOrderPart(partData);
      toast.success('Part added successfully');
      form.reset();
      onOpenChange(false);
      await onPartAdded();
    } catch (error) {
      console.error('Error creating part:', error);
      setSubmitError('Failed to add part. Please try again.');
      toast.error('Failed to add part');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDialogClose = (open: boolean) => {
    if (!isSubmitting) {
      if (!open) {
        form.reset();
        setSubmitError(null);
        setActiveTab('basic');
      }
      onOpenChange(open);
    }
  };
  const filteredInventoryItems = inventoryItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
  return <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] bg-slate-50 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add New Part
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full min-h-0">
            {submitError && <Alert variant="destructive" className="mb-4 flex-shrink-0">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
              <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing
                </TabsTrigger>
                <TabsTrigger value="supplier" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Supplier
                </TabsTrigger>
                <TabsTrigger value="warranty" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Warranty
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4 min-h-0">
                <TabsContent value="basic" className="space-y-6 mt-0">
                  {/* Inventory Search */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Search Inventory</span>
                    </div>
                    <div className="space-y-2">
                      <Input placeholder="Search inventory items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                      {searchQuery && <div className="max-h-32 overflow-y-auto border rounded-md">
                          {filteredInventoryItems.slice(0, 5).map(item => <div key={item.id} className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0" onClick={() => handleInventoryItemSelect(item.id)}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-sm">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    SKU: {item.sku} | Stock: {item.quantity}
                                  </div>
                                </div>
                                <Badge variant="outline">${item.price}</Badge>
                              </div>
                            </div>)}
                          {filteredInventoryItems.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">
                              No inventory items found
                            </div>}
                        </div>}
                    </div>
                  </div>

                  <Separator />

                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Part Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter part name..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                    <FormField control={form.control} name="part_number" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Part Number *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter part number..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="category_id" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <PartsCategorySelector
                              value={field.value}
                              onValueChange={(value) => field.onChange(value)}
                              placeholder="Select part category..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                    <FormField control={form.control} name="part_type" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Part Type</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select part type..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inventory">Inventory Item</SelectItem>
                                <SelectItem value="non-inventory">Non-Inventory</SelectItem>
                                <SelectItem value="special-order">Special Order</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  <FormField control={form.control} name="quantity" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Quantity *</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 1)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                  <FormField control={form.control} name="description" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Enter part description..." rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  {/* Job Line Assignment */}
                  {jobLines.length > 0 && <FormField control={form.control} name="job_line_id" render={({
                  field
                }) => <FormItem>
                          <FormLabel>Assign to Job Line</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select job line..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Assignment</SelectItem>
                                {jobLines.map(jobLine => <SelectItem key={jobLine.id} value={jobLine.id}>
                                    {jobLine.name} - {jobLine.category}
                                  </SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />}
                </TabsContent>

                <TabsContent value="pricing" className="space-y-6 mt-0">
                  <InteractiveMarkupSlider form={form as any} />

                  {/* Core Charge Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Core Charge</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="coreChargeApplied" render={({
                      field
                    }) => <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Apply Core Charge</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Charge for returnable core
                              </div>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>} />

                      {form.watch('coreChargeApplied') && <FormField control={form.control} name="coreChargeAmount" render={({
                      field
                    }) => <FormItem>
                              <FormLabel>Core Charge Amount</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />}
                    </div>
                  </div>

                  {/* ECO FEE Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">ECO FEE</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="ecoFeeApplied" render={({
                      field
                    }) => <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Apply ECO FEE</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Environmental handling fee
                              </div>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>} />

                      {form.watch('ecoFeeApplied') && <FormField control={form.control} name="ecoFee" render={({
                      field
                    }) => <FormItem>
                              <FormLabel>ECO FEE Amount</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />}
                    </div>
                  </div>

                  <FormField control={form.control} name="isTaxable" render={({
                  field
                }) => <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Taxable Item</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Subject to sales tax
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>} />
                </TabsContent>

                <TabsContent value="supplier" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="supplierName" render={({
                     field
                   }) => <FormItem>
                           <FormLabel>Supplier</FormLabel>
                           <FormControl>
                             <PartsSuppliersSelector
                               value={field.value}
                               onValueChange={(value) => field.onChange(value)}
                               placeholder="Select supplier..."
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>} />

                    <FormField control={form.control} name="supplierOrderRef" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Supplier Order Reference</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Order reference number..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="invoiceNumber" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Invoice Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Supplier invoice number..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                    <FormField control={form.control} name="poLine" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>PO Line</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Purchase order line..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  <FormField control={form.control} name="estimatedArrivalDate" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Estimated Arrival Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="isStockItem" render={({
                  field
                }) => <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Stock Item</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Part is kept in inventory
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>} />
                </TabsContent>

                <TabsContent value="warranty" className="space-y-6 mt-0">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Warranty & Installation</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="warrantyDuration" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Warranty Duration</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 12 months, 2 years..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                    <FormField control={form.control} name="warrantyExpiryDate" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Warranty Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="installDate" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Installation Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                    <FormField control={form.control} name="installedBy" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Installed By</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Technician name..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-6 mt-0">
                  <FormField control={form.control} name="status" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WORK_ORDER_PART_STATUSES.map(status => <SelectItem key={status} value={status}>
                                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="notes" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Customer Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Notes visible to customer..." rows={4} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                    <FormField control={form.control} name="notesInternal" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Internal Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Internal notes for staff..." rows={4} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* Form Actions - Always Visible */}
            <div className="flex justify-between items-center pt-4 border-t mt-6 bg-slate-50 flex-shrink-0">
              <div className="text-sm text-muted-foreground">
                {form.watch('total_price') > 0 && <span>Total: ${form.watch('total_price')?.toFixed(2)}</span>}
              </div>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                  {isSubmitting ? <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding Part...
                    </> : 'Add Part'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>;
}