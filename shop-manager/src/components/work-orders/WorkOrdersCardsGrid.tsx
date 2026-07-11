import React from 'react';
import type { WorkOrder } from '@/types/workOrder';
import { WorkOrderCard } from './WorkOrderCard';
import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface WorkOrdersCardsGridProps {
  workOrders: WorkOrder[];
}

export function WorkOrdersCardsGrid({ workOrders }: WorkOrdersCardsGridProps) {
  if (!workOrders || workOrders.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-6 w-6 text-muted-foreground" aria-hidden />}
        title="No work orders found"
        description="Create your first work order to get started."
        actionLink={{ label: 'Create Work Order', to: '/work-orders/create' }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {workOrders.map((wo) => (
        <WorkOrderCard key={wo.id} wo={wo} />
      ))}
    </div>
  );
}
