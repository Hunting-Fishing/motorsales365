
import React from 'react';
import { WorkOrderVehicle } from '@/types/workOrder';

interface InvoiceVehicleInfoProps {
  vehicle?: WorkOrderVehicle | null;
}

export function InvoiceVehicleInfo({ vehicle }: InvoiceVehicleInfoProps) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-2">Vehicle Information</h3>
      <p>{vehicle?.year || 'N/A'} {vehicle?.make || 'N/A'} {vehicle?.model || 'N/A'}</p>
      <p>License: {vehicle?.license_plate || 'N/A'}</p>
      <p>VIN: {vehicle?.vin || 'N/A'}</p>
    </div>
  );
}
