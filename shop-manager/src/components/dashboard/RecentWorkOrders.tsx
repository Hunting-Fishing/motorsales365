
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecentWorkOrders } from "@/services/dashboard/workOrderService";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, ClipboardList } from "lucide-react";
import { RecentWorkOrder } from "@/types/dashboard";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state";

export function RecentWorkOrders() {
  const [workOrders, setWorkOrders] = useState<RecentWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorkOrders = async (retryCount = 0) => {
      const maxRetries = 3;
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      
      try {
        setLoading(true);
        console.log("Fetching recent work orders for dashboard...");
        const data = await getRecentWorkOrders();
        console.log("Received work orders data:", data);
        setWorkOrders(data || []);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching recent work orders:", err);
        
        // Check if it's an auth error and retry
        const isAuthError = err?.message?.includes('JWT') || 
                           err?.message?.includes('expired') ||
                           err?.code === 'PGRST301' || 
                           err?.code === 'PGRST302' ||
                           err?.code === 'PGRST303';
        
        if (isAuthError && retryCount < maxRetries) {
          console.log(`Auth error fetching work orders, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})...`);
          setLoading(false);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return fetchWorkOrders(retryCount + 1);
        }
        
        setError("Failed to load recent work orders");
        setWorkOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkOrders();
  }, []);

  const handleWorkOrderClick = (workOrderId: string) => {
    navigate(`/work-orders/${workOrderId}`);
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'info';
      case 'in-progress':
      case 'in_progress':
        return 'warning';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };
  
  const getPriorityVariant = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64 text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-tour="dashboard-recent-work-orders">
      <CardHeader>
        <CardTitle>Recent Work Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {workOrders.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-6 w-6 text-muted-foreground" aria-hidden />}
              title="No work orders found"
              description="Create your first work order to get started."
              actionLink={{ label: 'Create Work Order', to: '/work-orders/create' }}
            />
          ) : (
            workOrders.map((order) => (
              <div 
                key={order.id} 
                className="flex items-center justify-between border-b py-3 last:border-0 cursor-pointer hover:bg-muted/50 rounded-lg px-3 transition-colors group"
                onClick={() => handleWorkOrderClick(order.id)}
              >
                <div className="flex flex-col">
                  {order.equipmentName ? (
                    <>
                      <span className="font-semibold group-hover:text-primary transition-colors">
                        {order.equipmentName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {order.customer}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {order.service}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {order.customer}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {order.service}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(order.status)}>
                    {order.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant={getPriorityVariant(order.priority)}>
                    {order.priority}
                  </Badge>
                  <span className="text-sm">{order.date}</span>
                  <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
