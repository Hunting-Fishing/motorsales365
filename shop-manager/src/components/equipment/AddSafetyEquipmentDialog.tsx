import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { ShieldCheck } from 'lucide-react';

interface AddSafetyEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  parentEquipmentId?: string; // Link safety equipment to parent equipment
}

const SAFETY_EQUIPMENT_TYPES = [
  { value: 'fire_extinguisher', label: 'Fire Extinguisher' },
  { value: 'life_raft', label: 'Life Raft' },
  { value: 'life_ring', label: 'Life Ring' },
  { value: 'epirb', label: 'EPIRB (Emergency Position Indicating Radio Beacon)' },
  { value: 'survival_suit', label: 'Survival Suit' },
  { value: 'flare', label: 'Flare' },
  { value: 'first_aid_kit', label: 'First Aid Kit' },
  { value: 'safety_harness', label: 'Safety Harness' },
  { value: 'life_jacket', label: 'Life Jacket / PFD' },
  { value: 'immersion_suit', label: 'Immersion Suit' },
];

const STATUS_OPTIONS = [
  { value: 'operational', label: 'Operational' },
  { value: 'maintenance', label: 'Needs Maintenance / Inspection Due' },
  { value: 'down', label: 'Out of Service / Expired' },
  { value: 'retired', label: 'Retired' },
];

export function AddSafetyEquipmentDialog({ open, onOpenChange, onSuccess, parentEquipmentId }: AddSafetyEquipmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    equipment_type: '',
    name: '',
    serial_number: '',
    location: '',
    inspection_date: '',
    expiry_date: '',
    status: 'operational',
    quantity: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.equipment_type || !formData.name || !formData.location) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in equipment type, name, and location',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get shop_id from profiles - handle both patterns
      let shop_id = user.id;
      try {
        const result = await supabase
          .from('profiles')
          .select('shop_id')
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();
        
        if (result.data?.shop_id) {
          shop_id = result.data.shop_id;
        }
      } catch (e) {
        console.error('Error fetching shop_id:', e);
        // Use user.id as fallback
      }

      const insertData = {
        equipment_type: formData.equipment_type as any, // Cast to match DB enum type
        name: formData.name,
        asset_number: `SAFE-${Date.now()}`,
        serial_number: formData.serial_number || null,
        location: formData.location,
        status: formData.status as any, // Cast to match status enum
        notes: formData.notes || null,
        shop_id: shop_id,
        created_by: user.id,
        parent_equipment_id: parentEquipmentId || null,
        specifications: {
          inspection_date: formData.inspection_date || null,
          expiry_date: formData.expiry_date || null,
          quantity: formData.quantity ? parseInt(formData.quantity) : 1,
        } as any, // Cast to match Json type
      };

      const { error } = await supabase
        .from('equipment_assets')
        .insert([insertData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Safety equipment added successfully',
      });

      // Reset form
      setFormData({
        equipment_type: '',
        name: '',
        serial_number: '',
        location: '',
        inspection_date: '',
        expiry_date: '',
        status: 'operational',
        quantity: '',
        notes: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding safety equipment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add safety equipment',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Add Safety Equipment
          </DialogTitle>
          <DialogDescription>
            Record fire extinguishers, life rafts, EPIRBs, and other safety equipment for tracking and compliance
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="equipment_type">Equipment Type *</Label>
              <Select
                value={formData.equipment_type}
                onValueChange={(value) => setFormData({ ...formData, equipment_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SAFETY_EQUIPMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Equipment Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., ABC Fire Extinguisher"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="Serial or ID number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Engine Room, Bridge"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspection_date">Last Inspection Date</Label>
              <Input
                id="inspection_date"
                type="date"
                value={formData.inspection_date}
                onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry/Next Inspection Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional information, certification details, etc."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Safety Equipment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
