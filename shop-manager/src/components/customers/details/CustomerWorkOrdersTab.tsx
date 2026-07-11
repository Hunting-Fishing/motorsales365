
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Plus } from 'lucide-react';
import { Customer } from '@/types/customer';
import { WorkOrder } from '@/types/workOrder';
import { useWorkOrdersByCustomer } from '@/hooks/useWorkOrdersByCustomer';

interface CustomerWorkOrdersTabProps {
  customer: Customer;
  workOrders: WorkOrder[];
  loading: boolean;
  error?: string;
}

export function CustomerWorkOrdersTab({ customer, workOrders, loading, error }: CustomerWorkOrdersTabProps) {
  
  const createWorkOrderUrl = () => {
    const params = new URLSearchParams({
      customerId: customer.id,
      customerName: `${customer.first_name} ${customer.last_name}`.trim(),
      customerEmail: customer.email || '',
      customerPhone: customer.phone || '',
      customerAddress: customer.address || '',
      customerCity: customer.city || '',
      customerState: customer.state || '',
      customerZip: customer.postal_code || '', // Using postal_code instead of zip_code
    });

    // Add first vehicle if exists
    if (customer.vehicles && customer.vehicles.length > 0) {
      const vehicle = customer.vehicles[0];
      params.append('vehicleId', vehicle.id);
      params.append('vehicleMake', vehicle.make || '');
      params.append('vehicleModel', vehicle.model || '');
      params.append('vehicleYear', vehicle.year?.toString() || '');
      params.append('vehicleVin', vehicle.vin || '');
      params.append('vehicleLicensePlate', vehicle.license_plate || '');
    }

    return `/work-orders/create?${params.toString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading work orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-red-600">Error loading work orders: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Service History</h3>
        <Button asChild>
          <Link to={createWorkOrderUrl()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Work Order
          </Link>
        </Button>
      </div>

      {workOrders && workOrders.length > 0 ? (
        <div className="grid gap-4">
          {workOrders.map((workOrder) => (
            <Card key={workOrder.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Work Order #{workOrder.work_order_number || workOrder.id.slice(0, 8)}
                  </CardTitle>
                  <Badge variant={workOrder.status === 'completed' ? 'default' : 'secondary'}>
                    {workOrder.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{workOrder.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span>Created: {new Date(workOrder.created_at).toLocaleDateString()}</span>
                    {workOrder.total_cost && (
                      <span className="font-medium">${workOrder.total_cost.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/work-orders/${workOrder.id}`}>
                        <ClipboardList className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <ClipboardList className="mx-auto h-12 w-12 opacity-50 mb-4" />
          <p>No service history found for this customer.</p>
          <Button asChild className="mt-4">
            <Link to={createWorkOrderUrl()}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Work Order
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
