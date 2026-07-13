
import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Calendar, Hash, Gauge } from 'lucide-react';

interface WorkOrderVehicleInfoProps {
  workOrder: WorkOrder;
}

export function WorkOrderVehicleInfo({ workOrder }: WorkOrderVehicleInfoProps) {
  const vehicleInfo = [
    { 
      label: 'Make/Model', 
      value: `${workOrder.vehicle_make || ''} ${workOrder.vehicle_model || ''}`.trim() || 'Not specified',
      icon: Car 
    },
    { 
      label: 'Year', 
      value: workOrder.vehicle_year || 'Not specified',
      icon: Calendar 
    },
    { 
      label: 'License Plate', 
      value: workOrder.vehicle_license_plate || 'Not specified',
      icon: Hash 
    },
    { 
      label: 'Odometer', 
      value: workOrder.vehicle_odometer ? `${workOrder.vehicle_odometer} miles` : 'Not recorded',
      icon: Gauge 
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Vehicle Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {vehicleInfo.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium min-w-[100px]">{item.label}:</span>
            <span className="text-muted-foreground">{item.value}</span>
          </div>
        ))}
        
        {workOrder.vehicle_vin && (
          <div className="pt-2 border-t">
            <div className="text-sm">
              <span className="font-medium">VIN:</span>
              <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {workOrder.vehicle_vin}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
