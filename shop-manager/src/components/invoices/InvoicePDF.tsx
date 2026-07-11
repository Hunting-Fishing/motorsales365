
import React from "react";
import { Invoice } from "@/types/invoice";
import { formatCurrency } from "@/utils/formatters";

interface InvoicePDFProps {
  invoice: Invoice;
}

export default function InvoicePDF({ invoice }: InvoicePDFProps) {
  // This is a placeholder component for PDF rendering
  // In a real application, we would use react-pdf/renderer to render a PDF
  
  return (
    <div className="p-8 bg-white">
      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">INVOICE</h1>
          <p>Invoice #{invoice.id}</p>
          <p>Date: {invoice.date}</p>
          <p>Due Date: {invoice.due_date}</p>
        </div>
        <div className="text-right">
          <h2 className="font-bold">ESM Auto Shop</h2>
          <p>123 Main Street</p>
          <p>Anytown, ST 12345</p>
          <p>support@esm-auto.com</p>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="font-bold mb-2">Bill To:</h2>
        <p>{invoice.customer}</p>
        {invoice.customer_email && <p>{invoice.customer_email}</p>}
        {invoice.customer_address && <p>{invoice.customer_address}</p>}
      </div>
      
      <table className="w-full mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2 border">Item</th>
            <th className="text-right p-2 border">Quantity</th>
            <th className="text-right p-2 border">Price</th>
            <th className="text-right p-2 border">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items && invoice.items.map((item, index) => (
            <tr key={index}>
              <td className="p-2 border">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </td>
              <td className="p-2 border text-right">
                {item.hours ? `${item.quantity} hr` : item.quantity}
              </td>
              <td className="p-2 border text-right">
                {formatCurrency(item.price)}
              </td>
              <td className="p-2 border text-right">
                {formatCurrency(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between mb-2">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Tax ({(invoice.tax / invoice.subtotal * 100).toFixed(0)}%)</span>
            <span>{formatCurrency(invoice.tax)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>
      
      {invoice.notes && (
        <div className="mb-8">
          <h2 className="font-bold mb-2">Notes</h2>
          <p>{invoice.notes}</p>
        </div>
      )}
      
      <div>
        <p className="text-center text-gray-500">Thank you for your business!</p>
      </div>
    </div>
  );
}
