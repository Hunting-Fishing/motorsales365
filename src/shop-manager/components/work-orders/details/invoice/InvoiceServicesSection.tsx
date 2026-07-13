
import React from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';

interface InvoiceServicesSectionProps {
  jobLines: WorkOrderJobLine[];
}

export function InvoiceServicesSection({ jobLines }: InvoiceServicesSectionProps) {
  const totalAmount = jobLines.reduce((sum, line) => sum + (line.total_amount || 0), 0);

  return (
    <div className="p-6">
      <h3 className="font-semibold mb-4">Services</h3>
      <div className="space-y-2">
        {jobLines.map((line) => (
          <div key={line.id} className="flex justify-between">
            <div>
              <div className="font-medium">{line.name}</div>
              {line.description && (
                <div className="text-sm text-gray-600">{line.description}</div>
              )}
            </div>
            <div className="text-right">
              <div>${line.total_amount?.toFixed(2) || '0.00'}</div>
            </div>
          </div>
        ))}
        {jobLines.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No services added yet
          </div>
        )}
      </div>
      <div className="border-t mt-4 pt-4">
        <div className="flex justify-between font-semibold">
          <span>Services Total:</span>
          <span>${totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
