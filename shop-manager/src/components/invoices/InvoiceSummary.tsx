
import React from "react";
import { Separator } from "@/components/ui/separator";

interface InvoiceSummaryProps {
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
}

export function InvoiceSummary({ subtotal, taxRate, tax, total }: InvoiceSummaryProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h2 className="text-lg font-medium mb-4">Invoice Summary</h2>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Tax ({(taxRate * 100).toFixed(0)}%):</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
