
import { PaymentMethod } from '@/types/payment';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';

interface InvoiceDetailsPaymentInfoProps {
  paymentMethod: string;
  status: string;
  statusLabel: string;
  createdBy: string;
  customerId?: string;
}

export function InvoiceDetailsPaymentInfo({
  paymentMethod,
  status,
  statusLabel,
  createdBy,
  customerId,
}: InvoiceDetailsPaymentInfoProps) {
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState<boolean>(!!customerId);

  // Fetch the customer's default payment method if customerId exists
  useEffect(() => {
    const fetchDefaultPaymentMethod = async () => {
      if (!customerId) return;
      
      try {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('customer_id', customerId)
          .eq('is_default', true)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching default payment method:', error);
        } else if (data) {
          setDefaultPaymentMethod(data as PaymentMethod);
        }
      } catch (err) {
        console.error('Error in fetchDefaultPaymentMethod:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (customerId) {
      fetchDefaultPaymentMethod();
    }
  }, [customerId]);

  // Format payment method display
  const formatPaymentMethod = () => {
    if (loading) {
      return <Skeleton className="h-4 w-24" />;
    }
    
    if (defaultPaymentMethod) {
      if (defaultPaymentMethod.method_type === 'credit_card' && defaultPaymentMethod.card_brand) {
        return `${defaultPaymentMethod.card_brand} •••• ${defaultPaymentMethod.card_last_four}`;
      }
      return defaultPaymentMethod.method_type.replace('_', ' ');
    }
    
    return paymentMethod || "Not specified";
  };

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-slate-500 uppercase mb-2">Payment Information:</h3>
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Payment Method: {formatPaymentMethod()}</p>
          <p className="text-sm text-slate-500">Payment Status: {statusLabel}</p>
        </div>
        <div className="text-sm text-slate-500">
          <p>Created By: {createdBy || "System"}</p>
        </div>
      </div>
    </div>
  );
}
