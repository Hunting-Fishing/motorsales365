import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, BarChart3, ArrowLeft, AlertTriangle, Droplets } from 'lucide-react';
import { useFuelDeliveryInventory, useCreateFuelDeliveryInventory, useFuelDeliveryProducts } from '@/hooks/useFuelDelivery';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';

export default function FuelDeliveryInventory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: inventory, isLoading } = useFuelDeliveryInventory();
  const { data: products } = useFuelDeliveryProducts();
  const createInventory = useCreateFuelDeliveryInventory();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'fuel_delivery');

  const [formData, setFormData] = useState({
    storage_tank_name: '',
    product_id: '',
    tank_capacity: '',
    current_quantity: '',
    minimum_level: '',
    reorder_level: '',
    location: '',
    notes: ''
  });

  const filteredInventory = inventory?.filter(item =>
    item.storage_tank_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.fuel_delivery_products?.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createInventory.mutateAsync({
      ...formData,
      product_id: formData.product_id || undefined,
      tank_capacity: parseFloat(formData.tank_capacity) || undefined,
      current_quantity: parseFloat(formData.current_quantity) || 0,
      minimum_level: parseFloat(formData.minimum_level) || undefined,
      reorder_level: parseFloat(formData.reorder_level) || undefined
    });
    setIsDialogOpen(false);
    setFormData({
      storage_tank_name: '',
      product_id: '',
      tank_capacity: '',
      current_quantity: '',
      minimum_level: '',
      reorder_level: '',
      location: '',
      notes: ''
    });
  };

  const getInventoryStatus = (current?: number, minimum?: number, capacity?: number) => {
    if (!current || !capacity) return { status: 'unknown', color: 'text-muted-foreground' };
    const percentage = (current / capacity) * 100;
    if (minimum && current <= minimum) return { status: 'Critical', color: 'text-red-500' };
    if (percentage <= 25) return { status: 'Low', color: 'text-amber-500' };
    if (percentage <= 50) return { status: 'Moderate', color: 'text-blue-500' };
    return { status: 'Good', color: 'text-green-500' };
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/fuel-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-amber-600" />
              {moduleInfo?.displayName || 'Fuel Delivery'} Inventory
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor bulk storage tanks and inventory levels
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Tank
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Storage Tank</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Tank Name *</Label>
                    <Input
                      value={formData.storage_tank_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, storage_tank_name: e.target.value }))}
                      placeholder="Tank A - Diesel"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select value={formData.product_id} onValueChange={(v) => setFormData(prev => ({ ...prev, product_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.product_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Yard A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tank Capacity (gal)</Label>
                    <Input
                      type="number"
                      value={formData.tank_capacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, tank_capacity: e.target.value }))}
                      placeholder="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Quantity (gal)</Label>
                    <Input
                      type="number"
                      value={formData.current_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, current_quantity: e.target.value }))}
                      placeholder="5000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Level (gal)</Label>
                    <Input
                      type="number"
                      value={formData.minimum_level}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimum_level: e.target.value }))}
                      placeholder="1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reorder Level (gal)</Label>
                    <Input
                      type="number"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData(prev => ({ ...prev, reorder_level: e.target.value }))}
                      placeholder="2500"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Tank notes..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createInventory.isPending}>
                    {createInventory.isPending ? 'Creating...' : 'Add Tank'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tanks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : filteredInventory && filteredInventory.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map((item) => {
            const percentage = item.tank_capacity 
              ? ((item.current_quantity || 0) / item.tank_capacity) * 100 
              : 0;
            const status = getInventoryStatus(item.current_quantity, item.minimum_level, item.tank_capacity);
            const isLow = item.minimum_level && (item.current_quantity || 0) <= item.minimum_level;

            return (
              <Card key={item.id} className={`border-border ${isLow ? 'border-red-500/50' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{item.storage_tank_name}</CardTitle>
                    {isLow && <AlertTriangle className="h-5 w-5 text-red-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.fuel_delivery_products?.product_name || 'Unknown Product'}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Level</span>
                        <span className={`font-medium ${status.color}`}>
                          {(item.current_quantity || 0).toLocaleString()} / {(item.tank_capacity || 0).toLocaleString()} gal
                        </span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className={`h-3 ${isLow ? '[&>div]:bg-red-500' : percentage <= 25 ? '[&>div]:bg-amber-500' : ''}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Min Level</span>
                        <p className="font-medium">{(item.minimum_level || 0).toLocaleString()} gal</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reorder At</span>
                        <p className="font-medium">{(item.reorder_level || 0).toLocaleString()} gal</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={isLow ? 'destructive' : 'outline'} className={!isLow ? status.color : ''}>
                        {status.status}
                      </Badge>
                      {item.location && (
                        <span className="text-xs text-muted-foreground">{item.location}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Droplets className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No storage tanks found</p>
            <Button variant="link" onClick={() => setIsDialogOpen(true)}>
              Add your first tank
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
