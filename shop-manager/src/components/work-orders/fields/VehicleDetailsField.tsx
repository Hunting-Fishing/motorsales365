
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "react-router-dom";
import { VinDecodeResult } from "@/types/vehicle";
import { Car } from "lucide-react";

// Import refactored components
import { VinDecoderField } from "./VinDecoderField";
import { BasicVehicleFields } from "./BasicVehicleFields";
import { DecodedVehicleFields } from "./DecodedVehicleFields";

interface VehicleDetailsFieldProps {
  form: any;
  isFleetCustomer?: boolean;
}

export const VehicleDetailsField: React.FC<VehicleDetailsFieldProps> = ({ 
  form, 
  isFleetCustomer = false 
}) => {
  const [searchParams] = useSearchParams();
  const vehicleInfo = searchParams.get('vehicleInfo');
  const vehicleId = searchParams.get('vehicleId') || '';
  const [decodedVehicle, setDecodedVehicle] = useState<VinDecodeResult | null>(null);
  
  // Parse vehicle info - assuming format "YEAR MAKE MODEL"
  const vehicleParts = vehicleInfo?.split(' ') || [];
  const vehicleYear = vehicleParts[0] || '';
  const vehicleMake = vehicleParts.length > 1 ? vehicleParts[1] : '';
  const vehicleModel = vehicleParts.length > 2 ? vehicleParts.slice(2).join(' ') : '';
  
  // Handler for when VIN is successfully decoded
  const handleVehicleDecoded = (vehicleData: VinDecodeResult) => {
    console.log("Vehicle decoded with data:", vehicleData);
    setDecodedVehicle(vehicleData);
  };
  
  return (
    <Card className="mb-4 border-esm-blue-100">
      <CardHeader className="pb-3 bg-gradient-to-r from-esm-blue-50 to-transparent">
        <CardTitle className="text-lg flex items-center">
          <Car className="h-5 w-5 mr-2 text-esm-blue-600" />
          Vehicle Information
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* VIN Decoder Field */}
            <VinDecoderField 
              form={form} 
              onVehicleDecoded={handleVehicleDecoded} 
            />

            {/* Basic Vehicle Information Fields */}
            <BasicVehicleFields 
              form={form}
              vehicleMake={vehicleMake}
              vehicleModel={vehicleModel}
              vehicleYear={vehicleYear}
              vehicleId={vehicleId}
              isFleetCustomer={isFleetCustomer}
            />
          </div>

          {/* Additional Decoded Vehicle Fields */}
          <DecodedVehicleFields 
            form={form}
            decodedVehicle={decodedVehicle}
          />
        </div>
      </CardContent>
    </Card>
  );
};
