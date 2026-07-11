import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Droplets } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';

export default function WaterDeliveryOrderForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getVolumeLabel } = useWaterUnits();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'water_delivery');

  const { data: customers } = useQuery({
    queryKey: ['water-delivery-customers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_customers')
        .select('*')
        .order('company_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: products } = useQuery({
    queryKey: ['water-delivery-products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_products')
        .select('*')
        .order('product_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: drivers } = useQuery({
    queryKey: ['water-delivery-drivers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_drivers')
        .select('*')
        .eq('is_active', true)
        .order('first_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: trucks } = useQuery({
    queryKey: ['water-delivery-trucks'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_trucks')
        .select('*')
        .eq('status', 'available')
        .order('truck_number');
      if (error) throw error;
      return data;
    }
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  const { data: locations } = useQuery({
    queryKey: ['water-delivery-locations', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      const { data, error } = await (supabase as any)
        .from('water_delivery_locations')
        .select('*')
        .eq('customer_id', selectedCustomerId)
        .order('location_name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomerId
  });

  const createOrder = useMutation({
    mutationFn: async (orderData: any) => {
      const { data: profile } = await supabase.from('profiles').select('shop_id').single();
      const orderNumber = `WO-${Date.now().toString().slice(-8)}`;
      const { error } = await (supabase as any)
        .from('water_delivery_orders')
        .insert({ ...orderData, shop_id: profile?.shop_id, order_number: orderNumber });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-orders'] });
      toast.success('Order created successfully');
      navigate('/water-delivery/orders');
    },
    onError: (error: any) => {
      toast.error('Failed to create order: ' + error.message);
    }
  });

  const [formData, setFormData] = useState({
    customer_id: '',
    location_id: '',
    product_id: '',
    quantity_gallons: '',
    price_per_gallon: '',
    delivery_fee: '',
    requested_date: '',
    priority: 'normal',
    driver_id: '',
    truck_id: '',
    special_instructions: '',
    internal_notes: ''
  });

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setFormData(prev => ({ ...prev, customer_id: customerId, location_id: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseFloat(formData.quantity_gallons) || 0;
    const pricePerUnit = parseFloat(formData.price_per_gallon) || 0;
    const deliveryFee = parseFloat(formData.delivery_fee) || 0;
    const subtotal = quantity * pricePerUnit;
    const taxAmount = subtotal * 0.08;
    const total = subtotal + taxAmount + deliveryFee;

    await createOrder.mutateAsync({
      customer_id: formData.customer_id || undefined,
      location_id: formData.location_id || undefined,
      product_id: formData.product_id || undefined,
      quantity_gallons: quantity,
      price_per_gallon: pricePerUnit,
      delivery_fee: deliveryFee,
      subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      requested_date: formData.requested_date || undefined,
      priority: formData.priority,
      driver_id: formData.driver_id || undefined,
      truck_id: formData.truck_id || undefined,
      special_instructions: formData.special_instructions || undefined,
      internal_notes: formData.internal_notes || undefined,
      status: 'pending'
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <Button variant="ghost" onClick={() => navigate('/water-delivery/orders')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Orders
      </Button>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Droplets className="h-8 w-8 text-cyan-600" />
            New {moduleInfo?.displayName || 'Water Delivery'} Order
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a new water delivery order
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Customer & Location */}
            <Card>
              <CardHeader>
                <CardTitle>Customer & Delivery Location</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={formData.customer_id} onValueChange={handleCustomerChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company_name || `${customer.first_name} ${customer.last_name}`.trim()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Delivery Location *</Label>
                  <Select 
                    value={formData.location_id} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, location_id: v }))}
                    disabled={!selectedCustomerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCustomerId ? "Select location" : "Select customer first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.map((location: any) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.location_name} - {location.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Product & Quantity */}
            <Card>
              <CardHeader>
                <CardTitle>Product & Pricing</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Water Product *</Label>
                  <Select 
                    value={formData.product_id} 
                    onValueChange={(v) => {
                      const product = products?.find((p: any) => p.id === v);
                      setFormData(prev => ({ 
                        ...prev, 
                        product_id: v,
                        price_per_gallon: product?.base_price_per_unit?.toString() || ''
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product: any) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.product_name} ({product.water_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity ({getVolumeLabel()}) *</Label>
                  <Input
                    type="number"
                    value={formData.quantity_gallons}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity_gallons: e.target.value }))}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price per {getVolumeLabel(false)}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price_per_gallon}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_per_gallon: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Fee</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.delivery_fee}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_fee: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle>Scheduling & Assignment</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Requested Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.requested_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, requested_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign Driver</Label>
                  <Select value={formData.driver_id} onValueChange={(v) => setFormData(prev => ({ ...prev, driver_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.map((driver: any) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.first_name} {driver.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign Truck</Label>
                  <Select value={formData.truck_id} onValueChange={(v) => setFormData(prev => ({ ...prev, truck_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select truck" />
                    </SelectTrigger>
                    <SelectContent>
                      {trucks?.map((truck: any) => (
                        <SelectItem key={truck.id} value={truck.id}>
                          {truck.truck_number} - {truck.make} {truck.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Special Instructions (visible to driver)</Label>
                  <Textarea
                    value={formData.special_instructions}
                    onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
                    placeholder="Access codes, delivery instructions..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={formData.internal_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                    placeholder="Office notes..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/water-delivery/orders')}>
                Cancel
              </Button>
              <Button type="submit" disabled={createOrder.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {createOrder.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
