
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, Mail, MapPin, Car } from 'lucide-react';

interface CustomerInfoDisplayProps {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  equipmentName?: string;
  equipmentType?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleLicensePlate?: string;
  vehicleVin?: string;
}

export const CustomerInfoDisplay: React.FC<CustomerInfoDisplayProps> = ({
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  equipmentName,
  equipmentType,
  vehicleMake,
  vehicleModel,
  vehicleYear,
  vehicleLicensePlate,
  vehicleVin
}) => {
  return (
    <Card className="border-green-100">
      <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-transparent">
        <CardTitle className="text-lg flex items-center">
          <User className="h-5 w-5 mr-2 text-green-600" />
          Customer Information
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Customer Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{customerName || 'Unknown Customer'}</span>
            </div>
            
            {customerEmail && (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{customerEmail}</span>
              </div>
            )}
            
            {customerPhone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{customerPhone}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {customerAddress && (
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                <span className="text-sm text-gray-600">{customerAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle/Equipment Information */}
        {(vehicleMake || vehicleModel || equipmentName) && (
          <div className="border-t pt-4">
            <h4 className="font-medium flex items-center mb-3">
              <Car className="h-4 w-4 mr-2 text-gray-500" />
              Vehicle/Equipment Details
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {vehicleMake && vehicleModel && (
                <div>
                  <span className="text-gray-500">Vehicle:</span>
                  <p className="font-medium">
                    {vehicleYear} {vehicleMake} {vehicleModel}
                  </p>
                </div>
              )}
              
              {vehicleLicensePlate && (
                <div>
                  <span className="text-gray-500">License Plate:</span>
                  <p className="font-medium">{vehicleLicensePlate}</p>
                </div>
              )}
              
              {vehicleVin && (
                <div>
                  <span className="text-gray-500">VIN:</span>
                  <p className="font-medium font-mono text-xs">{vehicleVin}</p>
                </div>
              )}
              
              {equipmentName && (
                <div>
                  <span className="text-gray-500">Equipment:</span>
                  <p className="font-medium">{equipmentName}</p>
                  {equipmentType && (
                    <p className="text-gray-500 text-xs">Type: {equipmentType}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
