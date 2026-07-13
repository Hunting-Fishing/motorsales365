
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PaymentMethodForm } from './PaymentMethodForm';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onPaymentMethodAdded: () => void;
}

export function AddPaymentMethodDialog({
  open,
  onOpenChange,
  customerId,
  onPaymentMethodAdded
}: AddPaymentMethodDialogProps) {
  const { addPaymentMethod } = usePaymentMethods(customerId);

  const handleSubmit = async (data: any) => {
    const result = await addPaymentMethod({
      ...data,
      is_default: !!data.is_default // Ensure it's a boolean
    });
    
    if (result) {
      onOpenChange(false);
      onPaymentMethodAdded();
      return true;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a new payment method to this customer account.
          </DialogDescription>
        </DialogHeader>
        
        <PaymentMethodForm
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
