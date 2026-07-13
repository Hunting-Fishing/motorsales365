import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Fuel } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  useFuelDeliveryCustomers,
  useFuelDeliveryLocations,
  useFuelDeliveryProducts,
  useFuelDeliveryDrivers,
  useFuelDeliveryTrucks,
  useCreateFuelDeliveryOrder 
} from '@/hooks/useFuelDelivery';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';

export default function FuelDeliveryOrderForm() {
  const navigate = useNavigate();
  const { data: customers } = useFuelDeliveryCustomers();
  const { data: products } = useFuelDeliveryProducts();
  const { data: drivers } = useFuelDeliveryDrivers();
  const { data: trucks } = useFuelDeliveryTrucks();
  const createOrder = useCreateFuelDeliveryOrder();
  const { getVolumeLabel } = useFuelUnits();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'fuel_delivery');

  const [formData, setFormData] = useState({
    customer_id: '',
    location_id: '',
    product_id: '',
    quantity_ordered: '',
    price_per_unit: '',
    delivery_fee: '',
    scheduled_date: '',
    priority: 'normal',
    driver_id: '',
    truck_id: '',
    special_instructions: '',
    internal_notes: ''
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const { data: locations } = useFuelDeliveryLocations(selectedCustomerId || undefined);

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setFormData(prev => ({ ...prev, customer_id: customerId, location_id: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseFloat(formData.quantity_ordered) || 0;
    const pricePerUnit = parseFloat(formData.price_per_unit) || 0;
    const deliveryFee = parseFloat(formData.delivery_fee) || 0;
    const subtotal = quantity * pricePerUnit;
    const taxAmount = subtotal * 0.08; // 8% tax
    const total = subtotal + taxAmount + deliveryFee;

    await createOrder.mutateAsync({
      customer_id: formData.customer_id || undefined,
      location_id: formData.location_id || undefined,
      product_id: formData.product_id || undefined,
      quantity_ordered: quantity,
      price_per_unit: pricePerUnit,
      delivery_fee: deliveryFee,
      subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      scheduled_date: formData.scheduled_date || undefined,
      priority: formData.priority,
      driver_id: formData.driver_id || undefined,
      truck_id: formData.truck_id || undefined,
      special_instructions: formData.special_instructions || undefined,
      internal_notes: formData.internal_notes || undefined,
      status: 'pending'
    });
    
    navigate('/fuel-delivery/orders');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <Button variant="ghost" onClick={() => navigate('/fuel-delivery/orders')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Orders
      </Button>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Fuel className="h-8 w-8 text-orange-600" />
            New {moduleInfo?.displayName || 'Fuel Delivery'} Order
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a new delivery order
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
                      {customers?.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company_name || customer.contact_name}
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
                      {locations?.map(location => (
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
                  <Label>Fuel Product *</Label>
                  <Select 
                    value={formData.product_id} 
                    onValueChange={(v) => {
                      const product = products?.find(p => p.id === v);
                      setFormData(prev => ({ 
                        ...prev, 
                        product_id: v,
                        price_per_unit: product?.base_price_per_unit?.toString() || ''
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.product_name} ({product.fuel_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity ({getVolumeLabel()}) *</Label>
                  <Input
                    type="number"
                    value={formData.quantity_ordered}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity_ordered: e.target.value }))}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price per {getVolumeLabel(false)}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price_per_unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_per_unit: e.target.value }))}
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
                  <Label>Scheduled Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
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
                      {drivers?.filter(d => d.status === 'active').map(driver => (
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
                      {trucks?.filter(t => t.status === 'available').map(truck => (
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
              <Button type="button" variant="outline" onClick={() => navigate('/fuel-delivery/orders')}>
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
