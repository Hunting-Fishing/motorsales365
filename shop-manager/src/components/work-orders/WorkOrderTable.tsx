
import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

interface WorkOrderTableProps {
  workOrders: WorkOrder[];
}

export function WorkOrderTable({ workOrders }: WorkOrderTableProps) {
function getStatusVariant(status?: string) {
  const s = (status ?? '').toLowerCase();
  if (s.includes('open') || s.includes('in-progress') || s.includes('progress')) return 'default' as const;
  if (s.includes('pending') || s.includes('waiting')) return 'secondary' as const;
  if (s.includes('completed') || s.includes('closed')) return 'outline' as const;
  if (s.includes('cancel')) return 'destructive' as const;
  return 'secondary' as const;
}

  if (workOrders.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-6 w-6 text-muted-foreground" aria-hidden />}
        title="No work orders found"
        description="Get started by creating your first work order."
        actionLink={{ label: 'Create Work Order', to: '/work-orders/create' }}
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Work Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.map((workOrder) => (
              <TableRow key={workOrder.id}>
                <TableCell className="font-medium">
                  {workOrder.work_order_number || workOrder.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  {workOrder.customer_name || 'Unknown Customer'}
                </TableCell>
                <TableCell>
                  {workOrder.description || 'No description'}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(String(workOrder.status))} className="capitalize">
                    {workOrder.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {workOrder.created_at ? new Date(workOrder.created_at).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/work-orders/${workOrder.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
