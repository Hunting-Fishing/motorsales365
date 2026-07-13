import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { History, Wrench } from 'lucide-react';
import { EquipmentAuditTrail } from './EquipmentAuditTrail';
import { MaintenanceIntervalsConfig } from './MaintenanceIntervalsConfig';

interface EquipmentDialogProps {
  open: boolean;
  onClose: () => void;
  equipment?: any;
}

export function EquipmentDialog({ open, onClose, equipment }: EquipmentDialogProps) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    equipment_type: '',
    asset_number: '',
    unit_number: '',
    name: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    year: '',
    location: '',
    status: 'operational',
    current_hours: '',
    current_mileage: '',
    notes: '',
  });
  const [maintenanceIntervals, setMaintenanceIntervals] = useState<any[]>([]);

  useEffect(() => {
    if (equipment) {
      setFormData({
        equipment_type: equipment.equipment_type || '',
        asset_number: equipment.asset_number || '',
        unit_number: equipment.unit_number || '',
        name: equipment.name || '',
        manufacturer: equipment.manufacturer || '',
        model: equipment.model || '',
        serial_number: equipment.serial_number || '',
        year: equipment.year?.toString() || '',
        location: equipment.location || '',
        status: equipment.status || 'operational',
        current_hours: equipment.current_hours?.toString() || '',
        current_mileage: equipment.current_mileage?.toString() || '',
        notes: equipment.notes || '',
      });
      setMaintenanceIntervals(equipment.maintenance_intervals || []);
    } else {
      setFormData({
        equipment_type: '',
        asset_number: '',
        unit_number: '',
        name: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        year: '',
        location: '',
        status: 'operational',
        current_hours: '',
        current_mileage: '',
        notes: '',
      });
      setMaintenanceIntervals([]);
    }
  }, [equipment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shopId) {
      toast({ 
        title: 'Error', 
        description: 'Shop ID not found. Please log out and log back in.', 
        variant: 'destructive' 
      });
      return;
    }

    setSaving(true);

    try {
      console.log('Starting equipment save...', { equipment: equipment?.id, formData });
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error('Authentication error:', userError);
        throw new Error('You must be logged in to save equipment');
      }

      const payload = {
        shop_id: shopId,
        equipment_type: formData.equipment_type as any,
        asset_number: formData.asset_number,
        unit_number: formData.unit_number || null,
        name: formData.name,
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        year: formData.year ? parseInt(formData.year) : null,
        location: formData.location || null,
        status: formData.status as any,
        current_hours: formData.current_hours ? parseFloat(formData.current_hours) : 0,
        current_mileage: formData.current_mileage ? parseFloat(formData.current_mileage) : 0,
        maintenance_intervals: maintenanceIntervals,
        notes: formData.notes || null,
        created_by: userData.user.id,
      };
      
      console.log('Payload:', payload);

      if (equipment) {
        const { error } = await supabase
          .from('equipment_assets')
          .update(payload)
          .eq('id', equipment.id);

        if (error) {
          console.error('Update error:', error);
          throw new Error(`Failed to update: ${error.message}`);
        }

        toast({ title: 'Success', description: 'Equipment updated successfully' });
      } else {
        const { error } = await supabase
          .from('equipment_assets')
          .insert([payload]);

        if (error) {
          console.error('Insert error:', error);
          throw new Error(`Failed to create: ${error.message}`);
        }

        toast({ title: 'Success', description: 'Equipment added successfully' });
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving equipment:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Failed to Save Equipment',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {equipment ? 'Edit Equipment' : 'Add New Equipment'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="maintenance">
              <Wrench className="h-4 w-4 mr-2" />
              Maintenance
            </TabsTrigger>
            {equipment && (
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details">
            <form onSubmit={handleSubmit} className="space-y-4 pt-4" id="equipment-form">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="equipment_type">Equipment Type *</Label>
                  <Select
                    value={formData.equipment_type}
                    onValueChange={(value) => setFormData({ ...formData, equipment_type: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diagnostic">Diagnostic Equipment</SelectItem>
                      <SelectItem value="lifting">Lifting Equipment</SelectItem>
                      <SelectItem value="air_tools">Air Tools</SelectItem>
                      <SelectItem value="hand_tools">Hand Tools</SelectItem>
                      <SelectItem value="electrical">Electrical Equipment</SelectItem>
                      <SelectItem value="generator">Generator</SelectItem>
                      <SelectItem value="forklift">Forklift</SelectItem>
                      <SelectItem value="excavator">Excavator</SelectItem>
                      <SelectItem value="loader">Loader</SelectItem>
                      <SelectItem value="dozer">Dozer</SelectItem>
                      <SelectItem value="crane">Crane</SelectItem>
                      <SelectItem value="heavy_truck">Heavy Truck</SelectItem>
                      <SelectItem value="vessel">Vessel</SelectItem>
                      <SelectItem value="outboard">Outboard Motor</SelectItem>
                      <SelectItem value="marine">Marine</SelectItem>
                      <SelectItem value="semi">Semi</SelectItem>
                      <SelectItem value="small_engine">Small Engine</SelectItem>
                      <SelectItem value="fleet_vehicle">Fleet Vehicle</SelectItem>
                      <SelectItem value="courtesy_car">Courtesy Car</SelectItem>
                      <SelectItem value="rental_vehicle">Rental Vehicle</SelectItem>
                      <SelectItem value="service_vehicle">Service Vehicle</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asset_number">Asset Number *</Label>
                  <Input
                    id="asset_number"
                    value={formData.asset_number}
                    onChange={(e) => setFormData({ ...formData, asset_number: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_number">Unit #</Label>
                  <Input
                    id="unit_number"
                    value={formData.unit_number}
                    onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                    placeholder="e.g., UNIT-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Equipment Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="down">Down</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_hours">Current Hours</Label>
                  <Input
                    id="current_hours"
                    type="number"
                    step="0.01"
                    value={formData.current_hours}
                    onChange={(e) => setFormData({ ...formData, current_hours: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_mileage">Current Mileage</Label>
                  <Input
                    id="current_mileage"
                    type="number"
                    step="0.01"
                    value={formData.current_mileage}
                    onChange={(e) => setFormData({ ...formData, current_mileage: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : equipment ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="maintenance" className="pt-4">
            <MaintenanceIntervalsConfig
              equipmentType={formData.equipment_type}
              intervals={maintenanceIntervals}
              onChange={setMaintenanceIntervals}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" form="equipment-form" disabled={saving}>
                {saving ? 'Saving...' : equipment ? 'Update' : 'Create'}
              </Button>
            </div>
          </TabsContent>

          {equipment && (
            <TabsContent value="history">
              <EquipmentAuditTrail entityType="equipment_assets" entityId={equipment.id} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
