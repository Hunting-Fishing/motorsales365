
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Car, Key, Calendar, Tag, Ruler, Gauge, Fuel, Cog, Flag } from 'lucide-react';

interface VehicleDetailCardProps {
  vehicle: any;
  className?: string;
}

export const VehicleDetailCard: React.FC<VehicleDetailCardProps> = ({ 
  vehicle,
  className = ''
}) => {
  if (!vehicle) return null;

  // Format display of various fields
  const displayYear = vehicle.year || 'Unknown';
  const displayMake = vehicle.make || 'Unknown';
  const displayModel = vehicle.model || 'Unknown';
  const displayVIN = vehicle.vin || 'No VIN recorded';
  const displayLicensePlate = vehicle.license_plate || 'No plate recorded';
  
  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Car className="mr-2 h-5 w-5" />
            <span>{displayYear} {displayMake} {displayModel}</span>
          </CardTitle>
          {vehicle.color && (
            <Badge variant="outline" className="ml-2">
              {vehicle.color}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <Key className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="font-mono text-sm">{displayVIN}</span>
          </div>
          <div className="flex items-center">
            <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="font-mono text-sm">{displayLicensePlate}</span>
          </div>
        </div>
        
        <Separator />
        
        {(vehicle.transmission || vehicle.drive_type || vehicle.fuel_type || vehicle.engine) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {vehicle.transmission && (
              <div className="flex items-center">
                <Cog className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground mr-2">Transmission:</span>
                  {vehicle.transmission} {vehicle.transmission_type && `(${vehicle.transmission_type})`}
                </span>
              </div>
            )}
            
            {vehicle.drive_type && (
              <div className="flex items-center">
                <Gauge className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground mr-2">Drive:</span>
                  {vehicle.drive_type}
                </span>
              </div>
            )}
            
            {vehicle.fuel_type && (
              <div className="flex items-center">
                <Fuel className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground mr-2">Fuel:</span>
                  {vehicle.fuel_type}
                </span>
              </div>
            )}
            
            {vehicle.engine && (
              <div className="flex items-center">
                <Cog className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground mr-2">Engine:</span>
                  {vehicle.engine}
                </span>
              </div>
            )}
          </div>
        )}
        
        {(vehicle.body_style || vehicle.country || vehicle.trim) && (
          <>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {vehicle.body_style && (
                <div className="flex items-center">
                  <Car className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground mr-2">Body Style:</span>
                    {vehicle.body_style}
                  </span>
                </div>
              )}
              
              {vehicle.country && (
                <div className="flex items-center">
                  <Flag className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground mr-2">Made in:</span>
                    {vehicle.country}
                  </span>
                </div>
              )}
              
              {vehicle.trim && (
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground mr-2">Trim:</span>
                    {vehicle.trim}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
        
        {vehicle.last_service_date && (
          <>
            <Separator />
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">
                <span className="text-muted-foreground mr-2">Last Service:</span>
                {new Date(vehicle.last_service_date).toLocaleDateString()}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
