import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useShopId } from '@/hooks/useShopId';
import { recordMaintenanceActivity } from '@/services/maintenance/maintenanceActivityService';

interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateScheduleDialog({ open, onOpenChange, onSuccess }: CreateScheduleDialogProps) {
  const { toast } = useToast();
  const { shopId } = useShopId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    maintenance_type: 'oil_change',
    asset_type: 'vehicle',
    vehicle_id: '',
    equipment_id: '',
    frequency_type: 'time_based',
    frequency_interval: 3,
    frequency_unit: 'months',
    mileage_interval: 0,
    hours_interval: 0,
    estimated_cost: 0,
    priority: 'medium',
  });

  // Fetch vehicles and equipment
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('id, year, make, model').order('year', { ascending: false });
      return data || [];
    }
  });

  const { data: equipment } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data } = await supabase.from('equipment_assets').select('id, name, equipment_type').order('name');
      return (data || []).map(item => ({
        ...item,
        category: item.equipment_type
      }));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Calculate next due date
      const nextDueDate = new Date();
      if (formData.frequency_unit === 'days') {
        nextDueDate.setDate(nextDueDate.getDate() + formData.frequency_interval);
      } else if (formData.frequency_unit === 'months') {
        nextDueDate.setMonth(nextDueDate.getMonth() + formData.frequency_interval);
      } else if (formData.frequency_unit === 'years') {
        nextDueDate.setFullYear(nextDueDate.getFullYear() + formData.frequency_interval);
      }

      const { data: newSchedule, error } = await supabase.from('maintenance_schedules').insert({
        title: formData.title,
        description: formData.description,
        maintenance_type: formData.maintenance_type,
        vehicle_id: formData.asset_type === 'vehicle' ? formData.vehicle_id : null,
        equipment_id: formData.asset_type === 'equipment' ? formData.equipment_id : null,
        frequency_type: formData.frequency_type,
        frequency_interval: formData.frequency_interval,
        frequency_unit: formData.frequency_unit,
        mileage_interval: formData.frequency_type === 'mileage_based' || formData.frequency_type === 'both' ? formData.mileage_interval : null,
        hours_interval: formData.frequency_type === 'hours_based' || formData.frequency_type === 'both' ? formData.hours_interval : null,
        next_due_date: nextDueDate.toISOString(),
        estimated_cost: formData.estimated_cost,
        priority: formData.priority,
        status: 'scheduled',
        created_by: user.user.id,
      }).select().single();

      if (error) throw error;

      // Record activity
      if (shopId && newSchedule) {
        await recordMaintenanceActivity(
          `Created maintenance schedule: ${formData.title}`,
          shopId,
          user.user.id,
          user.user.user_metadata?.full_name || user.user.email || 'Unknown User',
          newSchedule.id,
          formData.asset_type === 'vehicle' ? formData.vehicle_id : formData.equipment_id,
          {
            maintenance_type: formData.maintenance_type,
            frequency: `${formData.frequency_interval} ${formData.frequency_unit}`,
            priority: formData.priority,
          }
        );
      }

      toast({
        title: 'Schedule created',
        description: 'Maintenance schedule has been created successfully.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create maintenance schedule.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Maintenance Schedule</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Schedule Name *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Oil Change - Fleet Truck 1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance_type">Maintenance Type *</Label>
              <Select
                value={formData.maintenance_type}
                onValueChange={(value) => setFormData({ ...formData, maintenance_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oil_change">Oil Change</SelectItem>
                  <SelectItem value="tire_rotation">Tire Rotation</SelectItem>
                  <SelectItem value="brake_service">Brake Service</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="filter_replacement">Filter Replacement</SelectItem>
                  <SelectItem value="fluid_check">Fluid Check</SelectItem>
                  <SelectItem value="tune_up">Tune-Up</SelectItem>
                  <SelectItem value="custom">Custom Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about this maintenance..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset_type">Asset Type *</Label>
              <Select
                value={formData.asset_type}
                onValueChange={(value) => setFormData({ ...formData, asset_type: value as 'vehicle' | 'equipment' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset">Select Asset *</Label>
              {formData.asset_type === 'vehicle' ? (
                <Select
                  value={formData.vehicle_id}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles?.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={formData.equipment_id}
                  onValueChange={(value) => setFormData({ ...formData, equipment_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Scheduling Interval</h3>
            
            <div className="space-y-2 mb-4">
              <Label>Interval Type *</Label>
              <Select
                value={formData.frequency_type}
                onValueChange={(value) => setFormData({ ...formData, frequency_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_based">Time-Based Only</SelectItem>
                  <SelectItem value="mileage_based">Mileage-Based Only</SelectItem>
                  <SelectItem value="hours_based">Operating Hours-Based Only</SelectItem>
                  <SelectItem value="both">Combined (Whichever Comes First)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.frequency_type === 'time_based' || formData.frequency_type === 'both') && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency_interval">Every *</Label>
                  <Input
                    id="frequency_interval"
                    type="number"
                    min="1"
                    value={formData.frequency_interval}
                    onChange={(e) => setFormData({ ...formData, frequency_interval: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency_unit">Unit *</Label>
                  <Select
                    value={formData.frequency_unit}
                    onValueChange={(value) => setFormData({ ...formData, frequency_unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {(formData.frequency_type === 'mileage_based' || formData.frequency_type === 'both') && (
              <div className="space-y-2 mb-4">
                <Label htmlFor="mileage_interval">Mileage Interval *</Label>
                <Input
                  id="mileage_interval"
                  type="number"
                  min="0"
                  value={formData.mileage_interval}
                  onChange={(e) => setFormData({ ...formData, mileage_interval: parseInt(e.target.value) })}
                  placeholder="e.g., 5000 miles"
                  required
                />
                <p className="text-xs text-muted-foreground">Service every X miles/kilometers</p>
              </div>
            )}

            {(formData.frequency_type === 'hours_based' || formData.frequency_type === 'both') && (
              <div className="space-y-2">
                <Label htmlFor="hours_interval">Operating Hours Interval *</Label>
                <Input
                  id="hours_interval"
                  type="number"
                  min="0"
                  value={formData.hours_interval}
                  onChange={(e) => setFormData({ ...formData, hours_interval: parseInt(e.target.value) })}
                  placeholder="e.g., 250 hours"
                  required
                />
                <p className="text-xs text-muted-foreground">Service every X operating hours</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_cost">Estimated Cost ($)</Label>
              <Input
                id="estimated_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
