import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  useGunsmithJobPartOrders, 
  useUpdateJobPartOrderStatus,
  useDeleteJobPartOrder,
  type GunsmithJobPartOrder 
} from '@/hooks/useGunsmithJobPartOrders';
import { 
  Package, 
  MoreVertical, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Trash2,
  Wrench
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface GunsmithJobPartOrdersListProps {
  jobId: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  ordered: { label: 'Ordered', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  backordered: { label: 'Backordered', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  received: { label: 'Received', variant: 'secondary', icon: <CheckCircle className="h-3 w-3" /> },
  installed: { label: 'Installed', variant: 'outline', icon: <Wrench className="h-3 w-3" /> },
};

export function GunsmithJobPartOrdersList({ jobId }: GunsmithJobPartOrdersListProps) {
  const { data: orders, isLoading } = useGunsmithJobPartOrders(jobId);
  const updateStatus = useUpdateJobPartOrderStatus();
  const deleteOrder = useDeleteJobPartOrder();

  const handleStatusChange = (order: GunsmithJobPartOrder, newStatus: string) => {
    const updates: { id: string; status: string; received_date?: string; installed_date?: string } = {
      id: order.id,
      status: newStatus,
    };

    if (newStatus === 'received' && !order.received_date) {
      updates.received_date = new Date().toISOString().split('T')[0];
    }
    if (newStatus === 'installed' && !order.installed_date) {
      updates.installed_date = new Date().toISOString().split('T')[0];
    }

    updateStatus.mutate(updates);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Parts on Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Parts on Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No parts on order for this job
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4" />
          Parts on Order ({orders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {orders.map((order) => {
          const config = statusConfig[order.status] || statusConfig.ordered;
          
          return (
            <div 
              key={order.id} 
              className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{order.part_name}</span>
                  <Badge variant={config.variant} className="flex items-center gap-1">
                    {config.icon}
                    {config.label}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>PN: {order.part_number} • Qty: {order.quantity_ordered}</p>
                  {order.supplier && <p>Supplier: {order.supplier}</p>}
                  {order.unit_cost && (
                    <p>Cost: ${order.unit_cost.toFixed(2)} ea • Total: ${order.total_cost?.toFixed(2)}</p>
                  )}
                  {order.expected_date && (
                    <p>Expected: {format(new Date(order.expected_date), 'MMM d, yyyy')}</p>
                  )}
                  {order.received_date && (
                    <p className="text-green-600">Received: {format(new Date(order.received_date), 'MMM d, yyyy')}</p>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {order.status === 'ordered' && (
                    <>
                      <DropdownMenuItem onClick={() => handleStatusChange(order, 'received')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Received
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(order, 'backordered')}>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Mark Backordered
                      </DropdownMenuItem>
                    </>
                  )}
                  {order.status === 'backordered' && (
                    <DropdownMenuItem onClick={() => handleStatusChange(order, 'received')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Received
                    </DropdownMenuItem>
                  )}
                  {order.status === 'received' && (
                    <DropdownMenuItem onClick={() => handleStatusChange(order, 'installed')}>
                      <Wrench className="h-4 w-4 mr-2" />
                      Mark Installed
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => deleteOrder.mutate(order.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Order
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
