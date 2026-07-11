import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface AddTankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}

export function AddTankDialog({ open, onOpenChange, customerId }: AddTankDialogProps) {
  const queryClient = useQueryClient();
  const { getVolumeLabel, convertToGallons } = useWaterUnits();
  const [formData, setFormData] = useState({
    tank_name: '',
    tank_number: '',
    capacity_gallons: '',
    tank_type: 'standard',
    material: '',
    location_id: '',
    reorder_level_percent: '20',
    install_date: '',
    potable_certified: false,
    has_filtration: false,
    has_uv_treatment: false,
    notes: '',
  });

  // Fetch customer locations for dropdown
  const { data: locations } = useQuery({
    queryKey: ['water-delivery-customer-locations', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_delivery_locations')
        .select('id, location_name')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('location_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId && open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', profile.user?.id)
        .single();

      // Convert capacity to gallons for storage
      const capacityGallons = formData.capacity_gallons ? convertToGallons(parseFloat(formData.capacity_gallons)) : null;

      const { error } = await supabase.from('water_delivery_tanks').insert({
        customer_id: customerId,
        shop_id: userProfile?.shop_id,
        tank_name: formData.tank_name || null,
        tank_number: formData.tank_number || null,
        capacity_gallons: capacityGallons,
        tank_type: formData.tank_type,
        material: formData.material || null,
        location_id: formData.location_id || null,
        reorder_level_percent: formData.reorder_level_percent ? parseFloat(formData.reorder_level_percent) : 20,
        install_date: formData.install_date || null,
        potable_certified: formData.potable_certified,
        has_filtration: formData.has_filtration,
        has_uv_treatment: formData.has_uv_treatment,
        notes: formData.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-customer-tanks', customerId] });
      toast.success('Tank added successfully');
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Failed to add tank: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      tank_name: '',
      tank_number: '',
      capacity_gallons: '',
      tank_type: 'standard',
      material: '',
      location_id: '',
      reorder_level_percent: '20',
      install_date: '',
      potable_certified: false,
      has_filtration: false,
      has_uv_treatment: false,
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.capacity_gallons) {
      toast.error('Tank capacity is required');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Tank</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tank_name">Tank Name</Label>
              <Input
                id="tank_name"
                value={formData.tank_name}
                onChange={(e) => setFormData({ ...formData, tank_name: e.target.value })}
                placeholder="e.g., Main Storage Tank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tank_number">Tank Number</Label>
              <Input
                id="tank_number"
                value={formData.tank_number}
                onChange={(e) => setFormData({ ...formData, tank_number: e.target.value })}
                placeholder="e.g., T-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity_gallons">Capacity ({getVolumeLabel(false)}) *</Label>
              <Input
                id="capacity_gallons"
                type="number"
                value={formData.capacity_gallons}
                onChange={(e) => setFormData({ ...formData, capacity_gallons: e.target.value })}
                placeholder="e.g., 5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder_level">Reorder Level (%)</Label>
              <Input
                id="reorder_level"
                type="number"
                min="0"
                max="100"
                value={formData.reorder_level_percent}
                onChange={(e) => setFormData({ ...formData, reorder_level_percent: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tank_type">Tank Type</Label>
              <Select
                value={formData.tank_type}
                onValueChange={(value) => setFormData({ ...formData, tank_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="poly">Poly</SelectItem>
                  <SelectItem value="steel">Steel</SelectItem>
                  <SelectItem value="fiberglass">Fiberglass</SelectItem>
                  <SelectItem value="concrete">Concrete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Input
                id="material"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                placeholder="e.g., HDPE, Stainless Steel"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData({ ...formData, location_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="install_date">Install Date</Label>
              <Input
                id="install_date"
                type="date"
                value={formData.install_date}
                onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="potable_certified"
                checked={formData.potable_certified}
                onCheckedChange={(checked) => setFormData({ ...formData, potable_certified: checked })}
              />
              <Label htmlFor="potable_certified">Potable Certified</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="has_filtration"
                checked={formData.has_filtration}
                onCheckedChange={(checked) => setFormData({ ...formData, has_filtration: checked })}
              />
              <Label htmlFor="has_filtration">Has Filtration</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="has_uv_treatment"
                checked={formData.has_uv_treatment}
                onCheckedChange={(checked) => setFormData({ ...formData, has_uv_treatment: checked })}
              />
              <Label htmlFor="has_uv_treatment">Has UV Treatment</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes about this tank"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Tank
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
