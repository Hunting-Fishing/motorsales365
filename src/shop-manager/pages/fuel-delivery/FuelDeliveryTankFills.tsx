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
import { Plus, Droplets, Truck, User, Calendar, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFuelDeliveryCustomers, useFuelDeliveryProducts, useFuelDeliveryDrivers, useFuelDeliveryTrucks } from '@/hooks/useFuelDelivery';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';

interface TankFill {
  id: string;
  tank_id: string;
  tidy_tank_id: string;
  customer_id: string;
  product_id: string;
  driver_id: string;
  truck_id: string;
  fill_date: string;
  liters_before: number;
  liters_delivered: number;
  liters_after: number;
  price_per_liter: number;
  total_amount: number;
  fill_type: string;
  verification_method: string;
  notes: string;
  fuel_delivery_tanks?: { tank_name: string; tank_number: string };
  fuel_delivery_tidy_tanks?: { tank_name: string; tank_number: string };
  fuel_delivery_customers?: { company_name: string };
  fuel_delivery_products?: { product_name: string };
  fuel_delivery_drivers?: { first_name: string; last_name: string };
  fuel_delivery_trucks?: { truck_number: string };
}

interface Tank {
  id: string;
  tank_name: string;
  tank_number: string;
}

export default function FuelDeliveryTankFills() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tankType, setTankType] = useState<'fixed' | 'tidy'>('fixed');
  const { toast } = useToast();
  const { getVolumeLabel, formatVolume } = useFuelUnits();
  const queryClient = useQueryClient();

  const { data: fills = [], isLoading } = useQuery({
    queryKey: ['fuel-delivery-tank-fills'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_tank_fills')
        .select(`
          *,
          fuel_delivery_tanks(tank_name, tank_number),
          fuel_delivery_tidy_tanks(tank_name, tank_number),
          fuel_delivery_customers(company_name),
          fuel_delivery_products(product_name),
          fuel_delivery_drivers(first_name, last_name),
          fuel_delivery_trucks(truck_number)
        `)
        .order('fill_date', { ascending: false });
      if (error) throw error;
      return data as TankFill[];
    }
  });

  const { data: tanks = [] } = useQuery({
    queryKey: ['fuel-delivery-tanks-list'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_tanks')
        .select('id, tank_name, tank_number')
        .order('tank_name');
      if (error) throw error;
      return data as Tank[];
    }
  });

  const { data: tidyTanks = [] } = useQuery({
    queryKey: ['fuel-delivery-tidy-tanks-list'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_tidy_tanks')
        .select('id, tank_name, tank_number')
        .order('tank_name');
      if (error) throw error;
      return data as Tank[];
    }
  });

  const { data: customers = [] } = useFuelDeliveryCustomers();
  const { data: products = [] } = useFuelDeliveryProducts();
  const { data: drivers = [] } = useFuelDeliveryDrivers();
  const { data: trucks = [] } = useFuelDeliveryTrucks();

  const createFill = useMutation({
    mutationFn: async (fill: Partial<TankFill>) => {
      const { data: profile } = await supabase.from('profiles').select('shop_id').single();
      const { error } = await (supabase as any)
        .from('fuel_delivery_tank_fills')
        .insert({ ...fill, shop_id: profile?.shop_id });
      if (error) throw error;

      // Update tank level
      if (fill.tank_id) {
        await (supabase as any)
          .from('fuel_delivery_tanks')
          .update({ 
            current_level_liters: fill.liters_after,
            last_filled_date: fill.fill_date
          })
          .eq('id', fill.tank_id);
      } else if (fill.tidy_tank_id) {
        await (supabase as any)
          .from('fuel_delivery_tidy_tanks')
          .update({ 
            current_level_liters: fill.liters_after,
            last_filled_date: fill.fill_date
          })
          .eq('id', fill.tidy_tank_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-tank-fills'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-tanks'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-tidy-tanks'] });
      toast({ title: 'Tank fill recorded successfully' });
      setDialogOpen(false);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const litersBefore = parseFloat(form.get('liters_before') as string) || 0;
    const litersDelivered = parseFloat(form.get('liters_delivered') as string) || 0;
    const pricePerLiter = parseFloat(form.get('price_per_liter') as string) || 0;

    const fillData: Partial<TankFill> = {
      tank_id: tankType === 'fixed' ? (form.get('tank_id') as string || null) as any : null,
      tidy_tank_id: tankType === 'tidy' ? (form.get('tidy_tank_id') as string || null) as any : null,
      customer_id: form.get('customer_id') as string || null as any,
      product_id: form.get('product_id') as string || null as any,
      driver_id: form.get('driver_id') as string || null as any,
      truck_id: form.get('truck_id') as string || null as any,
      fill_date: form.get('fill_date') as string,
      liters_before: litersBefore,
      liters_delivered: litersDelivered,
      liters_after: litersBefore + litersDelivered,
      price_per_liter: pricePerLiter,
      total_amount: litersDelivered * pricePerLiter,
      fill_type: form.get('fill_type') as string || 'delivery',
      verification_method: form.get('verification_method') as string,
      notes: form.get('notes') as string,
    };

    createFill.mutate(fillData);
  };

  const totalLitersDelivered = fills.reduce((sum, f) => sum + (f.liters_delivered || 0), 0);
  const totalRevenue = fills.reduce((sum, f) => sum + (f.total_amount || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tank Fills</h1>
          <p className="text-muted-foreground">Record and track fuel deliveries to tanks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Record Fill</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Tank Fill</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Tank Type</Label>
                <Select value={tankType} onValueChange={(v) => setTankType(v as 'fixed' | 'tidy')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Storage Tank</SelectItem>
                    <SelectItem value="tidy">Tidy Tank (Portable)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tankType === 'fixed' ? (
                <div>
                  <Label>Select Tank</Label>
                  <Select name="tank_id" required>
                    <SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger>
                    <SelectContent>
                      {tanks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.tank_name} {t.tank_number && `(#${t.tank_number})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Select Tidy Tank</Label>
                  <Select name="tidy_tank_id" required>
                    <SelectTrigger><SelectValue placeholder="Select tidy tank" /></SelectTrigger>
                    <SelectContent>
                      {tidyTanks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.tank_name} {t.tank_number && `(#${t.tank_number})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Customer</Label>
                <Select name="customer_id">
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name || c.contact_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Product</Label>
                <Select name="product_id" required>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Driver</Label>
                  <Select name="driver_id">
                    <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Truck</Label>
                  <Select name="truck_id">
                    <SelectTrigger><SelectValue placeholder="Select truck" /></SelectTrigger>
                    <SelectContent>
                      {trucks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.truck_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Fill Date & Time</Label>
                <Input name="fill_date" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Level Before ({getVolumeLabel(true)})</Label>
                  <Input name="liters_before" type="number" step="0.01" placeholder="0" />
                </div>
                <div>
                  <Label>{getVolumeLabel()} Delivered</Label>
                  <Input name="liters_delivered" type="number" step="0.01" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price per {getVolumeLabel(false)}</Label>
                  <Input name="price_per_liter" type="number" step="0.0001" />
                </div>
                <div>
                  <Label>Fill Type</Label>
                  <Select name="fill_type" defaultValue="delivery">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="top_up">Top Up</SelectItem>
                      <SelectItem value="initial_fill">Initial Fill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Verification Method</Label>
                <Select name="verification_method">
                  <SelectTrigger><SelectValue placeholder="How was level verified?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dip_stick">Dip Stick</SelectItem>
                    <SelectItem value="gauge">Gauge</SelectItem>
                    <SelectItem value="meter">Meter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea name="notes" placeholder="Any additional notes..." />
              </div>

              <Button type="submit" className="w-full">Record Fill</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{fills.length}</div>
            <p className="text-sm text-muted-foreground">Total Fills</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatVolume(totalLitersDelivered)}</div>
            <p className="text-sm text-muted-foreground">Total Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatVolume(fills.length > 0 ? Math.round(totalLitersDelivered / fills.length) : 0)}
            </div>
            <p className="text-sm text-muted-foreground">Avg per Fill</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading fills...</div>
      ) : fills.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <Droplets className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tank fills recorded yet. Record your first fill to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Fill History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tank</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fills.map((fill) => (
                  <TableRow key={fill.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(fill.fill_date), 'MMM d, yyyy HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {fill.fuel_delivery_tanks?.tank_name || fill.fuel_delivery_tidy_tanks?.tank_name || '-'}
                      <span className="text-xs text-muted-foreground block">
                        {fill.fuel_delivery_tanks ? 'Fixed' : 'Tidy'}
                      </span>
                    </TableCell>
                    <TableCell>{fill.fuel_delivery_customers?.company_name || '-'}</TableCell>
                    <TableCell>{fill.fuel_delivery_products?.product_name || '-'}</TableCell>
                    <TableCell>
                      <span className="font-medium">{formatVolume(fill.liters_delivered || 0)}</span>
                      <span className="text-xs text-muted-foreground block">
                        {formatVolume(fill.liters_before || 0)} → {formatVolume(fill.liters_after || 0)}
                      </span>
                    </TableCell>
                    <TableCell>${fill.total_amount?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      {fill.fuel_delivery_drivers ? 
                        `${fill.fuel_delivery_drivers.first_name} ${fill.fuel_delivery_drivers.last_name}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {fill.fill_type?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
