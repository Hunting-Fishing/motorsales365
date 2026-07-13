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
import { Loader2, Save, Fuel, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export function FuelEntryTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    equipment_id: '',
    fuel_amount: '',
    fuel_unit: 'gallons',
    cost: '',
    odometer_reading: '',
    hours_reading: '',
    location: '',
    notes: ''
  });

  // Fetch equipment list
  const { data: equipment } = useQuery({
    queryKey: ['equipment-for-fuel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, asset_number')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch recent fuel entries
  const { data: recentFuel, isLoading: loadingFuel } = useQuery({
    queryKey: ['recent-fuel-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_entries')
        .select(`
          id,
          entry_date,
          fuel_amount,
          fuel_unit,
          cost,
          odometer_reading,
          hours_reading,
          location,
          equipment_id,
          equipment_assets (name, equipment_number)
        `)
        .order('entry_date', { ascending: false })
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
        .from('fuel_entries')
        .insert({
          shop_id: profile?.shop_id,
          equipment_id: formData.equipment_id,
          fuel_amount: parseFloat(formData.fuel_amount),
          fuel_unit: formData.fuel_unit,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          odometer_reading: formData.odometer_reading ? parseFloat(formData.odometer_reading) : null,
          hours_reading: formData.hours_reading ? parseFloat(formData.hours_reading) : null,
          location: formData.location,
          notes: formData.notes,
          entered_by: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Fuel Entry Saved',
        description: 'The fuel entry has been recorded successfully.'
      });
      setFormData({
        equipment_id: '',
        fuel_amount: '',
        fuel_unit: 'gallons',
        cost: '',
        odometer_reading: '',
        hours_reading: '',
        location: '',
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ['recent-fuel-entries'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save fuel entry',
        variant: 'destructive'
      });
    }
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pricePerUnit = formData.fuel_amount && formData.cost
    ? (parseFloat(formData.cost) / parseFloat(formData.fuel_amount)).toFixed(2)
    : null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Log Fuel Entry
          </CardTitle>
          <CardDescription>
            Record fuel purchases and consumption
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="fuel_amount">Fuel Amount</Label>
              <Input
                id="fuel_amount"
                type="number"
                placeholder="0.00"
                value={formData.fuel_amount}
                onChange={(e) => handleChange('fuel_amount', e.target.value)}
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel_unit">Unit</Label>
              <Select 
                value={formData.fuel_unit} 
                onValueChange={(v) => handleChange('fuel_unit', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gallons">Gallons</SelectItem>
                  <SelectItem value="liters">Liters</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Total Cost ($)</Label>
            <Input
              id="cost"
              type="number"
              placeholder="0.00"
              value={formData.cost}
              onChange={(e) => handleChange('cost', e.target.value)}
              step="0.01"
            />
          </div>

          {pricePerUnit && (
            <div className="p-3 bg-primary/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Price per {formData.fuel_unit === 'gallons' ? 'gallon' : 'liter'}</p>
              <p className="text-xl font-bold text-primary">${pricePerUnit}</p>
            </div>
          )}

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
            <Label htmlFor="location">Station/Location</Label>
            <Input
              id="location"
              placeholder="e.g., Shell on Main St"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
            />
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
            disabled={!formData.equipment_id || !formData.fuel_amount || submitMutation.isPending}
            className="w-full"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Fuel Entry
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Fuel Entries
          </CardTitle>
          <CardDescription>
            Last 10 fuel entry records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingFuel ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : recentFuel && recentFuel.length > 0 ? (
            <div className="space-y-3">
              {recentFuel.map((entry: any) => (
                <div key={entry.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {entry.equipment_assets?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.entry_date), 'MMM d, yyyy h:mm a')}
                      </p>
                      {entry.location && (
                        <p className="text-xs text-muted-foreground">
                          📍 {entry.location}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {entry.fuel_amount} {entry.fuel_unit}
                      </p>
                      {entry.cost && (
                        <p className="text-sm text-muted-foreground">
                          ${entry.cost.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No recent fuel entries
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
