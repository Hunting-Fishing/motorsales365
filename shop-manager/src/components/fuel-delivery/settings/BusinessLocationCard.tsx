import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Loader2, Check } from 'lucide-react';
import { useBusinessLocation } from '@/hooks/fuel-delivery/useBusinessLocation';
import { LocationPickerMap } from './LocationPickerMap';

interface BusinessLocationCardProps {
  shopId: string | null;
}

export function BusinessLocationCard({ shopId }: BusinessLocationCardProps) {
  const { location, isLoading, updateLocation, isUpdating } = useBusinessLocation(shopId);
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
    
    updateLocation({
      business_address: pendingLocation.address,
      business_latitude: pendingLocation.latitude,
      business_longitude: pendingLocation.longitude,
    });
    
    setIsEditing(false);
    setPendingLocation(null);
  };

  const hasLocation = location?.business_latitude && location?.business_longitude;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" />
            <div>
              <CardTitle className="text-base">Business Headquarters</CardTitle>
              <CardDescription className="text-xs">
                Primary location for delivery zone calculations
              </CardDescription>
            </div>
          </div>
          {hasLocation && !isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              Change
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
            {/* Address display above map */}
            {pendingLocation && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                <MapPin className="h-4 w-4 mt-0.5 text-orange-500 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-orange-700 dark:text-orange-300">Selected Location</p>
                  <p className="text-orange-600 dark:text-orange-400">{pendingLocation.address}</p>
                </div>
              </div>
            )}
            
            <LocationPickerMap
              latitude={pendingLocation?.latitude || location?.business_latitude}
              longitude={pendingLocation?.longitude || location?.business_longitude}
              address={pendingLocation?.address || location?.business_address}
              onLocationChange={handleLocationChange}
              height="280px"
              placeholder="Search for your business address..."
            />

            <div className="flex gap-2">
              {isEditing && (
                <Button variant="outline" onClick={() => { setIsEditing(false); setPendingLocation(null); }} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button 
                onClick={handleSave} 
                disabled={!pendingLocation || isUpdating}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
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
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-orange-700 dark:text-orange-300">Business HQ Set</p>
              <p className="text-sm text-orange-600 dark:text-orange-400 break-words">
                {location?.business_address || `${location?.business_latitude?.toFixed(6)}, ${location?.business_longitude?.toFixed(6)}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Delivery zones will be calculated from this location by default
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
