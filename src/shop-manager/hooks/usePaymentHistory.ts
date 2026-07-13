
import { useState, useEffect } from 'react';
import { Payment, PaymentFormValues, PaymentType, PaymentStatus } from '@/types/payment';
import { getCustomerPayments, recordPayment, getInvoicePayments } from '@/services/payment/paymentService';
import { toast } from '@/hooks/use-toast';

export function usePaymentHistory(customerId?: string, invoiceId?: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPayments = async () => {
    if (!customerId && !invoiceId) {
      setPayments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let data;
      if (invoiceId) {
        data = await getInvoicePayments(invoiceId);
      } else if (customerId) {
        data = await getCustomerPayments(customerId);
      } else {
        data = [];
      }
      setPayments(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch payments'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [customerId, invoiceId]);

  const addNewPayment = async (paymentData: PaymentFormValues) => {
    if (!customerId && !invoiceId) return null;

    try {
      const newPayment = await recordPayment({
        ...paymentData,
        customer_id: customerId!,
        invoice_id: invoiceId,
        amount: parseFloat(paymentData.amount.toString()),
        payment_type: paymentData.payment_type,
        status: paymentData.status,
        transaction_date: paymentData.transaction_date || new Date().toISOString()
      });
      
      setPayments(prev => [newPayment, ...prev]);
      
      toast({
        title: "Payment recorded",
        description: "The payment has been recorded successfully.",
      });
      
      return newPayment;
    } catch (err) {
      console.error('Error recording payment:', err);
      toast({
        title: "Failed to record payment",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
      return null;
    }
  };

  // Calculate totals
  const totalPayments = payments.reduce((sum, payment) => {
    if (payment.status === 'refunded') {
      return sum - payment.amount;
    }
    if (payment.payment_type === 'refund') {
      return sum - payment.amount;
    }
    return sum + payment.amount;
  }, 0);

  return {
    payments,
    isLoading,
    error,
    totalPayments,
    refetch: fetchPayments,
    addPayment: addNewPayment
  };
}
