import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { recordMaintenanceActivity } from '@/services/maintenance/maintenanceActivityService';
import { saveScheduleVersion } from '@/services/maintenance/versionService';

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  schedule: any;
}

export function EditScheduleDialog({ open, onOpenChange, onSuccess, schedule }: EditScheduleDialogProps) {
  const { toast } = useToast();
  const { shopId } = useShopId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    maintenance_type: '',
    frequency_interval: 0,
    frequency_unit: '',
    estimated_cost: 0,
    priority: '',
    status: '',
  });

  useEffect(() => {
    if (schedule) {
      setFormData({
        title: schedule.title || '',
        description: schedule.description || '',
        maintenance_type: schedule.maintenance_type || '',
        frequency_interval: schedule.frequency_interval || 0,
        frequency_unit: schedule.frequency_unit || '',
        estimated_cost: schedule.estimated_cost || 0,
        priority: schedule.priority || '',
        status: schedule.status || '',
      });
    }
  }, [schedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Save current version before updating
      await saveScheduleVersion(
        schedule.id,
        schedule,
        user.user.id,
        user.user.user_metadata?.full_name || user.user.email || 'Unknown User',
        'Manual update'
      );

      // Track changes for activity log
      const changes: string[] = [];
      if (formData.title !== schedule.title) changes.push('title');
      if (formData.description !== schedule.description) changes.push('description');
      if (formData.maintenance_type !== schedule.maintenance_type) changes.push('type');
      if (formData.priority !== schedule.priority) changes.push('priority');
      if (formData.status !== schedule.status) changes.push('status');

      const { error } = await supabase
        .from('maintenance_schedules')
        .update({
          title: formData.title,
          description: formData.description,
          maintenance_type: formData.maintenance_type,
          frequency_interval: formData.frequency_interval,
          frequency_unit: formData.frequency_unit,
          estimated_cost: formData.estimated_cost,
          priority: formData.priority,
          status: formData.status,
        })
        .eq('id', schedule.id);

      if (error) throw error;

      // Record activity
      if (shopId) {
        await recordMaintenanceActivity(
          `Updated maintenance schedule: ${formData.title}`,
          shopId,
          user.user.id,
          user.user.user_metadata?.full_name || user.user.email || 'Unknown User',
          schedule.id,
          schedule.vehicle_id || schedule.equipment_id,
          {
            changes: changes,
            previous_status: schedule.status,
            new_status: formData.status,
          }
        );
      }

      toast({
        title: 'Schedule updated',
        description: 'Maintenance schedule has been updated successfully.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update maintenance schedule.',
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
          <DialogTitle>Edit Maintenance Schedule</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Schedule Name *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency_interval">Frequency Interval</Label>
              <Input
                id="frequency_interval"
                type="number"
                min="1"
                value={formData.frequency_interval}
                onChange={(e) => setFormData({ ...formData, frequency_interval: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency_unit">Frequency Unit</Label>
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

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
