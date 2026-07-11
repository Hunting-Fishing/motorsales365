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
import { Plus, Package, MapPin, Droplets, Edit2, User, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface TidyTank {
  id: string;
  tank_name: string;
  tank_number: string;
  capacity_gallons: number;
  current_level_gallons: number;
  product_id: string;
  current_location: string;
  assigned_customer_id: string;
  assigned_date: string;
  return_date: string;
  condition: string;
  status: string;
  water_delivery_customers?: { company_name: string };
  water_delivery_products?: { product_name: string };
}

export default function WaterDeliveryTidyTanks() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTank, setEditingTank] = useState<TidyTank | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatVolume, getVolumeLabel } = useWaterUnits();

  const { data: tidyTanks = [], isLoading } = useQuery({
    queryKey: ['water-delivery-tidy-tanks'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_tidy_tanks')
        .select(`
          *,
          water_delivery_customers(company_name),
          water_delivery_products(product_name)
        `)
        .order('tank_name');
      if (error) throw error;
      return data as TidyTank[];
    }
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['water-delivery-customers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_customers')
        .select('id, company_name, contact_name')
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

  const createTank = useMutation({
    mutationFn: async (tank: Partial<TidyTank>) => {
      const { data: profile } = await supabase.from('profiles').select('shop_id').single();
      const { error } = await (supabase as any)
        .from('water_delivery_tidy_tanks')
        .insert({ ...tank, shop_id: profile?.shop_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-tidy-tanks'] });
      toast({ title: 'Tidy tank added successfully' });
      setDialogOpen(false);
    }
  });

  const updateTank = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TidyTank> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('water_delivery_tidy_tanks')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-tidy-tanks'] });
      toast({ title: 'Tidy tank updated' });
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
      capacity_gallons: parseFloat(form.get('capacity_gallons') as string),
      current_level_gallons: parseFloat(form.get('current_level_gallons') as string) || 0,
      product_id: form.get('product_id') as string || null,
      assigned_customer_id: form.get('assigned_customer_id') as string || null,
      current_location: form.get('current_location') as string || null,
      assigned_date: form.get('assigned_date') as string || null,
      return_date: form.get('return_date') as string || null,
      condition: form.get('condition') as string || 'good',
      status: form.get('status') as string || 'available',
    };

    if (editingTank) {
      updateTank.mutate({ id: editingTank.id, ...tankData });
    } else {
      createTank.mutate(tankData);
    }
  };

  const getFillPercentage = (tank: TidyTank) => {
    if (!tank.capacity_gallons) return 0;
    return Math.round((tank.current_level_gallons / tank.capacity_gallons) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'assigned': return 'bg-blue-500';
      case 'in_transit': return 'bg-yellow-500';
      case 'maintenance': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/water-delivery')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-cyan-600" />
            Tidy Tanks
          </h1>
          <p className="text-muted-foreground">Manage portable/mobile water tanks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingTank(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Tidy Tank</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTank ? 'Edit Tidy Tank' : 'Add New Tidy Tank'}</DialogTitle>
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
                  <Label>Capacity ({getVolumeLabel()})</Label>
                  <Input name="capacity_gallons" type="number" defaultValue={editingTank?.capacity_gallons} required />
                </div>
                <div>
                  <Label>Current Level ({getVolumeLabel()})</Label>
                  <Input name="current_level_gallons" type="number" defaultValue={editingTank?.current_level_gallons || 0} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select name="status" defaultValue={editingTank?.status || 'available'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select name="condition" defaultValue={editingTank?.condition || 'good'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="needs_maintenance">Needs Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Product</Label>
                <Select name="product_id" defaultValue={editingTank?.product_id}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigned Customer</Label>
                <Select name="assigned_customer_id" defaultValue={editingTank?.assigned_customer_id}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name || c.contact_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current Location</Label>
                <Input name="current_location" defaultValue={editingTank?.current_location} placeholder="e.g., Warehouse, Customer Site" />
              </div>
              <Button type="submit" className="w-full">
                {editingTank ? 'Update Tidy Tank' : 'Add Tidy Tank'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{tidyTanks.filter(t => t.status === 'available').length}</div>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{tidyTanks.filter(t => t.status === 'assigned').length}</div>
            <p className="text-sm text-muted-foreground">Assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{tidyTanks.filter(t => t.status === 'in_transit').length}</div>
            <p className="text-sm text-muted-foreground">In Transit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{tidyTanks.filter(t => t.condition === 'needs_maintenance').length}</div>
            <p className="text-sm text-muted-foreground">Needs Maintenance</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading tidy tanks...</div>
      ) : tidyTanks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tidy tanks found. Add your first portable tank.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tidyTanks.map((tank) => {
            const fillPercent = getFillPercentage(tank);
            return (
              <Card key={tank.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        {tank.tank_name}
                      </CardTitle>
                      {tank.tank_number && <p className="text-sm text-muted-foreground">#{tank.tank_number}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(tank.status)}`} />
                      <Button variant="ghost" size="icon" onClick={() => { setEditingTank(tank); setDialogOpen(true); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge variant="outline" className="capitalize">{tank.status?.replace('_', ' ')}</Badge>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-4 h-4" />
                        {formatVolume(tank.current_level_gallons || 0)}
                      </span>
                      <span>{formatVolume(tank.capacity_gallons || 0)} capacity</span>
                    </div>
                    <Progress value={fillPercent} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-1">{fillPercent}% full</p>
                  </div>

                  {tank.water_delivery_products?.product_name && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Product:</span> {tank.water_delivery_products.product_name}
                    </div>
                  )}

                  {tank.water_delivery_customers?.company_name && (
                    <div className="text-sm flex items-center gap-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{tank.water_delivery_customers.company_name}</span>
                    </div>
                  )}

                  {tank.current_location && (
                    <div className="text-sm flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{tank.current_location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
