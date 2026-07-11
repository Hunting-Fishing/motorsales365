
import React from "react";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  Car, 
  User, 
  Tag, 
  FileText, 
  AlertTriangle, 
  Clock, 
  Info
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerVehicle, formatVehicleYear } from "@/types/customer/vehicle";

interface VehicleDetailHeaderProps {
  vehicle: CustomerVehicle;
  customerName: string;
  customerId: string;
}

export const VehicleDetailHeader: React.FC<VehicleDetailHeaderProps> = ({
  vehicle,
  customerName,
  customerId,
}) => {
  // Show alert if the vehicle has no service history
  const noServiceHistoryAlert = !vehicle.last_service_date && (
    <div className="flex items-center gap-2 text-amber-600 text-sm">
      <AlertTriangle className="h-4 w-4" />
      <span>No service history recorded</span>
    </div>
  );

  // Format year to handle both string and number types
  const year = formatVehicleYear(vehicle.year);

  // Extract NHTSA information to display
  const hasNhtsaInfo = vehicle.transmission || vehicle.drive_type || 
                      vehicle.fuel_type || vehicle.engine || 
                      vehicle.body_style || vehicle.country || 
                      vehicle.transmission_type || vehicle.gvwr;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-slate-600" />
            <h2 className="text-xl font-semibold">
              {year} {vehicle.make || 'Unknown Make'} {vehicle.model || 'Unknown Model'} {vehicle.trim && <span className="text-slate-600">{vehicle.trim}</span>}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <User className="h-4 w-4" />
            <Link to={`/customers/${customerId}`} className="hover:underline">
              {customerName || 'Unknown Customer'}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-600 text-sm">
            {vehicle.license_plate && (
              <div className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                <span>Plate: {vehicle.license_plate}</span>
              </div>
            )}
            {vehicle.vin && (
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>VIN: {vehicle.vin}</span>
              </div>
            )}
            {vehicle.last_service_date && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  Last Service:{" "}
                  {new Date(vehicle.last_service_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {noServiceHistoryAlert}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/customers/${customerId}/edit?vehicleId=${vehicle.id}`}>
              Edit Vehicle
            </Link>
          </Button>
        </div>
      </div>

      {/* NHTSA Information Card - Quickly visible to the user */}
      {hasNhtsaInfo && (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-700">
              <Info className="h-4 w-4" />
              <span>Vehicle Specifications</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1 text-sm">
              {vehicle.transmission && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Transmission:</span>
                  <span>{vehicle.transmission}</span>
                </div>
              )}
              {vehicle.transmission_type && vehicle.transmission_type !== vehicle.transmission && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Trans. Type:</span>
                  <span>{vehicle.transmission_type}</span>
                </div>
              )}
              {vehicle.drive_type && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Drive Type:</span>
                  <span>{vehicle.drive_type}</span>
                </div>
              )}
              {vehicle.fuel_type && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Fuel:</span>
                  <span>{vehicle.fuel_type}</span>
                </div>
              )}
              {vehicle.engine && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Engine:</span>
                  <span>{vehicle.engine}</span>
                </div>
              )}
              {vehicle.body_style && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Bodyclass:</span>
                  <span>{vehicle.body_style}</span>
                </div>
              )}
              {vehicle.trim && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Trim:</span>
                  <span>{vehicle.trim}</span>
                </div>
              )}
              {vehicle.country && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Origin:</span>
                  <span>{vehicle.country}</span>
                </div>
              )}
              {vehicle.gvwr && (
                <div className="flex justify-between">
                  <span className="text-slate-500">GVWR:</span>
                  <span>{vehicle.gvwr}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
