import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, History, Save } from 'lucide-react';
import { EquipmentHierarchySelector } from './EquipmentHierarchySelector';
import { useMaintenanceIntervalTracking } from '@/hooks/useMaintenanceIntervalTracking';

const MAINTENANCE_TYPES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'filter_replacement', label: 'Filter Replacement' },
  { value: 'belt_replacement', label: 'Belt Replacement' },
  { value: 'coolant_flush', label: 'Coolant Flush' },
  { value: 'impeller_replacement', label: 'Impeller Replacement' },
  { value: 'transmission_service', label: 'Transmission Service' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' }
];

export function PreviousMaintenanceEntry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  
  const { intervals, recordService } = useMaintenanceIntervalTracking(selectedEquipmentId);
  
  const [formData, setFormData] = useState({
    maintenance_type: '',
    service_date: '',
    hours_at_service: '',
    description: '',
    parts_used: '',
    cost: '',
    notes: '',
    update_interval: '' // ID of interval to update countdown
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      // Insert into maintenance_logs
      const { error } = await supabase
        .from('maintenance_logs')
        .insert({
          shop_id: profile?.shop_id,
          equipment_id: selectedEquipmentId,
          maintenance_type: formData.maintenance_type,
          description: formData.description || `Previous ${formData.maintenance_type} service`,
          parts_used: formData.parts_used,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          hours_reading: formData.hours_at_service ? parseFloat(formData.hours_at_service) : null,
          log_date: formData.service_date || new Date().toISOString(),
          notes: formData.notes,
          performed_by: user.id
        });

      if (error) throw error;

      // Update interval countdown if selected
      if (formData.update_interval && formData.hours_at_service) {
        await recordService.mutateAsync({
          intervalId: formData.update_interval,
          serviceHours: parseFloat(formData.hours_at_service),
          serviceDate: formData.service_date
        });
      }
    },
    onSuccess: () => {
      toast({
        title: 'Previous Maintenance Recorded',
        description: 'The historical maintenance data has been saved.'
      });
      setFormData({
        maintenance_type: '',
        service_date: '',
        hours_at_service: '',
        description: '',
        parts_used: '',
        cost: '',
        notes: '',
        update_interval: ''
      });
      queryClient.invalidateQueries({ queryKey: ['recent-maintenance-logs'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-intervals'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save maintenance record',
        variant: 'destructive'
      });
    }
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Enter Previous Maintenance
        </CardTitle>
        <CardDescription>
          Record historical maintenance data to set up accurate countdown tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <EquipmentHierarchySelector
          selectedParentId={selectedParentId}
          selectedEquipmentId={selectedEquipmentId}
          onParentChange={setSelectedParentId}
          onEquipmentChange={(id) => setSelectedEquipmentId(id)}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Maintenance Type</Label>
            <Select 
              value={formData.maintenance_type} 
              onValueChange={(v) => handleChange('maintenance_type', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Service Date</Label>
            <Input
              type="date"
              value={formData.service_date}
              onChange={(e) => handleChange('service_date', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Hours at Service</Label>
            <Input
              type="number"
              placeholder="Engine hours when serviced"
              value={formData.hours_at_service}
              onChange={(e) => handleChange('hours_at_service', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Cost ($)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={formData.cost}
              onChange={(e) => handleChange('cost', e.target.value)}
              step="0.01"
            />
          </div>
        </div>

        {/* Update Interval Countdown */}
        {intervals.length > 0 && (
          <div className="space-y-2">
            <Label>Update Countdown For (Optional)</Label>
            <Select 
              value={formData.update_interval} 
              onValueChange={(v) => handleChange('update_interval', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select interval to reset countdown" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Don't update countdown</SelectItem>
                {intervals.map(interval => (
                  <SelectItem key={interval.id} value={interval.id}>
                    {interval.interval_name} (every {interval.interval_hours} hrs)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This will reset the countdown timer based on the hours entered above
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            placeholder="Brief description of work performed"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Parts Used</Label>
          <Textarea
            placeholder="List parts used (e.g., 4L 15W-40 Oil, 1x Oil Filter)"
            value={formData.parts_used}
            onChange={(e) => handleChange('parts_used', e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Notes (Optional)</Label>
          <Textarea
            placeholder="Any additional notes..."
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
          />
        </div>

        <Button
          onClick={() => submitMutation.mutate()}
          disabled={!selectedEquipmentId || !formData.maintenance_type || submitMutation.isPending}
          className="w-full"
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Previous Maintenance
        </Button>
      </CardContent>
    </Card>
  );
}
