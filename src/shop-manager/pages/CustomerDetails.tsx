
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCustomerDetailsOptimized } from '@/hooks/useCustomerDetailsOptimized';
import { CustomerDetailsHeader } from '@/components/customers/details/CustomerDetailsHeader';
import { CustomerDetailsTabs } from '@/components/customers/details/CustomerDetailsTabs';
import { AddInteractionDialog } from '@/components/interactions/AddInteractionDialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function CustomerDetails() {
  const { customerId } = useParams<{ customerId: string }>();
  const [addInteractionOpen, setAddInteractionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('service');
  
  const {
    customer,
    workOrders,
    customerNotes,
    customerLoyalty,
    customerInteractions,
    customerCommunications,
    loading,
    error,
    refetch
  } = useCustomerDetailsOptimized(customerId || '');

  if (!customerId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Invalid customer ID. Please check the URL and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading customer details: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Customer not found. The customer may have been deleted or you may not have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const customerName = `${customer.first_name} ${customer.last_name}`.trim();

  const handleInteractionAdded = () => {
    setAddInteractionOpen(false);
    refetch();
  };

  return (
    <>
      <Helmet>
        <title>{customerName} | Customer Details | All Business 365</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <CustomerDetailsHeader
          customer={customer}
          customerLoyalty={customerLoyalty}
          loyaltyLoading={loading}
          setAddInteractionOpen={setAddInteractionOpen}
        />

        <CustomerDetailsTabs
          customer={customer}
          customerWorkOrders={workOrders}
          customerInteractions={customerInteractions}
          customerCommunications={customerCommunications}
          customerNotes={customerNotes}
          setAddInteractionOpen={setAddInteractionOpen}
          onCommunicationAdded={refetch}
          onNoteAdded={refetch}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          workOrdersLoading={loading}
          workOrdersError={error}
        />

        <AddInteractionDialog
          open={addInteractionOpen}
          onOpenChange={setAddInteractionOpen}
          customerId={customer.id}
          customerName={customerName}
          onInteractionAdded={handleInteractionAdded}
        />
      </div>
    </>
  );
}
