import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SepticOrderForm() {
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    customer_id: '',
    tank_id: '',
    service_type: 'pump_out',
    priority: 'normal',
    scheduled_date: '',
    scheduled_time: '',
    location_address: '',
    notes: '',
    internal_notes: '',
    assigned_employee_id: '',
  });

  // Fetch customers
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['septic-customers', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_customers')
        .select('id, first_name, last_name, address, phone')
        .eq('shop_id', shopId)
        .order('last_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch tanks for selected customer
  const { data: tanks = [] } = useQuery({
    queryKey: ['septic-tanks', shopId, formData.customer_id],
    queryFn: async () => {
      if (!shopId || !formData.customer_id) return [];
      const { data, error } = await supabase
        .from('septic_tanks')
        .select('id, tank_type, tank_size_gallons, location_address')
        .eq('shop_id', shopId)
        .eq('customer_id', formData.customer_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId && !!formData.customer_id,
  });

  // Fetch employees for assignment
  const { data: employees = [] } = useQuery({
    queryKey: ['septic-employees-active', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_employees')
        .select('id, first_name, last_name, septic_employee_roles(role)')
        .eq('shop_id', shopId)
        .eq('status', 'active')
        .order('last_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Create order mutation
  const createOrder = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop selected');
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('septic_service_orders')
        .insert({
          shop_id: shopId,
          customer_id: formData.customer_id || null,
          tank_id: formData.tank_id || null,
          service_type: formData.service_type,
          priority: formData.priority,
          scheduled_date: formData.scheduled_date || null,
          scheduled_time: formData.scheduled_time || null,
          location_address: formData.location_address || null,
          notes: formData.notes || null,
          internal_notes: formData.internal_notes || null,
          assigned_employee_id: formData.assigned_employee_id || null,
          status: 'pending',
          created_by: user?.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Service order created successfully');
      queryClient.invalidateQueries({ queryKey: ['septic'] });
      queryClient.invalidateQueries({ queryKey: ['septic-customer-orders'] });
      queryClient.invalidateQueries({ queryKey: ['septic-customer-invoices'] });
      navigate('/septic/orders');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create order');
    },
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Auto-fill address from customer
    if (field === 'customer_id') {
      const customer = customers.find((c) => c.id === value);
      if (customer?.address) {
        setFormData((prev) => ({ ...prev, [field]: value, location_address: customer.address || '' }));
      }
    }
    // Auto-fill address from tank
    if (field === 'tank_id') {
      const tank = tanks.find((t) => t.id === value);
      if (tank?.location_address) {
        setFormData((prev) => ({ ...prev, [field]: value, location_address: tank.location_address || '' }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrder.mutate();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/septic/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">New Service Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Tank */}
        <Card>
          <CardHeader><CardTitle className="text-base">Customer & System</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={formData.customer_id} onValueChange={(v) => updateField('customer_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCustomers ? 'Loading...' : 'Select customer'} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} {c.phone ? `— ${c.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.customer_id && (
              <div className="space-y-2">
                <Label>Septic System / Tank</Label>
                <Select value={formData.tank_id} onValueChange={(v) => updateField('tank_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={tanks.length === 0 ? 'No tanks on file' : 'Select tank'} />
                  </SelectTrigger>
                  <SelectContent>
                    {tanks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.tank_type || 'Tank'} — {t.tank_size_gallons ? `${t.tank_size_gallons} gal` : 'Unknown size'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Service Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={formData.service_type} onValueChange={(v) => updateField('service_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pump_out">Pump Out</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => updateField('priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <Input type="date" value={formData.scheduled_date} onChange={(e) => updateField('scheduled_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Scheduled Time</Label>
                <Input type="time" value={formData.scheduled_time} onChange={(e) => updateField('scheduled_time', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Service Location</Label>
              <Input value={formData.location_address} onChange={(e) => updateField('location_address', e.target.value)} placeholder="Address for the service" />
            </div>

            <div className="space-y-2">
              <Label>Assign Employee</Label>
              <Select value={formData.assigned_employee_id} onValueChange={(v) => updateField('assigned_employee_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => {
                    const empRoles = (emp.septic_employee_roles || []) as any[];
                    const roleLabels = empRoles.map((r: any) => r.role).join(', ');
                    return (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}{roleLabels ? ` (${roleLabels})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer-Facing Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Notes visible to customer..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea value={formData.internal_notes} onChange={(e) => updateField('internal_notes', e.target.value)} placeholder="Internal team notes..." rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/septic/orders')}>Cancel</Button>
          <Button type="submit" disabled={createOrder.isPending} className="bg-gradient-to-r from-stone-600 to-stone-800 hover:from-stone-700 hover:to-stone-900">
            {createOrder.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Create Order
          </Button>
        </div>
      </form>
    </div>
  );
}
