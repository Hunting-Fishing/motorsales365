
import React, { useState } from 'react';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import { PaymentMethodsList } from '@/components/payments/PaymentMethodsList';
import { PaymentHistoryList } from '@/components/payments/PaymentHistoryList';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/types/customer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface CustomerPaymentTabProps {
  customer: Customer;
}

export function CustomerPaymentTab({ customer }: CustomerPaymentTabProps) {
  const { toast } = useToast();
  const { 
    paymentMethods, 
    isLoading: isLoadingMethods, 
    addPaymentMethod, 
    updatePaymentMethod,
    deletePaymentMethod,
    refetch: refetchPaymentMethods
  } = usePaymentMethods(customer.id);
  
  // Handle errors for when customer id is not available
  if (!customer.id) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Invalid Customer</AlertTitle>
        <AlertDescription>
          Customer ID is missing. Please reload the page or try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  const handlePaymentMethodAdded = () => {
    refetchPaymentMethods();
    toast({
      title: "Payment method added",
      description: "New payment method has been added successfully"
    });
  };

  const handlePaymentMethodUpdated = () => {
    refetchPaymentMethods();
    toast({
      title: "Payment method updated",
      description: "Payment method has been updated successfully"
    });
  };

  const handlePaymentMethodDeleted = () => {
    refetchPaymentMethods();
    toast({
      title: "Payment method removed",
      description: "Payment method has been removed successfully"
    });
  };
  
  return (
    <div className="space-y-8">
      <PaymentMethodsList 
        customerId={customer.id}
        paymentMethods={paymentMethods || []}
        onPaymentMethodAdded={handlePaymentMethodAdded}
        onPaymentMethodUpdated={handlePaymentMethodUpdated}
        onPaymentMethodDeleted={handlePaymentMethodDeleted}
      />
      <PaymentHistoryList customerId={customer.id} />
    </div>
  );
}
