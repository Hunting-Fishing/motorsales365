import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Engine, ENGINE_TYPES, FUEL_TYPES, COOLING_SYSTEMS } from '@/types/engine';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface AddEngineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engine?: Engine | null;
  onSuccess: () => void;
}

export function AddEngineDialog({ open, onOpenChange, engine, onSuccess }: AddEngineDialogProps) {
  const [formData, setFormData] = useState({
    manufacturer: '',
    model: '',
    engine_type: '',
    horsepower: '',
    displacement: '',
    cylinders: '',
    fuel_type: '',
    cooling_system: '',
    year_introduced: '',
    year_discontinued: '',
    notes: '',
  });
  const [applications, setApplications] = useState<string[]>([]);
  const [newApplication, setNewApplication] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (engine) {
      setFormData({
        manufacturer: engine.manufacturer || '',
        model: engine.model || '',
        engine_type: engine.engine_type || '',
        horsepower: engine.horsepower?.toString() || '',
        displacement: engine.displacement || '',
        cylinders: engine.cylinders?.toString() || '',
        fuel_type: engine.fuel_type || '',
        cooling_system: engine.cooling_system || '',
        year_introduced: engine.year_introduced?.toString() || '',
        year_discontinued: engine.year_discontinued?.toString() || '',
        notes: engine.notes || '',
      });
      setApplications(engine.common_applications || []);
    } else {
      resetForm();
    }
  }, [engine, open]);

  const resetForm = () => {
    setFormData({
      manufacturer: '',
      model: '',
      engine_type: '',
      horsepower: '',
      displacement: '',
      cylinders: '',
      fuel_type: '',
      cooling_system: '',
      year_introduced: '',
      year_discontinued: '',
      notes: '',
    });
    setApplications([]);
    setNewApplication('');
  };

  const handleAddApplication = () => {
    if (newApplication.trim() && !applications.includes(newApplication.trim())) {
      setApplications([...applications, newApplication.trim()]);
      setNewApplication('');
    }
  };

  const handleRemoveApplication = (app: string) => {
    setApplications(applications.filter(a => a !== app));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.manufacturer || !formData.model) {
      toast.error('Manufacturer and model are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const engineData = {
        manufacturer: formData.manufacturer,
        model: formData.model,
        engine_type: formData.engine_type || null,
        horsepower: formData.horsepower ? parseInt(formData.horsepower) : null,
        displacement: formData.displacement || null,
        cylinders: formData.cylinders ? parseInt(formData.cylinders) : null,
        fuel_type: formData.fuel_type || null,
        cooling_system: formData.cooling_system || null,
        year_introduced: formData.year_introduced ? parseInt(formData.year_introduced) : null,
        year_discontinued: formData.year_discontinued ? parseInt(formData.year_discontinued) : null,
        common_applications: applications.length > 0 ? applications : null,
        notes: formData.notes || null,
      };

      if (engine) {
        const { error } = await supabase
          .from('engines')
          .update(engineData)
          .eq('id', engine.id);

        if (error) throw error;
        toast.success('Engine updated successfully');
      } else {
        const { error } = await supabase
          .from('engines')
          .insert([engineData]);

        if (error) throw error;
        toast.success('Engine added successfully');
      }

      onSuccess();
      resetForm();
    } catch (error) {
      console.error('Error saving engine:', error);
      toast.error('Failed to save engine');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{engine ? 'Edit Engine' : 'Add New Engine'}</DialogTitle>
          <DialogDescription>
            Add engine specifications to your database for easy reference across equipment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer *</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g., Caterpillar, Cummins, Yanmar"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., C7, 6BT5.9, 4JH5E"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="engine_type">Engine Type</Label>
              <Select
                value={formData.engine_type}
                onValueChange={(value) => setFormData({ ...formData, engine_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ENGINE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel_type">Fuel Type</Label>
              <Select
                value={formData.fuel_type}
                onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horsepower">Horsepower</Label>
              <Input
                id="horsepower"
                type="number"
                value={formData.horsepower}
                onChange={(e) => setFormData({ ...formData, horsepower: e.target.value })}
                placeholder="e.g., 250"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cylinders">Cylinders</Label>
              <Input
                id="cylinders"
                type="number"
                value={formData.cylinders}
                onChange={(e) => setFormData({ ...formData, cylinders: e.target.value })}
                placeholder="e.g., 6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displacement">Displacement</Label>
              <Input
                id="displacement"
                value={formData.displacement}
                onChange={(e) => setFormData({ ...formData, displacement: e.target.value })}
                placeholder="e.g., 7.2L or 440 cu in"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooling_system">Cooling System</Label>
              <Select
                value={formData.cooling_system}
                onValueChange={(value) => setFormData({ ...formData, cooling_system: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cooling" />
                </SelectTrigger>
                <SelectContent>
                  {COOLING_SYSTEMS.map((system) => (
                    <SelectItem key={system} value={system}>
                      {system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year_introduced">Year Introduced</Label>
              <Input
                id="year_introduced"
                type="number"
                value={formData.year_introduced}
                onChange={(e) => setFormData({ ...formData, year_introduced: e.target.value })}
                placeholder="e.g., 2005"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year_discontinued">Year Discontinued</Label>
              <Input
                id="year_discontinued"
                type="number"
                value={formData.year_discontinued}
                onChange={(e) => setFormData({ ...formData, year_discontinued: e.target.value })}
                placeholder="e.g., 2018"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Common Applications</Label>
            <div className="flex gap-2">
              <Input
                value={newApplication}
                onChange={(e) => setNewApplication(e.target.value)}
                placeholder="e.g., Marine, Generator, Forklift"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddApplication();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddApplication}>
                Add
              </Button>
            </div>
            {applications.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {applications.map((app) => (
                  <Badge key={app} variant="secondary" className="gap-1">
                    {app}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveApplication(app)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes, specifications, or special considerations..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : engine ? 'Update Engine' : 'Add Engine'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
