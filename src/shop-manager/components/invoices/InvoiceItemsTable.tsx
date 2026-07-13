
import React from "react";
import { InvoiceItemRow } from "./InvoiceItemRow";
import { InvoiceItem } from "@/types/invoice";

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  onRemoveItem: (id: string) => void;
  onUpdateItemQuantity: (id: string, quantity: number) => void;
  onUpdateItemDescription: (id: string, description: string) => void;
  onUpdateItemPrice: (id: string, price: number) => void;
}

export function InvoiceItemsTable({
  items,
  onRemoveItem,
  onUpdateItemQuantity,
  onUpdateItemDescription,
  onUpdateItemPrice,
}: InvoiceItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="p-6 border border-dashed rounded-md text-center text-slate-500">
        No items added yet. Use the buttons above to add items from inventory or add labor.
      </div>
    );
  }

  return (
    <div className="mt-4 border rounded-md">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Qty</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Price</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((item) => (
            <InvoiceItemRow
              key={item.id}
              item={item}
              onRemoveItem={onRemoveItem}
              onUpdateItemQuantity={onUpdateItemQuantity}
              onUpdateItemDescription={onUpdateItemDescription}
              onUpdateItemPrice={onUpdateItemPrice}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
