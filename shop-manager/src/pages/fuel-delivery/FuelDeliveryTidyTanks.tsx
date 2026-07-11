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
import { Plus, Package, MapPin, Wrench, Droplets, Edit2, User } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useFuelDeliveryCustomers, useFuelDeliveryProducts } from '@/hooks/useFuelDelivery';
import { format } from 'date-fns';

interface TidyTank {
  id: string;
  tank_name: string;
  tank_number: string;
  capacity_liters: number;
  current_level_liters: number;
  product_id: string;
  current_location: string;
  assigned_customer_id: string;
  assigned_date: string;
  return_date: string;
  condition: string;
  status: string;
  last_filled_date: string;
  fuel_delivery_customers?: { company_name: string };
  fuel_delivery_products?: { product_name: string };
}

export default function FuelDeliveryTidyTanks() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTank, setEditingTank] = useState<TidyTank | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tidyTanks = [], isLoading } = useQuery({
    queryKey: ['fuel-delivery-tidy-tanks'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_tidy_tanks')
        .select(`
          *,
          fuel_delivery_customers(company_name),
          fuel_delivery_products(product_name)
        `)
        .order('tank_name');
      if (error) throw error;
      return data as TidyTank[];
    }
  });

  const { data: customers = [] } = useFuelDeliveryCustomers();
  const { data: products = [] } = useFuelDeliveryProducts();

  const createTank = useMutation({
    mutationFn: async (tank: Partial<TidyTank>) => {
      const { data: profile } = await supabase.from('profiles').select('shop_id').single();
      const { error } = await (supabase as any)
        .from('fuel_delivery_tidy_tanks')
        .insert({ ...tank, shop_id: profile?.shop_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-tidy-tanks'] });
      toast({ title: 'Tidy tank added successfully' });
      setDialogOpen(false);
    }
  });

  const updateTank = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TidyTank> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_tidy_tanks')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-tidy-tanks'] });
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
      capacity_liters: parseFloat(form.get('capacity_liters') as string),
      current_level_liters: parseFloat(form.get('current_level_liters') as string) || 0,
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
    if (!tank.capacity_liters) return 0;
    return Math.round((tank.current_level_liters / tank.capacity_liters) * 100);
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

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'good': return <Badge variant="default">Good</Badge>;
      case 'fair': return <Badge variant="secondary">Fair</Badge>;
      case 'needs_maintenance': return <Badge variant="destructive">Needs Maintenance</Badge>;
      case 'retired': return <Badge variant="outline">Retired</Badge>;
      default: return <Badge variant="secondary">{condition}</Badge>;
    }
  };

  const openEdit = (tank: TidyTank) => {
    setEditingTank(tank);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tidy Tanks</h1>
          <p className="text-muted-foreground">Manage portable/mobile fuel tanks</p>
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
                  <Label>Capacity (L)</Label>
                  <Input name="capacity_liters" type="number" step="0.01" defaultValue={editingTank?.capacity_liters} required />
                </div>
                <div>
                  <Label>Current Level (L)</Label>
                  <Input name="current_level_liters" type="number" step="0.01" defaultValue={editingTank?.current_level_liters || 0} />
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
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Label>Assigned Customer</Label>
                <Select name="assigned_customer_id" defaultValue={editingTank?.assigned_customer_id}>
                  <SelectTrigger><SelectValue placeholder="Select customer (if assigned)" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name || c.contact_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current Location</Label>
                <Input name="current_location" defaultValue={editingTank?.current_location} placeholder="e.g., Warehouse, Customer Site" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assigned Date</Label>
                  <Input name="assigned_date" type="date" defaultValue={editingTank?.assigned_date?.split('T')[0]} />
                </div>
                <div>
                  <Label>Return Date</Label>
                  <Input name="return_date" type="date" defaultValue={editingTank?.return_date?.split('T')[0]} />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingTank ? 'Update Tidy Tank' : 'Add Tidy Tank'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
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
            <p className="text-muted-foreground">No tidy tanks found. Add your first portable tank to get started.</p>
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
                      {tank.tank_number && (
                        <p className="text-sm text-muted-foreground">#{tank.tank_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(tank.status)}`} />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tank)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{tank.status?.replace('_', ' ')}</Badge>
                    {getConditionBadge(tank.condition)}
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-4 h-4" />
                        {tank.current_level_liters?.toLocaleString() || 0} L
                      </span>
                      <span>{tank.capacity_liters?.toLocaleString()} L capacity</span>
                    </div>
                    <Progress value={fillPercent} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-1">{fillPercent}% full</p>
                  </div>

                  {tank.fuel_delivery_products?.product_name && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Product:</span>{' '}
                      {tank.fuel_delivery_products.product_name}
                    </div>
                  )}

                  {tank.fuel_delivery_customers?.company_name && (
                    <div className="text-sm flex items-center gap-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{tank.fuel_delivery_customers.company_name}</span>
                    </div>
                  )}

                  {tank.current_location && (
                    <div className="text-sm flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{tank.current_location}</span>
                    </div>
                  )}

                  {tank.assigned_date && (
                    <div className="text-xs text-muted-foreground">
                      Assigned: {format(new Date(tank.assigned_date), 'MMM d, yyyy')}
                      {tank.return_date && <> • Return: {format(new Date(tank.return_date), 'MMM d, yyyy')}</>}
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
