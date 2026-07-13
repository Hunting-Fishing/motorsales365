
import React, { useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle } from "lucide-react";
import { VinDecodeResult } from "@/types/vehicle";
import { toast } from "@/hooks/use-toast";
import { decodeVin } from "@/services/vinDecoderService";
import { VehicleBodyStyle } from "@/types/vehicle";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VinDecoderFieldProps {
  form: any;
  onVehicleDecoded?: (vehicleData: VinDecodeResult) => void;
}

export const VinDecoderField: React.FC<VinDecoderFieldProps> = ({ form, onVehicleDecoded }) => {
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodingError, setDecodingError] = useState<string | null>(null);
  
  const handleVinDecode = async (vinNumber: string) => {
    if (vinNumber.length !== 17) return;
    
    setIsDecoding(true);
    setDecodingError(null);
    
    try {
      const decodedData = await decodeVin(vinNumber);
      
      if (decodedData) {
        // Update form fields with decoded vehicle information
        form.setValue("vehicleMake", decodedData.make || '');
        form.setValue("vehicleModel", decodedData.model || '');
        form.setValue("vehicleYear", decodedData.year?.toString() || '');
        
        // Add additional vehicle details to the form
        if (decodedData.drive_type) form.setValue("driveType", decodedData.drive_type);
        if (decodedData.fuel_type) form.setValue("fuelType", decodedData.fuel_type);
        if (decodedData.transmission) form.setValue("transmission", decodedData.transmission);
        
        // Update the body style if available
        if (decodedData.body_style) {
          const bodyStyle = decodedData.body_style.toLowerCase() as VehicleBodyStyle;
          form.setValue("bodyStyle", bodyStyle);
        }
        
        if (decodedData.country) form.setValue("country", decodedData.country);
        if (decodedData.engine) form.setValue("engine", decodedData.engine);
        
        // Notify parent component
        if (onVehicleDecoded) {
          onVehicleDecoded(decodedData);
        }
        
        toast({
          title: "VIN Decoded Successfully",
          description: `Vehicle identified as ${decodedData.year} ${decodedData.make} ${decodedData.model}`,
          variant: "default",
        });
      } else {
        setDecodingError("VIN decoding service is not available. Please enter vehicle details manually.");
        toast({
          title: "VIN Decode Service Unavailable",
          description: "Please enter vehicle details manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error decoding VIN:", error);
      setDecodingError(error instanceof Error ? error.message : "VIN decoding failed");
      toast({
        title: "VIN Decode Error",
        description: "Please enter vehicle details manually.",
        variant: "destructive",
      });
    } finally {
      setIsDecoding(false);
    }
  };

  return (
    <div className="space-y-2">
      <FormField
        control={form.control}
        name="vin"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              VIN {isDecoding && <Loader2 className="h-4 w-4 inline animate-spin ml-2" />}
            </FormLabel>
            <FormControl>
              <Input 
                {...field} 
                placeholder="Vehicle Identification Number (17 characters)"
                maxLength={17}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  field.onChange(value);
                  setDecodingError(null);
                  if (value.length === 17) {
                    handleVinDecode(value);
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {decodingError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{decodingError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
