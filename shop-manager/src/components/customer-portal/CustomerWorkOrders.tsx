
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, FileText, Clock } from 'lucide-react';

interface WorkOrder {
  id: string;
  status: string;
  description: string;
  created_at: string;
  total_cost: number;
  service_type: string;
}

export function CustomerWorkOrders() {
  const { userId } = useAuthUser();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkOrders() {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from('work_orders')
          .select('*')
          .eq('customer_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching work orders:', error);
        } else {
          setWorkOrders(data || []);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchWorkOrders();
  }, [userId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
      case 'in-progress':
        return 'bg-primary/10 text-primary';
      case 'pending':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Orders</CardTitle>
        <CardDescription>View your service history and current work orders</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : workOrders.length > 0 ? (
          <div className="space-y-4">
            {workOrders.map((order) => (
              <div key={order.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">Work Order #{order.id.slice(-8)}</h3>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-2">{order.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                      {order.service_type && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {order.service_type}
                        </div>
                      )}
                      {order.total_cost && (
                        <div className="font-medium text-foreground">
                          ${order.total_cost.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Work Orders</h3>
            <p className="text-muted-foreground">You don't have any work orders yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
