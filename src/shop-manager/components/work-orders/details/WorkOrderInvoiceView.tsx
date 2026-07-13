
import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { WorkOrderJobLine } from '@/types/jobLine';
import { normalizeVehicleForInvoice } from '@/utils/workOrders/dataHelpers';
import { 
  InvoiceHeader,
  InvoiceCustomerInfo,
  InvoiceVehicleInfo,
  InvoiceServicesSection,
  InvoiceTotalsSection,
  InvoiceFooter
} from './invoice';

interface WorkOrderInvoiceViewProps {
  workOrder: WorkOrder;
  jobLines: WorkOrderJobLine[];
}

export function WorkOrderInvoiceView({ workOrder, jobLines }: WorkOrderInvoiceViewProps) {
  const normalizedVehicle = normalizeVehicleForInvoice(workOrder);
  
  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none">
      <div className="p-8 border-b border-gray-200">
        <InvoiceHeader workOrderId={workOrder.id} />
        <InvoiceCustomerInfo workOrder={workOrder} />
        <InvoiceVehicleInfo vehicle={normalizedVehicle} />
      </div>

      <InvoiceServicesSection jobLines={jobLines} />

      <InvoiceTotalsSection workOrder={workOrder} />

      <InvoiceFooter />
    </div>
  );
}
