import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Droplets } from 'lucide-react';
import { useCreateWaterTruckTank, useNextTankNumber } from '@/hooks/water-delivery/useWaterTruckTanks';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';
import { useShopId } from '@/hooks/useShopId';

interface AddWaterTruckTankDialogProps {
  truckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TANK_MATERIALS = [
  { value: 'stainless_steel', label: 'Stainless Steel' },
  { value: 'aluminum', label: 'Aluminum' },
  { value: 'fiberglass', label: 'Fiberglass' },
  { value: 'food_grade_plastic', label: 'Food-Grade Plastic' },
  { value: 'carbon_steel', label: 'Carbon Steel' },
  { value: 'poly', label: 'Polyethylene' },
];

export function AddWaterTruckTankDialog({ truckId, open, onOpenChange }: AddWaterTruckTankDialogProps) {
  const createTank = useCreateWaterTruckTank();
  const { shopId } = useShopId();
  const { getVolumeLabel, convertToGallons } = useWaterUnits();
  const { data: nextTankNumber } = useNextTankNumber(truckId);
  
  const [formData, setFormData] = useState({
    tank_name: '',
    capacity: '',
    current_level: '',
    material: 'stainless_steel',
    is_potable_certified: true,
    last_sanitized_date: '',
    next_sanitization_due: '',
    notes: '',
  });

  useEffect(() => {
    if (open && nextTankNumber) {
      setFormData(prev => ({
        ...prev,
        tank_name: `Tank ${nextTankNumber}`,
      }));
    }
  }, [open, nextTankNumber]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!shopId || !formData.capacity) return;

    const capacityInGallons = convertToGallons(parseFloat(formData.capacity));
    const currentLevelInGallons = formData.current_level 
      ? convertToGallons(parseFloat(formData.current_level)) 
      : 0;

    await createTank.mutateAsync({
      shop_id: shopId,
      truck_id: truckId,
      tank_number: nextTankNumber || 1,
      tank_name: formData.tank_name || null,
      capacity_gallons: capacityInGallons,
      current_level_gallons: currentLevelInGallons,
      material: formData.material || null,
      is_potable_certified: formData.is_potable_certified,
      last_sanitized_date: formData.last_sanitized_date || null,
      next_sanitization_due: formData.next_sanitization_due || null,
      last_fill_date: null,
      last_fill_source: null,
      notes: formData.notes || null,
      is_active: true,
    });

    // Reset form
    setFormData({
      tank_name: '',
      capacity: '',
      current_level: '',
      material: 'stainless_steel',
      is_potable_certified: true,
      last_sanitized_date: '',
      next_sanitization_due: '',
      notes: '',
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-cyan-600" />
            Add Tank
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tank Name</Label>
              <Input
                value={formData.tank_name}
                onChange={(e) => handleChange('tank_name', e.target.value)}
                placeholder="Tank 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Capacity ({getVolumeLabel()}) *</Label>
              <Input
                type="number"
                value={formData.capacity}
                onChange={(e) => handleChange('capacity', e.target.value)}
                placeholder="1500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Level ({getVolumeLabel()})</Label>
              <Input
                type="number"
                value={formData.current_level}
                onChange={(e) => handleChange('current_level', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Material</Label>
              <Select value={formData.material} onValueChange={(v) => handleChange('material', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TANK_MATERIALS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={formData.is_potable_certified}
              onCheckedChange={(v) => handleChange('is_potable_certified', v)}
              id="potable-tank"
            />
            <Label htmlFor="potable-tank" className="cursor-pointer">
              Potable Water Certified
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Last Sanitized</Label>
              <Input
                type="date"
                value={formData.last_sanitized_date}
                onChange={(e) => handleChange('last_sanitized_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Next Sanitization Due</Label>
              <Input
                type="date"
                value={formData.next_sanitization_due}
                onChange={(e) => handleChange('next_sanitization_due', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about this tank..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTank.isPending || !formData.capacity}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {createTank.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Tank
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
