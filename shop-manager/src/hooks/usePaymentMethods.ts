
import { useState, useEffect } from 'react';
import { PaymentMethod } from '@/types/payment';
import { 
  getCustomerPaymentMethods, 
  addPaymentMethod, 
  updatePaymentMethod, 
  deletePaymentMethod, 
  setDefaultPaymentMethod 
} from '@/services/payment/paymentService';
import { toast } from '@/hooks/use-toast';

export function usePaymentMethods(customerId?: string) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPaymentMethods = async () => {
    if (!customerId) {
      setPaymentMethods([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getCustomerPaymentMethods(customerId);
      setPaymentMethods(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch payment methods'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [customerId]);

  const addNewPaymentMethod = async (paymentMethodData: Omit<PaymentMethod, 'id' | 'customer_id' | 'created_at' | 'updated_at'>) => {
    if (!customerId) return null;

    try {
      const newPaymentMethod = await addPaymentMethod({
        ...paymentMethodData,
        customer_id: customerId
      });
      
      setPaymentMethods(prev => [...prev, newPaymentMethod]);
      toast({
        title: "Payment method added",
        description: "Your payment method has been added successfully.",
      });
      return newPaymentMethod;
    } catch (err) {
      console.error('Error adding payment method:', err);
      toast({
        title: "Failed to add payment method",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateExistingPaymentMethod = async (id: string, updates: Partial<PaymentMethod>) => {
    try {
      const updatedPaymentMethod = await updatePaymentMethod(id, updates);
      setPaymentMethods(prev => 
        prev.map(method => method.id === id ? updatedPaymentMethod : method)
      );
      toast({
        title: "Payment method updated",
        description: "Your payment method has been updated successfully.",
      });
      return updatedPaymentMethod;
    } catch (err) {
      console.error('Error updating payment method:', err);
      toast({
        title: "Failed to update payment method",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
      return null;
    }
  };

  const removePaymentMethod = async (id: string) => {
    try {
      await deletePaymentMethod(id);
      setPaymentMethods(prev => prev.filter(method => method.id !== id));
      toast({
        title: "Payment method removed",
        description: "Your payment method has been removed successfully.",
      });
      return true;
    } catch (err) {
      console.error('Error deleting payment method:', err);
      toast({
        title: "Failed to remove payment method",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const makeDefaultPaymentMethod = async (paymentMethodId: string) => {
    if (!customerId) return false;

    try {
      await setDefaultPaymentMethod(customerId, paymentMethodId);
      
      // Update local state
      setPaymentMethods(prev => prev.map(method => ({
        ...method,
        is_default: method.id === paymentMethodId
      })));
      
      toast({
        title: "Default payment method updated",
        description: "Your default payment method has been updated successfully.",
      });
      return true;
    } catch (err) {
      console.error('Error setting default payment method:', err);
      toast({
        title: "Failed to update default payment method",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    paymentMethods,
    isLoading,
    error,
    refetch: fetchPaymentMethods,
    addPaymentMethod: addNewPaymentMethod,
    updatePaymentMethod: updateExistingPaymentMethod,
    deletePaymentMethod: removePaymentMethod,
    setDefaultPaymentMethod: makeDefaultPaymentMethod
  };
}
