import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Droplets, 
  ArrowLeft,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePowerWashingQuote } from '@/hooks/usePowerWashing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const quoteSchema = z.object({
  customer_name: z.string().min(1, 'Name is required'),
  customer_email: z.string().email('Valid email required').optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  property_type: z.string().min(1, 'Property type is required'),
  property_address: z.string().min(1, 'Address is required'),
  property_city: z.string().optional(),
  property_state: z.string().optional(),
  property_zip: z.string().optional(),
  estimated_sqft: z.string().optional(),
  services_requested: z.array(z.string()).min(1, 'Select at least one service'),
  preferred_date: z.string().optional(),
  flexibility: z.string().optional(),
  additional_details: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

const serviceOptions = [
  { id: 'house_washing', label: 'House Washing' },
  { id: 'driveway_cleaning', label: 'Driveway Cleaning' },
  { id: 'deck_cleaning', label: 'Deck Cleaning' },
  { id: 'roof_cleaning', label: 'Roof Cleaning' },
  { id: 'patio_cleaning', label: 'Patio Cleaning' },
  { id: 'fence_cleaning', label: 'Fence Cleaning' },
  { id: 'gutter_cleaning', label: 'Gutter Cleaning' },
  { id: 'commercial', label: 'Commercial Building' },
];

export default function PowerWashingQuoteForm() {
  const navigate = useNavigate();
  const createQuote = useCreatePowerWashingQuote();

  // Get current user's profile to get shop_id
  const { data: profile } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      services_requested: [],
      flexibility: 'flexible',
    },
  });

  const selectedServices = watch('services_requested') || [];

  const toggleService = (serviceId: string) => {
    const current = selectedServices;
    const updated = current.includes(serviceId)
      ? current.filter(s => s !== serviceId)
      : [...current, serviceId];
    setValue('services_requested', updated);
  };

  const onSubmit = async (data: QuoteFormData) => {
    const quoteNumber = `PW-${Date.now().toString(36).toUpperCase()}`;
    
    await createQuote.mutateAsync({
      quote_number: quoteNumber,
      shop_id: profile?.shop_id || '',
      customer_name: data.customer_name,
      customer_email: data.customer_email || null,
      customer_phone: data.customer_phone || null,
      property_type: data.property_type,
      property_address: data.property_address,
      property_city: data.property_city || null,
      property_state: data.property_state || null,
      property_zip: data.property_zip || null,
      estimated_sqft: data.estimated_sqft ? parseFloat(data.estimated_sqft) : null,
      services_requested: data.services_requested,
      preferred_date: data.preferred_date || null,
      flexibility: data.flexibility || null,
      additional_details: data.additional_details || null,
      source: 'manual',
    });

    navigate('/power-washing/quotes');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/power-washing/quotes')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotes
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-blue-500/10 rounded-full w-fit mb-4">
              <Droplets className="h-8 w-8 text-blue-500" />
            </div>
            <CardTitle className="text-2xl">Request a Quote</CardTitle>
            <CardDescription>
              Fill out the form below and we'll get back to you with a free estimate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_name">Name *</Label>
                    <Input
                      id="customer_name"
                      {...register('customer_name')}
                      placeholder="Your full name"
                    />
                    {errors.customer_name && (
                      <p className="text-sm text-destructive mt-1">{errors.customer_name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="customer_phone">Phone</Label>
                    <Input
                      id="customer_phone"
                      {...register('customer_phone')}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customer_email">Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    {...register('customer_email')}
                    placeholder="your@email.com"
                  />
                  {errors.customer_email && (
                    <p className="text-sm text-destructive mt-1">{errors.customer_email.message}</p>
                  )}
                </div>
              </div>

              {/* Property Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Property Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="property_type">Property Type *</Label>
                    <Select onValueChange={(value) => setValue('property_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential Home</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="commercial">Commercial Building</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.property_type && (
                      <p className="text-sm text-destructive mt-1">{errors.property_type.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="estimated_sqft">Estimated Sq Ft</Label>
                    <Input
                      id="estimated_sqft"
                      type="number"
                      {...register('estimated_sqft')}
                      placeholder="e.g., 2000"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="property_address">Address *</Label>
                  <Input
                    id="property_address"
                    {...register('property_address')}
                    placeholder="Street address"
                  />
                  {errors.property_address && (
                    <p className="text-sm text-destructive mt-1">{errors.property_address.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="property_city">City</Label>
                    <Input id="property_city" {...register('property_city')} />
                  </div>
                  <div>
                    <Label htmlFor="property_state">State</Label>
                    <Input id="property_state" {...register('property_state')} />
                  </div>
                  <div>
                    <Label htmlFor="property_zip">ZIP</Label>
                    <Input id="property_zip" {...register('property_zip')} />
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Services Needed *</h3>
                <div className="grid grid-cols-2 gap-3">
                  {serviceOptions.map((service) => (
                    <div
                      key={service.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedServices.includes(service.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleService(service.id)}
                    >
                      <Checkbox
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => toggleService(service.id)}
                      />
                      <span className="text-sm">{service.label}</span>
                    </div>
                  ))}
                </div>
                {errors.services_requested && (
                  <p className="text-sm text-destructive">{errors.services_requested.message}</p>
                )}
              </div>

              {/* Scheduling */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Scheduling Preference</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preferred_date">Preferred Date</Label>
                    <Input
                      id="preferred_date"
                      type="date"
                      {...register('preferred_date')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="flexibility">Flexibility</Label>
                    <Select 
                      defaultValue="flexible"
                      onValueChange={(value) => setValue('flexibility', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="specific_date">Must be this date</SelectItem>
                        <SelectItem value="flexible">Flexible +/- a few days</SelectItem>
                        <SelectItem value="asap">ASAP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <Label htmlFor="additional_details">Additional Details</Label>
                <Textarea
                  id="additional_details"
                  {...register('additional_details')}
                  placeholder="Any special requests, access notes, or other information..."
                  rows={4}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={createQuote.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {createQuote.isPending ? 'Submitting...' : 'Submit Quote Request'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
