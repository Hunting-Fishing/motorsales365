import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Route, ArrowLeft, MapPin, Map, Users, Edit, Trash2, Eye, X, Save, Wand2 } from 'lucide-react';
import { useFuelDeliveryRoutes, useCreateFuelDeliveryRoute, useFuelDeliveryDrivers, useFuelDeliveryTrucks, useFuelDeliveryLocations, useFuelDeliveryCustomers, useFuelDeliveryOrders, useCreateFuelDeliveryLocation, FuelDeliveryRoute, FuelDeliveryCustomer } from '@/hooks/useFuelDelivery';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { RouteMap } from '@/components/fuel-delivery/RouteMap';
import { CustomerMap } from '@/components/fuel-delivery/CustomerMap';
import { Location } from '@/hooks/useMapbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { geocodeAddress } from '@/utils/geocoding';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';
import { GenerateRoutesDialog } from '@/components/fuel-delivery/GenerateRoutesDialog';

export default function FuelDeliveryRoutes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [selectedRoute, setSelectedRoute] = useState<FuelDeliveryRoute | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const { data: routes, isLoading } = useFuelDeliveryRoutes();
  const { data: drivers } = useFuelDeliveryDrivers();
  const { data: trucks } = useFuelDeliveryTrucks();
  const { data: locations } = useFuelDeliveryLocations();
  const { data: customers } = useFuelDeliveryCustomers();
  const { data: orders } = useFuelDeliveryOrders();
  const createRoute = useCreateFuelDeliveryRoute();
  const createLocation = useCreateFuelDeliveryLocation();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'fuel_delivery');

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    route_name: '',
    route_date: '',
    driver_id: '',
    truck_id: '',
    status: 'planned',
    notes: ''
  });
  // Store order IDs for editing stops (since route_stops uses order_id)
  const [editSelectedOrderIds, setEditSelectedOrderIds] = useState<string[]>([]);
  // Store customer IDs for manual customer selection
  const [editSelectedCustomerIds, setEditSelectedCustomerIds] = useState<string[]>([]);

  // Load route stops when a route is selected
  useEffect(() => {
    if (selectedRoute?.id) {
      loadRouteStops(selectedRoute.id);
    }
  }, [selectedRoute?.id]);

  const loadRouteStops = async (routeId: string) => {
    const { data, error } = await supabase
      .from('fuel_delivery_route_stops')
      .select('*, fuel_delivery_orders(*, fuel_delivery_locations(*)), fuel_delivery_customers(*)')
      .eq('route_id', routeId)
      .order('stop_sequence');
    
    if (!error && data) {
      setRouteStops(data);
      // Set selected order IDs for editing
      setEditSelectedOrderIds(data.map((s: any) => s.order_id).filter(Boolean));
      // Set selected customer IDs for editing
      setEditSelectedCustomerIds(data.map((s: any) => s.customer_id).filter(Boolean));
    }
  };

  const handleRouteClick = (route: FuelDeliveryRoute) => {
    setSelectedRoute(route);
    setEditFormData({
      route_name: route.route_name || '',
      route_date: route.route_date || '',
      driver_id: route.driver_id || '',
      truck_id: route.truck_id || '',
      status: route.status || 'planned',
      notes: route.notes || ''
    });
    setIsEditMode(false);
    setIsViewDialogOpen(true);
  };

  const handleUpdateRoute = async () => {
    if (!selectedRoute?.id) return;
    setIsSaving(true);

    try {
      // Update route details
      const totalStops = editSelectedOrderIds.length + editSelectedCustomerIds.length;
      
      const { error: routeError } = await supabase
        .from('fuel_delivery_routes')
        .update({
          route_name: editFormData.route_name,
          route_date: editFormData.route_date,
          driver_id: editFormData.driver_id || null,
          truck_id: editFormData.truck_id || null,
          status: editFormData.status,
          notes: editFormData.notes,
          total_stops: totalStops
        })
        .eq('id', selectedRoute.id);

      if (routeError) throw routeError;

      // Update stops - delete existing and recreate
      await supabase
        .from('fuel_delivery_route_stops')
        .delete()
        .eq('route_id', selectedRoute.id);

      // Insert order-based stops
      let stopSequence = 1;
      if (editSelectedOrderIds.length > 0) {
        const orderStopsToInsert = editSelectedOrderIds.map((orderId) => ({
          route_id: selectedRoute.id,
          order_id: orderId,
          customer_id: null,
          stop_sequence: stopSequence++,
          status: 'pending'
        }));

        const { error: orderStopsError } = await supabase.from('fuel_delivery_route_stops').insert(orderStopsToInsert);
        if (orderStopsError) throw orderStopsError;
      }

      // Insert customer-based stops (without orders)
      if (editSelectedCustomerIds.length > 0) {
        const customerStopsToInsert = editSelectedCustomerIds.map((customerId) => ({
          route_id: selectedRoute.id,
          order_id: null,
          customer_id: customerId,
          stop_sequence: stopSequence++,
          status: 'pending'
        }));

        const { error: customerStopsError } = await supabase.from('fuel_delivery_route_stops').insert(customerStopsToInsert);
        if (customerStopsError) throw customerStopsError;
      }

      toast({ title: 'Route updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-routes'] });
      setIsViewDialogOpen(false);
      setSelectedRoute(null);
    } catch (error: any) {
      console.error('Update route error:', error);
      toast({ title: 'Error updating route', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoute = async () => {
    if (!selectedRoute?.id) return;
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      // Delete stops first
      await supabase
        .from('fuel_delivery_route_stops')
        .delete()
        .eq('route_id', selectedRoute.id);

      // Delete route
      const { error } = await supabase
        .from('fuel_delivery_routes')
        .delete()
        .eq('id', selectedRoute.id);

      if (error) throw error;

      toast({ title: 'Route deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-routes'] });
      setIsViewDialogOpen(false);
      setSelectedRoute(null);
    } catch (error: any) {
      toast({ title: 'Error deleting route', description: error.message, variant: 'destructive' });
    }
  };

  const toggleEditOrder = (orderId: string) => {
    setEditSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const toggleEditCustomer = (customerId: string) => {
    setEditSelectedCustomerIds(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId) 
        : [...prev, customerId]
    );
  };

  // Handle creating a delivery location from a customer's billing address
  const handleCreateLocationFromCustomer = async (customer: FuelDeliveryCustomer) => {
    if (!customer.billing_address) {
      toast({ title: 'No billing address', description: 'Customer has no billing address to use as delivery location', variant: 'destructive' });
      return;
    }

    try {
      // Get coordinates - use existing or geocode the address
      let latitude = customer.billing_latitude;
      let longitude = customer.billing_longitude;
      
      if (!latitude || !longitude) {
        const geocoded = await geocodeAddress(customer.billing_address);
        if (geocoded) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
          
          // Also update the customer record with geocoded coordinates
          await supabase
            .from('fuel_delivery_customers')
            .update({ 
              billing_latitude: latitude, 
              billing_longitude: longitude 
            })
            .eq('id', customer.id);
            
          toast({ title: 'Address geocoded', description: 'Coordinates obtained from billing address' });
        } else {
          toast({ title: 'Geocoding failed', description: 'Could not get coordinates for this address. Please enter a valid address.', variant: 'destructive' });
          return;
        }
      }

      await createLocation.mutateAsync({
        customer_id: customer.id,
        location_name: customer.billing_address?.split(',')[0] || 'Primary Location',
        address: customer.billing_address,
        latitude: latitude,
        longitude: longitude,
        fuel_type: customer.preferred_fuel_type || 'diesel',
        is_active: true,
        delivery_days: customer.delivery_days,
        delivery_frequency: customer.delivery_frequency as any,
        preferred_delivery_time: customer.preferred_delivery_time,
      });
      
      toast({ title: 'Delivery location created', description: `Location created for ${customer.contact_name}` });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-locations'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-customers'] });
    } catch (error: any) {
      toast({ title: 'Error creating location', description: error.message, variant: 'destructive' });
    }
  };

  // Get customers who can be added to a route (have a location entry, or have billing address/coordinates)
  const customersWithLocations = customers?.filter(c => 
    locations?.some(l => l.customer_id === c.id) || 
    c.billing_address || 
    (c.billing_latitude && c.billing_longitude)
  ) || [];

  // Convert locations to map format
  const mapDestinations: Location[] = (locations || [])
    .filter(loc => loc.latitude && loc.longitude)
    .slice(0, 12) // Mapbox optimization supports up to 12 waypoints
    .map(loc => ({
      id: loc.id,
      address: loc.address || '',
      coordinates: [loc.longitude!, loc.latitude!] as [number, number],
      name: loc.location_name || loc.address || 'Unknown',
      priority: 'normal' as const,
    }));

  // Default origin - first location or center of US
  const mapOrigin: [number, number] = mapDestinations.length > 0 
    ? mapDestinations[0].coordinates 
    : [-98.5795, 39.8283];

  const [formData, setFormData] = useState({
    route_name: '',
    route_date: '',
    driver_id: '',
    truck_id: '',
    notes: ''
  });

  // Selected locations/customers for the route
  const [selectedStops, setSelectedStops] = useState<string[]>([]);

  // Available stops: prefer locations with coords, else use customers with coords
  const availableStops = React.useMemo(() => {
    const stops: Array<{
      id: string;
      type: 'location' | 'customer';
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      customerId?: string;
      fuelType?: string;
    }> = [];

    // Add locations with coordinates
    (locations || []).forEach(loc => {
      if (loc.latitude && loc.longitude) {
        const customer = customers?.find(c => c.id === loc.customer_id);
        stops.push({
          id: loc.id,
          type: 'location',
          name: `${customer?.company_name || customer?.contact_name || 'Unknown'} - ${loc.location_name}`,
          address: loc.address || '',
          latitude: loc.latitude,
          longitude: loc.longitude,
          customerId: loc.customer_id,
          fuelType: loc.fuel_type,
        });
      }
    });

    // Add customers with coordinates that don't have a location entry
    const locationCustomerIds = new Set((locations || []).map(l => l.customer_id).filter(Boolean));
    (customers || []).forEach(cust => {
      if (cust.billing_latitude && cust.billing_longitude && !locationCustomerIds.has(cust.id)) {
        stops.push({
          id: `customer-${cust.id}`,
          type: 'customer',
          name: cust.company_name || cust.contact_name || 'Unknown Customer',
          address: cust.billing_address || '',
          latitude: cust.billing_latitude,
          longitude: cust.billing_longitude,
          customerId: cust.id,
          fuelType: cust.preferred_fuel_type,
        });
      }
    });

    return stops;
  }, [locations, customers]);

  const toggleStop = (stopId: string) => {
    setSelectedStops(prev => 
      prev.includes(stopId) 
        ? prev.filter(id => id !== stopId) 
        : [...prev, stopId]
    );
  };

  const filteredRoutes = routes?.filter(route =>
    route.route_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRoute = await createRoute.mutateAsync({
      ...formData,
      driver_id: formData.driver_id || undefined,
      truck_id: formData.truck_id || undefined,
      total_stops: selectedStops.length
    });

    // Create route stops if route was created and stops were selected
    if (newRoute?.id && selectedStops.length > 0) {
      for (let i = 0; i < selectedStops.length; i++) {
        const stopId = selectedStops[i];
        const stop = availableStops.find(s => s.id === stopId);
        if (!stop) continue;

        // For location-based stops, use the customer_id from the location
        // For customer-based stops, extract the customer ID
        const isCustomerStop = stopId.startsWith('customer-');
        const customerId = isCustomerStop 
          ? stopId.replace('customer-', '') 
          : stop.customerId;

        await supabase.from('fuel_delivery_route_stops').insert({
          route_id: newRoute.id,
          customer_id: customerId,
          stop_sequence: i + 1,
          status: 'pending',
        });
      }
    }

    setIsDialogOpen(false);
    setFormData({
      route_name: '',
      route_date: '',
      driver_id: '',
      truck_id: '',
      notes: ''
    });
    setSelectedStops([]);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'planned': return <Badge variant="outline">Planned</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
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
              <Route className="h-8 w-8 text-purple-600" />
              {moduleInfo?.displayName || 'Fuel Delivery'} Routes
            </h1>
            <p className="text-muted-foreground mt-1">
              Plan and manage delivery routes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(true)}>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate from Schedule
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Route
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Route</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Route Name *</Label>
                    <Input
                      value={formData.route_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, route_name: e.target.value }))}
                      placeholder="North County Route"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Route Date *</Label>
                    <Input
                      type="date"
                      value={formData.route_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, route_date: e.target.value }))}
                      required
                    />
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
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Route notes..."
                    />
                  </div>
                  
                  {/* Stop Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      Select Delivery Stops ({selectedStops.length} selected)
                    </Label>
                    {availableStops.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                        {availableStops.map((stop) => (
                          <div
                            key={stop.id}
                            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                              selectedStops.includes(stop.id) 
                                ? 'bg-primary/10 border border-primary' 
                                : 'hover:bg-muted border border-transparent'
                            }`}
                            onClick={() => toggleStop(stop.id)}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                              selectedStops.includes(stop.id) ? 'bg-primary border-primary' : 'border-muted-foreground'
                            }`}>
                              {selectedStops.includes(stop.id) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{stop.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{stop.address}</div>
                            </div>
                            <Badge variant="outline" className="text-xs capitalize">
                              {stop.fuelType || 'diesel'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 border rounded-md text-center">
                        No locations or customers with coordinates available.
                        <br />
                        <span className="text-xs">Add customers with addresses to see them here.</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRoute.isPending}>
                    {createRoute.isPending ? 'Creating...' : 'Create Route'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      {/* Tabs for List/Map view */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Routes List
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Map
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Route Planner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search routes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Routes Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredRoutes && filteredRoutes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Truck</TableHead>
                      <TableHead>Stops</TableHead>
                      <TableHead>Gallons</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                    {filteredRoutes.map((route) => (
                      <TableRow 
                        key={route.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRouteClick(route)}
                      >
                        <TableCell className="font-medium">{route.route_name}</TableCell>
                        <TableCell>{format(new Date(route.route_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {route.fuel_delivery_drivers 
                            ? `${route.fuel_delivery_drivers.first_name} ${route.fuel_delivery_drivers.last_name}`
                            : '-'}
                        </TableCell>
                        <TableCell>{route.fuel_delivery_trucks?.truck_number || '-'}</TableCell>
                        <TableCell>
                          {route.completed_stops || 0}/{route.total_stops || 0}
                        </TableCell>
                        <TableCell>
                          {route.total_gallons_delivered?.toLocaleString() || 0}/{route.total_gallons_planned?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>{getStatusBadge(route.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No routes found</p>
                  <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                    Create your first route
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Customer Locations Map
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Filter customers by delivery schedule (days, frequency) for route planning. Red markers indicate low fuel levels.
              </p>
            </CardHeader>
            <CardContent>
              <CustomerMap
                locations={locations || []}
                customers={customers || []}
                onLocationClick={(loc) => {
                  console.log('Location clicked:', loc);
                }}
                onCreateLocationFromCustomer={handleCreateLocationFromCustomer}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5 text-orange-500" />
                Route Optimization Planner
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Optimize delivery routes for multiple stops. Click "Optimize Route" to find the fastest path.
              </p>
            </CardHeader>
            <CardContent>
              {mapDestinations.length > 0 ? (
                <RouteMap
                  origin={mapOrigin}
                  destinations={mapDestinations.slice(1)} // Skip first as it's the origin
                  showOptimizeButton={true}
                  onOptimizedRoute={(result) => {
                    console.log('Route optimized:', result);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <MapPin className="h-12 w-12 mb-3 opacity-50" />
                  <p className="font-medium">No Locations with Coordinates</p>
                  <p className="text-sm text-center mt-1">
                    Add locations with latitude/longitude to use route optimization
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/fuel-delivery/locations')}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Manage Locations
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View/Edit Route Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                {isEditMode ? 'Edit Route' : 'Route Details'}
              </span>
              <div className="flex items-center gap-2">
                {!isEditMode ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setIsEditMode(true)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleDeleteRoute}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setIsEditMode(false)}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleUpdateRoute} disabled={isSaving}>
                      <Save className="h-4 w-4 mr-1" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedRoute && (
            <div className="space-y-6">
              {isEditMode ? (
                // Edit Mode Form
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Route Name *</Label>
                      <Input
                        value={editFormData.route_name}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, route_name: e.target.value }))}
                        placeholder="Route name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Route Date *</Label>
                      <Input
                        type="date"
                        value={editFormData.route_date}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, route_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Driver</Label>
                      <Select 
                        value={editFormData.driver_id || 'none'} 
                        onValueChange={(v) => setEditFormData(prev => ({ ...prev, driver_id: v === 'none' ? '' : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No driver</SelectItem>
                          {drivers?.filter(d => d.status === 'active').map(driver => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.first_name} {driver.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Truck</Label>
                      <Select 
                        value={editFormData.truck_id || 'none'} 
                        onValueChange={(v) => setEditFormData(prev => ({ ...prev, truck_id: v === 'none' ? '' : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select truck" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No truck</SelectItem>
                          {trucks?.map(truck => (
                            <SelectItem key={truck.id} value={truck.id}>
                              {truck.truck_number} - {truck.make} {truck.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={editFormData.status} 
                      onValueChange={(v) => setEditFormData(prev => ({ ...prev, status: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Route notes..."
                    />
                  </div>

                  {/* Edit Stops - Show available orders */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      Delivery Orders ({editSelectedOrderIds.length} selected)
                    </Label>
                    {(orders && orders.length > 0) ? (
                      <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                        {orders.map((order) => {
                          const location = locations?.find(l => l.id === order.location_id);
                          const customer = customers?.find(c => c.id === order.customer_id);
                          const isSelected = editSelectedOrderIds.includes(order.id);
                          return (
                            <div
                              key={order.id}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-primary/10 border border-primary' 
                                  : 'hover:bg-muted border border-transparent'
                              }`}
                              onClick={() => toggleEditOrder(order.id)}
                            >
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {order.order_number} - {customer?.company_name || customer?.contact_name || 'Unknown'}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {location?.address || 'No location'} • {order.quantity_ordered} gal
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs capitalize">
                                {order.status || 'pending'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 border rounded-md text-center">
                        No orders available.
                      </div>
                    )}
                  </div>

                  {/* Add Customers Directly */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Add Customers ({editSelectedCustomerIds.length} selected)
                    </Label>
                    {customersWithLocations.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                        {customersWithLocations.map((customer) => {
                          const customerLocations = locations?.filter(l => l.customer_id === customer.id) || [];
                          const primaryLocation = customerLocations[0];
                          const isSelected = editSelectedCustomerIds.includes(customer.id);
                          // Don't show customers that already have orders selected
                          const hasOrderSelected = orders?.some(o => 
                            o.customer_id === customer.id && editSelectedOrderIds.includes(o.id)
                          );
                          if (hasOrderSelected) return null;
                          
                          return (
                            <div
                              key={customer.id}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-blue-500/10 border border-blue-500' 
                                  : 'hover:bg-muted border border-transparent'
                              }`}
                              onClick={() => toggleEditCustomer(customer.id)}
                            >
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                isSelected ? 'bg-blue-500 border-blue-500' : 'border-muted-foreground'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {customer.company_name || customer.contact_name || 'Unknown Customer'}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {primaryLocation?.address || customer.billing_address || 'No address'}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Direct
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 border rounded-md text-center">
                        No customers with delivery locations configured.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Route Name</Label>
                      <p className="font-medium">{selectedRoute.route_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Date</Label>
                      <p className="font-medium">{format(new Date(selectedRoute.route_date), 'MMMM d, yyyy')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Driver</Label>
                      <p className="font-medium">
                        {selectedRoute.fuel_delivery_drivers 
                          ? `${selectedRoute.fuel_delivery_drivers.first_name} ${selectedRoute.fuel_delivery_drivers.last_name}`
                          : 'Not assigned'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Truck</Label>
                      <p className="font-medium">{selectedRoute.fuel_delivery_trucks?.truck_number || 'Not assigned'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedRoute.status)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Stops</Label>
                      <p className="font-medium">{selectedRoute.completed_stops || 0}/{selectedRoute.total_stops || 0}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Gallons</Label>
                      <p className="font-medium">
                        {selectedRoute.total_gallons_delivered?.toLocaleString() || 0}/
                        {selectedRoute.total_gallons_planned?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>

                  {selectedRoute.notes && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Notes</Label>
                      <p className="text-sm mt-1">{selectedRoute.notes}</p>
                    </div>
                  )}

                  {/* Route Stops List */}
                  <div>
                    <Label className="text-muted-foreground text-xs flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4" />
                      Delivery Stops
                    </Label>
                    {routeStops.length > 0 ? (
                      <div className="border rounded-md divide-y">
                        {routeStops.map((stop, index) => {
                          const order = stop.fuel_delivery_orders;
                          const location = order?.fuel_delivery_locations;
                          // For order-based stops, get customer from location; for customer-based stops, use directly from join
                          const customer = stop.fuel_delivery_customers || customers?.find(c => c.id === location?.customer_id);
                          // Get address from location, or fall back to customer's billing address
                          const displayAddress = location?.address || customer?.billing_address || 'No address';
                          const displayName = customer?.company_name || customer?.contact_name || location?.location_name || 'Unknown Stop';
                          return (
                            <div key={stop.id} className="p-3 flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {displayName}
                                </p>
                                <p className="text-xs text-muted-foreground">{displayAddress}</p>
                              </div>
                              <Badge variant={stop.status === 'completed' ? 'default' : 'outline'} className="capitalize">
                                {stop.status || 'pending'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 border rounded-md text-center">
                        No stops added to this route
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Routes Dialog */}
      <GenerateRoutesDialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['fuel-delivery-routes'] })}
      />
    </div>
  );
}
