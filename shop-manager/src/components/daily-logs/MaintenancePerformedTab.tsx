import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Wrench, History } from 'lucide-react';
import { format } from 'date-fns';

const MAINTENANCE_TYPES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'filter_replacement', label: 'Filter Replacement' },
  { value: 'tire_rotation', label: 'Tire Rotation' },
  { value: 'brake_service', label: 'Brake Service' },
  { value: 'fluid_top_off', label: 'Fluid Top Off' },
  { value: 'belt_replacement', label: 'Belt Replacement' },
  { value: 'battery_replacement', label: 'Battery Replacement' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'tune_up', label: 'Tune Up' },
  { value: 'cleaning', label: 'Cleaning/Washing' },
  { value: 'lubrication', label: 'Lubrication' },
  { value: 'other', label: 'Other' }
];

export function MaintenancePerformedTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    equipment_id: '',
    maintenance_type: '',
    description: '',
    parts_used: '',
    labor_hours: '',
    cost: '',
    odometer_reading: '',
    hours_reading: '',
    notes: ''
  });

  // Fetch equipment list
  const { data: equipment } = useQuery({
    queryKey: ['equipment-for-maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, asset_number')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch recent maintenance logs
  const { data: recentMaintenance, isLoading: loadingMaintenance } = useQuery({
    queryKey: ['recent-maintenance-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select(`
          id,
          log_date,
          maintenance_type,
          description,
          parts_used,
          labor_hours,
          cost,
          equipment_id,
          equipment_assets (name, equipment_number)
        `)
        .order('log_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
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

      const { error } = await supabase
        .from('maintenance_logs')
        .insert({
          shop_id: profile?.shop_id,
          equipment_id: formData.equipment_id,
          maintenance_type: formData.maintenance_type,
          description: formData.description,
          parts_used: formData.parts_used,
          labor_hours: formData.labor_hours ? parseFloat(formData.labor_hours) : null,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          odometer_reading: formData.odometer_reading ? parseFloat(formData.odometer_reading) : null,
          hours_reading: formData.hours_reading ? parseFloat(formData.hours_reading) : null,
          notes: formData.notes,
          performed_by: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Maintenance Logged',
        description: 'The maintenance record has been saved successfully.'
      });
      setFormData({
        equipment_id: '',
        maintenance_type: '',
        description: '',
        parts_used: '',
        labor_hours: '',
        cost: '',
        odometer_reading: '',
        hours_reading: '',
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ['recent-maintenance-logs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save maintenance log',
        variant: 'destructive'
      });
    }
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getMaintenanceTypeLabel = (value: string) => {
    return MAINTENANCE_TYPES.find(t => t.value === value)?.label || value;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Log Maintenance Performed
          </CardTitle>
          <CardDescription>
            Quick log for maintenance work completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment</Label>
              <Select 
                value={formData.equipment_id} 
                onValueChange={(v) => handleChange('equipment_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipment?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.asset_number ? `${item.asset_number} - ` : ''}{item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance_type">Maintenance Type</Label>
              <Select 
                value={formData.maintenance_type} 
                onValueChange={(v) => handleChange('maintenance_type', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief description of work performed"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parts_used">Parts Used</Label>
            <Textarea
              id="parts_used"
              placeholder="List parts used (optional)"
              value={formData.parts_used}
              onChange={(e) => handleChange('parts_used', e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="labor_hours">Labor Hours</Label>
              <Input
                id="labor_hours"
                type="number"
                placeholder="0.0"
                value={formData.labor_hours}
                onChange={(e) => handleChange('labor_hours', e.target.value)}
                step="0.25"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                placeholder="0.00"
                value={formData.cost}
                onChange={(e) => handleChange('cost', e.target.value)}
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="odometer_reading">Odometer</Label>
              <Input
                id="odometer_reading"
                type="number"
                placeholder="Optional"
                value={formData.odometer_reading}
                onChange={(e) => handleChange('odometer_reading', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours_reading">Hours</Label>
              <Input
                id="hours_reading"
                type="number"
                placeholder="Optional"
                value={formData.hours_reading}
                onChange={(e) => handleChange('hours_reading', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
            />
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!formData.equipment_id || !formData.maintenance_type || submitMutation.isPending}
            className="w-full"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Maintenance Log
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Maintenance
          </CardTitle>
          <CardDescription>
            Last 10 maintenance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMaintenance ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : recentMaintenance && recentMaintenance.length > 0 ? (
            <div className="space-y-3">
              {recentMaintenance.map((log: any) => (
                <div key={log.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {log.equipment_assets?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.log_date), 'MMM d, yyyy h:mm a')}
                      </p>
                      <p className="text-sm mt-1">
                        {getMaintenanceTypeLabel(log.maintenance_type)}
                      </p>
                      {log.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {log.labor_hours && (
                        <p className="text-sm">{log.labor_hours} hrs</p>
                      )}
                      {log.cost && (
                        <p className="text-sm font-semibold">${log.cost.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No recent maintenance logs
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
