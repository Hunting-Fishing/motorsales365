
import React from 'react';
import { Customer } from '@/types/customer';
import { CustomerFormsList } from './CustomerFormsList';

interface CustomerFormsTabProps {
  customer: Customer;
}

export function CustomerFormsTab({ customer }: CustomerFormsTabProps) {
  return (
    <div className="space-y-6">
      <CustomerFormsList 
        customerId={customer.id}
        customerName={`${customer.first_name} ${customer.last_name}`}
      />
    </div>
  );
}
