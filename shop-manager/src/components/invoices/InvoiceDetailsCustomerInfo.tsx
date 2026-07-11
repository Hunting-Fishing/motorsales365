
import { Link } from "react-router-dom";

interface InvoiceDetailsCustomerInfoProps {
  customer: string;
  customerAddress: string;
  customerEmail: string;
  workOrderId: string;
  description: string;
}

export function InvoiceDetailsCustomerInfo({
  customer,
  customerAddress,
  customerEmail,
  workOrderId,
  description,
}: InvoiceDetailsCustomerInfoProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between mb-8 gap-6">
      <div>
        <h3 className="text-sm font-medium text-slate-500 uppercase mb-2">Bill To:</h3>
        <div className="text-slate-800">
          <p className="font-bold">{customer}</p>
          <p>{customerAddress}</p>
          <p>{customerEmail}</p>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-500 uppercase mb-2">Work Order Reference:</h3>
        <Link 
          to={`/work-orders/${workOrderId}`} 
          className="font-medium text-esm-blue-600 hover:text-esm-blue-800"
        >
          {workOrderId}
        </Link>
        <p className="text-slate-500 mt-1">{description}</p>
      </div>
    </div>
  );
}
