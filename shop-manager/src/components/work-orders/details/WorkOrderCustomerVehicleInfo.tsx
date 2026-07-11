
import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Car, Phone, Mail, MapPin } from 'lucide-react';

interface WorkOrderCustomerVehicleInfoProps {
  workOrder: WorkOrder;
}

export function WorkOrderCustomerVehicleInfo({ workOrder }: WorkOrderCustomerVehicleInfoProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-medium">{workOrder.customer_name || 'Unknown Customer'}</p>
            {workOrder.customer_email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {workOrder.customer_email}
              </div>
            )}
            {workOrder.customer_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {workOrder.customer_phone}
              </div>
            )}
            {(workOrder.customer_address || workOrder.customer_city || workOrder.customer_state) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {[workOrder.customer_address, workOrder.customer_city, workOrder.customer_state]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-medium">
              {[workOrder.vehicle_year, workOrder.vehicle_make, workOrder.vehicle_model]
                .filter(Boolean)
                .join(' ') || 'Vehicle information not available'}
            </p>
            {workOrder.vehicle_vin && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">VIN:</span> {workOrder.vehicle_vin}
              </div>
            )}
            {workOrder.vehicle_license_plate && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">License:</span> {workOrder.vehicle_license_plate}
              </div>
            )}
            {workOrder.vehicle_odometer && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Odometer:</span> {workOrder.vehicle_odometer} miles
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
