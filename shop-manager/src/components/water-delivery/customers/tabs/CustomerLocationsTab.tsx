import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Plus, Pencil, Clock, Phone, Key, Home, Container, Droplets, Navigation } from 'lucide-react';
import { InfoTooltip } from '../InfoTooltip';
import { AddLocationDialog } from '../AddLocationDialog';
import { EditLocationDialog } from '../EditLocationDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LocationMapPicker } from '../LocationMapPicker';

interface CustomerLocationsTabProps {
  customerId: string;
}

interface Location {
  id: string;
  location_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  access_instructions: string | null;
  gate_code: string | null;
  delivery_window_start: string | null;
  delivery_window_end: string | null;
  special_equipment_needed: string | null;
  notes: string | null;
  is_primary: boolean | null;
  is_active: boolean | null;
  customer_id: string;
  latitude: number | null;
  longitude: number | null;
}

// Helper to detect location type from name
function detectLocationType(name: string): 'residence' | 'cistern' | 'well' {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('cistern')) return 'cistern';
  if (lowerName.includes('well')) return 'well';
  return 'residence';
}

// Get icon for location type
function getLocationIcon(name: string) {
  const type = detectLocationType(name);
  switch (type) {
    case 'cistern':
      return <Container className="h-5 w-5 text-blue-600" />;
    case 'well':
      return <Droplets className="h-5 w-5 text-cyan-600" />;
    default:
      return <Home className="h-5 w-5 text-green-600" />;
  }
}

export function CustomerLocationsTab({ customerId }: CustomerLocationsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const { data: locations, isLoading } = useQuery({
    queryKey: ['water-delivery-customer-locations', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_delivery_locations')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_primary', { ascending: false })
        .order('location_name');
      if (error) throw error;
      return (data || []) as Location[];
    },
    enabled: !!customerId,
  });

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>;
  }

  const formatTime = (time: string | null) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const openDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Delivery Locations</h3>
          <InfoTooltip content="Delivery locations are the physical addresses where water will be delivered. Each customer can have multiple locations (e.g., main office, warehouse). The site contact is the person at that specific location, which may differ from the main customer contact." />
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {locations && locations.length > 0 ? (
        <div className="grid gap-4">
          {locations.map((loc) => {
            const hasCoordinates = loc.latitude != null && loc.longitude != null;
            
            return (
              <Card key={loc.id} className={!loc.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getLocationIcon(loc.location_name)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{loc.location_name}</p>
                          {loc.is_primary && (
                            <Badge variant="default" className="text-xs">Primary</Badge>
                          )}
                          <Badge variant={loc.is_active ? 'outline' : 'secondary'}>
                            {loc.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {[loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(', ') || 'No address'}
                        </p>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          {loc.contact_name && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{loc.contact_name}{loc.contact_phone && `: ${loc.contact_phone}`}</span>
                            </div>
                          )}
                          {(loc.delivery_window_start || loc.delivery_window_end) && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatTime(loc.delivery_window_start)} - {formatTime(loc.delivery_window_end)}
                              </span>
                            </div>
                          )}
                          {loc.gate_code && (
                            <div className="flex items-center gap-1">
                              <Key className="h-3 w-3" />
                              <span>Gate: {loc.gate_code}</span>
                            </div>
                          )}
                          {hasCoordinates && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}</span>
                            </div>
                          )}
                        </div>

                        {loc.access_instructions && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {loc.access_instructions}
                          </p>
                        )}
                        
                        {loc.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {loc.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hasCoordinates && (
                        <>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" title="View on map">
                                <MapPin className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-2" align="end">
                              <div className="space-y-2">
                                <p className="text-sm font-medium">{loc.location_name}</p>
                                <LocationMapPicker
                                  latitude={loc.latitude}
                                  longitude={loc.longitude}
                                  onLocationChange={() => {}} // Read-only view
                                  locationType={detectLocationType(loc.location_name)}
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Get directions"
                            onClick={() => openDirections(loc.latitude!, loc.longitude!)}
                          >
                            <Navigation className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingLocation(loc)}
                        title="Edit location"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No locations found. Add a delivery location to get started.
          </CardContent>
        </Card>
      )}

      <AddLocationDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        customerId={customerId}
      />

      <EditLocationDialog
        open={!!editingLocation}
        onOpenChange={(open) => !open && setEditingLocation(null)}
        location={editingLocation}
      />
    </div>
  );
}
