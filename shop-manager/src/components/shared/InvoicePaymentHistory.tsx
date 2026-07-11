
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Plus, Receipt, DollarSign, TrendingDown } from 'lucide-react';
import { formatPaymentMethodForDisplay } from '@/constants/paymentMethods';

export interface PaymentRecord {
  id: string;
  amount: number;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
  transaction_date: string;
  created_at: string;
  status?: string;
}

interface InvoicePaymentHistoryProps {
  payments: PaymentRecord[];
  invoiceTotal: number;
  isLoading?: boolean;
  onAddPayment?: () => void;
  showAddButton?: boolean;
}

export function InvoicePaymentHistory({
  payments,
  invoiceTotal,
  isLoading = false,
  onAddPayment,
  showAddButton = true,
}: InvoicePaymentHistoryProps) {
  // Calculate running balance for each payment
  const paymentsWithBalance = React.useMemo(() => {
    let runningBalance = invoiceTotal;
    return payments
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
      .map((payment) => {
        runningBalance = runningBalance - payment.amount;
        return {
          ...payment,
          runningBalance: Math.max(0, runningBalance),
        };
      });
  }, [payments, invoiceTotal]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, invoiceTotal - totalPaid);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Payment History
        </CardTitle>
        {showAddButton && onAddPayment && remainingBalance > 0 && (
          <Button size="sm" variant="outline" onClick={onAddPayment}>
            <Plus className="h-4 w-4 mr-1" />
            Add Payment
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg text-sm">
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Invoice Total</p>
            <p className="font-semibold">${invoiceTotal.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Total Paid</p>
            <p className="font-semibold text-green-600">${totalPaid.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Balance</p>
            <p className={`font-semibold ${remainingBalance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              ${remainingBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Payment List */}
        {paymentsWithBalance.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No payments recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentsWithBalance.map((payment) => (
              <div
                key={payment.id}
                className="flex items-start justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-green-600">
                      +${payment.amount.toFixed(2)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {formatPaymentMethodForDisplay(payment.payment_method)}
                    </Badge>
                    {payment.status && payment.status !== 'completed' && (
                      <Badge 
                        variant={payment.status === 'pending' ? 'outline' : 'destructive'}
                        className="text-xs"
                      >
                        {payment.status}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>{format(new Date(payment.transaction_date), 'MMM d, yyyy h:mm a')}</p>
                    {payment.reference_number && (
                      <p>Ref: {payment.reference_number}</p>
                    )}
                    {payment.notes && (
                      <p className="italic">{payment.notes}</p>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingDown className="h-3 w-3" />
                    <span>Balance after:</span>
                  </div>
                  <p className={`font-medium ${payment.runningBalance === 0 ? 'text-green-600' : 'text-foreground'}`}>
                    ${payment.runningBalance.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paid in Full indicator */}
        {remainingBalance === 0 && payments.length > 0 && (
          <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600">
            <DollarSign className="h-5 w-5" />
            <span className="font-semibold">Paid in Full</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
