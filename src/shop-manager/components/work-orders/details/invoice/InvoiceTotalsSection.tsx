
import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { Customer } from '@/types/customer';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { useWorkOrderTaxCalculations } from '@/hooks/useWorkOrderTaxCalculations';
import { ShieldCheck } from 'lucide-react';

interface InvoiceTotalsSectionProps {
  workOrder: WorkOrder;
  customer?: Customer | null;
  jobLines?: WorkOrderJobLine[];
  parts?: WorkOrderPart[];
}

export function InvoiceTotalsSection({ 
  workOrder, 
  customer, 
  jobLines = [], 
  parts = [] 
}: InvoiceTotalsSectionProps) {
  const taxCalculations = useWorkOrderTaxCalculations({
    jobLines,
    parts,
    customer
  });

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div className="p-6 bg-gray-50">
      <div className="max-w-md ml-auto space-y-3">
        {/* Tax Exemption Status */}
        {taxCalculations.isCustomerTaxExempt && (
          <div className="flex items-center justify-end gap-2 text-green-700">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-medium">
              Tax Exempt
              {taxCalculations.customerTaxExemptionId && (
                <span className="ml-1 text-xs">
                  (#{taxCalculations.customerTaxExemptionId})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Subtotals */}
        {taxCalculations.laborAmount > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Labor Subtotal:</span>
            <span className="font-medium">{formatCurrency(taxCalculations.laborAmount)}</span>
          </div>
        )}
        
        {taxCalculations.partsAmount > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Parts Subtotal:</span>
            <span className="font-medium">{formatCurrency(taxCalculations.partsAmount)}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-sm border-t pt-2">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium">{formatCurrency(taxCalculations.subtotal)}</span>
        </div>

        {/* Tax Breakdown */}
        {taxCalculations.totalTax > 0 ? (
          <>
            {taxCalculations.laborTax > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Labor Tax ({taxCalculations.taxBreakdown.laborTaxRate}%):</span>
                <span className="font-medium">{formatCurrency(taxCalculations.laborTax)}</span>
              </div>
            )}
            {taxCalculations.partsTax > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Parts Tax ({taxCalculations.taxBreakdown.partsTaxRate}%):</span>
                <span className="font-medium">{formatCurrency(taxCalculations.partsTax)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total Tax:</span>
              <span className="font-medium">{formatCurrency(taxCalculations.totalTax)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">{taxCalculations.taxBreakdown.taxDescription}:</span>
            <span className="font-medium">$0.00</span>
          </div>
        )}

        {/* Grand Total */}
        <div className="flex justify-between items-center text-xl font-bold border-t-2 pt-3">
          <span>Total:</span>
          <span>{formatCurrency(taxCalculations.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
