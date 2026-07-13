import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { Customer } from '@/types/customer';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { TimeEntry } from '@/types/workOrder';
import { useWorkOrderTaxCalculations } from '@/hooks/useWorkOrderTaxCalculations';

interface WorkOrderPrintLayoutProps {
  workOrder: WorkOrder;
  customer: Customer | null;
  jobLines: WorkOrderJobLine[];
  parts: WorkOrderPart[];
  timeEntries: TimeEntry[];
}

export function WorkOrderPrintLayout({
  workOrder,
  customer,
  jobLines,
  parts,
  timeEntries
}: WorkOrderPrintLayoutProps) {
  // Use centralized tax calculations
  const taxCalculations = useWorkOrderTaxCalculations({
    jobLines,
    parts,
    customer
  });
  
  const laborTotal = taxCalculations.laborAmount;
  const partsTotal = taxCalculations.partsAmount;
  const shopSupplies = 5.00; // Standard shop supplies fee
  const hazardousMaterials = 0.00;
  const laborDiscount = 0.00;
  const partsDiscount = 0.00;
  const laborTaxes = taxCalculations.laborTax;
  const partsTaxes = taxCalculations.partsTax;
  const totalAmount = laborTotal + partsTotal + shopSupplies + hazardousMaterials + laborTaxes + partsTaxes - laborDiscount - partsDiscount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  return (
    <div className="print-layout bg-white text-black p-6 max-w-5xl mx-auto" style={{ fontSize: '12px', lineHeight: '1.4' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b-2 border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">WORK ORDER</h1>
          <div className="text-sm">
            <div>WO #: {workOrder.work_order_number || workOrder.id}</div>
            <div>Date: {formatDate(workOrder.created_at || new Date().toISOString())}</div>
            <div>Status: {workOrder.status?.toUpperCase()}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-lg mb-2">Your Auto Shop Name</div>
          <div className="text-sm">
            <div>123 Main Street</div>
            <div>City, State 12345</div>
            <div>Phone: (555) 123-4567</div>
            <div>Email: info@yourshop.com</div>
          </div>
        </div>
      </div>

      {/* Customer and Vehicle Information */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        {/* Customer Information */}
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-bold text-sm mb-3 border-b border-gray-300 pb-1">CUSTOMER INFORMATION</h3>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-semibold">Name:</span> {customer?.first_name} {customer?.last_name}
            </div>
            {customer?.company && (
              <div>
                <span className="font-semibold">Company:</span> {customer.company}
              </div>
            )}
            <div>
              <span className="font-semibold">Address:</span> {customer?.address || 'N/A'}
            </div>
            <div className="ml-16">{customer?.city}, {customer?.state} {customer?.postal_code}</div>
            <div>
              <span className="font-semibold">Phone:</span> {customer?.phone || 'N/A'}
            </div>
            <div>
              <span className="font-semibold">Email:</span> {customer?.email || 'N/A'}
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-bold text-sm mb-3 border-b border-gray-300 pb-1">VEHICLE INFORMATION</h3>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-semibold">Vehicle:</span> {workOrder.vehicle_year} {workOrder.vehicle_make} {workOrder.vehicle_model}
            </div>
            <div>
              <span className="font-semibold">License Plate:</span> {workOrder.vehicle_license_plate || 'N/A'}
            </div>
            <div>
              <span className="font-semibold">VIN:</span> {workOrder.vehicle_vin || 'N/A'}
            </div>
            <div>
              <span className="font-semibold">Odometer:</span> {workOrder.vehicle_odometer || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Work Order Details Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-800">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-800 px-2 py-2 text-left text-xs font-bold">TYPE</th>
              <th className="border border-gray-800 px-2 py-2 text-left text-xs font-bold">DESCRIPTION</th>
              <th className="border border-gray-800 px-2 py-2 text-left text-xs font-bold">PART #</th>
              <th className="border border-gray-800 px-2 py-2 text-center text-xs font-bold">QTY</th>
              <th className="border border-gray-800 px-2 py-2 text-right text-xs font-bold">PRICE</th>
              <th className="border border-gray-800 px-2 py-2 text-right text-xs font-bold">RATE</th>
              <th className="border border-gray-800 px-2 py-2 text-right text-xs font-bold">HOURS</th>
              <th className="border border-gray-800 px-2 py-2 text-right text-xs font-bold">LINE TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {/* Labor Items */}
            {jobLines.map((jobLine, index) => (
              <tr key={`labor-${index}`} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-2 py-2 text-xs">Labor</td>
                <td className="border border-gray-300 px-2 py-2 text-xs">{jobLine.name}</td>
                <td className="border border-gray-300 px-2 py-2 text-xs">-</td>
                <td className="border border-gray-300 px-2 py-2 text-xs text-center">-</td>
                <td className="border border-gray-300 px-2 py-2 text-xs text-right">-</td>
                <td className="border border-gray-300 px-2 py-2 text-xs text-right">{formatCurrency(jobLine.labor_rate || 0)}</td>
                <td className="border border-gray-300 px-2 py-2 text-xs text-right">{jobLine.estimated_hours || 0}</td>
                <td className="border border-gray-300 px-2 py-2 text-xs text-right font-semibold">{formatCurrency(jobLine.total_amount || 0)}</td>
              </tr>
            ))}

            {/* Parts Items */}
            {parts.map((part, index) => (
              <tr key={`part-${index}`} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-2 py-2 text-xs">Parts</td>
                <td className="border border-gray-300 px-2 py-2 text-xs">{part.name}</td>
                <td className="border border-gray-300 px-2 py-2 text-xs">{part.part_number || '-'}</td>
                <td className="border border-gray-300 px-2 py-2 text-xs text-center">{part.quantity}</td>
                <td className="border border-gray-300 px-2 py-2 text-xs text-right">{formatCurrency(part.customerPrice || part.unit_price)}</td>
                <td className="border border-gray-300 px-2 py-2 text-xs text-right">-</td>
                <td className="border border-gray-300 px-2 py-2 text-xs text-right">-</td>
                <td className="border border-gray-300 px-2 py-2 text-xs text-right font-semibold">{formatCurrency((part.customerPrice || part.unit_price) * part.quantity)}</td>
              </tr>
            ))}

            {/* Empty row if no items */}
            {jobLines.length === 0 && parts.length === 0 && (
              <tr>
                <td colSpan={8} className="border border-gray-300 px-2 py-4 text-xs text-center text-gray-500">
                  No services or parts added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="flex justify-end">
        <div className="w-80 border border-gray-800">
          <div className="bg-gray-100 p-2 border-b border-gray-300">
            <h3 className="font-bold text-sm">COST SUMMARY</h3>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span>Labor:</span>
              <span className="font-semibold">{formatCurrency(laborTotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Parts:</span>
              <span className="font-semibold">{formatCurrency(partsTotal)}</span>
            </div>
            <div className="flex justify-between text-xs items-center">
              <span className="flex items-center">
                <input type="checkbox" checked className="mr-1" readOnly />
                Shop Supplies:
              </span>
              <span className="font-semibold">{formatCurrency(shopSupplies)}</span>
            </div>
            <div className="flex justify-between text-xs items-center">
              <span className="flex items-center">
                <input type="checkbox" checked={hazardousMaterials > 0} className="mr-1" readOnly />
                Hazardous Materials:
              </span>
              <span className="font-semibold">{formatCurrency(hazardousMaterials)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Labor Discount:</span>
              <span className="font-semibold">{formatCurrency(laborDiscount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Parts Discount:</span>
              <span className="font-semibold">{formatCurrency(partsDiscount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Labor Taxes:</span>
              <span className="font-semibold">{formatCurrency(laborTaxes)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Parts Taxes:</span>
              <span className="font-semibold">{formatCurrency(partsTaxes)}</span>
            </div>
            <div className="border-t border-gray-400 pt-2">
              <div className="flex justify-between text-sm font-bold">
                <span>TOTAL:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description/Notes */}
      {workOrder.description && (
        <div className="mt-6 border-t border-gray-300 pt-4">
          <h3 className="font-bold text-sm mb-2">WORK DESCRIPTION</h3>
          <p className="text-xs text-gray-700">{workOrder.description}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-600 border-t border-gray-300 pt-4">
        <p>Thank you for choosing our service. If you have any questions, please contact us.</p>
        <p className="mt-1">This work order was generated on {new Date().toLocaleDateString('en-US')} at {new Date().toLocaleTimeString('en-US')}</p>
      </div>
    </div>
  );
}