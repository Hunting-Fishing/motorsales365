
import React from 'react';
import { CustomerForm } from '@/components/customers/form/CustomerForm';
import { useCustomerCreate } from './hooks/useCustomerCreate';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

export function CustomerCreateForm() {
  const {
    isSubmitting,
    isSuccess,
    isLoading,
    newCustomerId,
    defaultValues,
    availableShops,
    onSubmit,
    handleImportComplete,
  } = useCustomerCreate();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show empty state if no shops are available
  if (availableShops.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8 text-gray-400" />}
        title="No shops available"
        description="Please create a shop first before adding customers, or contact your administrator."
        action={{
          label: "Go to Settings",
          onClick: () => window.location.href = "/settings"
        }}
      />
    );
  }

  return (
    <CustomerForm
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      customerId={newCustomerId}
      availableShops={availableShops}
    />
  );
}
