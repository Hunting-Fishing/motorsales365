import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Receipt, CreditCard, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerFinancialTabProps {
  customer: any;
  invoices: any[];
  payments: any[];
}

export default function CustomerFinancialTab({ customer, invoices, payments }: CustomerFinancialTabProps) {
  const totalInvoiced = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0);
  const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const outstanding = totalInvoiced - totalPaid;

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  // Categorize orders for breakdown
  const maintenanceCost = invoices
    .filter((i: any) => i.service_type === 'pumping' || i.service_type === 'maintenance')
    .reduce((s: number, i: any) => s + Number(i.total || 0), 0);
  const repairCost = invoices
    .filter((i: any) => i.service_type === 'repair')
    .reduce((s: number, i: any) => s + Number(i.total || 0), 0);
  const installCost = invoices
    .filter((i: any) => i.service_type === 'installation')
    .reduce((s: number, i: any) => s + Number(i.total || 0), 0);
  const inspectionCost = invoices
    .filter((i: any) => i.service_type === 'inspection')
    .reduce((s: number, i: any) => s + Number(i.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Receipt className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">${totalInvoiced.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Invoiced</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <p className={`text-2xl font-bold ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              ${Math.abs(outstanding).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{outstanding > 0 ? 'Outstanding' : 'Credit'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{invoices.length}</p>
            <p className="text-xs text-muted-foreground">Total Invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Payment Preferences</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Preferred Method</p>
              <p className="text-sm font-medium capitalize">{customer.preferred_payment_method || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment Terms</p>
              <p className="text-sm font-medium">{customer.payment_terms || 'Due on receipt'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tax Exempt</p>
              <p className="text-sm font-medium">{customer.tax_exempt ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      {totalInvoiced > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Cost Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Maintenance / Pumping', value: maintenanceCost, color: 'bg-emerald-500' },
                { label: 'Repairs', value: repairCost, color: 'bg-orange-500' },
                { label: 'Installations', value: installCost, color: 'bg-blue-500' },
                { label: 'Inspections', value: inspectionCost, color: 'bg-purple-500' },
              ].filter(item => item.value > 0).map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.label}</span>
                    <span className="font-medium">${item.value.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full`}
                      style={{ width: `${(item.value / totalInvoiced) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No invoices yet.</p>
          ) : (
            <div className="divide-y">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{inv.invoice_number || 'Draft'}</span>
                      <Badge className={statusColors[inv.status] || ''}>{inv.status}</Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {inv.created_at && <span>Issued: {format(new Date(inv.created_at), 'MMM d, yyyy')}</span>}
                      {inv.due_date && <span>Due: {format(new Date(inv.due_date), 'MMM d, yyyy')}</span>}
                      {inv.paid_date && <span className="text-emerald-600">Paid: {format(new Date(inv.paid_date), 'MMM d, yyyy')}</span>}
                    </div>
                  </div>
                  <span className="font-semibold text-sm">${Number(inv.total || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payments recorded.</p>
          ) : (
            <div className="divide-y">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium capitalize">{p.payment_method || 'Payment'}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.payment_date ? format(new Date(p.payment_date), 'MMM d, yyyy') : ''}
                      {p.reference && ` • Ref: ${p.reference}`}
                    </p>
                  </div>
                  <span className="font-semibold text-sm text-emerald-600">+${Number(p.amount || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
