import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Fuel, DollarSign, Receipt, Truck as TruckIcon, Calendar } from 'lucide-react';
import { useTruckCompartments, TruckCompartment } from '@/hooks/useTruckCompartments';
import { useAddFuelToCompartment } from '@/hooks/fuel-delivery/useAddFuelToCompartment';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';
import { FuelDeliveryTruck } from '@/hooks/useFuelDelivery';
import { cn } from '@/lib/utils';

interface AddFuelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truck: FuelDeliveryTruck | null;
  preselectedCompartmentId?: string;
  shopId: string;
}

export function AddFuelDialog({
  open,
  onOpenChange,
  truck,
  preselectedCompartmentId,
  shopId
}: AddFuelDialogProps) {
  const { data: compartments = [] } = useTruckCompartments(truck?.id);
  const addFuel = useAddFuelToCompartment();
  const { formatVolume, getUnitLabel, getPriceLabel, convertFromGallons } = useFuelUnits();

  const [selectedCompartmentId, setSelectedCompartmentId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [vendor, setVendor] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [fillDate, setFillDate] = useState(new Date().toISOString().slice(0, 16));

  // Reset form when dialog opens/closes or truck changes
  useEffect(() => {
    if (open) {
      setSelectedCompartmentId(preselectedCompartmentId || null);
      setAmount('');
      setPricePerUnit('');
      setVendor('');
      setReceiptNumber('');
      setNotes('');
      setFillDate(new Date().toISOString().slice(0, 16));
    }
  }, [open, preselectedCompartmentId]);

  const selectedCompartment = compartments.find(c => c.id === selectedCompartmentId);
  
  const calculateTotalCost = () => {
    const amountNum = parseFloat(amount) || 0;
    const priceNum = parseFloat(pricePerUnit) || 0;
    return amountNum * priceNum;
  };

  const calculateRemainingCapacity = (comp: TruckCompartment) => {
    return comp.capacity_gallons - comp.current_level_gallons;
  };

  const getPercentage = (comp: TruckCompartment) => {
    if (!comp.capacity_gallons) return 0;
    return Math.round((comp.current_level_gallons / comp.capacity_gallons) * 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompartmentId || !truck?.id || !amount) return;

    await addFuel.mutateAsync({
      compartmentId: selectedCompartmentId,
      truckId: truck.id,
      shopId,
      amountToAdd: parseFloat(amount),
      pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : undefined,
      vendor: vendor || undefined,
      receiptNumber: receiptNumber || undefined,
      notes: notes || undefined,
      fillDate: new Date(fillDate)
    });

    onOpenChange(false);
  };

  if (!truck) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-primary" />
            Add Fuel to Truck
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <TruckIcon className="h-4 w-4" />
            {truck.truck_number} - {truck.make} {truck.model}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Compartment Selection */}
          <div className="space-y-2">
            <Label>Select Tank/Compartment *</Label>
            <div className="grid grid-cols-1 gap-2">
              {compartments.map((comp) => {
                const percentage = getPercentage(comp);
                const remainingCapacity = calculateRemainingCapacity(comp);
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {comp.compartment_name || `Tank ${comp.compartment_number}`}
                        </span>
                        {comp.product && (
                          <Badge variant="secondary" className="text-xs">
                            {comp.product.product_code}
                          </Badge>
                        )}
                      </div>
                      <Badge variant={percentage < 30 ? "destructive" : percentage < 70 ? "secondary" : "default"}>
                        {percentage}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Current: {formatVolume(comp.current_level_gallons, 0)}</span>
                      <span>Room for: {formatVolume(remainingCapacity, 0)}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
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

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Add ({getUnitLabel()}) *</Label>
            <div className="relative">
              <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter amount in ${getUnitLabel()}`}
                className="pl-10"
                required
              />
            </div>
            {selectedCompartment && amount && (
              <p className="text-xs text-muted-foreground">
                New level will be: {formatVolume(
                  selectedCompartment.current_level_gallons + parseFloat(amount || '0'),
                  0
                )} / {formatVolume(selectedCompartment.capacity_gallons, 0)}
              </p>
            )}
          </div>

          {/* Price Per Unit */}
          <div className="space-y-2">
            <Label htmlFor="price">Price {getPriceLabel()}</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                step="0.001"
                min="0"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                placeholder="e.g., 3.459"
                className="pl-10"
              />
            </div>
            {amount && pricePerUnit && (
              <p className="text-sm font-medium text-primary">
                Total Cost: ${calculateTotalCost().toFixed(2)}
              </p>
            )}
          </div>

          {/* Vendor & Receipt */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor/Supplier</Label>
              <Input
                id="vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g., Shell"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt">Receipt #</Label>
              <div className="relative">
                <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="receipt"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="Optional"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Fill Date */}
          <div className="space-y-2">
            <Label htmlFor="fillDate">Fill Date & Time</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fillDate"
                type="datetime-local"
                value={fillDate}
                onChange={(e) => setFillDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this fill..."
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2">
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
            >
              {addFuel.isPending ? 'Adding Fuel...' : 'Record Fill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
