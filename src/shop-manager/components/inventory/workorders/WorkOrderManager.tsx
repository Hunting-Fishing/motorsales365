import React, { useState } from 'react';
import { useWorkOrders } from '@/hooks/inventory/useWorkOrders';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { CreateWorkOrderDialog } from './CreateWorkOrderDialog';
import { format } from 'date-fns';

export function WorkOrderManager() {
  const { workOrders, isLoading, completeWorkOrder, deleteWorkOrder } = useWorkOrders();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'scheduled': return 'bg-yellow-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const handleComplete = async (id: string) => {
    if (confirm('Complete this work order? Parts will be deducted from inventory.')) {
      await completeWorkOrder(id);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this work order? This action cannot be undone.')) {
      await deleteWorkOrder(id);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading work orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Work Orders</h2>
          <p className="text-muted-foreground">
            Manage service work orders and track inventory usage
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Work Order
        </Button>
      </div>

      <div className="grid gap-4">
        {workOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No work orders yet. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          workOrders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{order.title}</CardTitle>
                    <CardDescription>
                      Asset ID: {order.asset_id}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor(order.priority)}>
                      {order.priority}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.description && (
                    <p className="text-sm text-muted-foreground">{order.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {order.scheduled_date && (
                      <div>
                        <p className="text-muted-foreground">Scheduled</p>
                        <p className="font-medium">
                          {format(new Date(order.scheduled_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    )}
                    {order.completed_date && (
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="font-medium">
                          {format(new Date(order.completed_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    )}
                    {order.assigned_to && (
                      <div>
                        <p className="text-muted-foreground">Assigned To</p>
                        <p className="font-medium">{order.assigned_to}</p>
                      </div>
                    )}
                  </div>

                  {order.notes && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm">{order.notes}</p>
                    </div>
                  )}

                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={() => handleComplete(order.id)}
                        variant="default"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                      <Button 
                        onClick={() => handleDelete(order.id)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CreateWorkOrderDialog 
        open={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
      />
    </div>
  );
}
