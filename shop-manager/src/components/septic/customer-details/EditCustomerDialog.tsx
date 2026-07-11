import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any;
}

export default function EditCustomerDialog({ open, onOpenChange, customer }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (customer) {
      setForm({ ...customer });
    }
  }, [customer]);

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const { id, created_at, shop_id, ...updates } = form;
      updates.updated_at = new Date().toISOString();
      const { error } = await supabase.from('septic_customers').update(updates).eq('id', customer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-customer', customer.id] });
      toast({ title: 'Customer updated', description: 'Changes saved successfully.' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
        <Tabs defaultValue="contact">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="property">Property</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email || ''} onChange={e => set('email', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address || ''} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>City</Label>
                <Input value={form.city || ''} onChange={e => set('city', e.target.value)} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.state || ''} onChange={e => set('state', e.target.value)} />
              </div>
              <div>
                <Label>ZIP</Label>
                <Input value={form.zip_code || ''} onChange={e => set('zip_code', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>County</Label>
              <Input value={form.county || ''} onChange={e => set('county', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emergency Contact</Label>
                <Input value={form.emergency_contact_name || ''} onChange={e => set('emergency_contact_name', e.target.value)} />
              </div>
              <div>
                <Label>Emergency Phone</Label>
                <Input value={form.emergency_contact_phone || ''} onChange={e => set('emergency_contact_phone', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} />
            </div>
          </TabsContent>

          <TabsContent value="property" className="space-y-4 mt-4">
            <div>
              <Label>Customer Type</Label>
              <Select value={form.customer_type || 'residential'} onValueChange={v => set('customer_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(form.customer_type === 'commercial' || form.customer_type === 'municipal') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Business Name</Label>
                  <Input value={form.business_name || ''} onChange={e => set('business_name', e.target.value)} />
                </div>
                <div>
                  <Label>Business Contact</Label>
                  <Input value={form.business_contact || ''} onChange={e => set('business_contact', e.target.value)} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bedrooms</Label>
                <Input type="number" value={form.bedrooms || ''} onChange={e => set('bedrooms', e.target.value ? parseInt(e.target.value) : null)} />
              </div>
              <div>
                <Label>Occupants</Label>
                <Input type="number" value={form.occupants || ''} onChange={e => set('occupants', e.target.value ? parseInt(e.target.value) : null)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Property Size</Label>
                <Input value={form.property_size || ''} onChange={e => set('property_size', e.target.value)} placeholder="e.g., 2 acres" />
              </div>
              <div>
                <Label>Year Built</Label>
                <Input type="number" value={form.year_built || ''} onChange={e => set('year_built', e.target.value ? parseInt(e.target.value) : null)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Well Distance (ft)</Label>
                <Input type="number" value={form.well_distance_ft || ''} onChange={e => set('well_distance_ft', e.target.value ? parseInt(e.target.value) : null)} />
              </div>
              <div>
                <Label>Water Source</Label>
                <Select value={form.water_source || ''} onValueChange={v => set('water_source', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="well">Well</SelectItem>
                    <SelectItem value="municipal">Municipal</SelectItem>
                    <SelectItem value="spring">Spring</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Parcel Number</Label>
              <Input value={form.parcel_number || ''} onChange={e => set('parcel_number', e.target.value)} />
            </div>
            <div>
              <Label>System Type</Label>
              <Select value={form.system_type || ''} onValueChange={v => set('system_type', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conventional">Conventional</SelectItem>
                  <SelectItem value="mound">Mound</SelectItem>
                  <SelectItem value="aerobic">Aerobic</SelectItem>
                  <SelectItem value="chamber">Chamber</SelectItem>
                  <SelectItem value="drip_distribution">Drip Distribution</SelectItem>
                  <SelectItem value="sand_filter">Sand Filter</SelectItem>
                  <SelectItem value="constructed_wetland">Constructed Wetland</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Access Notes</Label>
              <Textarea value={form.access_notes || ''} onChange={e => set('access_notes', e.target.value)} rows={2} placeholder="Gate codes, key locations..." />
            </div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4 mt-4">
            <div>
              <Label>Preferred Payment Method</Label>
              <Select value={form.preferred_payment_method || ''} onValueChange={v => set('preferred_payment_method', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="ach">ACH / Bank Transfer</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Select value={form.payment_terms || ''} onValueChange={v => set('payment_terms', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                  <SelectItem value="net_15">Net 15</SelectItem>
                  <SelectItem value="net_30">Net 30</SelectItem>
                  <SelectItem value="net_60">Net 60</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Tax Exempt</Label>
              <Switch checked={form.tax_exempt || false} onCheckedChange={v => set('tax_exempt', v)} />
            </div>
          </TabsContent>
        </Tabs>

        <Button className="w-full mt-4" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
