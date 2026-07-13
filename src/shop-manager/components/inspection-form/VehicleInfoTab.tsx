
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { VehicleBodyStyle, VinDecodeResult } from "@/types/vehicle";
import { decodeVin, getVinValidationError } from "@/services/vinDecoderService";

interface VehicleInfoTabProps {
  vehicleInfo: {
    vin: string;
    make: string;
    model: string;
    year: string;
    licensePlate: string;
    color: string;
    bodyStyle: VehicleBodyStyle;
    mileage: string;
  };
  onVehicleInfoChange: (info: any) => void;
  vehicleId?: string;
  initialBodyStyle?: VehicleBodyStyle;
  onBodyStyleChange?: (style: VehicleBodyStyle) => void;
}

export function VehicleInfoTab({ 
  vehicleInfo,
  onVehicleInfoChange,
  vehicleId,
  initialBodyStyle,
  onBodyStyleChange
}: VehicleInfoTabProps) {
  const [decodingVin, setDecodingVin] = useState(false);
  const [bodyStyle, setBodyStyle] = useState<VehicleBodyStyle>(
    initialBodyStyle || vehicleInfo.bodyStyle || 'sedan'
  );

  const form = useForm({
    defaultValues: vehicleInfo
  });

  useEffect(() => {
    // If vehicleId is provided, we could fetch vehicle details
    if (vehicleId) {
      // Fetch vehicle details here
      console.log("Fetching details for vehicle:", vehicleId);
    }
  }, [vehicleId]);

  const handleDecodeVin = async () => {
    const vin = vehicleInfo.vin?.trim();
    
    const validationError = getVinValidationError(vin);
    if (validationError) {
      toast({
        title: "Invalid VIN",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setDecodingVin(true);

    try {
      // Use the real VIN decoder service
      const decodedInfo = await decodeVin(vin);

      if (decodedInfo) {
        // Update the vehicle info with the decoded data
        onVehicleInfoChange({
          ...vehicleInfo,
          make: decodedInfo.make || vehicleInfo.make,
          model: decodedInfo.model || vehicleInfo.model,
          year: decodedInfo.year?.toString() || vehicleInfo.year,
          bodyStyle: (decodedInfo.body_style as VehicleBodyStyle) || vehicleInfo.bodyStyle,
        });

        toast({
          title: "VIN Decoded",
          description: `${decodedInfo.year || ''} ${decodedInfo.make || ''} ${decodedInfo.model || ''} ${decodedInfo.trim || ''}`.trim(),
        });
      } else {
        toast({
          title: "Decode Failed",
          description: "Could not decode VIN. Please enter vehicle details manually.",
          variant: "destructive",
        });
      }

    } catch (err) {
      console.error("Error decoding VIN:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to decode VIN. Please check the VIN and try again.",
        variant: "destructive",
      });
    } finally {
      setDecodingVin(false);
    }
  };

  const handleBodyStyleChange = (value: VehicleBodyStyle) => {
    setBodyStyle(value);
    onVehicleInfoChange({
      ...vehicleInfo,
      bodyStyle: value
    });
    
    // Call the parent's handler if provided
    if (onBodyStyleChange) {
      onBodyStyleChange(value);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label htmlFor="vin">VIN</Label>
                <div className="flex space-x-2">
                  <Input
                    id="vin"
                    value={vehicleInfo.vin}
                    onChange={(e) =>
                      onVehicleInfoChange({
                        ...vehicleInfo,
                        vin: e.target.value
                      })
                    }
                    placeholder="Vehicle Identification Number"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDecodeVin}
                    disabled={decodingVin}
                  >
                    {decodingVin ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="make">Make</Label>
            <Input
              id="make"
              value={vehicleInfo.make}
              onChange={(e) =>
                onVehicleInfoChange({
                  ...vehicleInfo,
                  make: e.target.value
                })
              }
              placeholder="e.g. Toyota"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={vehicleInfo.model}
              onChange={(e) =>
                onVehicleInfoChange({
                  ...vehicleInfo,
                  model: e.target.value
                })
              }
              placeholder="e.g. Camry"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              value={vehicleInfo.year}
              onChange={(e) =>
                onVehicleInfoChange({
                  ...vehicleInfo,
                  year: e.target.value
                })
              }
              placeholder="e.g. 2020"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licensePlate">License Plate</Label>
            <Input
              id="licensePlate"
              value={vehicleInfo.licensePlate}
              onChange={(e) =>
                onVehicleInfoChange({
                  ...vehicleInfo,
                  licensePlate: e.target.value
                })
              }
              placeholder="License Plate Number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              value={vehicleInfo.color}
              onChange={(e) =>
                onVehicleInfoChange({
                  ...vehicleInfo,
                  color: e.target.value
                })
              }
              placeholder="e.g. Blue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bodyStyle">Body Style</Label>
            <Select 
              value={vehicleInfo.bodyStyle} 
              onValueChange={(value: VehicleBodyStyle) => handleBodyStyleChange(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select body style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedan">Sedan</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="coupe">Coupe</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="wagon">Wagon</SelectItem>
                <SelectItem value="hatchback">Hatchback</SelectItem>
                <SelectItem value="convertible">Convertible</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mileage">Mileage</Label>
            <Input
              id="mileage"
              value={vehicleInfo.mileage}
              onChange={(e) =>
                onVehicleInfoChange({
                  ...vehicleInfo,
                  mileage: e.target.value
                })
              }
              placeholder="e.g. 45000"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
