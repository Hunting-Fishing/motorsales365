
import React from 'react';
import { CustomerLoginRequiredWithImpersonation } from '@/components/customer-portal/CustomerLoginRequiredWithImpersonation';
import { CustomerPortalHeader } from '@/components/customer-portal/CustomerPortalHeader';
import { CustomerAppointmentBooking } from '@/components/customer-portal/CustomerAppointmentBooking';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useAuthUser } from '@/hooks/useAuthUser';

export default function ClientBooking() {
  const { impersonatedCustomer } = useImpersonation();
  const { user } = useAuthUser();
  
  // Get customer name from impersonation or auth user
  const customerName = impersonatedCustomer?.name || user?.user_metadata?.full_name || user?.email || 'Customer';

  return (
    <>
      <CustomerLoginRequiredWithImpersonation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <CustomerPortalHeader customerName={customerName} />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <CustomerAppointmentBooking />
          </div>
        </main>
      </div>
    </>
  );
}
