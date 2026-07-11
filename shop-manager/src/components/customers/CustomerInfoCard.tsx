
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Building2, Calendar, Car } from "lucide-react";
import { Customer, getCustomerFullName } from "@/types/customer";

interface CustomerInfoCardProps {
  customer: Customer & { name?: string, dateAdded?: string };
}

export const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({ customer }) => {
  const customerName = customer.name || getCustomerFullName(customer);
  const dateAdded = customer.dateAdded || customer.created_at;
  
  return (
    <Card className="md:col-span-1">
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="text-lg">Customer Information</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start">
            <Mail className="h-5 w-5 text-slate-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-500">Email</p>
              <p className="text-sm">{customer.email}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <Phone className="h-5 w-5 text-slate-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-500">Phone</p>
              <p className="text-sm">{customer.phone}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <MapPin className="h-5 w-5 text-slate-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-500">Address</p>
              <p className="text-sm">{customer.address}</p>
            </div>
          </div>
          
          {customer.company && (
            <div className="flex items-start">
              <Building2 className="h-5 w-5 text-slate-500 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-500">Company</p>
                <p className="text-sm">{customer.company}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-start">
            <Calendar className="h-5 w-5 text-slate-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-500">Customer Since</p>
              <p className="text-sm">{new Date(dateAdded).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Vehicle Information */}
          {customer.vehicles && customer.vehicles.length > 0 && (
            <div className="flex items-start">
              <Car className="h-5 w-5 text-slate-500 mr-2 mt-0.5" />
              <div className="w-full">
                <p className="text-sm font-medium text-slate-500 mb-2">Vehicles ({customer.vehicles.length})</p>
                <div className="space-y-2">
                  {customer.vehicles.slice(0, 3).map((vehicle, index) => (
                    <div key={vehicle.id || index} className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </span>
                        {vehicle.license_plate && (
                          <Badge variant="outline" className="text-xs">
                            {vehicle.license_plate}
                          </Badge>
                        )}
                      </div>
                      {vehicle.vin && (
                        <p className="text-xs text-slate-500">VIN: {vehicle.vin}</p>
                      )}
                    </div>
                  ))}
                  {customer.vehicles.length > 3 && (
                    <p className="text-xs text-slate-500">
                      +{customer.vehicles.length - 3} more vehicles
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
