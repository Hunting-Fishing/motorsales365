import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Clock, Gauge } from 'lucide-react';
import { format } from 'date-fns';
import { EquipmentHierarchySelector } from './EquipmentHierarchySelector';
import { MaintenanceCountdown } from './MaintenanceCountdown';
import { EquipmentNode } from '@/hooks/useEquipmentHierarchy';

export function EngineHoursTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentNode | null>(null);
  const [hoursReading, setHoursReading] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Fetch recent engine hour logs
  const { data: recentLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['recent-engine-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_usage_logs')
        .select(`
          id,
          reading_value,
          reading_type,
          reading_date,
          notes,
          equipment_id,
          equipment_assets (name, equipment_number)
        `)
        .eq('reading_type', 'hours')
        .order('reading_date', { ascending: false })
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

      // Insert usage log
      const { error: logError } = await supabase
        .from('equipment_usage_logs')
        .insert({
          equipment_id: selectedEquipmentId,
          reading_type: 'hours',
          reading_value: parseFloat(hoursReading),
          reading_date: new Date().toISOString(),
          recorded_by: user.id,
          notes
        });

      if (logError) throw logError;

      // Update equipment current hours
      const { error: updateError } = await supabase
        .from('equipment_assets')
        .update({ current_hours: parseFloat(hoursReading) })
        .eq('id', selectedEquipmentId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({
        title: 'Engine Hours Recorded',
        description: 'The engine hours have been saved successfully.'
      });
      setHoursReading('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['recent-engine-hours'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-intervals'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save engine hours',
        variant: 'destructive'
      });
    }
  });

  const handleEquipmentChange = (equipmentId: string, equipment: EquipmentNode | null) => {
    setSelectedEquipmentId(equipmentId);
    setSelectedEquipment(equipment);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Form */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Log Engine Hours
          </CardTitle>
          <CardDescription>
            Select vessel/equipment, then log the current hours reading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <EquipmentHierarchySelector
            selectedParentId={selectedParentId}
            selectedEquipmentId={selectedEquipmentId}
            onParentChange={setSelectedParentId}
            onEquipmentChange={handleEquipmentChange}
          />

          {selectedEquipment && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Hours</p>
                  <p className="text-2xl font-bold">
                    {selectedEquipment.current_hours?.toLocaleString() || 0} hrs
                  </p>
                </div>
                {selectedEquipment.equipment_type && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{selectedEquipment.equipment_type}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="hours">New Hours Reading</Label>
            <Input
              id="hours"
              type="number"
              placeholder="Enter current hours reading"
              value={hoursReading}
              onChange={(e) => setHoursReading(e.target.value)}
              min="0"
              step="0.1"
              className="text-lg"
            />
            {selectedEquipment?.current_hours && hoursReading && (
              <p className="text-sm text-muted-foreground">
                +{(parseFloat(hoursReading) - (selectedEquipment.current_hours || 0)).toFixed(1)} hours since last reading
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!selectedEquipmentId || !hoursReading || submitMutation.isPending}
            className="w-full"
            size="lg"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Engine Hours
          </Button>
        </CardContent>
      </Card>

      {/* Right Column - Countdown + Recent */}
      <div className="space-y-6">
        {/* Maintenance Countdown */}
        {selectedEquipmentId && (
          <MaintenanceCountdown 
            equipmentId={selectedEquipmentId} 
            currentHours={selectedEquipment?.current_hours || 0}
          />
        )}

        {/* Recent Entries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recentLogs && recentLogs.length > 0 ? (
              <div className="space-y-2">
                {recentLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm truncate max-w-[120px]">
                        {log.equipment_assets?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.reading_date), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="font-semibold text-sm">{log.reading_value?.toLocaleString()} hrs</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4 text-sm">
                No recent entries
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
