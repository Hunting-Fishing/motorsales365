
import React from 'react';
import { CustomerCreateForm } from '@/components/customers/create/CustomerCreateForm';
import { CreateCustomerHeader } from '@/components/customers/create/CreateCustomerHeader';
import { useCustomerCreate } from '@/components/customers/create/hooks/useCustomerCreate';

export default function CreateCustomer() {
  const { handleImportComplete, isSubmitting } = useCustomerCreate();

  return (
    <div className="container mx-auto px-4 py-8">
      <CreateCustomerHeader 
        onImportComplete={handleImportComplete}
        isSubmitting={isSubmitting}
      />
      <div className="mt-8">
        <CustomerCreateForm />
      </div>
    </div>
  );
}
