import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Car, Wrench } from 'lucide-react';
import { addDays, addMonths } from 'date-fns';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
}

interface CreateVehicleScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const MAINTENANCE_TYPES = [
  { value: 'oil_change', label: 'Oil Change', defaultMileage: 5000 },
  { value: 'coolant_flush', label: 'Coolant Flush', defaultMileage: 30000 },
  { value: 'brake_inspection', label: 'Brake Inspection', defaultMileage: 15000 },
  { value: 'tire_rotation', label: 'Tire Rotation', defaultMileage: 7500 },
  { value: 'transmission_service', label: 'Transmission Service', defaultMileage: 50000 },
  { value: 'air_filter', label: 'Air Filter Replacement', defaultMileage: 15000 },
  { value: 'spark_plugs', label: 'Spark Plugs', defaultMileage: 30000 },
  { value: 'timing_belt', label: 'Timing Belt', defaultMileage: 60000 },
  { value: 'battery_check', label: 'Battery Check', defaultMileage: null },
  { value: 'custom', label: 'Custom Maintenance', defaultMileage: null },
];

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly (Every 3 months)' },
  { value: 'annual', label: 'Annual' },
];

export function CreateVehicleScheduleDialog({
  open,
  onOpenChange,
  onCreated
}: CreateVehicleScheduleDialogProps) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_id: '',
    maintenance_type: 'oil_change',
    custom_name: '',
    frequency: 'quarterly',
    use_mileage: true,
    mileage_interval: 5000,
    current_mileage: 0,
    next_due_date: addMonths(new Date(), 3).toISOString().split('T')[0],
  });

  useEffect(() => {
    if (open && shopId) {
      fetchVehicles();
    }
  }, [open, shopId]);

  useEffect(() => {
    // Auto-update mileage interval when maintenance type changes
    const maintenanceType = MAINTENANCE_TYPES.find(t => t.value === formData.maintenance_type);
    if (maintenanceType?.defaultMileage) {
      setFormData(prev => ({ ...prev, mileage_interval: maintenanceType.defaultMileage }));
    }
  }, [formData.maintenance_type]);

  useEffect(() => {
    // Update next due date based on frequency
    const today = new Date();
    let nextDate: Date;
    switch (formData.frequency) {
      case 'monthly':
        nextDate = addMonths(today, 1);
        break;
      case 'quarterly':
        nextDate = addMonths(today, 3);
        break;
      case 'annual':
        nextDate = addMonths(today, 12);
        break;
      default:
        nextDate = addMonths(today, 3);
    }
    setFormData(prev => ({ ...prev, next_due_date: nextDate.toISOString().split('T')[0] }));
  }, [formData.frequency]);

  const fetchVehicles = async () => {
    if (!shopId) return;
    setLoadingVehicles(true);
    try {
      const { data, error } = await (supabase
        .from('vehicles' as any)
        .select('id, make, model, year, license_plate')
        .eq('shop_id', shopId)
        .order('make') as any);

      if (error) throw error;
      setVehicles((data || []) as Vehicle[]);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setFormData(prev => ({
      ...prev,
      vehicle_id: vehicleId
    }));
  };

  const handleSubmit = async () => {
    if (!shopId || !formData.vehicle_id) return;

    setLoading(true);
    try {
      const maintenanceType = MAINTENANCE_TYPES.find(t => t.value === formData.maintenance_type);
      const scheduleName = formData.maintenance_type === 'custom' 
        ? formData.custom_name 
        : maintenanceType?.label || 'Vehicle Maintenance';

      const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);
      const vehicleLabel = selectedVehicle 
        ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` 
        : '';

      const { error } = await supabase
        .from('safety_schedules')
        .insert({
          shop_id: shopId,
          schedule_name: `${scheduleName} - ${vehicleLabel}`,
          schedule_type: 'vehicle_maintenance',
          frequency: formData.frequency,
          next_due_date: formData.next_due_date,
          vehicle_id: formData.vehicle_id,
          mileage_interval: formData.use_mileage ? formData.mileage_interval : null,
          last_mileage: formData.current_mileage,
          next_mileage: formData.use_mileage 
            ? formData.current_mileage + formData.mileage_interval 
            : null,
          is_enabled: true,
          reminder_days_before: 7
        });

      if (error) throw error;

      toast({
        title: 'Schedule Created',
        description: 'Vehicle maintenance schedule has been created.'
      });

      onOpenChange(false);
      onCreated?.();
      resetForm();
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create schedule',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      maintenance_type: 'oil_change',
      custom_name: '',
      frequency: 'quarterly',
      use_mileage: true,
      mileage_interval: 5000,
      current_mileage: 0,
      next_due_date: addMonths(new Date(), 3).toISOString().split('T')[0],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehicle Maintenance Schedule
          </DialogTitle>
          <DialogDescription>
            Create a maintenance schedule linked to a specific vehicle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Vehicle *</Label>
            <Select
              value={formData.vehicle_id}
              onValueChange={handleVehicleSelect}
              disabled={loadingVehicles}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingVehicles ? 'Loading...' : 'Select vehicle'} />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.license_plate})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Maintenance Type</Label>
            <Select
              value={formData.maintenance_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, maintenance_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.maintenance_type === 'custom' && (
            <div className="space-y-2">
              <Label>Custom Name *</Label>
              <Input
                value={formData.custom_name}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_name: e.target.value }))}
                placeholder="e.g., Cabin Air Filter"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Time-Based Frequency</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <Label>Mileage-Based Tracking</Label>
              <p className="text-sm text-muted-foreground">Track by miles in addition to time</p>
            </div>
            <Switch
              checked={formData.use_mileage}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_mileage: checked }))}
            />
          </div>

          {formData.use_mileage && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Mileage</Label>
                <Input
                  type="number"
                  value={formData.current_mileage}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_mileage: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Interval (miles)</Label>
                <Input
                  type="number"
                  value={formData.mileage_interval}
                  onChange={(e) => setFormData(prev => ({ ...prev, mileage_interval: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Next Due Date</Label>
            <Input
              type="date"
              value={formData.next_due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, next_due_date: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.vehicle_id || (formData.maintenance_type === 'custom' && !formData.custom_name)}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
