import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Building2, Phone, Mail, MapPin, Tag, Car } from "lucide-react";
import { CustomerFormValues } from "../schemas/customerSchema";
import { formatPhoneNumber } from "@/utils/formatters";

interface CustomerPreviewProps {
  customerData: CustomerFormValues;
}

export const CustomerPreview: React.FC<CustomerPreviewProps> = ({ customerData }) => {
  const fullName = `${customerData.first_name} ${customerData.last_name}`;
  
  return (
    <Card className="border shadow-sm">
      <CardHeader className="bg-slate-50 pb-2">
        <CardTitle className="text-lg flex items-center">
          <User className="h-5 w-5 mr-2 text-slate-500" />
          Customer Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium">{fullName}</h3>
            {customerData.company && (
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <Building2 className="h-4 w-4 mr-1" />
                {customerData.company}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {customerData.phone && (
              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 mr-2 text-gray-500" />
                {formatPhoneNumber(customerData.phone)}
              </div>
            )}
            
            {customerData.email && (
              <div className="flex items-center text-sm">
                <Mail className="h-4 w-4 mr-2 text-gray-500" />
                {customerData.email}
              </div>
            )}
            
            {customerData.address && (
              <div className="flex items-center text-sm col-span-1 md:col-span-2">
                <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                {customerData.address}
              </div>
            )}
          </div>

          {customerData.tags && customerData.tags.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center mb-1 text-sm text-gray-600">
                <Tag className="h-4 w-4 mr-1" />
                Tags
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {customerData.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-slate-100">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {customerData.vehicles && customerData.vehicles.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center mb-1 text-sm text-gray-600">
                <Car className="h-4 w-4 mr-1" />
                Vehicles
              </div>
              <div className="space-y-2 mt-1">
                {customerData.vehicles.map((vehicle, index) => (
                  <div key={index} className="text-sm border rounded-md p-2 bg-slate-50">
                    {vehicle.year && vehicle.make && vehicle.model ? (
                      <div className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                    ) : (
                      <div className="font-medium text-gray-500">Vehicle {index + 1}</div>
                    )}
                    {vehicle.vin && <div className="text-xs text-gray-600">VIN: {vehicle.vin}</div>}
                    {vehicle.license_plate && <div className="text-xs text-gray-600">License: {vehicle.license_plate}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
