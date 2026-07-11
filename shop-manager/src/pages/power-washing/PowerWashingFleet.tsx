import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Car, 
  Plus, 
  Fuel,
  Gauge,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function PowerWashingFleet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_name: '',
    make: '',
    model: '',
    year: '',
    license_plate: '',
    fuel_type: 'gasoline',
    current_odometer: ''
  });
  const [logForm, setLogForm] = useState({
    log_type: 'mileage',
    odometer_reading: '',
    gallons: '',
    fuel_cost: '',
    notes: ''
  });

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['power-washing-vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_vehicles')
        .select('*, profiles(first_name, last_name)')
        .order('vehicle_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: logs } = useQuery({
    queryKey: ['power-washing-vehicle-logs', selectedVehicle],
    queryFn: async () => {
      if (!selectedVehicle) return [];
      const { data, error } = await supabase
        .from('power_washing_vehicle_logs')
        .select('*')
        .eq('vehicle_id', selectedVehicle)
        .order('log_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedVehicle
  });

  const createVehicle = useMutation({
    mutationFn: async (data: typeof vehicleForm) => {
      const { error } = await supabase
        .from('power_washing_vehicles')
        .insert({
          vehicle_name: data.vehicle_name,
          make: data.make || null,
          model: data.model || null,
          year: data.year ? parseInt(data.year) : null,
          license_plate: data.license_plate || null,
          fuel_type: data.fuel_type,
          current_odometer: data.current_odometer ? parseInt(data.current_odometer) : null,
          status: 'active'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-vehicles'] });
      toast({ title: 'Vehicle added successfully' });
      setIsVehicleDialogOpen(false);
      setVehicleForm({
        vehicle_name: '', make: '', model: '', year: '',
        license_plate: '', fuel_type: 'gasoline', current_odometer: ''
      });
    },
    onError: () => {
      toast({ title: 'Failed to add vehicle', variant: 'destructive' });
    }
  });

  const createLog = useMutation({
    mutationFn: async (data: typeof logForm) => {
      if (!selectedVehicle) throw new Error('No vehicle selected');
      
      const { error } = await supabase
        .from('power_washing_vehicle_logs')
        .insert({
          vehicle_id: selectedVehicle,
          log_type: data.log_type,
          odometer_reading: data.odometer_reading ? parseInt(data.odometer_reading) : null,
          gallons: data.gallons ? parseFloat(data.gallons) : null,
          fuel_cost: data.fuel_cost ? parseFloat(data.fuel_cost) : null,
          notes: data.notes || null
        });
      if (error) throw error;

      // Update vehicle odometer
      if (data.odometer_reading) {
        await supabase
          .from('power_washing_vehicles')
          .update({ current_odometer: parseInt(data.odometer_reading) })
          .eq('id', selectedVehicle);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-vehicle-logs'] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-vehicles'] });
      toast({ title: 'Log entry added' });
      setIsLogDialogOpen(false);
      setLogForm({ log_type: 'mileage', odometer_reading: '', gallons: '', fuel_cost: '', notes: '' });
    },
    onError: () => {
      toast({ title: 'Failed to add log entry', variant: 'destructive' });
    }
  });

  const getMaintenanceStatus = (vehicle: any) => {
    if (!vehicle.next_service_due) return null;
    const daysUntil = differenceInDays(new Date(vehicle.next_service_due), new Date());
    if (daysUntil < 0) return { status: 'overdue', color: 'destructive' };
    if (daysUntil <= 7) return { status: 'due soon', color: 'warning' };
    return null;
  };

  const totalFuelCost = logs?.reduce((sum, log) => sum + (log.fuel_cost || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Car className="h-8 w-8 text-slate-500" />
            Fleet Management
          </h1>
          <p className="text-muted-foreground mt-1">Track vehicles, mileage, and fuel usage</p>
        </div>
        <Dialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vehicle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Vehicle Name *</Label>
                <Input
                  value={vehicleForm.vehicle_name}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_name: e.target.value })}
                  placeholder="e.g., Truck 1, Van A"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Make</Label>
                  <Input
                    value={vehicleForm.make}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                    placeholder="Ford"
                  />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    placeholder="F-150"
                  />
                </div>
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                    placeholder="2020"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>License Plate</Label>
                  <Input
                    value={vehicleForm.license_plate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fuel Type</Label>
                  <Select value={vehicleForm.fuel_type} onValueChange={(v) => setVehicleForm({ ...vehicleForm, fuel_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasoline">Gasoline</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Current Odometer</Label>
                <Input
                  type="number"
                  value={vehicleForm.current_odometer}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, current_odometer: e.target.value })}
                  placeholder="Miles"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => createVehicle.mutate(vehicleForm)}
                disabled={!vehicleForm.vehicle_name || createVehicle.isPending}
              >
                {createVehicle.isPending ? 'Adding...' : 'Add Vehicle'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicles List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : vehicles?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No vehicles added</p>
              ) : (
                <div className="space-y-3">
                  {vehicles?.map((vehicle) => {
                    const maintenanceStatus = getMaintenanceStatus(vehicle);
                    return (
                      <div 
                        key={vehicle.id} 
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedVehicle === vehicle.id 
                            ? 'bg-primary/10 border border-primary' 
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                        onClick={() => setSelectedVehicle(vehicle.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{vehicle.vehicle_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                          </div>
                          <div className="text-right">
                            {maintenanceStatus && (
                              <Badge variant={maintenanceStatus.color as any} className="mb-1">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {maintenanceStatus.status}
                              </Badge>
                            )}
                            {vehicle.current_odometer && (
                              <p className="text-xs text-muted-foreground">
                                {vehicle.current_odometer.toLocaleString()} mi
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vehicle Details & Logs */}
        <div className="lg:col-span-2">
          {selectedVehicle ? (
            <Tabs defaultValue="logs">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Log
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Log Entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Log Type</Label>
                        <Select value={logForm.log_type} onValueChange={(v) => setLogForm({ ...logForm, log_type: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mileage">Mileage</SelectItem>
                            <SelectItem value="fuel">Fuel</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Odometer Reading</Label>
                        <Input
                          type="number"
                          value={logForm.odometer_reading}
                          onChange={(e) => setLogForm({ ...logForm, odometer_reading: e.target.value })}
                          placeholder="Current miles"
                        />
                      </div>
                      {logForm.log_type === 'fuel' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Gallons</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={logForm.gallons}
                              onChange={(e) => setLogForm({ ...logForm, gallons: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Cost</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={logForm.fuel_cost}
                              onChange={(e) => setLogForm({ ...logForm, fuel_cost: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={logForm.notes}
                          onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                        />
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => createLog.mutate(logForm)}
                        disabled={createLog.isPending}
                      >
                        {createLog.isPending ? 'Adding...' : 'Add Entry'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <TabsContent value="logs">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Logs</CardTitle>
                      <Badge variant="outline">
                        Total Fuel: ${totalFuelCost.toFixed(2)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {logs?.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No logs yet</p>
                    ) : (
                      <div className="space-y-3">
                        {logs?.map((log) => (
                          <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-muted">
                                {log.log_type === 'fuel' ? (
                                  <Fuel className="h-4 w-4" />
                                ) : log.log_type === 'maintenance' ? (
                                  <Wrench className="h-4 w-4" />
                                ) : (
                                  <Gauge className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium capitalize">{log.log_type}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(log.log_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {log.odometer_reading && (
                                <p className="text-sm">{log.odometer_reading.toLocaleString()} mi</p>
                              )}
                              {log.fuel_cost && (
                                <p className="text-sm text-green-600">${log.fuel_cost.toFixed(2)}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle>Vehicle Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const vehicle = vehicles?.find(v => v.id === selectedVehicle);
                      if (!vehicle) return null;
                      return (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Name</Label>
                            <p className="font-medium">{vehicle.vehicle_name}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">License Plate</Label>
                            <p className="font-medium">{vehicle.license_plate || '-'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Make / Model</Label>
                            <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Year</Label>
                            <p className="font-medium">{vehicle.year || '-'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Fuel Type</Label>
                            <p className="font-medium capitalize">{vehicle.fuel_type}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Current Odometer</Label>
                            <p className="font-medium">{vehicle.current_odometer?.toLocaleString() || '-'} mi</p>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Select a vehicle to view details and logs</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
