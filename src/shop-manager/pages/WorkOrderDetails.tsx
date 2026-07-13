
import React from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { WorkOrderDetailsView } from '@/components/work-orders/WorkOrderDetailsView';

export default function WorkOrderDetails() {
  const { id: workOrderId } = useParams<{ id: string }>();

  if (!workOrderId) {
    return (
      <>
        <Helmet>
          <title>Work Order Not Found | All Business 365</title>
        </Helmet>
        <Layout>
          <div className="modern-card p-8 text-center">
            <h1 className="text-2xl font-bold text-error mb-2">Work Order Not Found</h1>
            <p className="text-muted-foreground">No work order ID provided in the URL.</p>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Work Order Details | All Business 365</title>
      </Helmet>
      <Layout>
        <WorkOrderDetailsView workOrderId={workOrderId} />
      </Layout>
    </>
  );
}
