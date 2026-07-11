import React from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Users, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ServiceBoardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthUser();
  const { workOrders, loading } = useWorkOrders();

  if (authLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Group work orders by status
  const pendingOrders = workOrders.filter(wo => wo.status === 'pending');
  const inProgressOrders = workOrders.filter(wo => wo.status === 'in_progress');
  const completedOrders = workOrders.filter(wo => wo.status === 'completed');

  const StatusColumn = ({ title, orders, status, icon: Icon, color }: any) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="outline">{orders.length}</Badge>
      </div>
      <div className="space-y-3">
        {orders.map((order: any) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  {order.work_order_number || `WO-${order.id.slice(0, 8)}`}
                </CardTitle>
                <Badge className={color}>{status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-2">
                {order.description || 'No description'}
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                {order.customer_name && (
                  <div>Customer: {order.customer_name}</div>
                )}
                {order.vehicle_make && order.vehicle_model && (
                  <div>Vehicle: {order.vehicle_year} {order.vehicle_make} {order.vehicle_model}</div>
                )}
              </div>
              <div className="mt-3">
                <Link to={`/work-orders/${order.id}`}>
                  <Button size="sm" variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No {title.toLowerCase()} work orders
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Service Board</h1>
        <Link to="/work-orders/create">
          <Button>
            <Wrench className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Active work orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting start
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently working
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Finished today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusColumn
          title="Pending"
          orders={pendingOrders}
          status="pending"
          icon={Clock}
          color="bg-yellow-100 text-yellow-800"
        />
        <StatusColumn
          title="In Progress"
          orders={inProgressOrders}
          status="in_progress"
          icon={Users}
          color="bg-blue-100 text-blue-800"
        />
        <StatusColumn
          title="Completed"
          orders={completedOrders}
          status="completed"
          icon={Wrench}
          color="bg-green-100 text-green-800"
        />
      </div>
    </div>
  );
}