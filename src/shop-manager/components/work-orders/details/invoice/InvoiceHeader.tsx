
import React from 'react';

interface InvoiceHeaderProps {
  workOrderId: string;
}

export function InvoiceHeader({ workOrderId }: InvoiceHeaderProps) {
  return (
    <div className="text-center mb-6">
      <h1 className="text-2xl font-bold">Work Order Invoice</h1>
      <p className="text-gray-600">#{workOrderId.slice(0, 8)}</p>
    </div>
  );
}
