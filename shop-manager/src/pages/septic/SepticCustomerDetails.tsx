import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Pencil, Plus, Loader2, Building2, Home, Landmark } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import CustomerOverviewTab from '@/components/septic/customer-details/CustomerOverviewTab';
import CustomerSystemsTab from '@/components/septic/customer-details/CustomerSystemsTab';
import CustomerServiceHistoryTab from '@/components/septic/customer-details/CustomerServiceHistoryTab';
import CustomerFinancialTab from '@/components/septic/customer-details/CustomerFinancialTab';
import CustomerNotesTab from '@/components/septic/customer-details/CustomerNotesTab';
import CustomerEnvironmentalTab from '@/components/septic/customer-details/CustomerEnvironmentalTab';
import CustomerRecommendationsTab from '@/components/septic/customer-details/CustomerRecommendationsTab';
import EditCustomerDialog from '@/components/septic/customer-details/EditCustomerDialog';

export default function SepticCustomerDetails() {
  const { customerId: id } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const [showEdit, setShowEdit] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['septic-customer', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('septic_customers').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: tanks = [] } = useQuery({
    queryKey: ['septic-customer-tanks', id, shopId],
    queryFn: async () => {
      if (!id || !shopId) return [];
      const { data, error } = await supabase
        .from('septic_tanks')
        .select('*')
        .eq('shop_id', shopId)
        .eq('customer_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!shopId,
    staleTime: 0,
    refetchOnMount: 'always' as const,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['septic-customer-orders', id, shopId],
    queryFn: async () => {
      if (!id || !shopId) return [];
      const { data, error } = await supabase
        .from('septic_service_orders')
        .select('id, order_number, service_type, status, scheduled_date, total, created_at')
        .eq('shop_id', shopId)
        .eq('customer_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!shopId,
    staleTime: 0,
    refetchOnMount: 'always' as const,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['septic-customer-invoices', id, shopId],
    queryFn: async () => {
      if (!id || !shopId) return [];
      const { data, error } = await supabase
        .from('septic_invoices')
        .select('*')
        .eq('shop_id', shopId)
        .eq('customer_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!shopId,
    staleTime: 0,
    refetchOnMount: 'always' as const,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['septic-customer-payments', id, shopId],
    queryFn: async () => {
      if (!id || !shopId) return [];
      const { data, error } = await supabase
        .from('septic_payments')
        .select('*')
        .eq('shop_id', shopId)
        .eq('customer_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!shopId,
    staleTime: 0,
    refetchOnMount: 'always' as const,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground mb-4">Customer not found</p>
        <Button variant="outline" onClick={() => navigate('/septic/customers')}>Back to Customers</Button>
      </div>
    );
  }

  const customerTypeIcon = customer.customer_type === 'commercial'
    ? <Building2 className="h-4 w-4" />
    : customer.customer_type === 'municipal'
      ? <Landmark className="h-4 w-4" />
      : <Home className="h-4 w-4" />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/septic/customers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{customer.first_name} {customer.last_name}</h1>
              <Badge variant="outline" className="flex items-center gap-1 capitalize">
                {customerTypeIcon}
                {customer.customer_type || 'Residential'}
              </Badge>
              {customer.business_name && (
                <Badge variant="secondary">{customer.business_name}</Badge>
              )}
            </div>
            {customer.address && (
              <p className="text-sm text-muted-foreground mt-0.5">{customer.address}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button size="sm" onClick={() => navigate('/septic/orders/new')} className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800">
            <Plus className="h-4 w-4 mr-1" /> New Order
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full flex overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="systems">Systems</TabsTrigger>
          <TabsTrigger value="history">Service History</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="environmental">Environmental</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <CustomerOverviewTab customer={customer} tanks={tanks} orders={orders} invoices={invoices} />
        </TabsContent>

        <TabsContent value="systems" className="mt-6">
          <CustomerSystemsTab customer={customer} tanks={tanks} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <CustomerServiceHistoryTab orders={orders} />
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <CustomerFinancialTab customer={customer} invoices={invoices} payments={payments} />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <CustomerNotesTab customerId={id!} />
        </TabsContent>

        <TabsContent value="environmental" className="mt-6">
          <CustomerEnvironmentalTab customerId={id!} />
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6">
          <CustomerRecommendationsTab customerId={id!} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <EditCustomerDialog open={showEdit} onOpenChange={setShowEdit} customer={customer} />
    </div>
  );
}
