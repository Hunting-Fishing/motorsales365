import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Droplets } from 'lucide-react';
import { useUpdateWaterTruckTank, WaterTruckTank } from '@/hooks/water-delivery/useWaterTruckTanks';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface EditWaterTruckTankDialogProps {
  tank: WaterTruckTank;
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

export function EditWaterTruckTankDialog({ tank, open, onOpenChange }: EditWaterTruckTankDialogProps) {
  const updateTank = useUpdateWaterTruckTank();
  const { getVolumeLabel, convertToGallons, convertFromGallons } = useWaterUnits();
  
  const [formData, setFormData] = useState({
    tank_name: '',
    capacity: '',
    current_level: '',
    material: 'stainless_steel',
    is_potable_certified: true,
    last_sanitized_date: '',
    next_sanitization_due: '',
    last_fill_source: '',
    notes: '',
  });

  useEffect(() => {
    if (tank) {
      setFormData({
        tank_name: tank.tank_name || '',
        capacity: convertFromGallons(Number(tank.capacity_gallons)).toFixed(0),
        current_level: convertFromGallons(Number(tank.current_level_gallons)).toFixed(0),
        material: tank.material || 'stainless_steel',
        is_potable_certified: tank.is_potable_certified ?? true,
        last_sanitized_date: tank.last_sanitized_date || '',
        next_sanitization_due: tank.next_sanitization_due || '',
        last_fill_source: tank.last_fill_source || '',
        notes: tank.notes || '',
      });
    }
  }, [tank, convertFromGallons]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.capacity) return;

    const capacityInGallons = convertToGallons(parseFloat(formData.capacity));
    const currentLevelInGallons = formData.current_level 
      ? convertToGallons(parseFloat(formData.current_level)) 
      : 0;

    await updateTank.mutateAsync({
      id: tank.id,
      tank_name: formData.tank_name || null,
      capacity_gallons: capacityInGallons,
      current_level_gallons: currentLevelInGallons,
      material: formData.material || null,
      is_potable_certified: formData.is_potable_certified,
      last_sanitized_date: formData.last_sanitized_date || null,
      next_sanitization_due: formData.next_sanitization_due || null,
      last_fill_source: formData.last_fill_source || null,
      notes: formData.notes || null,
    });

    onOpenChange(false);
  };

  // Calculate fill percentage
  const capacity = formData.capacity ? parseFloat(formData.capacity) : 0;
  const currentLevel = formData.current_level ? parseFloat(formData.current_level) : 0;
  const fillPercentage = capacity > 0 ? Math.min((currentLevel / capacity) * 100, 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-cyan-600" />
            Edit Tank: {tank.tank_name || `Tank ${tank.tank_number}`}
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

          <div className="space-y-2">
            <Label>Current Level ({getVolumeLabel()})</Label>
            <Input
              type="number"
              value={formData.current_level}
              onChange={(e) => handleChange('current_level', e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Tank Level Visual */}
          {capacity > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tank Level</span>
                <span className="font-medium">{fillPercentage.toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all duration-300"
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>
          )}

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

          <div className="flex items-center gap-3">
            <Switch
              checked={formData.is_potable_certified}
              onCheckedChange={(v) => handleChange('is_potable_certified', v)}
              id="potable-tank-edit"
            />
            <Label htmlFor="potable-tank-edit" className="cursor-pointer">
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
            <Label>Last Fill Source</Label>
            <Input
              value={formData.last_fill_source}
              onChange={(e) => handleChange('last_fill_source', e.target.value)}
              placeholder="Municipal water, Well, etc."
            />
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
            disabled={updateTank.isPending || !formData.capacity}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {updateTank.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
