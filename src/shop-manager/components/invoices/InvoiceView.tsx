
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/utils/formatters';
import { Invoice } from '@/types/invoice';
import { getInvoiceStatusColor } from '@/utils/invoiceUtils';

interface InvoiceViewProps {
  invoice: Invoice;
}

export default function InvoiceView({ invoice }: InvoiceViewProps) {
  const statusColorClass = getInvoiceStatusColor(invoice.status);
  
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Invoice #{invoice.id}</CardTitle>
        <Badge className={statusColorClass}>
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Customer</h3>
            <p className="text-base font-semibold">{invoice.customer}</p>
            <p className="text-sm">{invoice.customer_email}</p>
            <p className="text-sm whitespace-pre-line">{invoice.customer_address}</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Invoice Date</h3>
              <p className="text-sm">{invoice.date}</p>
            </div>
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Due Date</h3>
              <p className="text-sm">{invoice.due_date}</p>
            </div>
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Payment Method</h3>
              <p className="text-sm">{invoice.payment_method}</p>
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-4">Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Item</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Quantity</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Price</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items && invoice.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-4">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {item.hours ? `${item.quantity} hr` : item.quantity}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-2 pt-4">
          <div className="flex w-full max-w-[200px] justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex w-full max-w-[200px] justify-between">
            <span className="text-muted-foreground">Tax ({(invoice.tax / invoice.subtotal * 100).toFixed(0)}%)</span>
            <span>{formatCurrency(invoice.tax)}</span>
          </div>
          <div className="flex w-full max-w-[200px] justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
        
        {invoice.notes && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-base font-semibold mb-2">Notes</h3>
            <p className="text-sm whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
