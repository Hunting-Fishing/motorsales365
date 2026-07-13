
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InventoryOrder } from "@/types/inventory/orders";

interface OverdueOrdersAlertProps {
  orders: InventoryOrder[];
}

export function OverdueOrdersAlert({ orders }: OverdueOrdersAlertProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const overdueOrders = orders.filter(order => {
    if (order.status === 'received' || order.status === 'cancelled') return false;
    
    const expectedDate = new Date(order.expected_arrival);
    expectedDate.setHours(0, 0, 0, 0);
    
    return expectedDate < today;
  });
  
  if (overdueOrders.length === 0) return null;
  
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Overdue Orders</AlertTitle>
      <AlertDescription>
        You have {overdueOrders.length} overdue order{overdueOrders.length > 1 ? 's' : ''} that {overdueOrders.length > 1 ? 'have' : 'has'} not been received yet.
      </AlertDescription>
    </Alert>
  );
}
