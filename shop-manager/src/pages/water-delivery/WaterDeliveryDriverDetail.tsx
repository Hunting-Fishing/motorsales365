import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, User, Phone, Mail, Truck, Route, Calendar, MapPin,
  Clock, CheckCircle2, AlertTriangle, Shield, Award, Map
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { WaterDeliveryRouteMap } from '@/components/water-delivery/WaterDeliveryRouteMap';
import { Location } from '@/hooks/useMapbox';
import { useShopId } from '@/hooks/useShopId';

export default function WaterDeliveryDriverDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch driver details
  const { data: driver, isLoading: driverLoading } = useQuery({
    queryKey: ['water-driver-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_delivery_drivers')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch assigned truck
  const { data: assignedTruck } = useQuery({
    queryKey: ['driver-assigned-truck', driver?.assigned_truck_id],
    queryFn: async () => {
      if (!driver?.assigned_truck_id) return null;
      const { data, error } = await supabase
        .from('water_delivery_trucks')
        .select('*')
        .eq('id', driver.assigned_truck_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!driver?.assigned_truck_id,
  });

  // Fetch driver's routes
  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ['driver-routes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_delivery_routes')
        .select(`
          *,
          water_delivery_trucks (truck_number)
        `)
        .eq('driver_id', id)
        .order('route_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch route stops with locations for mapping
  const { data: routeStops } = useQuery({
    queryKey: ['driver-route-stops', routes?.map(r => r.id)],
    queryFn: async () => {
      if (!routes || routes.length === 0) return [];
      const routeIds = routes.slice(0, 5).map(r => r.id);
      const { data, error } = await supabase
        .from('water_delivery_route_stops')
        .select(`
          *,
          water_delivery_locations (
            id, location_name, address, city, state, latitude, longitude
          )
        `)
        .in('route_id', routeIds)
        .order('stop_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!routes && routes.length > 0,
  });

  // Convert stops to map locations
  const mapLocations: Location[] = React.useMemo(() => {
    if (!routeStops) return [];
    return routeStops
      .filter(stop => stop.water_delivery_locations?.latitude && stop.water_delivery_locations?.longitude)
      .map((stop, index) => ({
        id: stop.id,
        address: [
          stop.water_delivery_locations?.address,
          stop.water_delivery_locations?.city,
          stop.water_delivery_locations?.state
        ].filter(Boolean).join(', '),
        coordinates: [
          stop.water_delivery_locations!.longitude!,
          stop.water_delivery_locations!.latitude!
        ] as [number, number],
        name: stop.water_delivery_locations?.location_name || `Stop ${index + 1}`,
        priority: 'normal' as const,
      }));
  }, [routeStops]);

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!routes) return { total: 0, completed: 0, inProgress: 0, planned: 0 };
    return {
      total: routes.length,
      completed: routes.filter(r => r.status === 'completed').length,
      inProgress: routes.filter(r => r.status === 'in_progress').length,
      planned: routes.filter(r => r.status === 'planned').length,
    };
  }, [routes]);

  const getCertExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: 'none', days: 0 };
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return { status: 'expired', days };
    if (days < 30) return { status: 'expiring', days };
    return { status: 'valid', days };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'planned': return <Badge variant="outline">Planned</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (driverLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Button variant="ghost" onClick={() => navigate('/water-delivery/drivers')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Drivers
        </Button>
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Driver not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const licenseExpiry = getCertExpiryStatus(driver.license_expiry);
  const waterCertExpiry = getCertExpiryStatus(driver.water_quality_cert_expiry);
  const tankerExpiry = getCertExpiryStatus(driver.tanker_endorsement_expiry);
  const medicalExpiry = getCertExpiryStatus(driver.medical_card_expiry);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/water-delivery/drivers')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Drivers
        </Button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-cyan-100 flex items-center justify-center">
              <User className="h-8 w-8 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {driver.first_name} {driver.last_name}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                {driver.email && (
                  <span className="flex items-center gap-1 text-sm">
                    <Mail className="h-3 w-3" />
                    {driver.email}
                  </span>
                )}
                {driver.phone && (
                  <span className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3" />
                    {driver.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Badge variant={driver.is_active ? 'default' : 'secondary'} className="text-base px-4 py-1">
            {driver.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Route className="h-6 w-6 mx-auto text-cyan-600 mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Routes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{stats.planned}</p>
            <p className="text-xs text-muted-foreground">Planned</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Assigned Truck */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-cyan-600" />
                  Assigned Truck
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignedTruck ? (
                  <div className="space-y-2">
                    <p className="text-xl font-semibold">{assignedTruck.truck_number}</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{assignedTruck.make} {assignedTruck.model} ({assignedTruck.year})</p>
                      <p>VIN: {assignedTruck.vin || 'N/A'}</p>
                      <p>Capacity: {assignedTruck.tank_capacity_gallons?.toLocaleString()} gal</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => navigate('/water-delivery/trucks')}
                    >
                      View Truck Details
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No truck assigned</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Routes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Route className="h-5 w-5 text-cyan-600" />
                  Recent Routes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {routesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : routes && routes.length > 0 ? (
                  <div className="space-y-2">
                    {routes.slice(0, 5).map(route => (
                      <div key={route.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{route.route_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(route.route_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        {getStatusBadge(route.status)}
                      </div>
                    ))}
                    <Button 
                      variant="link" 
                      className="w-full mt-2"
                      onClick={() => setActiveTab('routes')}
                    >
                      View All Routes
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No routes assigned yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Driver Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-cyan-600" />
                Driver Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">License Number</p>
                  <p className="font-medium">{driver.license_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">License Class</p>
                  <p className="font-medium">{driver.license_class || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">License State</p>
                  <p className="font-medium">{driver.license_state || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hire Date</p>
                  <p className="font-medium">
                    {driver.hire_date ? format(parseISO(driver.hire_date), 'MMM d, yyyy') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hourly Rate</p>
                  <p className="font-medium">
                    {driver.hourly_rate ? `$${Number(driver.hourly_rate).toFixed(2)}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Emergency Contact</p>
                  <p className="font-medium">{driver.emergency_contact_name || 'N/A'}</p>
                  {driver.emergency_contact_phone && (
                    <p className="text-sm text-muted-foreground">{driver.emergency_contact_phone}</p>
                  )}
                </div>
              </div>
              {driver.notes && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{driver.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Routes Tab */}
        <TabsContent value="routes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Route className="h-5 w-5 text-cyan-600" />
                Route History
              </CardTitle>
              <Button 
                size="sm" 
                className="bg-cyan-600 hover:bg-cyan-700"
                onClick={() => navigate('/water-delivery/routes')}
              >
                View All Routes
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {routesLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : routes && routes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Truck</TableHead>
                      <TableHead>Stops</TableHead>
                      <TableHead>Gallons</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map(route => (
                      <TableRow 
                        key={route.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate('/water-delivery/routes')}
                      >
                        <TableCell className="font-medium">{route.route_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(parseISO(route.route_date), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>{route.water_delivery_trucks?.truck_number || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {route.completed_stops || 0}/{route.total_stops || 0}
                          </div>
                        </TableCell>
                        <TableCell>{route.delivered_gallons?.toLocaleString() || '-'}</TableCell>
                        <TableCell>{getStatusBadge(route.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No routes assigned to this driver</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Map className="h-5 w-5 text-cyan-600" />
                Recent Delivery Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mapLocations.length > 0 ? (
                <WaterDeliveryRouteMap
                  destinations={mapLocations}
                  height="500px"
                  showOptimizeButton={mapLocations.length > 1}
                />
              ) : (
                <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No delivery locations with coordinates</p>
                    <p className="text-sm">Complete some routes to see locations on the map</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certifications Tab */}
        <TabsContent value="certifications">
          <div className="grid md:grid-cols-2 gap-4">
            {/* CDL License */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-cyan-600" />
                  CDL License
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">License #</span>
                    <span className="font-medium">{driver.license_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Class</span>
                    <span className="font-medium">{driver.license_class || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">State</span>
                    <span className="font-medium">{driver.license_state || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Expiry</span>
                    <Badge className={
                      licenseExpiry.status === 'expired' ? 'bg-red-500' :
                      licenseExpiry.status === 'expiring' ? 'bg-orange-500' : 'bg-green-500'
                    }>
                      {driver.license_expiry 
                        ? format(parseISO(driver.license_expiry), 'MMM d, yyyy')
                        : 'Not Set'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Water Quality Certification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-500" />
                  Water Quality Certification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={driver.water_quality_certified ? 'bg-green-500' : 'bg-gray-400'}>
                      {driver.water_quality_certified ? 'Certified' : 'Not Certified'}
                    </Badge>
                  </div>
                  {driver.water_quality_certified && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Expiry</span>
                      <Badge className={
                        waterCertExpiry.status === 'expired' ? 'bg-red-500' :
                        waterCertExpiry.status === 'expiring' ? 'bg-orange-500' : 'bg-green-500'
                      }>
                        {driver.water_quality_cert_expiry 
                          ? format(parseISO(driver.water_quality_cert_expiry), 'MMM d, yyyy')
                          : 'Not Set'}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tanker Endorsement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-orange-500" />
                  Tanker Endorsement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={driver.tanker_endorsement ? 'bg-green-500' : 'bg-gray-400'}>
                      {driver.tanker_endorsement ? 'Endorsed' : 'Not Endorsed'}
                    </Badge>
                  </div>
                  {driver.tanker_endorsement && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Expiry</span>
                      <Badge className={
                        tankerExpiry.status === 'expired' ? 'bg-red-500' :
                        tankerExpiry.status === 'expiring' ? 'bg-orange-500' : 'bg-green-500'
                      }>
                        {driver.tanker_endorsement_expiry 
                          ? format(parseISO(driver.tanker_endorsement_expiry), 'MMM d, yyyy')
                          : 'Not Set'}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Medical Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-green-500" />
                  Medical Card
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Expiry</span>
                    <Badge className={
                      medicalExpiry.status === 'expired' ? 'bg-red-500' :
                      medicalExpiry.status === 'expiring' ? 'bg-orange-500' :
                      medicalExpiry.status === 'valid' ? 'bg-green-500' : 'bg-gray-400'
                    }>
                      {driver.medical_card_expiry 
                        ? format(parseISO(driver.medical_card_expiry), 'MMM d, yyyy')
                        : 'Not Set'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
