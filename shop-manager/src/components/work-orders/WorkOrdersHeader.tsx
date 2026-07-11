
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WorkOrder } from '@/types/workOrder';

interface WorkOrdersHeaderProps {
  workOrders: WorkOrder[];
}

export default function WorkOrdersHeader({ workOrders }: WorkOrdersHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Work Orders</h1>
        <p className="text-muted-foreground">
          Manage and track all work orders ({workOrders.length} total)
        </p>
      </div>
      <Button asChild>
        <Link to="/work-orders/create">
          <Plus className="h-4 w-4 mr-2" />
          Create Work Order
        </Link>
      </Button>
    </div>
  );
}
