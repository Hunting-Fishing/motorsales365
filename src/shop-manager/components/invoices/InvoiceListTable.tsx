
import { Link } from "react-router-dom";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { Invoice } from "@/types/invoice";
import { InvoiceListEmptyState } from "./InvoiceListEmptyState";

interface InvoiceListTableProps {
  invoices: Invoice[];
}

export function InvoiceListTable({ invoices }: InvoiceListTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Invoice #
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Work Order
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Customer
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Description
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Due Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Created By
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {invoices.length === 0 ? (
            <InvoiceListEmptyState />
          ) : (
            invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {invoice.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {invoice.work_order_id && (
                    <Link to={`/work-orders/${invoice.work_order_id}`} className="text-esm-blue-600 hover:text-esm-blue-800">
                      {invoice.work_order_id}
                    </Link>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {invoice.customer}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {invoice.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  ${invoice.total ? invoice.total.toFixed(2) : '0.00'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <InvoiceStatusBadge status={invoice.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {invoice.due_date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {invoice.created_by}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link to={`/invoices/${invoice.id}`} className="text-esm-blue-600 hover:text-esm-blue-800 mr-4">
                    View
                  </Link>
                  <Link to={`/invoices/${invoice.id}/edit`} className="text-esm-blue-600 hover:text-esm-blue-800">
                    Edit
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
