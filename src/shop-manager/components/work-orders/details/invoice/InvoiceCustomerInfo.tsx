
import React from 'react';
import { WorkOrder } from '@/types/workOrder';

interface InvoiceCustomerInfoProps {
  workOrder: WorkOrder;
}

export function InvoiceCustomerInfo({ workOrder }: InvoiceCustomerInfoProps) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-2">Customer Information</h3>
      <p>{workOrder.customer_name || 'N/A'}</p>
      <p>{workOrder.customer_email || 'N/A'}</p>
      <p>{workOrder.customer_phone || 'N/A'}</p>
    </div>
  );
}
