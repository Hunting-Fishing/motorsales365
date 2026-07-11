import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { WaterDeliveryCustomerHeader } from '@/components/water-delivery/customers/WaterDeliveryCustomerHeader';
import { WaterDeliveryCustomerTabs } from '@/components/water-delivery/customers/WaterDeliveryCustomerTabs';
import { useWaterDeliveryCustomerDetails } from '@/hooks/water-delivery/useWaterDeliveryCustomerDetails';

export default function WaterDeliveryCustomerDetails() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { customer, stats, isLoading, error, refetch } = useWaterDeliveryCustomerDetails(customerId || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Button variant="ghost" onClick={() => navigate('/water-delivery/customers')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Customer Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || 'The customer you are looking for does not exist.'}</p>
          <Button onClick={() => navigate('/water-delivery/customers')}>
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/water-delivery/customers')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Customers
      </Button>

      {/* Customer Header */}
      <WaterDeliveryCustomerHeader customer={customer} stats={stats} onRefresh={refetch} />

      {/* Customer Tabs */}
      <WaterDeliveryCustomerTabs customerId={customer.id} />
    </div>
  );
}
