import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  CalendarIcon, 
  User, 
  Building2,
  DollarSign,
  Clock,
  Users,
  MapPin,
  UserPlus
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePowerWashingServices, useCreatePowerWashingJob } from '@/hooks/usePowerWashing';
import { useAuth } from '@/hooks/useAuth';
import { useShopId } from '@/hooks/useShopId';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CrewAssignmentPicker } from '@/components/power-washing/CrewAssignmentPicker';
import { CustomerSearchPicker } from '@/components/power-washing/CustomerSearchPicker';
import { RouteAssignmentPicker } from '@/components/power-washing/RouteAssignmentPicker';
import { AddressAutocomplete, AddressResult } from '@/components/shared/AddressAutocomplete';
import { PropertyAreaPicker } from '@/components/power-washing/PropertyAreaPicker';

const PROPERTY_TYPES = [
  { value: 'residential_home', label: 'Residential Home' },
  { value: 'commercial_building', label: 'Commercial Building' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'apartment_complex', label: 'Apartment Complex' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'parking_lot', label: 'Parking Lot/Garage' },
  { value: 'driveway', label: 'Driveway' },
  { value: 'deck_patio', label: 'Deck/Patio' },
  { value: 'fence', label: 'Fence' },
  { value: 'roof', label: 'Roof' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'high', label: 'High', color: 'bg-amber-500/10 text-amber-600' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500/10 text-red-600' },
];

interface SelectedCustomer {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

export default function PowerWashingJobCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customer');
  
  const { user } = useAuth();
  const { data: services } = usePowerWashingServices();
  const createJob = useCreatePowerWashingJob();
  
  const { shopId, loading: shopLoading } = useShopId();
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [isLoadingPreselected, setIsLoadingPreselected] = useState(!!preselectedCustomerId);

  // Form state
  const [formData, setFormData] = useState({
    // Customer Info (for new customer mode)
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    // Property Info
    propertyType: '',
    propertyAddress: '',
    propertyCity: '',
    propertyState: '',
    propertyZip: '',
    propertyLatitude: null as number | null,
    propertyLongitude: null as number | null,
    squareFootage: '',
    // Job Details
    serviceId: '',
    priority: 'normal',
    scheduledDate: null as Date | null,
    scheduledTimeStart: '',
    scheduledTimeEnd: '',
    // Route
    routeId: null as string | null,
    // Pricing
    quotedPrice: '',
    depositAmount: '',
    depositPaid: false,
    // Notes
    customerNotes: '',
    internalNotes: '',
    specialInstructions: '',
    // Crew
    assignedCrew: [] as string[],
  });

  // Fetch preselected customer from URL parameter
  useEffect(() => {
    const fetchPreselectedCustomer = async () => {
      if (!preselectedCustomerId) {
        setIsLoadingPreselected(false);
        return;
      }
      if (!shopId) return; // Wait for shopId

      setIsLoadingPreselected(true);

      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone, company, address, city, state, postal_code, latitude, longitude')
        .eq('id', preselectedCustomerId)
        .eq('shop_id', shopId)
        .maybeSingle();

      if (customer && !error) {
        setSelectedCustomer(customer);
        // Auto-populate the property address fields
        if (customer.address) {
          setFormData(prev => ({
            ...prev,
            propertyAddress: customer.address || '',
            propertyCity: customer.city || '',
            propertyState: customer.state || '',
            propertyZip: customer.postal_code || '',
            propertyLatitude: customer.latitude,
            propertyLongitude: customer.longitude,
          }));
        }
      } else if (error) {
        console.error('Failed to fetch preselected customer:', error);
      }
      setIsLoadingPreselected(false);
    };

    fetchPreselectedCustomer();
  }, [preselectedCustomerId, shopId]);

  // Handle customer selection - auto-populate property address
  const handleCustomerSelect = (customer: SelectedCustomer | null) => {
    setSelectedCustomer(customer);
    
    if (customer && customer.address) {
      // Prompt user to use customer's address
      setFormData(prev => ({
        ...prev,
        propertyAddress: customer.address || '',
        propertyCity: customer.city || '',
        propertyState: customer.state || '',
        propertyZip: customer.postal_code || '',
        propertyLatitude: customer.latitude,
        propertyLongitude: customer.longitude,
      }));
    }
  };

  const handleAddressSelect = (result: AddressResult) => {
    setFormData(prev => ({
      ...prev,
      propertyAddress: result.streetAddress,
      propertyCity: result.city,
      propertyState: result.state,
      propertyZip: result.postalCode,
      propertyLatitude: result.latitude,
      propertyLongitude: result.longitude,
    }));
  };

  const selectedService = services?.find(s => s.id === formData.serviceId);

  // Auto-calculate price based on sqft - returns null if no sqft entered
  const calculateEstimatedPrice = (): number | null => {
    if (!selectedService) return null;
    
    if (formData.squareFootage) {
      const sqft = parseFloat(formData.squareFootage);
      const basePrice = selectedService.base_price_per_sqft * sqft;
      return Math.max(basePrice, selectedService.minimum_price || 0);
    }
    
    return null; // No estimate without sqft
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shopId) {
      toast.error('No shop associated with your account');
      return;
    }

    // Validate customer selection
    if (customerMode === 'existing' && !selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    // Generate job number
    const jobNumber = `PW-${Date.now().toString(36).toUpperCase()}`;

    try {
      const jobData = {
        shop_id: shopId,
        job_number: jobNumber,
        customer_id: customerMode === 'existing' ? selectedCustomer?.id : null,
        service_id: formData.serviceId || null,
        property_type: formData.propertyType || null,
        property_address: formData.propertyAddress || null,
        property_city: formData.propertyCity || null,
        property_state: formData.propertyState || null,
        property_zip: formData.propertyZip || null,
        property_latitude: formData.propertyLatitude,
        property_longitude: formData.propertyLongitude,
        square_footage: formData.squareFootage ? parseFloat(formData.squareFootage) : null,
        priority: formData.priority,
        scheduled_date: formData.scheduledDate ? format(formData.scheduledDate, 'yyyy-MM-dd') : null,
        scheduled_time_start: formData.scheduledTimeStart || null,
        scheduled_time_end: formData.scheduledTimeEnd || null,
        quoted_price: formData.quotedPrice ? parseFloat(formData.quotedPrice) : null,
        deposit_amount: formData.depositAmount ? parseFloat(formData.depositAmount) : null,
        deposit_paid: formData.depositPaid,
        customer_notes: formData.customerNotes || null,
        internal_notes: formData.internalNotes || null,
        special_instructions: formData.specialInstructions || null,
        assigned_crew: formData.assignedCrew.length > 0 ? formData.assignedCrew : null,
        status: formData.scheduledDate ? 'scheduled' : 'pending',
        created_by: user?.id || null,
      };

      const createdJob = await createJob.mutateAsync(jobData);

      // If route is selected, add job to route stops
      if (formData.routeId && createdJob?.id) {
        // Get current max stop order for this route
        const { data: existingStops } = await supabase
          .from('power_washing_route_stops')
          .select('stop_order')
          .eq('route_id', formData.routeId)
          .order('stop_order', { ascending: false })
          .limit(1);

        const nextStopOrder = (existingStops?.[0]?.stop_order || 0) + 1;

        // Insert route stop
        await supabase
          .from('power_washing_route_stops')
          .insert({
            route_id: formData.routeId,
            job_id: createdJob.id,
            stop_order: nextStopOrder,
            status: 'pending',
          });

        // Update route total_jobs manually
        const { data: currentRoute } = await supabase
          .from('power_washing_routes')
          .select('total_jobs')
          .eq('id', formData.routeId)
          .single();
        
        await supabase
          .from('power_washing_routes')
          .update({ total_jobs: (currentRoute?.total_jobs || 0) + 1 })
          .eq('id', formData.routeId);
      }

      navigate('/power-washing/jobs');
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  };

  const updateField = (field: string, value: string | boolean | Date | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing/jobs')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create New Job</h1>
            <p className="text-muted-foreground">Schedule a new power washing job</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={customerMode} onValueChange={(v) => setCustomerMode(v as 'existing' | 'new')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Existing Customer
                  </TabsTrigger>
                  <TabsTrigger value="new" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    New Customer
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="existing" className="mt-4">
                  {shopLoading || isLoadingPreselected ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <span className="animate-pulse">Loading customer...</span>
                    </div>
                  ) : shopId ? (
                    <CustomerSearchPicker
                      shopId={shopId}
                      selectedCustomer={selectedCustomer}
                      onSelectCustomer={handleCustomerSelect}
                      onCreateNewCustomer={() => setCustomerMode('new')}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Unable to load customers. Please try refreshing.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="new" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      placeholder="John Smith"
                      value={formData.customerName}
                      onChange={(e) => updateField('customerName', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">Email</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.customerEmail}
                        onChange={(e) => updateField('customerEmail', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerPhone">Phone</Label>
                      <Input
                        id="customerPhone"
                        placeholder="(555) 123-4567"
                        value={formData.customerPhone}
                        onChange={(e) => updateField('customerPhone', e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Note: A new customer record will be created when you submit this job.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Property Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Property Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCustomer?.address && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium">Using customer's address</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.postal_code}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type</Label>
                <Select value={formData.propertyType} onValueChange={(v) => updateField('propertyType', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyAddress">Street Address</Label>
                <AddressAutocomplete
                  value={formData.propertyAddress}
                  onChange={(value) => updateField('propertyAddress', value)}
                  onSelect={handleAddressSelect}
                  placeholder="Start typing an address..."
                />
                {formData.propertyLatitude && formData.propertyLongitude && (
                  <p className="text-xs text-muted-foreground">
                    📍 Location captured: {formData.propertyLatitude.toFixed(4)}, {formData.propertyLongitude.toFixed(4)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="propertyCity">City</Label>
                  <Input
                    id="propertyCity"
                    placeholder="City"
                    value={formData.propertyCity}
                    onChange={(e) => updateField('propertyCity', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyState">State</Label>
                  <Input
                    id="propertyState"
                    placeholder="State"
                    value={formData.propertyState}
                    onChange={(e) => updateField('propertyState', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyZip">ZIP</Label>
                  <Input
                    id="propertyZip"
                    placeholder="ZIP"
                    value={formData.propertyZip}
                    onChange={(e) => updateField('propertyZip', e.target.value)}
                  />
                </div>
              </div>
              {/* Saved Property Areas Picker */}
              {selectedCustomer && (
                <PropertyAreaPicker
                  customerId={selectedCustomer.id}
                  onSelectArea={(area) => {
                    setFormData(prev => ({
                      ...prev,
                      squareFootage: area.square_footage.toString(),
                      propertyType: area.area_type || prev.propertyType,
                    }));
                    toast.success(`Applied ${area.label || 'saved area'}: ${area.square_footage.toLocaleString()} sqft`);
                  }}
                />
              )}

              <div className="space-y-2">
                <Label htmlFor="squareFootage" className="flex items-center gap-2">
                  Square Footage
                  {selectedService && !formData.squareFootage && (
                    <span className="text-destructive text-xs font-normal">← Required for pricing</span>
                  )}
                </Label>
                <Input
                  id="squareFootage"
                  type="number"
                  placeholder="e.g., 2500"
                  value={formData.squareFootage}
                  onChange={(e) => updateField('squareFootage', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Service & Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Service & Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={formData.serviceId} onValueChange={(v) => updateField('serviceId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.filter(s => s.is_active).map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{service.name}</span>
                          {service.base_price_per_sqft && (
                            <span className="text-muted-foreground ml-2">
                              ${service.base_price_per_sqft}/sqft
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedService?.estimated_time_minutes && (
                  <p className="text-sm text-muted-foreground">
                    Est. time: {Math.floor(selectedService.estimated_time_minutes / 60)}h {selectedService.estimated_time_minutes % 60}m
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map(priority => (
                    <Button
                      key={priority.value}
                      type="button"
                      variant={formData.priority === priority.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateField('priority', priority.value)}
                      className={formData.priority === priority.value ? '' : priority.color}
                    >
                      {priority.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.scheduledDate ? format(formData.scheduledDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.scheduledDate || undefined}
                      onSelect={(date) => updateField('scheduledDate', date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.scheduledTimeStart}
                    onChange={(e) => updateField('scheduledTimeStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.scheduledTimeEnd}
                    onChange={(e) => updateField('scheduledTimeEnd', e.target.value)}
                  />
                </div>
              </div>

              {/* Route Assignment */}
              {shopId && (
                <div className="pt-4 border-t">
                  <RouteAssignmentPicker
                    shopId={shopId}
                    scheduledDate={formData.scheduledDate}
                    selectedRouteId={formData.routeId}
                    onSelectRoute={(id) => setFormData(prev => ({ ...prev, routeId: id }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Estimated Price</p>
                {selectedService ? (
                  formData.squareFootage ? (
                    <>
                      <p className="text-2xl font-bold text-primary">
                        ${calculateEstimatedPrice()?.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {parseFloat(formData.squareFootage).toLocaleString()} sqft × ${selectedService.base_price_per_sqft}/sqft
                        {calculateEstimatedPrice() === selectedService.minimum_price && (
                          <span className="ml-1 text-amber-600">(minimum applied)</span>
                        )}
                      </p>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-sm font-medium">
                        Enter square footage to calculate
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rate: ${selectedService.base_price_per_sqft}/sqft • Minimum: ${selectedService.minimum_price}
                      </p>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Select a service first</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quotedPrice">Quoted Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="quotedPrice"
                    type="number"
                    className="pl-7"
                    placeholder="0.00"
                    value={formData.quotedPrice}
                    onChange={(e) => updateField('quotedPrice', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="depositAmount">Deposit Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="depositAmount"
                    type="number"
                    className="pl-7"
                    placeholder="0.00"
                    value={formData.depositAmount}
                    onChange={(e) => updateField('depositAmount', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="depositPaid"
                  checked={formData.depositPaid}
                  onCheckedChange={(checked) => updateField('depositPaid', !!checked)}
                />
                <Label htmlFor="depositPaid" className="cursor-pointer">Deposit has been paid</Label>
              </div>
            </CardContent>
          </Card>

          {/* Crew Assignment */}
          {shopId && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Assign Crew
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CrewAssignmentPicker
                  shopId={shopId}
                  selectedCrew={formData.assignedCrew}
                  onCrewChange={(crew) => setFormData(prev => ({ ...prev, assignedCrew: crew }))}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Notes Section - Full Width */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Notes & Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerNotes">Customer Notes</Label>
                <Textarea
                  id="customerNotes"
                  placeholder="Notes from customer..."
                  rows={3}
                  value={formData.customerNotes}
                  onChange={(e) => updateField('customerNotes', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internalNotes">Internal Notes</Label>
                <Textarea
                  id="internalNotes"
                  placeholder="Notes for crew..."
                  rows={3}
                  value={formData.internalNotes}
                  onChange={(e) => updateField('internalNotes', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                placeholder="Access codes, pet warnings, areas to avoid, etc."
                rows={2}
                value={formData.specialInstructions}
                onChange={(e) => updateField('specialInstructions', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/power-washing/jobs')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createJob.isPending}>
            {createJob.isPending ? 'Creating...' : 'Create Job'}
          </Button>
        </div>
      </form>
    </div>
  );
}
