import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Users, ArrowLeft, MapPin, Pencil, Trash2, Fuel } from 'lucide-react';
import { useFuelDeliveryCustomers, useCreateFuelDeliveryCustomer, useUpdateFuelDeliveryCustomer, useFuelDeliveryLocations, FuelDeliveryCustomer } from '@/hooks/useFuelDelivery';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressAutocomplete, AddressResult } from '@/components/fuel-delivery/AddressAutocomplete';
import { FuelTypeSelect, CustomerVehicleForm, VehicleFormData } from '@/components/fuel-delivery';
import { supabase } from '@/integrations/supabase/client';
import { geocodeAddress } from '@/utils/geocoding';
import { toast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';
import { RouteUpdateConfirmDialog } from '@/components/fuel-delivery/RouteUpdateConfirmDialog';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';
import { 
  analyzeRouteChanges, 
  regenerateRoutesForCustomer, 
  syncLocationSchedulesWithCustomer,
  deliveryDaysChanged,
  RouteUpdateSummary 
} from '@/services/fuelDelivery/RouteScheduleService';

export default function FuelDeliveryCustomers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<FuelDeliveryCustomer | null>(null);
  const { data: customers, isLoading } = useFuelDeliveryCustomers();
  const { data: allLocations } = useFuelDeliveryLocations();
  const createCustomer = useCreateFuelDeliveryCustomer();
  const updateCustomer = useUpdateFuelDeliveryCustomer();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'fuel_delivery');
  const { getVolumeLabel } = useFuelUnits();
  
  // Track original vehicle IDs from DB to distinguish new vs existing
  const [originalVehicleIds, setOriginalVehicleIds] = useState<Set<string>>(new Set());
  
  // Track original delivery_days for route update detection
  const originalDeliveryDaysRef = useRef<number[]>([]);
  
  // Route update confirmation dialog state
  const [routeUpdateDialogOpen, setRouteUpdateDialogOpen] = useState(false);
  const [routeUpdateSummary, setRouteUpdateSummary] = useState<RouteUpdateSummary | null>(null);
  const [pendingDeliveryDays, setPendingDeliveryDays] = useState<number[]>([]);
  const [pendingCustomerId, setPendingCustomerId] = useState<string | null>(null);
  const [isUpdatingRoutes, setIsUpdatingRoutes] = useState(false);

  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    billing_address: '',
    billing_latitude: null as number | null,
    billing_longitude: null as number | null,
    payment_terms: 'net30',
    credit_limit: '',
    tax_exempt: false,
    auto_delivery: false,
    preferred_fuel_type: '',
    delivery_instructions: '',
    notes: '',
    delivery_days: [] as number[],
    delivery_frequency: 'on_demand',
    preferred_delivery_time: 'any',
    minimum_delivery_gallons: ''
  });

  const DAYS_OF_WEEK = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      delivery_days: prev.delivery_days.includes(day)
        ? prev.delivery_days.filter(d => d !== day)
        : [...prev.delivery_days, day]
    }));
  };

  const [vehicles, setVehicles] = useState<VehicleFormData[]>([]);
  
  // Delivery locations for the current customer being edited
  const customerLocations = editingCustomer 
    ? allLocations?.filter(loc => loc.customer_id === editingCustomer.id) || []
    : [];

  const handleAddressSelect = (result: AddressResult) => {
    setFormData(prev => ({
      ...prev,
      billing_address: result.address,
      billing_longitude: result.coordinates[0],
      billing_latitude: result.coordinates[1],
    }));
  };

  const handleFuelTypeDetected = (fuelType: string) => {
    // Auto-set preferred fuel type if not already set
    if (!formData.preferred_fuel_type) {
      setFormData(prev => ({ ...prev, preferred_fuel_type: fuelType }));
    }
  };

  const filteredCustomers = customers?.filter(customer =>
    customer.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    customer.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    customer.email?.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_name: '',
      phone: '',
      email: '',
      billing_address: '',
      billing_latitude: null,
      billing_longitude: null,
      payment_terms: 'net30',
      credit_limit: '',
      tax_exempt: false,
      auto_delivery: false,
      preferred_fuel_type: '',
      delivery_instructions: '',
      notes: '',
      delivery_days: [],
      delivery_frequency: 'on_demand',
      preferred_delivery_time: 'any',
      minimum_delivery_gallons: ''
    });
    setVehicles([]);
    setOriginalVehicleIds(new Set());
    setEditingCustomer(null);
  };

  const openEditDialog = async (customer: FuelDeliveryCustomer) => {
    setEditingCustomer(customer);
    
    // Store original delivery_days for later comparison
    const originalDays = Array.isArray(customer.delivery_days) ? customer.delivery_days : [];
    originalDeliveryDaysRef.current = originalDays;
    
    setFormData({
      company_name: customer.company_name || '',
      contact_name: customer.contact_name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      billing_address: customer.billing_address || '',
      billing_latitude: customer.billing_latitude || null,
      billing_longitude: customer.billing_longitude || null,
      payment_terms: customer.payment_terms || 'net30',
      credit_limit: customer.credit_limit?.toString() || '',
      tax_exempt: customer.tax_exempt || false,
      auto_delivery: customer.auto_delivery || false,
      preferred_fuel_type: customer.preferred_fuel_type || '',
      delivery_instructions: customer.delivery_instructions || '',
      notes: customer.notes || '',
      delivery_days: originalDays,
      delivery_frequency: customer.delivery_frequency || 'on_demand',
      preferred_delivery_time: customer.preferred_delivery_time || 'any',
      minimum_delivery_gallons: customer.minimum_delivery_gallons?.toString() || ''
    });

    // Fetch existing vehicles for this customer
    try {
      const { data: existingVehicles } = await supabase
        .from('vehicles')
        .select('*')
        .eq('customer_id', customer.id);
      
      if (existingVehicles && existingVehicles.length > 0) {
        // Store the IDs of vehicles from DB to track new vs existing
        setOriginalVehicleIds(new Set(existingVehicles.map(v => v.id)));
        setVehicles(existingVehicles.map(v => ({
          id: v.id,
          vin: v.vin || '',
          year: v.year?.toString() || '',
          make: v.make || '',
          model: v.model || '',
          fuel_type: v.fuel_type || '',
          license_plate: v.license_plate || '',
          color: v.color || '',
          tank_capacity: '', // Extract from notes if available
          body_style: v.body_style || '',
        })));
      } else {
        setOriginalVehicleIds(new Set());
        setVehicles([]);
      }
    } catch (err) {
      console.error('Failed to fetch customer vehicles:', err);
      setOriginalVehicleIds(new Set());
      setVehicles([]);
    }

    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Geocode address if we have address but no coordinates
      let latitude = formData.billing_latitude;
      let longitude = formData.billing_longitude;
      
      if (formData.billing_address && (!latitude || !longitude)) {
        const geocoded = await geocodeAddress(formData.billing_address);
        if (geocoded) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
          toast({ title: 'Address geocoded', description: 'Coordinates captured from address' });
        }
      }
      
      const customerPayload = {
        company_name: formData.company_name,
        contact_name: formData.contact_name,
        phone: formData.phone,
        email: formData.email,
        billing_address: formData.billing_address,
        billing_latitude: latitude,
        billing_longitude: longitude,
        payment_terms: formData.payment_terms,
        credit_limit: parseFloat(formData.credit_limit) || 0,
        tax_exempt: formData.tax_exempt,
        auto_delivery: formData.auto_delivery,
        preferred_fuel_type: formData.preferred_fuel_type,
        delivery_instructions: formData.delivery_instructions,
        notes: formData.notes,
        delivery_days: formData.delivery_days.length > 0 ? formData.delivery_days : undefined,
        delivery_frequency: formData.delivery_frequency,
        preferred_delivery_time: formData.preferred_delivery_time,
        minimum_delivery_gallons: parseFloat(formData.minimum_delivery_gallons) || undefined
      };

      if (editingCustomer) {
        // Update existing customer
        await updateCustomer.mutateAsync({
          id: editingCustomer.id,
          ...customerPayload
        });

        // Handle vehicles for existing customer using originalVehicleIds to track new vs existing
        // Get current vehicle IDs that are still in the form
        const currentVehicleIds = vehicles.map(v => v.id);
        
        // Delete vehicles that were removed (in originalVehicleIds but not in current form)
        const vehiclesToDelete = Array.from(originalVehicleIds).filter(id => !currentVehicleIds.includes(id));
        
        if (vehiclesToDelete.length > 0) {
          await supabase.from('vehicles').delete().in('id', vehiclesToDelete);
        }

        // Upsert vehicles (update existing from DB, insert new ones)
        for (const vehicle of vehicles) {
          const isExistingInDb = originalVehicleIds.has(vehicle.id);
          const vehicleData = {
            customer_id: editingCustomer.id,
            owner_type: 'customer',
            vin: vehicle.vin || null,
            year: vehicle.year ? parseInt(vehicle.year) : null,
            make: vehicle.make || null,
            model: vehicle.model || null,
            fuel_type: vehicle.fuel_type || null,
            license_plate: vehicle.license_plate || null,
            color: vehicle.color || null,
            body_style: vehicle.body_style || null,
            notes: vehicle.tank_capacity ? `Tank Capacity: ${vehicle.tank_capacity} ${getVolumeLabel()}` : null,
          };

          if (isExistingInDb) {
            // Update existing vehicle in DB
            await supabase.from('vehicles').update(vehicleData).eq('id', vehicle.id);
          } else {
            // Insert new vehicle (don't use the temp ID, let DB generate it)
            await supabase.from('vehicles').insert(vehicleData);
          }
        }

        // Check if delivery_days changed and prompt for route update
        if (shopId && deliveryDaysChanged(originalDeliveryDaysRef.current, formData.delivery_days)) {
          try {
            const summary = await analyzeRouteChanges(
              editingCustomer.id,
              null,
              formData.delivery_days,
              shopId
            );
            
            // Only show dialog if there are actual changes
            if (summary.stopsToCreate > 0 || summary.stopsToRemove > 0) {
              setPendingCustomerId(editingCustomer.id);
              setPendingDeliveryDays(formData.delivery_days);
              setRouteUpdateSummary(summary);
              setRouteUpdateDialogOpen(true);
            }
          } catch (err) {
            console.error('Failed to analyze route changes:', err);
          }
        }
      } else {
        // Create customer first
        const newCustomer = await createCustomer.mutateAsync(customerPayload);
        
        if (newCustomer?.id) {
          // Auto-create a fuel_delivery_location if customer has coordinates
          if (formData.billing_latitude && formData.billing_longitude) {
            const { error: locError } = await (supabase as any).from('fuel_delivery_locations').insert({
              customer_id: newCustomer.id,
              location_name: formData.billing_address || 'Primary Location',
              address: formData.billing_address || '',
              latitude: formData.billing_latitude,
              longitude: formData.billing_longitude,
              fuel_type: formData.preferred_fuel_type || 'diesel',
              is_active: true
            });
            if (locError) {
              console.error('Failed to auto-create delivery location:', locError);
            }
          }

          // If vehicles were added, save them linked to the customer
          if (vehicles.length > 0) {
            for (const vehicle of vehicles) {
              const { error } = await supabase.from('vehicles').insert({
                customer_id: newCustomer.id,
                owner_type: 'customer',
                vin: vehicle.vin || null,
                year: vehicle.year ? parseInt(vehicle.year) : null,
                make: vehicle.make || null,
                model: vehicle.model || null,
                fuel_type: vehicle.fuel_type || null,
                license_plate: vehicle.license_plate || null,
                color: vehicle.color || null,
                body_type: vehicle.body_style || null,
                notes: vehicle.tank_capacity ? `Tank Capacity: ${vehicle.tank_capacity} ${getVolumeLabel()}` : null,
              });
              if (error) throw error;
            }
          }
        }
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      // keep dialog open; the mutation already shows a toast
      console.error('Failed to save fuel delivery customer', err);
    }
  };

  // Handle route update confirmation
  const handleRouteUpdateConfirm = async () => {
    if (!pendingCustomerId || !shopId) return;
    
    setIsUpdatingRoutes(true);
    try {
      const result = await regenerateRoutesForCustomer(pendingCustomerId, pendingDeliveryDays, shopId);
      
      // Also sync locations that inherit customer's schedule
      await syncLocationSchedulesWithCustomer(pendingCustomerId, pendingDeliveryDays, shopId);
      
      toast({ 
        title: 'Routes updated',
        description: `Added to ${result.added} routes, removed from ${result.removed} routes`
      });
    } catch (err) {
      console.error('Failed to update routes:', err);
      toast({ 
        title: 'Failed to update routes',
        variant: 'destructive'
      });
    } finally {
      setIsUpdatingRoutes(false);
      setRouteUpdateDialogOpen(false);
      setPendingCustomerId(null);
      setPendingDeliveryDays([]);
      setRouteUpdateSummary(null);
    }
  };

  const handleRouteUpdateSkip = () => {
    setRouteUpdateDialogOpen(false);
    setPendingCustomerId(null);
    setPendingDeliveryDays([]);
    setRouteUpdateSummary(null);
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/fuel-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8 text-orange-600" />
              {moduleInfo?.displayName || 'Fuel Delivery'} Customers
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage customers and accounts
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="ABC Farms Inc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Name *</Label>
                    <Input
                      value={formData.contact_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                      placeholder="John Smith"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      Billing Address
                    </Label>
                    <AddressAutocomplete
                      value={formData.billing_address}
                      onChange={(address) => setFormData(prev => ({ ...prev, billing_address: address }))}
                      onSelect={handleAddressSelect}
                      placeholder="Start typing an address..."
                    />
                    {formData.billing_latitude && formData.billing_longitude && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                        Coordinates captured: {formData.billing_latitude.toFixed(4)}, {formData.billing_longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Select value={formData.payment_terms} onValueChange={(v) => setFormData(prev => ({ ...prev, payment_terms: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cod">COD</SelectItem>
                        <SelectItem value="net15">Net 15</SelectItem>
                        <SelectItem value="net30">Net 30</SelectItem>
                        <SelectItem value="net45">Net 45</SelectItem>
                        <SelectItem value="net60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Credit Limit</Label>
                    <Input
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: e.target.value }))}
                      placeholder="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Fuel Type</Label>
                    <FuelTypeSelect
                      value={formData.preferred_fuel_type}
                      onChange={(v) => setFormData(prev => ({ ...prev, preferred_fuel_type: v }))}
                      placeholder="Select fuel type"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tax Exempt</Label>
                      <Switch
                        checked={formData.tax_exempt}
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, tax_exempt: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <Label>Auto Delivery</Label>
                      <Switch
                        checked={formData.auto_delivery}
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_delivery: v }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Delivery Instructions</Label>
                    <Textarea
                      value={formData.delivery_instructions}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_instructions: e.target.value }))}
                      placeholder="Special instructions for deliveries..."
                    />
                  </div>

                  {/* Scheduling Section */}
                  <div className="col-span-2 border-t pt-4 mt-2">
                    <h3 className="font-medium text-sm mb-3">Delivery Schedule</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label>Preferred Delivery Days</Label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <Button
                              key={day.value}
                              type="button"
                              variant={formData.delivery_days.includes(day.value) ? 'default' : 'outline'}
                              size="sm"
                              className="w-12 h-8"
                              onClick={() => toggleDay(day.value)}
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Delivery Frequency</Label>
                        <Select 
                          value={formData.delivery_frequency} 
                          onValueChange={(v) => setFormData(prev => ({ ...prev, delivery_frequency: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="on_demand">On Demand</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Preferred Time</Label>
                        <Select 
                          value={formData.preferred_delivery_time} 
                          onValueChange={(v) => setFormData(prev => ({ ...prev, preferred_delivery_time: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="morning">Morning (6am-12pm)</SelectItem>
                            <SelectItem value="afternoon">Afternoon (12pm-5pm)</SelectItem>
                            <SelectItem value="evening">Evening (5pm-9pm)</SelectItem>
                            <SelectItem value="any">Any Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Minimum Delivery ({getVolumeLabel(false)})</Label>
                        <Input
                          type="number"
                          value={formData.minimum_delivery_gallons}
                          onChange={(e) => setFormData(prev => ({ ...prev, minimum_delivery_gallons: e.target.value }))}
                          placeholder="100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Section */}
                  <CustomerVehicleForm
                    vehicles={vehicles}
                    onVehiclesChange={setVehicles}
                    onFuelTypeDetected={handleFuelTypeDetected}
                  />
                  
                  {/* Delivery Locations Section - Only show when editing */}
                  {editingCustomer && (
                    <div className="col-span-2 border-t pt-4 mt-2">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-orange-500" />
                          Delivery Locations ({customerLocations.length})
                        </h3>
                      </div>
                      {customerLocations.length > 0 ? (
                        <div className="space-y-2">
                          {customerLocations.map((location) => (
                            <div 
                              key={location.id} 
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm">{location.location_name || location.address}</p>
                                <p className="text-xs text-muted-foreground">{location.address}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {location.fuel_type && (
                                    <Badge variant="outline" className="text-xs">
                                      <Fuel className="h-3 w-3 mr-1" />
                                      {location.fuel_type}
                                    </Badge>
                                  )}
                                  {location.latitude && location.longitude && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                      Has coordinates
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm('Delete this delivery location?')) {
                                    await supabase.from('fuel_delivery_locations').delete().eq('id', location.id);
                                    toast({ title: 'Location deleted' });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No delivery locations set</p>
                          <p className="text-xs mt-1">Use the Routes map to create a delivery location from the billing address</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createCustomer.isPending || updateCustomer.isPending}>
                    {editingCustomer
                      ? updateCustomer.isPending ? 'Saving...' : 'Save Changes'
                      : createCustomer.isPending ? 'Creating...' : 'Create Customer'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{customer.company_name || '-'}</TableCell>
                    <TableCell>{customer.contact_name}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell className="uppercase">{customer.payment_terms}</TableCell>
                    <TableCell>${customer.current_balance?.toLocaleString() || '0'}</TableCell>
                    <TableCell>
                      {customer.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No customers found</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                Add your first customer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route Update Confirmation Dialog */}
      <RouteUpdateConfirmDialog
        open={routeUpdateDialogOpen}
        onOpenChange={setRouteUpdateDialogOpen}
        onConfirm={handleRouteUpdateConfirm}
        onSkip={handleRouteUpdateSkip}
        summary={routeUpdateSummary}
        newDeliveryDays={pendingDeliveryDays}
        entityName={editingCustomer?.company_name || editingCustomer?.contact_name || 'Customer'}
        entityType="customer"
        isProcessing={isUpdatingRoutes}
      />
    </div>
  );
}
