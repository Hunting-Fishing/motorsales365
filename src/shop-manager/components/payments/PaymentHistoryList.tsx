
import React, { useState } from 'react';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Payment } from '@/types/payment';
import { format } from 'date-fns';
import { Plus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PaymentHistoryListProps {
  customerId: string;
  invoiceId?: string;
  allowAddPayment?: boolean;
}

export function PaymentHistoryList({ customerId, invoiceId, allowAddPayment = false }: PaymentHistoryListProps) {
  const { payments, isLoading, error, totalPayments } = usePaymentHistory(customerId, invoiceId);
  const [openAddDialog, setOpenAddDialog] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Loading payments...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Payments</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            {payments.length > 0 
              ? `Total payments: $${totalPayments.toFixed(2)}`
              : 'No payment history found'}
          </CardDescription>
        </div>
        {allowAddPayment && (
          <Button onClick={() => setOpenAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Payment
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <p>No payments have been recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <PaymentItem key={payment.id} payment={payment} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentItem({ payment }: { payment: Payment }) {
  const paymentDate = payment.transaction_date 
    ? format(new Date(payment.transaction_date), 'MMM d, yyyy')
    : 'Unknown date';
    
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-purple-100 text-purple-800"
  };
  
  const statusColor = statusColors[payment.status] || "bg-gray-100 text-gray-800";
  
  return (
    <div className="flex justify-between items-center p-3 rounded-md border">
      <div>
        <p className="font-medium">${payment.amount.toFixed(2)}</p>
        <p className="text-sm text-muted-foreground">{paymentDate}</p>
        {payment.notes && (
          <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
        </span>
        <span className="text-xs">
          {payment.payment_type === 'full' ? 'Full Payment' : 
           payment.payment_type === 'partial' ? 'Partial Payment' :
           payment.payment_type === 'deposit' ? 'Deposit' : 'Refund'}
        </span>
      </div>
    </div>
  );
}
