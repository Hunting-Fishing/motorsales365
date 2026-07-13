
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Package 
} from "lucide-react";
import { InventoryOrder } from "@/types/inventory/orders";
import { Badge } from "@/components/ui/badge";

interface InventoryOrdersTableProps {
  orders: InventoryOrder[];
  onReceive: (order: InventoryOrder) => void;
  onCancel: (order: InventoryOrder) => void;
}

export function InventoryOrdersTable({ 
  orders, 
  onReceive, 
  onCancel 
}: InventoryOrdersTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ordered':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border border-blue-300">Ordered</Badge>;
      case 'partially received':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border border-yellow-300">Partially Received</Badge>;
      case 'received':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border border-green-300">Received</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border border-red-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isOverdue = (expectedArrival: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(expectedArrival);
    expectedDate.setHours(0, 0, 0, 0);
    
    return expectedDate < today;
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Package className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium">No orders found</h3>
        <p className="text-sm text-gray-500">
          No inventory orders match your current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Ordered</TableHead>
            <TableHead>Expected Arrival</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const overdueOrder = isOverdue(order.expected_arrival) && 
                               (order.status !== 'received' && order.status !== 'cancelled');
            
            return (
              <TableRow key={order.id} className={overdueOrder ? "bg-red-50" : ""}>
                <TableCell className="font-medium">{order.item_name}</TableCell>
                <TableCell>{order.supplier}</TableCell>
                <TableCell>{format(new Date(order.order_date), "PP")}</TableCell>
                <TableCell className={overdueOrder ? "text-red-600 font-medium" : ""}>
                  {format(new Date(order.expected_arrival), "PP")}
                  {overdueOrder && <Clock className="inline-block ml-1 h-4 w-4" />}
                </TableCell>
                <TableCell>
                  {order.quantity_received} / {order.quantity_ordered}
                </TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell className="text-right">
                  {(order.status === 'ordered' || order.status === 'partially received') && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 mr-2" 
                        onClick={() => onReceive(order)}
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="sr-only">Receive</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0" 
                        onClick={() => onCancel(order)}
                      >
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="sr-only">Cancel</span>
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
