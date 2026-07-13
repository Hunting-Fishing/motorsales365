import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { toast } from 'sonner';
import { Loader2, Edit2, X, Building2 } from 'lucide-react';

interface ShopData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  business_type: string | null;
  industry: string | null;
  tax_id: string | null;
  shop_description: string | null;
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
];

const BUSINESS_TYPES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 's_corp', label: 'S Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'nonprofit', label: 'Non-Profit' },
];

export function BusinessInformationCard() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<ShopData>>({});

  const { data: shop, isLoading } = useQuery({
    queryKey: ['user-shop', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // First get the user's shop_id from their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();
      
      if (!profile?.shop_id) return null;
      
      // Then get the shop details
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, address, phone, email, city, state, postal_code, business_type, industry, tax_id, shop_description')
        .eq('id', profile.shop_id)
        .single();
      
      if (error) throw error;
      return data as ShopData;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (shop) {
      setFormData({
        name: shop.name || '',
        address: shop.address || '',
        phone: shop.phone || '',
        email: shop.email || '',
        city: shop.city || '',
        state: shop.state || '',
        postal_code: shop.postal_code || '',
        business_type: shop.business_type || '',
        tax_id: shop.tax_id || '',
        shop_description: shop.shop_description || '',
      });
    }
  }, [shop]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ShopData>) => {
      if (!shop?.id) throw new Error('No shop found');
      
      const { error } = await supabase
        .from('shops')
        .update({
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          city: data.city,
          state: data.state,
          postal_code: data.postal_code,
          business_type: data.business_type,
          tax_id: data.tax_id,
          shop_description: data.shop_description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-shop'] });
      setIsEditMode(false);
      toast.success('Business information updated successfully');
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Failed to update business information');
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (shop) {
      setFormData({
        name: shop.name || '',
        address: shop.address || '',
        phone: shop.phone || '',
        email: shop.email || '',
        city: shop.city || '',
        state: shop.state || '',
        postal_code: shop.postal_code || '',
        business_type: shop.business_type || '',
        tax_id: shop.tax_id || '',
        shop_description: shop.shop_description || '',
      });
    }
    setIsEditMode(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!shop) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Information
          </CardTitle>
          <CardDescription>No business associated with your account</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Business Information</CardTitle>
            <CardDescription>Your company details</CardDescription>
          </div>
          {!isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            value={formData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={!isEditMode}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="businessPhone">Business Phone</Label>
            <Input
              id="businessPhone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={!isEditMode}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessEmail">Business Email</Label>
            <Input
              id="businessEmail"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!isEditMode}
              placeholder="contact@business.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Street Address</Label>
          <Input
            id="address"
            value={formData.address || ''}
            onChange={(e) => handleInputChange('address', e.target.value)}
            disabled={!isEditMode}
            placeholder="123 Main Street"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city || ''}
              onChange={(e) => handleInputChange('city', e.target.value)}
              disabled={!isEditMode}
              placeholder="City"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            {isEditMode ? (
              <Select
                value={formData.state || ''}
                onValueChange={(value) => handleInputChange('state', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="state"
                value={formData.state || ''}
                disabled
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">ZIP Code</Label>
            <Input
              id="postalCode"
              value={formData.postal_code || ''}
              onChange={(e) => handleInputChange('postal_code', e.target.value)}
              disabled={!isEditMode}
              placeholder="12345"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type</Label>
            {isEditMode ? (
              <Select
                value={formData.business_type || ''}
                onValueChange={(value) => handleInputChange('business_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="businessType"
                value={BUSINESS_TYPES.find(t => t.value === formData.business_type)?.label || formData.business_type || ''}
                disabled
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxId">Tax ID / EIN</Label>
            <Input
              id="taxId"
              value={formData.tax_id || ''}
              onChange={(e) => handleInputChange('tax_id', e.target.value)}
              disabled={!isEditMode}
              placeholder="XX-XXXXXXX"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Business Description</Label>
          <Textarea
            id="description"
            value={formData.shop_description || ''}
            onChange={(e) => handleInputChange('shop_description', e.target.value)}
            disabled={!isEditMode}
            placeholder="Tell customers about your business..."
            rows={3}
          />
        </div>

        {isEditMode && (
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex-1"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
