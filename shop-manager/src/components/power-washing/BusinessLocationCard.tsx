import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Loader2, Check, Pencil } from 'lucide-react';
import { usePowerWashingBusinessLocation } from '@/hooks/power-washing/usePowerWashingBusinessLocation';
import { LocationPickerMap } from '@/components/fuel-delivery/settings/LocationPickerMap';

interface BusinessLocationCardProps {
  shopId: string | null;
}

export function BusinessLocationCard({ shopId }: BusinessLocationCardProps) {
  const { location, isLoading, updateLocation, isUpdating } = usePowerWashingBusinessLocation(shopId);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  // Reset pending location when location data changes
  useEffect(() => {
    if (location) {
      setPendingLocation(null);
    }
  }, [location]);

  const handleLocationChange = (loc: { latitude: number; longitude: number; address: string }) => {
    setPendingLocation(loc);
  };

  const handleSave = () => {
    if (!pendingLocation) return;
    
    // Parse address components from the full address
    const addressParts = pendingLocation.address.split(', ');
    const city = addressParts.length > 1 ? addressParts[addressParts.length - 3] : undefined;
    const stateZip = addressParts.length > 0 ? addressParts[addressParts.length - 2] : undefined;
    const [state, postal_code] = stateZip?.split(' ') || [];

    updateLocation({
      business_address: pendingLocation.address,
      business_latitude: pendingLocation.latitude,
      business_longitude: pendingLocation.longitude,
      city,
      state,
      postal_code,
    });
    
    setIsEditing(false);
    setPendingLocation(null);
  };

  const hasLocation = location?.latitude && location?.longitude;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-cyan-500" />
            <div>
              <CardTitle className="text-base">Business Address</CardTitle>
              <CardDescription className="text-xs">
                Your primary business location for service calculations
              </CardDescription>
            </div>
          </div>
          {hasLocation && !isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasLocation || isEditing ? (
          <div className="space-y-4">
            <LocationPickerMap
              latitude={pendingLocation?.latitude || location?.latitude || undefined}
              longitude={pendingLocation?.longitude || location?.longitude || undefined}
              address={pendingLocation?.address || location?.address || undefined}
              onLocationChange={handleLocationChange}
              height="280px"
              placeholder="Search for your business address..."
            />
            
            {pendingLocation && (
              <div className="flex items-start gap-2 p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg border border-cyan-200 dark:border-cyan-800">
                <MapPin className="h-4 w-4 mt-0.5 text-cyan-500 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-cyan-700 dark:text-cyan-300">Selected Location</p>
                  <p className="text-cyan-600 dark:text-cyan-400">{pendingLocation.address}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {isEditing && (
                <Button 
                  variant="outline" 
                  onClick={() => { setIsEditing(false); setPendingLocation(null); }} 
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button 
                onClick={handleSave} 
                disabled={!pendingLocation || isUpdating}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Save Location
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mini map preview */}
            <div className="rounded-lg overflow-hidden border h-[200px]">
              <LocationPickerMap
                latitude={location.latitude || undefined}
                longitude={location.longitude || undefined}
                address={location.address || undefined}
                onLocationChange={() => {}} // Read-only in preview mode
                height="200px"
              />
            </div>
            
            {/* Address display */}
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30 rounded-lg border border-cyan-200 dark:border-cyan-800">
              <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-cyan-700 dark:text-cyan-300">Business HQ</p>
                <p className="text-sm text-cyan-600 dark:text-cyan-400 break-words">
                  {location.address || `${location.latitude?.toFixed(6)}, ${location.longitude?.toFixed(6)}`}
                </p>
                {(location.city || location.state) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {[location.city, location.state, location.postal_code].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
