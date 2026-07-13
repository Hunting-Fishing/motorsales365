import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Car, Gauge, Fuel, Settings, Palette, Calendar } from "lucide-react";
import { CustomerVehicle } from "@/types/customer";

interface VehicleInfoDisplayProps {
  vehicle: CustomerVehicle;
}

export const VehicleInfoDisplay: React.FC<VehicleInfoDisplayProps> = ({ vehicle }) => {
  // Group vehicle information by category
  const basicInfo = [
    { label: "Year", value: vehicle.year?.toString() },
    { label: "Make", value: vehicle.make },
    { label: "Model", value: vehicle.model },
    { label: "Trim", value: vehicle.trim },
    { label: "VIN", value: vehicle.vin },
    { label: "License Plate", value: vehicle.license_plate }
  ].filter(item => item.value);

  const technicalSpecs = [
    { label: "GVWR", value: vehicle.gvwr, icon: Gauge },
    { label: "Drive Type", value: vehicle.drive_type, icon: Settings },
    { label: "Engine", value: vehicle.engine, icon: Settings },
    { label: "Fuel Type", value: vehicle.fuel_type, icon: Fuel },
    { label: "Transmission", value: vehicle.transmission, icon: Settings },
    { label: "Transmission Type", value: vehicle.transmission_type, icon: Settings }
  ].filter(item => item.value);

  const additionalDetails = [
    { label: "Body Style", value: vehicle.body_style },
    { label: "Color", value: vehicle.color, icon: Palette },
    { label: "Country", value: vehicle.country },
    { label: "Last Service", value: vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString() : null, icon: Calendar }
  ].filter(item => item.value);

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center">
          <Car className="h-4 w-4 mr-2 text-blue-600" />
          Vehicle Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Information */}
        {basicInfo.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center">
              <Car className="h-3 w-3 mr-1" />
              Basic Information
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {basicInfo.map((item, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <Badge variant="outline" className="justify-start text-xs">
                    {item.value}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Specifications */}
        {technicalSpecs.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center">
                <Settings className="h-3 w-3 mr-1" />
                Technical Specifications
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {technicalSpecs.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={index} className="flex items-center space-x-2">
                      <IconComponent className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-500 min-w-0 flex-shrink-0">{item.label}:</span>
                      <Badge variant="secondary" className="text-xs">
                        {item.value}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Additional Details */}
        {additionalDetails.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Additional Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {additionalDetails.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={index} className="flex items-center space-x-2">
                      {IconComponent && <IconComponent className="h-3 w-3 text-slate-400" />}
                      <span className="text-xs text-slate-500 min-w-0 flex-shrink-0">{item.label}:</span>
                      <Badge variant="outline" className="text-xs">
                        {item.value}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Vehicle Notes */}
        {vehicle.notes && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Notes</h4>
              <div className="p-2 bg-slate-50 rounded-md border">
                <p className="text-xs text-slate-600">{vehicle.notes}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};