import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2, MapPin } from 'lucide-react';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { CustomerHistoryTab } from './tabs/CustomerHistoryTab';
import { CustomerLocationsTab } from './tabs/CustomerLocationsTab';

const KNOWN_BUSINESS_TYPES = ['retail', 'restaurant', 'office', 'industrial', 'healthcare', 'education', 'government'];
const isKnownBusinessType = (type: string | null | undefined): boolean => {
  return KNOWN_BUSINESS_TYPES.includes(type || '');
};

interface EditWaterDeliveryCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any;
  onSuccess?: () => void;
}

export function EditWaterDeliveryCustomerDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: EditWaterDeliveryCustomerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    is_commercial: false,
    is_active: true,
    // Commercial fields
    company_name: '',
    business_type: '',
    other_business_type: '',
    tax_id: '',
    billing_contact_name: '',
    billing_contact_email: '',
    billing_contact_phone: '',
    // Account fields
    payment_terms: 'COD',
    credit_limit: 0,
    requires_po: false,
    tax_exempt: false,
    tax_exempt_number: '',
    portal_enabled: false,
    portal_pin: '',
    notes: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        billing_address: customer.billing_address || '',
        billing_city: customer.billing_city || '',
        billing_state: customer.billing_state || '',
        billing_zip: customer.billing_zip || '',
        is_commercial: customer.is_commercial || false,
        is_active: customer.is_active ?? true,
        company_name: customer.company_name || '',
        business_type: isKnownBusinessType(customer.business_type) ? customer.business_type : (customer.business_type ? 'other' : ''),
        other_business_type: !isKnownBusinessType(customer.business_type) ? (customer.business_type || '') : '',
        tax_id: customer.tax_id || '',
        billing_contact_name: customer.billing_contact_name || '',
        billing_contact_email: customer.billing_contact_email || '',
        billing_contact_phone: customer.billing_contact_phone || '',
        payment_terms: customer.payment_terms || 'COD',
        credit_limit: customer.credit_limit || 0,
        requires_po: customer.requires_po || false,
        tax_exempt: customer.tax_exempt || false,
        tax_exempt_number: customer.tax_exempt_number || '',
        portal_enabled: customer.portal_access_enabled || false,
        portal_pin: customer.portal_pin || '',
        notes: customer.notes || '',
      });
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: updated, error } = await supabase
        .from('water_delivery_customers')
        .update({
          first_name: data.first_name,
          last_name: data.last_name || null,
          email: data.email || null,
          phone: data.phone || null,
          billing_address: data.billing_address || null,
          billing_city: data.billing_city || null,
          billing_state: data.billing_state || null,
          billing_zip: data.billing_zip || null,
          is_commercial: data.is_commercial,
          is_active: data.is_active,
          company_name: data.is_commercial ? (data.company_name || null) : null,
          business_type: data.is_commercial 
            ? (data.business_type === 'other' ? data.other_business_type : data.business_type) || null 
            : null,
          tax_id: data.is_commercial ? (data.tax_id || null) : null,
          billing_contact_name: data.is_commercial ? (data.billing_contact_name || null) : null,
          billing_contact_email: data.is_commercial ? (data.billing_contact_email || null) : null,
          billing_contact_phone: data.is_commercial ? (data.billing_contact_phone || null) : null,
          payment_terms: data.payment_terms,
          credit_limit: data.credit_limit,
          requires_po: data.requires_po,
          tax_exempt: data.tax_exempt,
          tax_exempt_number: data.tax_exempt_number || null,
          portal_access_enabled: data.portal_enabled,
          portal_pin: data.portal_pin || null,
          notes: data.notes || null,
        })
        .eq('id', customer.id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      toast({ title: 'Customer updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-customers'] });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-customer', customer.id] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error updating customer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      toast({ title: 'First name is required', variant: 'destructive' });
      return;
    }
    updateMutation.mutate(formData);
  };

  const generatePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData(prev => ({ ...prev, portal_pin: pin }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="locations" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="hidden sm:inline">Locations</span>
              </TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="portal">Portal</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name">First Name *</Label>
                  <Input
                    id="edit_first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_email">Email</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone</Label>
                  <Input
                    id="edit_phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_commercial"
                    checked={formData.is_commercial}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_commercial: checked }))}
                  />
                  <Label htmlFor="edit_is_commercial">Commercial Account</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="edit_is_active">Active</Label>
                </div>
              </div>

              {/* Commercial Account Section */}
              {formData.is_commercial && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    Commercial Account Details
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_company_name">Company Name *</Label>
                      <Input
                        id="edit_company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_business_type">Business Type</Label>
                      <Select
                        value={formData.business_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, business_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="industrial">Industrial</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.business_type === 'other' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit_other_business_type">Specify Business Type *</Label>
                      <Input
                        id="edit_other_business_type"
                        value={formData.other_business_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, other_business_type: e.target.value }))}
                        placeholder="Enter business type..."
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit_tax_id">Tax ID / EIN</Label>
                    <Input
                      id="edit_tax_id"
                      value={formData.tax_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                    />
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium mb-3">Billing Contact (if different)</p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="edit_billing_contact_name">Contact Name</Label>
                        <Input
                          id="edit_billing_contact_name"
                          value={formData.billing_contact_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, billing_contact_name: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit_billing_contact_email">Email</Label>
                          <Input
                            id="edit_billing_contact_email"
                            type="email"
                            value={formData.billing_contact_email}
                            onChange={(e) => setFormData(prev => ({ ...prev, billing_contact_email: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit_billing_contact_phone">Phone</Label>
                          <Input
                            id="edit_billing_contact_phone"
                            value={formData.billing_contact_phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, billing_contact_phone: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea
                  id="edit_notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit_billing_address">Street Address</Label>
                <AddressAutocomplete
                  id="edit_billing_address"
                  value={formData.billing_address}
                  onChange={(value) => setFormData(prev => ({ ...prev, billing_address: value }))}
                  onAddressSelect={(addr) => {
                    setFormData(prev => ({
                      ...prev,
                      billing_address: addr.street,
                      billing_city: addr.city,
                      billing_state: addr.state,
                      billing_zip: addr.zip,
                    }));
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_billing_city">City</Label>
                  <Input
                    id="edit_billing_city"
                    value={formData.billing_city}
                    onChange={(e) => setFormData(prev => ({ ...prev, billing_city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_billing_state">State</Label>
                  <Input
                    id="edit_billing_state"
                    value={formData.billing_state}
                    onChange={(e) => setFormData(prev => ({ ...prev, billing_state: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_billing_zip">ZIP Code</Label>
                  <Input
                    id="edit_billing_zip"
                    value={formData.billing_zip}
                    onChange={(e) => setFormData(prev => ({ ...prev, billing_zip: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="locations" className="mt-4">
              <CustomerLocationsTab customerId={customer.id} />
            </TabsContent>

            <TabsContent value="account" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_payment_terms">Payment Terms</Label>
                  <Select
                    value={formData.payment_terms}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, payment_terms: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COD">COD (Cash on Delivery)</SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 45">Net 45</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                      <SelectItem value="Prepaid">Prepaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_credit_limit">Credit Limit ($)</Label>
                  <Input
                    id="edit_credit_limit"
                    type="number"
                    min="0"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_requires_po"
                  checked={formData.requires_po}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_po: checked }))}
                />
                <Label htmlFor="edit_requires_po">Requires Purchase Order</Label>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_tax_exempt"
                    checked={formData.tax_exempt}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, tax_exempt: checked }))}
                  />
                  <Label htmlFor="edit_tax_exempt">Tax Exempt</Label>
                </div>
                {formData.tax_exempt && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_tax_exempt_number">Tax Exempt Number</Label>
                    <Input
                      id="edit_tax_exempt_number"
                      value={formData.tax_exempt_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_exempt_number: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="portal" className="space-y-4 mt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_portal_enabled"
                  checked={formData.portal_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, portal_enabled: checked }))}
                />
                <Label htmlFor="edit_portal_enabled">Enable Customer Portal Access</Label>
              </div>

              {formData.portal_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="edit_portal_pin">Portal PIN</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit_portal_pin"
                      value={formData.portal_pin}
                      onChange={(e) => setFormData(prev => ({ ...prev, portal_pin: e.target.value }))}
                      maxLength={4}
                    />
                    <Button type="button" variant="outline" onClick={generatePin}>
                      Generate
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <CustomerHistoryTab customerId={customer.id} />
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}