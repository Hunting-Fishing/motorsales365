
import { InvoiceItem } from "@/types/invoice";

interface InvoiceDetailsItemsTableProps {
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export function InvoiceDetailsItemsTable({
  items,
  subtotal,
  tax,
  total,
}: InvoiceDetailsItemsTableProps) {
  return (
    <div className="mt-8 overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3 border-b border-slate-200">Item</th>
            <th className="px-4 py-3 border-b border-slate-200">Description</th>
            <th className="px-4 py-3 border-b border-slate-200 text-center">Quantity</th>
            <th className="px-4 py-3 border-b border-slate-200 text-right">Price</th>
            <th className="px-4 py-3 border-b border-slate-200 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-4 text-sm font-medium text-slate-900">{item.name}</td>
              <td className="px-4 py-4 text-sm text-slate-500">{item.description}</td>
              <td className="px-4 py-4 text-sm text-slate-500 text-center">{item.quantity}</td>
              <td className="px-4 py-4 text-sm text-slate-500 text-right">
                ${item.price.toFixed(2)}{item.hours ? "/hr" : ""}
              </td>
              <td className="px-4 py-4 text-sm font-medium text-slate-900 text-right">
                ${item.total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}></td>
            <td className="px-4 py-3 text-sm font-medium text-slate-500 text-right">Subtotal:</td>
            <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={3}></td>
            <td className="px-4 py-3 text-sm font-medium text-slate-500 text-right">Tax:</td>
            <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">${tax.toFixed(2)}</td>
          </tr>
          <tr className="bg-slate-50">
            <td colSpan={3}></td>
            <td className="px-4 py-3 text-base font-bold text-slate-800 text-right">Total:</td>
            <td className="px-4 py-3 text-base font-bold text-slate-800 text-right">${total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
