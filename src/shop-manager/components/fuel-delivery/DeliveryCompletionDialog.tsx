import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Fuel, 
  Droplet, 
  CheckCircle2, 
  ChevronRight,
  ChevronLeft,
  Loader2,
  PenLine
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { TruckCompartmentSelector } from './TruckCompartmentSelector';
import { SignaturePad } from './SignaturePad';
import { useTruckCompartments, TruckCompartment, useUpdateCompartmentLevel } from '@/hooks/useTruckCompartments';
import { useFuelProducts, FuelProduct, useProductsByTruck } from '@/hooks/useFuelProducts';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';
import { AlertTriangle, CheckCircle2 as CheckIcon } from 'lucide-react';

interface RouteStop {
  id: string;
  customer_id?: string;
  status: string;
  actual_arrival?: string | null;
  fuel_delivery_customers?: {
    company_name?: string;
  } | null;
}

interface DeliveryRoute {
  id: string;
  truck_id?: string | null;
}

interface CompletionData {
  gallonsDelivered: number;
  productId: string | null;
  compartmentId: string | null;
  customProductName: string | null;
  meterStart: number | null;
  meterEnd: number | null;
  tankBefore: number;
  tankAfter: number;
  signature: string | null;
  customerPresent: boolean;
  notes: string;
  arrivalTime: string;
  departureTime: string;
}

interface DeliveryCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stop: RouteStop | null;
  route: DeliveryRoute | null;
  onComplete: (data: CompletionData) => Promise<void>;
}

type Step = 'product' | 'compartment' | 'quantity' | 'tank' | 'signature';

const STEPS: Step[] = ['product', 'compartment', 'quantity', 'tank', 'signature'];

export function DeliveryCompletionDialog({
  open,
  onOpenChange,
  stop,
  route,
  onComplete
}: DeliveryCompletionDialogProps) {
  const [currentStep, setCurrentStep] = useState<Step>('product');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [useCustomProduct, setUseCustomProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState('');
  const [selectedCompartment, setSelectedCompartment] = useState<TruckCompartment | null>(null);
  const [gallonsDelivered, setGallonsDelivered] = useState('');
  const [meterStart, setMeterStart] = useState('');
  const [meterEnd, setMeterEnd] = useState('');
  const [tankBefore, setTankBefore] = useState('');
  const [tankAfter, setTankAfter] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [customerPresent, setCustomerPresent] = useState(true);
  const [notes, setNotes] = useState('');
  
  // Data hooks
  const { data: compartments = [], isLoading: loadingCompartments } = useTruckCompartments(route?.truck_id || undefined);
  const { data: products = [], isLoading: loadingProducts } = useFuelProducts();
  const { data: truckProducts = [] } = useProductsByTruck(route?.truck_id || undefined);
  const updateCompartmentLevel = useUpdateCompartmentLevel();
  const { getUnitLabel, getPriceLabel, formatVolume, convertToGallons, convertFromGallons } = useFuelUnits();
  
  // Get set of product IDs that are on the truck
  const truckProductIds = new Set(truckProducts.map(p => p.id));
  
  // Time tracking
  const arrivalTime = stop?.actual_arrival ? new Date(stop.actual_arrival) : new Date();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    if (open) {
      const interval = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [open]);
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep('product');
      setSelectedProductId(null);
      setUseCustomProduct(false);
      setCustomProductName('');
      setSelectedCompartment(null);
      setGallonsDelivered('');
      setMeterStart('');
      setMeterEnd('');
      setTankBefore('');
      setTankAfter('');
      setSignature(null);
      setCustomerPresent(true);
      setNotes('');
    }
  }, [open]);
  
  // Calculate from meter readings
  useEffect(() => {
    const start = parseFloat(meterStart);
    const end = parseFloat(meterEnd);
    if (!isNaN(start) && !isNaN(end) && end > start) {
      setGallonsDelivered((end - start).toFixed(1));
    }
  }, [meterStart, meterEnd]);
  
  const duration = differenceInMinutes(currentTime, arrivalTime);
  
  const getCurrentStepIndex = () => STEPS.indexOf(currentStep);
  
  const canProceed = () => {
    switch (currentStep) {
      case 'product':
        return useCustomProduct ? customProductName.trim() !== '' : selectedProductId !== null;
      case 'compartment':
        return useCustomProduct || selectedCompartment !== null;
      case 'quantity':
        return parseFloat(gallonsDelivered) > 0;
      case 'tank':
        return true; // Optional
      case 'signature':
        return !customerPresent || signature !== null;
      default:
        return false;
    }
  };
  
  const goNext = () => {
    const currentIndex = getCurrentStepIndex();
    
    // Skip compartment step if using custom product
    if (currentStep === 'product' && useCustomProduct) {
      setCurrentStep('quantity');
      return;
    }
    
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };
  
  const goBack = () => {
    const currentIndex = getCurrentStepIndex();
    
    // Skip compartment step if using custom product
    if (currentStep === 'quantity' && useCustomProduct) {
      setCurrentStep('product');
      return;
    }
    
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };
  
  const handleComplete = async () => {
    if (!stop) return;
    
    setIsSubmitting(true);
    try {
      const data: CompletionData = {
        gallonsDelivered: parseFloat(gallonsDelivered),
        productId: useCustomProduct ? null : selectedProductId,
        compartmentId: selectedCompartment?.id || null,
        customProductName: useCustomProduct ? customProductName : null,
        meterStart: meterStart ? parseFloat(meterStart) : null,
        meterEnd: meterEnd ? parseFloat(meterEnd) : null,
        tankBefore: parseFloat(tankBefore) || 0,
        tankAfter: parseFloat(tankAfter) || 0,
        signature,
        customerPresent,
        notes,
        arrivalTime: arrivalTime.toISOString(),
        departureTime: new Date().toISOString()
      };
      
      // Update compartment level if one was selected
      if (selectedCompartment && route?.truck_id) {
        const newLevel = Math.max(0, selectedCompartment.current_level_gallons - parseFloat(gallonsDelivered));
        await updateCompartmentLevel.mutateAsync({
          compartmentId: selectedCompartment.id,
          newLevel,
          truckId: route.truck_id
        });
      }
      
      await onComplete(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to complete delivery:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="text-lg">
            Complete Delivery
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {stop?.fuel_delivery_customers?.company_name || 'Customer'}
          </div>
        </DialogHeader>
        
        {/* Time Tracking Banner */}
        <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <div className="text-sm">
                <span className="text-muted-foreground">Arrived:</span>{' '}
                <span className="font-medium">{format(arrivalTime, 'h:mm a')}</span>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Duration:</span>{' '}
              <span className="font-medium">{duration} min</span>
            </div>
          </div>
          <div className="text-sm font-medium text-primary">
            {format(currentTime, 'h:mm:ss a')}
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="px-4 py-2 border-b">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              // Skip compartment in visual if using custom
              if (step === 'compartment' && useCustomProduct) return null;
              
              const isActive = step === currentStep;
              const isPast = STEPS.indexOf(step) < STEPS.indexOf(currentStep);
              
              return (
                <div 
                  key={step}
                  className={cn(
                    "flex items-center gap-1",
                    isActive ? "text-primary" : isPast ? "text-green-600" : "text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium",
                    isActive ? "bg-primary text-primary-foreground" :
                    isPast ? "bg-green-600 text-white" : "bg-muted"
                  )}>
                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className="text-xs capitalize hidden sm:inline">{step}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="p-4">
            {/* Step: Product Selection */}
            {currentStep === 'product' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Select Fuel Product</Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="custom-toggle" className="text-sm text-muted-foreground">
                      Custom Entry
                    </Label>
                    <Switch
                      id="custom-toggle"
                      checked={useCustomProduct}
                      onCheckedChange={setUseCustomProduct}
                    />
                  </div>
                </div>
                
                {useCustomProduct ? (
                  <div className="space-y-2">
                    <Label htmlFor="custom-product">Product Name</Label>
                    <Input
                      id="custom-product"
                      placeholder="e.g., Marine Diesel, Aviation Fuel"
                      value={customProductName}
                      onChange={(e) => setCustomProductName(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loadingProducts ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {/* Products on truck section */}
                        {truckProducts.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                              <CheckIcon className="h-4 w-4" />
                              <span>On Truck</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {products
                                .filter(p => truckProductIds.has(p.id))
                                .map((product) => (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => setSelectedProductId(product.id)}
                                    className={cn(
                                      "p-3 rounded-lg border-2 text-left transition-all",
                                      selectedProductId === product.id
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                        : "border-green-500 bg-green-50 dark:bg-green-950/30 hover:border-green-600 hover:bg-green-100 dark:hover:bg-green-950/50"
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="relative">
                                        <Fuel className="h-5 w-5 text-green-600" />
                                        <CheckIcon className="absolute -bottom-1 -right-1 h-3 w-3 text-green-600" />
                                      </div>
                                      <div>
                                        <div className="font-medium text-sm">{product.product_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {product.product_code}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Products NOT on truck section */}
                        {products.filter(p => !truckProductIds.has(p.id)).length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-red-500">
                              <AlertTriangle className="h-4 w-4" />
                              <span>Not On Truck</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {products
                                .filter(p => !truckProductIds.has(p.id))
                                .map((product) => (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => setSelectedProductId(product.id)}
                                    className={cn(
                                      "p-3 rounded-lg border-2 text-left transition-all",
                                      selectedProductId === product.id
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                        : "border-red-300 bg-red-50 dark:bg-red-950/30 hover:border-red-400 dark:hover:bg-red-950/50"
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="relative">
                                        <Fuel className="h-5 w-5 text-red-400" />
                                        <AlertTriangle className="absolute -bottom-1 -right-1 h-3 w-3 text-red-500" />
                                      </div>
                                      <div>
                                        <div className="font-medium text-sm">{product.product_name}</div>
                                        <div className="text-xs text-red-500">
                                          {product.product_code} • Not loaded
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Warning if no products on truck */}
                        {truckProducts.length === 0 && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                              <AlertTriangle className="h-4 w-4" />
                              <span>No products loaded on this truck. Load fuel before making deliveries.</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Step: Compartment Selection */}
            {currentStep === 'compartment' && (
              <div className="space-y-4">
                <Label className="text-base font-medium">Select Truck Tank</Label>
                <p className="text-sm text-muted-foreground">
                  Choose which compartment you're dispensing from
                </p>
                
                {loadingCompartments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <TruckCompartmentSelector
                    compartments={compartments}
                    selectedCompartmentId={selectedCompartment?.id || null}
                    onSelect={setSelectedCompartment}
                    filterByProductId={selectedProductId}
                  />
                )}
                
                {selectedCompartment && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-sm text-green-800 dark:text-green-200">
                      <strong>Selected:</strong> {selectedCompartment.compartment_name} with{' '}
                      {formatVolume(selectedCompartment.current_level_gallons, 0)} available
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Step: Quantity */}
            {currentStep === 'quantity' && (
              <div className="space-y-4">
                <Label className="text-base font-medium">Quantity Delivered</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meter-start">Meter Start</Label>
                    <Input
                      id="meter-start"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={meterStart}
                      onChange={(e) => setMeterStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meter-end">Meter End</Label>
                    <Input
                      id="meter-end"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={meterEnd}
                      onChange={(e) => setMeterEnd(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or enter directly</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gallons">{getUnitLabel(false)} Delivered</Label>
                  <div className="relative">
                    <Input
                      id="gallons"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={gallonsDelivered}
                      onChange={(e) => setGallonsDelivered(e.target.value)}
                      className="text-2xl h-14 pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {getUnitLabel()}
                    </span>
                  </div>
                </div>
                
                {selectedCompartment && parseFloat(gallonsDelivered) > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Remaining in tank after delivery:</span>{' '}
                      <span className="font-medium">
                        {formatVolume(Math.max(0, selectedCompartment.current_level_gallons - parseFloat(gallonsDelivered)), 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Step: Customer Tank */}
            {currentStep === 'tank' && (
              <div className="space-y-4">
                <Label className="text-base font-medium">Customer Tank Levels</Label>
                <p className="text-sm text-muted-foreground">
                  Optional: Record the tank levels before and after delivery
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tank-before">Before (%)</Label>
                    <Input
                      id="tank-before"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={tankBefore}
                      onChange={(e) => setTankBefore(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tank-after">After (%)</Label>
                    <Input
                      id="tank-after"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={tankAfter}
                      onChange={(e) => setTankAfter(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Delivery Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any notes about this delivery..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
            
            {/* Step: Signature */}
            {currentStep === 'signature' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Customer Signature</Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="customer-present" className="text-sm text-muted-foreground">
                      Customer Present
                    </Label>
                    <Switch
                      id="customer-present"
                      checked={customerPresent}
                      onCheckedChange={setCustomerPresent}
                    />
                  </div>
                </div>
                
                {customerPresent ? (
                  <SignaturePad
                    onSignatureChange={setSignature}
                    label="Please sign below"
                  />
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      No signature will be collected. A delivery confirmation will be sent to the customer.
                    </p>
                  </div>
                )}
                
                {/* Summary */}
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="font-medium text-sm">Delivery Summary</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Product:</div>
                    <div>{useCustomProduct ? customProductName : selectedProduct?.product_name}</div>
                    
                    <div className="text-muted-foreground">Quantity:</div>
                    <div>{gallonsDelivered} {getUnitLabel()}</div>
                    
                    <div className="text-muted-foreground">Duration:</div>
                    <div>{duration} minutes</div>
                    
                    {selectedCompartment && (
                      <>
                        <div className="text-muted-foreground">From Tank:</div>
                        <div>{selectedCompartment.compartment_name}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Footer Navigation */}
        <div className="p-4 border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentStep === 'product'}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          {currentStep === 'signature' ? (
            <Button
              onClick={handleComplete}
              disabled={!canProceed() || isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Complete Delivery
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
