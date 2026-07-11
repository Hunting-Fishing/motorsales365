import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Save, Loader2, CheckCircle, Crosshair } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

export default function GunsmithCustomerCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { shopId } = useShopId();
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    preferred_contact: 'phone',
    notes: ''
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!shopId) {
        throw new Error('Shop ID not available');
      }
      
      const fullAddress = [formData.address, formData.city, formData.state, formData.zip]
        .filter(Boolean)
        .join(', ');
      
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          shop_id: shopId,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: fullAddress || null,
          notes: formData.notes || null
        })
        .select()
        .single();
      
      if (error) throw error;
      return customer;
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-customers'] });
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
    
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    
    createMutation.mutate();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Success state - customer created
  if (createdCustomerId) {
    return (
      <MobilePageContainer>
        <div className="max-w-2xl mx-auto">
          <Card className="border-amber-500/30">
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
                  onClick={() => navigate(`/gunsmith/firearms/new?customerId=${createdCustomerId}`)}
                  className="bg-amber-600 hover:bg-amber-700 w-full"
                >
                  <Crosshair className="h-4 w-4 mr-2" />
                  Add a Firearm
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/gunsmith/customers/${createdCustomerId}`)}
                  className="border-amber-600/30 text-amber-600 hover:bg-amber-600/10 w-full"
                >
                  View Customer Profile
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/gunsmith/customers')}
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
          subtitle="Add a new customer to your gunsmith records"
          icon={<Users className="h-6 w-6 md:h-8 md:w-8 text-amber-600 shrink-0" />}
          onBack={() => navigate('/gunsmith/customers')}
        />

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card className="border-amber-500/20">
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Customer Information</CardTitle>
              <CardDescription className="text-xs md:text-sm">Enter the customer's basic contact information</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0 space-y-4 md:space-y-6">
              {/* Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="first_name" className="text-sm">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    placeholder="John"
                    required
                    className="border-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="last_name" className="text-sm">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder="Smith"
                    required
                    className="border-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Contact Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="phone" className="text-sm">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="border-amber-500/20 focus:border-amber-500"
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
                    className="border-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Preferred Contact */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="preferred_contact" className="text-sm">Preferred Contact Method</Label>
                <Select 
                  value={formData.preferred_contact} 
                  onValueChange={(value) => handleInputChange('preferred_contact', value)}
                >
                  <SelectTrigger className="border-amber-500/20 focus:border-amber-500">
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="text">Text Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Address */}
              <div className="space-y-3 md:space-y-4">
                <Label className="text-sm">Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Street Address"
                  className="border-amber-500/20 focus:border-amber-500"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
                  <div className="col-span-2">
                    <Input
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="City"
                      className="border-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <Input
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="State"
                    className="border-amber-500/20 focus:border-amber-500"
                  />
                  <Input
                    value={formData.zip}
                    onChange={(e) => handleInputChange('zip', e.target.value)}
                    placeholder="ZIP"
                    className="border-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="notes" className="text-sm">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes about this customer..."
                  rows={3}
                  className="border-amber-500/20 focus:border-amber-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 md:gap-3 mt-4 md:mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/gunsmith/customers')}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
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