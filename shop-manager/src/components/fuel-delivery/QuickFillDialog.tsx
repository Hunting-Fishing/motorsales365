import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Fuel, Clock, Droplets, TruckIcon } from 'lucide-react';
import { useTruckCompartments, TruckCompartment } from '@/hooks/useTruckCompartments';
import { useAddFuelToCompartment } from '@/hooks/fuel-delivery/useAddFuelToCompartment';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';
import { useFuelProducts } from '@/hooks/useFuelProducts';
import { FuelDeliveryTruck } from '@/hooks/useFuelDelivery';
import { cn } from '@/lib/utils';

interface QuickFillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truck: FuelDeliveryTruck | null;
  shopId: string;
}

export function QuickFillDialog({
  open,
  onOpenChange,
  truck,
  shopId
}: QuickFillDialogProps) {
  const { data: compartments = [] } = useTruckCompartments(truck?.id);
  const { data: fuelProducts = [] } = useFuelProducts();
  const addFuel = useAddFuelToCompartment();
  const { formatVolume, getUnitLabel, convertFromGallons, convertToGallons } = useFuelUnits();

  const [selectedCompartmentId, setSelectedCompartmentId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [fillTime, setFillTime] = useState('');

  // Reset and initialize form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCompartmentId(null);
      setSelectedProductId(null);
      setAmount('');
      // Set current time
      const now = new Date();
      const timeString = now.toTimeString().slice(0, 5);
      setFillTime(timeString);
    }
  }, [open]);

  // Auto-select product when compartment is selected
  useEffect(() => {
    if (selectedCompartmentId) {
      const comp = compartments.find(c => c.id === selectedCompartmentId);
      if (comp?.product_id) {
        setSelectedProductId(comp.product_id);
      }
    }
  }, [selectedCompartmentId, compartments]);

  const selectedCompartment = compartments.find(c => c.id === selectedCompartmentId);
  const selectedProduct = fuelProducts.find(p => p.id === selectedProductId);

  const getPercentage = (comp: TruckCompartment) => {
    if (!comp.capacity_gallons) return 0;
    return Math.round((comp.current_level_gallons / comp.capacity_gallons) * 100);
  };

  const getRemainingCapacity = (comp: TruckCompartment) => {
    return comp.capacity_gallons - comp.current_level_gallons;
  };

  const getProductDisplayName = (product: typeof fuelProducts[0]) => {
    if (!product) return '';
    let name = product.product_name;
    if (product.octane_rating) {
      name += ` (${product.octane_rating})`;
    }
    if (product.grade) {
      name += ` - ${product.grade}`;
    }
    return name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompartmentId || !truck?.id || !amount) return;

    // Build fill date from today + selected time
    const today = new Date();
    const [hours, minutes] = fillTime.split(':').map(Number);
    today.setHours(hours, minutes, 0, 0);

    await addFuel.mutateAsync({
      compartmentId: selectedCompartmentId,
      truckId: truck.id,
      shopId,
      amountToAdd: parseFloat(amount),
      fillDate: today,
      notes: selectedProduct 
        ? `Quick fill: ${getProductDisplayName(selectedProduct)}`
        : undefined
    });

    onOpenChange(false);
  };

  // Fill to capacity helper
  const handleFillToCapacity = () => {
    if (selectedCompartment) {
      const remaining = getRemainingCapacity(selectedCompartment);
      setAmount(convertFromGallons(remaining).toFixed(0));
    }
  };

  if (!truck) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-primary" />
            Quick Fill
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Truck Info */}
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{truck.truck_number}</span>
            <span className="text-muted-foreground">
              {truck.make} {truck.model}
            </span>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="fillTime" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Fill Time
            </Label>
            <Input
              id="fillTime"
              type="time"
              value={fillTime}
              onChange={(e) => setFillTime(e.target.value)}
              required
            />
          </div>

          {/* Tank Selection */}
          <div className="space-y-2">
            <Label>Select Tank *</Label>
            <div className="grid gap-2">
              {compartments.map((comp) => {
                const percentage = getPercentage(comp);
                const remaining = getRemainingCapacity(comp);
                const isSelected = selectedCompartmentId === comp.id;
                
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => setSelectedCompartmentId(comp.id)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      "hover:border-primary/50",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {comp.compartment_name || `Tank ${comp.compartment_number}`}
                        </span>
                      </div>
                      {comp.product && (
                        <Badge variant="secondary" className="text-xs">
                          {comp.product.product_code}
                          {comp.product.fuel_type === 'gasoline' && ' ⛽'}
                          {comp.product.fuel_type === 'diesel' && ' 🛢️'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{formatVolume(comp.current_level_gallons, 0)} / {formatVolume(comp.capacity_gallons, 0)}</span>
                      <span className={cn(
                        percentage < 30 ? 'text-red-500' :
                        percentage < 70 ? 'text-amber-500' : 'text-green-500'
                      )}>
                        {percentage}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          percentage < 30 ? 'bg-red-500' : 
                          percentage < 70 ? 'bg-amber-500' : 'bg-green-500'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fuel Type - shows what's in tank or allows override */}
          {selectedCompartment && (
            <div className="space-y-2">
              <Label>Fuel Type</Label>
              <Select
                value={selectedProductId || ''}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel type">
                    {selectedProduct && getProductDisplayName(selectedProduct)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {fuelProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <span>{getProductDisplayName(product)}</span>
                        {product.category && (
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Quantity ({getUnitLabel()}) *</Label>
              {selectedCompartment && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFillToCapacity}
                  className="h-auto py-1 px-2 text-xs"
                >
                  Fill to capacity ({formatVolume(getRemainingCapacity(selectedCompartment), 0)})
                </Button>
              )}
            </div>
            <Input
              id="amount"
              type="number"
              step="1"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter ${getUnitLabel()}`}
              required
              className="text-lg font-medium"
            />
            {selectedCompartment && amount && (
              <p className="text-xs text-muted-foreground">
                New level: {formatVolume(
                  selectedCompartment.current_level_gallons + convertToGallons(parseFloat(amount || '0')),
                  0
                )} / {formatVolume(selectedCompartment.capacity_gallons, 0)}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedCompartmentId || !amount || addFuel.isPending}
              className="min-w-[120px]"
            >
              {addFuel.isPending ? 'Filling...' : 'Record Fill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
