import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FuelEntryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FuelFormData) => void;
}

interface FuelFormData {
  fuel_type: string;
  quantity_gallons: number;
  cost_per_gallon: number;
  total_cost: number;
  odometer_reading?: number;
  engine_hours?: number;
  location?: string;
  notes?: string;
  entry_date: string;
}

export function FuelEntryForm({ open, onClose, onSubmit }: FuelEntryFormProps) {
  const [formData, setFormData] = useState<FuelFormData>({
    fuel_type: 'diesel',
    quantity_gallons: 0,
    cost_per_gallon: 0,
    total_cost: 0,
    entry_date: new Date().toISOString().split('T')[0],
  });

  const updateField = (field: keyof FuelFormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate total cost
      if (field === 'quantity_gallons' || field === 'cost_per_gallon') {
        const gallons = field === 'quantity_gallons' ? value : prev.quantity_gallons;
        const costPerGallon = field === 'cost_per_gallon' ? value : prev.cost_per_gallon;
        updated.total_cost = gallons * costPerGallon;
      }
      
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      fuel_type: 'diesel',
      quantity_gallons: 0,
      cost_per_gallon: 0,
      total_cost: 0,
      entry_date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Fuel Entry</DialogTitle>
          <DialogDescription>
            Record a new fuel purchase or fill-up
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fuel_type">Fuel Type</Label>
              <Select
                value={formData.fuel_type}
                onValueChange={(value) => updateField('fuel_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="gasoline">Gasoline</SelectItem>
                  <SelectItem value="marine_diesel">Marine Diesel</SelectItem>
                  <SelectItem value="propane">Propane</SelectItem>
                  <SelectItem value="oil">Oil/Lubricant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="entry_date">Date</Label>
              <Input
                id="entry_date"
                type="date"
                value={formData.entry_date}
                onChange={(e) => updateField('entry_date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity_gallons">Quantity (gallons)</Label>
              <Input
                id="quantity_gallons"
                type="number"
                step="0.01"
                value={formData.quantity_gallons || ''}
                onChange={(e) => updateField('quantity_gallons', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="cost_per_gallon">Cost per Gallon</Label>
              <Input
                id="cost_per_gallon"
                type="number"
                step="0.01"
                value={formData.cost_per_gallon || ''}
                onChange={(e) => updateField('cost_per_gallon', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="total_cost">Total Cost</Label>
            <Input
              id="total_cost"
              type="number"
              step="0.01"
              value={formData.total_cost.toFixed(2)}
              onChange={(e) => updateField('total_cost', parseFloat(e.target.value) || 0)}
              className="bg-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="odometer_reading">Odometer (optional)</Label>
              <Input
                id="odometer_reading"
                type="number"
                value={formData.odometer_reading || ''}
                onChange={(e) => updateField('odometer_reading', parseInt(e.target.value) || undefined)}
                placeholder="Miles"
              />
            </div>
            <div>
              <Label htmlFor="engine_hours">Engine Hours (optional)</Label>
              <Input
                id="engine_hours"
                type="number"
                step="0.1"
                value={formData.engine_hours || ''}
                onChange={(e) => updateField('engine_hours', parseFloat(e.target.value) || undefined)}
                placeholder="Hours"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              value={formData.location || ''}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Station or location"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
