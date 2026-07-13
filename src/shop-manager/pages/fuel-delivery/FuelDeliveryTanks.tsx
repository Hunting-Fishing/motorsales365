import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Fuel, MapPin, AlertTriangle, Droplets, Edit2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useFuelDeliveryCustomers, useFuelDeliveryLocations, useFuelDeliveryProducts } from '@/hooks/useFuelDelivery';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';

interface Tank {
  id: string;
  tank_name: string;
  tank_number: string;
  tank_type: string;
  capacity_liters: number;
  current_level_liters: number;
  minimum_level_liters: number;
  product_id: string;
  customer_id: string;
  location_id: string;
  status: string;
  last_filled_date: string;
  fuel_delivery_customers?: { company_name: string };
  fuel_delivery_locations?: { location_name: string; address: string };
  fuel_delivery_products?: { product_name: string };
}

export default function FuelDeliveryTanks() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getVolumeLabel, formatVolume } = useFuelUnits();

  const { data: tanks = [], isLoading } = useQuery({
    queryKey: ['fuel-delivery-tanks'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_tanks')
        .select(`
          *,
          fuel_delivery_customers(company_name),
          fuel_delivery_locations(location_name, address),
          fuel_delivery_products(product_name)
        `)
        .order('tank_name');
      if (error) throw error;
      return data as Tank[];
    }
  });

  const { data: customers = [] } = useFuelDeliveryCustomers();
  const { data: locations = [] } = useFuelDeliveryLocations();
  const { data: products = [] } = useFuelDeliveryProducts();

  const createTank = useMutation({
    mutationFn: async (tank: Partial<Tank>) => {
      const { data: profile } = await supabase.from('profiles').select('shop_id').single();
      const { error } = await (supabase as any)
        .from('fuel_delivery_tanks')
        .insert({ ...tank, shop_id: profile?.shop_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-tanks'] });
      toast({ title: 'Tank added successfully' });
      setDialogOpen(false);
    }
  });

  const updateTank = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tank> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_tanks')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-tanks'] });
      toast({ title: 'Tank updated' });
      setDialogOpen(false);
      setEditingTank(null);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const tankData = {
      tank_name: form.get('tank_name') as string,
      tank_number: form.get('tank_number') as string,
      tank_type: form.get('tank_type') as string,
      capacity_liters: parseFloat(form.get('capacity_liters') as string),
      current_level_liters: parseFloat(form.get('current_level_liters') as string) || 0,
      minimum_level_liters: parseFloat(form.get('minimum_level_liters') as string) || 0,
      product_id: form.get('product_id') as string || null,
      customer_id: form.get('customer_id') as string || null,
      location_id: form.get('location_id') as string || null,
      status: form.get('status') as string || 'active',
    };

    if (editingTank) {
      updateTank.mutate({ id: editingTank.id, ...tankData });
    } else {
      createTank.mutate(tankData);
    }
  };

  const getFillPercentage = (tank: Tank) => {
    if (!tank.capacity_liters) return 0;
    return Math.round((tank.current_level_liters / tank.capacity_liters) * 100);
  };

  const getLevelStatus = (tank: Tank) => {
    const percentage = getFillPercentage(tank);
    if (percentage <= 20) return 'critical';
    if (percentage <= 40) return 'low';
    return 'good';
  };

  const openEdit = (tank: Tank) => {
    setEditingTank(tank);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Storage Tanks</h1>
          <p className="text-muted-foreground">Manage fixed fuel storage tanks at customer locations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingTank(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Tank</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTank ? 'Edit Tank' : 'Add New Tank'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tank Name</Label>
                  <Input name="tank_name" defaultValue={editingTank?.tank_name} required />
                </div>
                <div>
                  <Label>Tank Number</Label>
                  <Input name="tank_number" defaultValue={editingTank?.tank_number} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tank Type</Label>
                  <Select name="tank_type" defaultValue={editingTank?.tank_type || 'fixed'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="underground">Underground</SelectItem>
                      <SelectItem value="above_ground">Above Ground</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select name="status" defaultValue={editingTank?.status || 'active'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Capacity ({getVolumeLabel(true)})</Label>
                  <Input name="capacity_liters" type="number" step="0.01" defaultValue={editingTank?.capacity_liters} required />
                </div>
                <div>
                  <Label>Current Level ({getVolumeLabel(true)})</Label>
                  <Input name="current_level_liters" type="number" step="0.01" defaultValue={editingTank?.current_level_liters || 0} />
                </div>
                <div>
                  <Label>Min Level ({getVolumeLabel(true)})</Label>
                  <Input name="minimum_level_liters" type="number" step="0.01" defaultValue={editingTank?.minimum_level_liters || 0} />
                </div>
              </div>
              <div>
                <Label>Product</Label>
                <Select name="product_id" defaultValue={editingTank?.product_id}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Customer</Label>
                <Select name="customer_id" defaultValue={editingTank?.customer_id}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name || c.contact_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Select name="location_id" defaultValue={editingTank?.location_id}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.location_name} - {l.address}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {editingTank ? 'Update Tank' : 'Add Tank'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading tanks...</div>
      ) : tanks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <Fuel className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tanks found. Add your first tank to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tanks.map((tank) => {
            const fillPercent = getFillPercentage(tank);
            const levelStatus = getLevelStatus(tank);
            return (
              <Card key={tank.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Fuel className="w-5 h-5" />
                        {tank.tank_name}
                      </CardTitle>
                      {tank.tank_number && (
                        <p className="text-sm text-muted-foreground">#{tank.tank_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={tank.status === 'active' ? 'default' : 'secondary'}>
                        {tank.status}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tank)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-4 h-4" />
                        {formatVolume(tank.current_level_liters || 0)}
                      </span>
                      <span>{formatVolume(tank.capacity_liters)} capacity</span>
                    </div>
                    <Progress 
                      value={fillPercent} 
                      className={`h-3 ${levelStatus === 'critical' ? '[&>div]:bg-destructive' : levelStatus === 'low' ? '[&>div]:bg-yellow-500' : ''}`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{fillPercent}% full</span>
                      {levelStatus !== 'good' && (
                        <span className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="w-3 h-3" />
                          {levelStatus === 'critical' ? 'Critical' : 'Low'}
                        </span>
                      )}
                    </div>
                  </div>

                  {tank.fuel_delivery_products?.product_name && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Product:</span>{' '}
                      {tank.fuel_delivery_products.product_name}
                    </div>
                  )}

                  {tank.fuel_delivery_customers?.company_name && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Customer:</span>{' '}
                      {tank.fuel_delivery_customers.company_name}
                    </div>
                  )}

                  {tank.fuel_delivery_locations && (
                    <div className="text-sm flex items-start gap-1">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <span>{tank.fuel_delivery_locations.location_name}</span>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Type: {tank.tank_type?.replace('_', ' ')}
                    {tank.last_filled_date && (
                      <> • Last filled: {new Date(tank.last_filled_date).toLocaleDateString()}</>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
