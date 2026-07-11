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
import { Plus, Droplets, Calendar, ArrowLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface TankFill {
  id: string;
  tank_id: string;
  customer_id: string;
  product_id: string;
  driver_id: string;
  truck_id: string;
  fill_date: string;
  gallons_before: number;
  gallons_delivered: number;
  gallons_after: number;
  price_per_gallon: number;
  total_amount: number;
  fill_type: string;
  notes: string;
  water_delivery_tanks?: { tank_name: string };
  water_delivery_customers?: { company_name: string };
  water_delivery_products?: { product_name: string };
  water_delivery_drivers?: { first_name: string; last_name: string };
}

export default function WaterDeliveryTankFills() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { getVolumeLabel, formatVolume } = useWaterUnits();
  const queryClient = useQueryClient();

  const { data: fills = [], isLoading } = useQuery({
    queryKey: ['water-delivery-tank-fills'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_tank_fills')
        .select(`
          *,
          water_delivery_tanks(tank_name),
          water_delivery_customers(company_name),
          water_delivery_products(product_name),
          water_delivery_drivers(first_name, last_name)
        `)
        .order('fill_date', { ascending: false });
      if (error) throw error;
      return data as TankFill[];
    }
  });

  const { data: tanks = [] } = useQuery({
    queryKey: ['water-delivery-tanks-list'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_tanks')
        .select('id, tank_name')
        .order('tank_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['water-delivery-customers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_customers')
        .select('id, company_name, first_name, last_name')
        .order('company_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['water-delivery-products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_products')
        .select('id, product_name')
        .order('product_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['water-delivery-drivers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_drivers')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('first_name');
      if (error) throw error;
      return data;
    }
  });

  const createFill = useMutation({
    mutationFn: async (fill: Partial<TankFill>) => {
      const { data: profile } = await supabase.from('profiles').select('shop_id').single();
      const { error } = await (supabase as any)
        .from('water_delivery_tank_fills')
        .insert({ ...fill, shop_id: profile?.shop_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-tank-fills'] });
      toast({ title: 'Tank fill recorded successfully' });
      setDialogOpen(false);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const gallonsBefore = parseFloat(form.get('gallons_before') as string) || 0;
    const gallonsDelivered = parseFloat(form.get('gallons_delivered') as string) || 0;
    const pricePerGallon = parseFloat(form.get('price_per_gallon') as string) || 0;

    const fillData: Partial<TankFill> = {
      tank_id: form.get('tank_id') as string || null as any,
      customer_id: form.get('customer_id') as string || null as any,
      product_id: form.get('product_id') as string || null as any,
      driver_id: form.get('driver_id') as string || null as any,
      fill_date: form.get('fill_date') as string,
      gallons_before: gallonsBefore,
      gallons_delivered: gallonsDelivered,
      gallons_after: gallonsBefore + gallonsDelivered,
      price_per_gallon: pricePerGallon,
      total_amount: gallonsDelivered * pricePerGallon,
      fill_type: form.get('fill_type') as string || 'delivery',
      notes: form.get('notes') as string,
    };

    createFill.mutate(fillData);
  };

  const totalGallonsDelivered = fills.reduce((sum, f) => sum + (f.gallons_delivered || 0), 0);
  const totalRevenue = fills.reduce((sum, f) => sum + (f.total_amount || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/water-delivery')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Droplets className="h-8 w-8 text-cyan-600" />
            Tank Fills
          </h1>
          <p className="text-muted-foreground">Record and track water deliveries to tanks</p>
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
                <Label>Select Tank</Label>
                <Select name="tank_id" required>
                  <SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger>
                  <SelectContent>
                    {tanks.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.tank_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Customer</Label>
                <Select name="customer_id">
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name || `${c.first_name} ${c.last_name}`.trim()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Product</Label>
                <Select name="product_id" required>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Driver</Label>
                <Select name="driver_id">
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fill Date & Time</Label>
                <Input name="fill_date" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Level Before ({getVolumeLabel()})</Label>
                  <Input name="gallons_before" type="number" step="0.01" placeholder="0" />
                </div>
                <div>
                  <Label>{getVolumeLabel()} Delivered</Label>
                  <Input name="gallons_delivered" type="number" step="0.01" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price per {getVolumeLabel(false)}</Label>
                  <Input name="price_per_gallon" type="number" step="0.0001" />
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
                <Label>Notes</Label>
                <Textarea name="notes" placeholder="Any additional notes..." />
              </div>

              <Button type="submit" className="w-full">Record Fill</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{fills.length}</div>
            <p className="text-sm text-muted-foreground">Total Fills</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatVolume(totalGallonsDelivered)}</div>
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
              {formatVolume(fills.length > 0 ? Math.round(totalGallonsDelivered / fills.length) : 0)}
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
            <p className="text-muted-foreground">No tank fills recorded yet.</p>
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
                    <TableCell>{fill.water_delivery_tanks?.tank_name || '-'}</TableCell>
                    <TableCell>{fill.water_delivery_customers?.company_name || '-'}</TableCell>
                    <TableCell>{fill.water_delivery_products?.product_name || '-'}</TableCell>
                    <TableCell>
                      <span className="font-medium">{formatVolume(fill.gallons_delivered || 0)}</span>
                    </TableCell>
                    <TableCell>${fill.total_amount?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      {fill.water_delivery_drivers ? 
                        `${fill.water_delivery_drivers.first_name} ${fill.water_delivery_drivers.last_name}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{fill.fill_type}</Badge>
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
