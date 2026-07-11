import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Users, Save, Loader2, CheckCircle, Droplets, FileText, Home, Building2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useBusinessConstants } from '@/hooks/useBusinessConstants';
import { toast } from 'sonner';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { AddressAutocomplete, AddressResult } from '@/components/shared/AddressAutocomplete';
import { MiniMapPreview } from '@/components/shared/MiniMapPreview';

export default function PowerWashingCustomerCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { shopId, loading: shopIdLoading } = useShopId();
const { businessIndustries, addCustomIndustry } = useBusinessConstants();
  
  // Filter industries to show only Power Washing-relevant categories
  const powerWashingRelevantIndustries = [
    'strata_hoa', 'apartments', 'property_management', 'golf_course',
    'sports_recreation', 'restaurant', 'hotel_motel', 'hospitality',
    'shopping_center', 'gas_station', 'warehouse', 'office_building',
    'school', 'church', 'government', 'medical', 'retail', 
    'construction', 'car_wash', 'parking'
  ];
  
  const filteredIndustries = businessIndustries.filter(
    industry => powerWashingRelevantIndustries.includes(industry.value)
  );
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);
  const [customerMode, setCustomerMode] = useState<'residential' | 'business'>('residential');
  const [customIndustry, setCustomIndustry] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    latitude: null as number | null,
    longitude: null as number | null,
    preferred_contact: 'phone',
    property_type: 'residential',
    notes: '',
    // Business fields
    company: '',
    business_email: '',
    business_phone: '',
    business_type: '',
    business_industry: '',
    tax_id: ''
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!shopId) {
        throw new Error('Shop ID not available');
      }
      
      const fullAddress = [formData.address, formData.city, formData.state, formData.zip]
        .filter(Boolean)
        .join(', ');
      
      const isBusiness = customerMode === 'business';
      
      // Handle custom industry if "other" is selected
      let finalIndustry = formData.business_industry;
      if (isBusiness && formData.business_industry === 'other' && customIndustry.trim()) {
        try {
          finalIndustry = await addCustomIndustry(customIndustry.trim());
        } catch (err) {
          console.error('Failed to add custom industry:', err);
          // Use custom name as key if saving fails
          finalIndustry = customIndustry.trim().toLowerCase().replace(/\s+/g, '_');
        }
      }
      
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          shop_id: shopId,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: isBusiness ? (formData.business_email || formData.email || null) : (formData.email || null),
          phone: isBusiness ? (formData.business_phone || formData.phone || null) : (formData.phone || null),
          address: fullAddress || null,
          city: formData.city || null,
          state: formData.state || null,
          postal_code: formData.zip || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          notes: formData.notes || null,
          business_type: isBusiness ? formData.business_type : formData.property_type,
          communication_preference: formData.preferred_contact,
          company: isBusiness ? formData.company : null,
          business_email: isBusiness ? formData.business_email : null,
          business_phone: isBusiness ? formData.business_phone : null,
          business_industry: isBusiness ? finalIndustry : null,
          tax_id: isBusiness ? formData.tax_id : null,
          is_fleet: formData.property_type === 'fleet'
        })
        .select()
        .single();
      
      if (error) throw error;
      return customer;
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully!');
      setCreatedCustomerId(customer.id);
    },
    onError: (error) => {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (customerMode === 'business' && !formData.company.trim()) {
      toast.error('Company name is required for business customers');
      return;
    }
    
    if (customerMode === 'residential' && (!formData.first_name.trim() || !formData.last_name.trim())) {
      toast.error('First name and last name are required');
      return;
    }
    
    if (customerMode === 'business' && formData.business_industry === 'other' && !customIndustry.trim()) {
      toast.error('Please enter a custom industry name');
      return;
    }
    
    createMutation.mutate();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressSelect = (result: AddressResult) => {
    setFormData(prev => ({
      ...prev,
      address: result.streetAddress,
      city: result.city,
      state: result.state,
      zip: result.postalCode,
      latitude: result.latitude,
      longitude: result.longitude,
    }));
  };

  // Success state - customer created
  if (createdCustomerId) {
    return (
      <MobilePageContainer>
        <div className="max-w-2xl mx-auto">
          <Card className="border-cyan-500/30">
            <CardContent className="pt-6 pb-6 md:pt-8 md:pb-8 text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 md:h-8 md:w-8 text-green-500" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Customer Created!</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                {formData.first_name} {formData.last_name} has been added to your customer list.
              </p>
              <div className="flex flex-col gap-2 md:gap-3">
                <Button 
                  onClick={() => navigate(`/power-washing/jobs/new?customerId=${createdCustomerId}`)}
                  className="bg-cyan-600 hover:bg-cyan-700 w-full"
                >
                  <Droplets className="h-4 w-4 mr-2" />
                  Create a Job
                </Button>
                <Button 
                  onClick={() => navigate(`/power-washing/quotes/new?customerId=${createdCustomerId}`)}
                  variant="outline"
                  className="border-cyan-600/30 text-cyan-600 hover:bg-cyan-600/10 w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create a Quote
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/power-washing/customers/${createdCustomerId}`)}
                  className="w-full"
                >
                  View Customer Profile
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/power-washing/customers')}
                  className="w-full"
                >
                  Back to Customers
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MobilePageContainer>
    );
  }

  return (
    <MobilePageContainer>
      <div className="max-w-2xl mx-auto">
        <MobilePageHeader
          title="New Customer"
          subtitle="Add a new power washing customer"
          icon={<Users className="h-6 w-6 md:h-8 md:w-8 text-cyan-600 shrink-0" />}
          onBack={() => navigate('/power-washing/customers')}
        />

        {/* Customer Type Toggle */}
        <div className="flex justify-center mb-4">
          <ToggleGroup 
            type="single" 
            value={customerMode} 
            onValueChange={(v) => v && setCustomerMode(v as 'residential' | 'business')}
            className="bg-muted p-1 rounded-lg"
          >
            <ToggleGroupItem 
              value="residential" 
              className="data-[state=on]:bg-cyan-600 data-[state=on]:text-white px-4 py-2 rounded-md"
            >
              <Home className="h-4 w-4 mr-2" />
              Residential
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="business" 
              className="data-[state=on]:bg-cyan-600 data-[state=on]:text-white px-4 py-2 rounded-md"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Business Customer
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card className="border-cyan-500/20">
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">
                {customerMode === 'business' ? 'Business Customer Information' : 'Customer Information'}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {customerMode === 'business' 
                  ? 'Enter the business and contact information' 
                  : "Enter the customer's contact and property information"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0 space-y-4 md:space-y-6">
              {/* Business Details Section */}
              {customerMode === 'business' && (
                <div className="space-y-4 border-l-4 border-cyan-500 pl-4 bg-cyan-500/5 rounded-r-lg p-4">
                  <h3 className="font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Business Details
                  </h3>
                  
                  {/* Company Name */}
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="company" className="text-sm">Company Name *</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="ABC Power Washing Co."
                      required
                      className="border-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>

                  {/* Business Type & Industry */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="business_type" className="text-sm">Business Type</Label>
                      <Select 
                        value={formData.business_type} 
                        onValueChange={(value) => handleInputChange('business_type', value)}
                      >
                        <SelectTrigger className="border-cyan-500/20 focus:border-cyan-500">
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corporation">Corporation</SelectItem>
                          <SelectItem value="llc">LLC</SelectItem>
                          <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="nonprofit">Non-Profit</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="business_industry" className="text-sm">Industry</Label>
                      <Select 
                        value={formData.business_industry} 
                        onValueChange={(value) => {
                          handleInputChange('business_industry', value);
                          if (value !== 'other') setCustomIndustry('');
                        }}
                      >
                        <SelectTrigger className="border-cyan-500/20 focus:border-cyan-500">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredIndustries.map((industry) => (
                            <SelectItem key={industry.value} value={industry.value}>
                              {industry.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Custom Industry Input - shown when "Other" is selected */}
                      {formData.business_industry === 'other' && (
                        <div className="mt-2">
                          <Input
                            value={customIndustry}
                            onChange={(e) => setCustomIndustry(e.target.value)}
                            placeholder="Enter new industry name"
                            className="border-cyan-500/20 focus:border-cyan-500"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            This will be added to the industry list for future use
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tax ID */}
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="tax_id" className="text-sm">Tax ID / EIN (Optional)</Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => handleInputChange('tax_id', e.target.value)}
                      placeholder="XX-XXXXXXX"
                      className="border-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>

                  {/* Business Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="business_phone" className="text-sm">Business Phone</Label>
                      <Input
                        id="business_phone"
                        type="tel"
                        value={formData.business_phone}
                        onChange={(e) => handleInputChange('business_phone', e.target.value)}
                        placeholder="(555) 123-4567"
                        className="border-cyan-500/20 focus:border-cyan-500"
                      />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="business_email" className="text-sm">Business Email</Label>
                      <Input
                        id="business_email"
                        type="email"
                        value={formData.business_email}
                        onChange={(e) => handleInputChange('business_email', e.target.value)}
                        placeholder="info@company.com"
                        className="border-cyan-500/20 focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* Contact Person / Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="first_name" className="text-sm">
                    {customerMode === 'business' ? 'Contact First Name' : 'First Name *'}
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    placeholder="John"
                    required={customerMode === 'residential'}
                    className="border-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="last_name" className="text-sm">
                    {customerMode === 'business' ? 'Contact Last Name' : 'Last Name *'}
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder="Smith"
                    required={customerMode === 'residential'}
                    className="border-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Contact Row - Only show for residential or as secondary contact for business */}
              {customerMode === 'residential' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="phone" className="text-sm">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="border-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="john@example.com"
                      className="border-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Property Type & Preferred Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="property_type" className="text-sm">Property Type</Label>
                  <Select 
                    value={formData.property_type} 
                    onValueChange={(value) => handleInputChange('property_type', value)}
                  >
                    <SelectTrigger className="border-cyan-500/20 focus:border-cyan-500">
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerMode === 'residential' ? (
                        <>
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="hoa">HOA</SelectItem>
                          <SelectItem value="multi_family">Multi-Family</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="industrial">Industrial</SelectItem>
                          <SelectItem value="fleet">Fleet</SelectItem>
                          <SelectItem value="multi_location">Multi-Location</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="preferred_contact" className="text-sm">Preferred Contact</Label>
                  <Select 
                    value={formData.preferred_contact} 
                    onValueChange={(value) => handleInputChange('preferred_contact', value)}
                  >
                    <SelectTrigger className="border-cyan-500/20 focus:border-cyan-500">
                      <SelectValue placeholder="Select contact method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="text">Text Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Address with Autocomplete */}
              <div className="space-y-3 md:space-y-4">
                <Label className="text-sm">Service Address</Label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(value) => handleInputChange('address', value)}
                  onSelect={handleAddressSelect}
                  placeholder="Start typing an address..."
                  className="border-cyan-500/20 focus:border-cyan-500"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
                  <div className="col-span-2">
                    <Input
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="City"
                      className="border-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                  <Input
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="State"
                    className="border-cyan-500/20 focus:border-cyan-500"
                  />
                  <Input
                    value={formData.zip}
                    onChange={(e) => handleInputChange('zip', e.target.value)}
                    placeholder="ZIP"
                    className="border-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
                {formData.latitude && formData.longitude && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      📍 Location captured: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                    </p>
                    <MiniMapPreview
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                      onLocationChange={(lat, lng) => {
                        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                      }}
                      className="h-48 border border-cyan-500/20"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="notes" className="text-sm">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Special instructions, gate codes, pet info, preferred scheduling times..."
                  rows={3}
                  className="border-cyan-500/20 focus:border-cyan-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 md:gap-3 mt-4 md:mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/power-washing/customers')}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-cyan-600 hover:bg-cyan-700 w-full sm:w-auto"
              disabled={createMutation.isPending || shopIdLoading || !shopId}
            >
              {shopIdLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Customer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </MobilePageContainer>
  );
}
