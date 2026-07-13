
import React from 'react';
import { CustomerHeader } from '../CustomerHeader';
import { CustomerInfoCard } from '../CustomerInfoCard';
import { CustomerLoyaltyCard } from '../loyalty/CustomerLoyaltyCard';
import { Customer } from '@/types/customer';
import { CustomerLoyalty } from '@/types/loyalty';

interface CustomerDetailsHeaderProps {
  customer: Customer;
  customerLoyalty?: CustomerLoyalty | null;
  loyaltyLoading?: boolean;
  setAddInteractionOpen: (open: boolean) => void;
}

export function CustomerDetailsHeader({ 
  customer, 
  customerLoyalty, 
  loyaltyLoading = false,
  setAddInteractionOpen 
}: CustomerDetailsHeaderProps) {
  return (
    <div className="space-y-6">
      <CustomerHeader 
        customer={customer} 
        setAddInteractionOpen={setAddInteractionOpen} 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomerInfoCard customer={customer} />
        <CustomerLoyaltyCard 
          customerLoyalty={customerLoyalty}
          isLoading={loyaltyLoading}
        />
      </div>
    </div>
  );
}
