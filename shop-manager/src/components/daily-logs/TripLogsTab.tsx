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
import { Loader2, Save, Route, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export function TripLogsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    equipment_id: '',
    trip_date: format(new Date(), 'yyyy-MM-dd'),
    start_reading: '',
    end_reading: '',
    reading_type: 'miles',
    driver_name: '',
    purpose: '',
    destination: '',
    notes: ''
  });

  // Fetch equipment list
  const { data: equipment } = useQuery({
    queryKey: ['equipment-for-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, asset_number')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch recent trip logs
  const { data: recentTrips, isLoading: loadingTrips } = useQuery({
    queryKey: ['recent-trip-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_logs')
        .select(`
          id,
          trip_date,
          start_reading,
          end_reading,
          reading_type,
          driver_name,
          purpose,
          destination,
          equipment_id,
          equipment_assets (name, equipment_number)
        `)
        .order('trip_date', { ascending: false })
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
        .from('trip_logs')
        .insert({
          shop_id: profile?.shop_id,
          equipment_id: formData.equipment_id,
          trip_date: formData.trip_date,
          start_reading: formData.start_reading ? parseFloat(formData.start_reading) : null,
          end_reading: formData.end_reading ? parseFloat(formData.end_reading) : null,
          reading_type: formData.reading_type,
          driver_name: formData.driver_name,
          purpose: formData.purpose,
          destination: formData.destination,
          notes: formData.notes,
          entered_by: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Trip Log Saved',
        description: 'The trip log has been recorded successfully.'
      });
      setFormData({
        equipment_id: '',
        trip_date: format(new Date(), 'yyyy-MM-dd'),
        start_reading: '',
        end_reading: '',
        reading_type: 'miles',
        driver_name: '',
        purpose: '',
        destination: '',
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ['recent-trip-logs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save trip log',
        variant: 'destructive'
      });
    }
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const tripDistance = formData.start_reading && formData.end_reading 
    ? parseFloat(formData.end_reading) - parseFloat(formData.start_reading) 
    : null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Log Trip
          </CardTitle>
          <CardDescription>
            Record trip details including mileage and destination
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
              <Label htmlFor="trip_date">Trip Date</Label>
              <Input
                id="trip_date"
                type="date"
                value={formData.trip_date}
                onChange={(e) => handleChange('trip_date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_reading">Start Reading</Label>
              <Input
                id="start_reading"
                type="number"
                placeholder="0"
                value={formData.start_reading}
                onChange={(e) => handleChange('start_reading', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_reading">End Reading</Label>
              <Input
                id="end_reading"
                type="number"
                placeholder="0"
                value={formData.end_reading}
                onChange={(e) => handleChange('end_reading', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reading_type">Unit</Label>
              <Select 
                value={formData.reading_type} 
                onValueChange={(v) => handleChange('reading_type', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="miles">Miles</SelectItem>
                  <SelectItem value="kilometers">Kilometers</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {tripDistance !== null && tripDistance > 0 && (
            <div className="p-3 bg-primary/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Trip Distance</p>
              <p className="text-xl font-bold text-primary">
                {tripDistance.toLocaleString()} {formData.reading_type}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="driver_name">Driver Name</Label>
              <Input
                id="driver_name"
                placeholder="Enter driver name"
                value={formData.driver_name}
                onChange={(e) => handleChange('driver_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                placeholder="Where did you go?"
                value={formData.destination}
                onChange={(e) => handleChange('destination', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              placeholder="e.g., Customer delivery, Job site visit"
              value={formData.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
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
            disabled={!formData.equipment_id || submitMutation.isPending}
            className="w-full"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Trip Log
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Recent Trips
          </CardTitle>
          <CardDescription>
            Last 10 trip log entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTrips ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : recentTrips && recentTrips.length > 0 ? (
            <div className="space-y-3">
              {recentTrips.map((trip: any) => {
                const distance = trip.end_reading && trip.start_reading 
                  ? trip.end_reading - trip.start_reading 
                  : null;
                return (
                  <div key={trip.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {trip.equipment_assets?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(trip.trip_date), 'MMM d, yyyy')}
                          {trip.destination && ` • ${trip.destination}`}
                        </p>
                        {trip.driver_name && (
                          <p className="text-xs text-muted-foreground">
                            Driver: {trip.driver_name}
                          </p>
                        )}
                      </div>
                      {distance && (
                        <div className="text-right">
                          <p className="font-semibold">{distance.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{trip.reading_type}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No recent trip logs
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
