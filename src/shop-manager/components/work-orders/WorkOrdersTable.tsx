
import React from 'react';
import { Link } from 'react-router-dom';
import { WorkOrder } from '@/types/workOrder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge';
import { Calendar, User, Car, DollarSign, Clock, Eye } from 'lucide-react';

interface WorkOrdersTableProps {
  workOrders: WorkOrder[];
}

export function WorkOrdersTable({ workOrders }: WorkOrdersTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading">Work Orders</h2>
          <p className="text-muted-foreground font-body">
            Manage and track all work orders
          </p>
        </div>
      </div>

      {workOrders.length === 0 ? (
        <Card className="modern-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted/20 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold font-heading">No work orders found</h3>
                <p className="text-muted-foreground font-body">
                  Create your first work order to get started
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workOrders.map((workOrder, index) => (
            <Card 
              key={workOrder.id} 
              className="work-order-card animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  {/* Main Content - Mobile Optimized */}
                  <div className="flex-1 space-y-4 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-bold font-heading gradient-text truncate">
                          {workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`}
                        </h3>
                        <p className="text-sm text-muted-foreground font-body mt-1 line-clamp-2">
                          {workOrder.description || 'No description provided'}
                        </p>
                      </div>
                      <WorkOrderStatusBadge status={workOrder.status} />
                    </div>

                    {/* Details Grid - Mobile Optimized */}
                    <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {workOrder.customer_name && (
                        <div className="flex items-center gap-2 min-h-[44px]">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground font-body">Customer</p>
                            <p className="text-sm font-medium font-body truncate">
                              {workOrder.customer_name}
                            </p>
                          </div>
                        </div>
                      )}

                      {(workOrder.vehicle_make && workOrder.vehicle_model) && (
                        <div className="flex items-center gap-2 min-h-[44px]">
                          <div className="p-2 rounded-lg bg-info/10 shrink-0">
                            <Car className="w-4 h-4 text-info" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground font-body">Vehicle</p>
                            <p className="text-sm font-medium font-body truncate">
                              {workOrder.vehicle_year} {workOrder.vehicle_make} {workOrder.vehicle_model}
                            </p>
                          </div>
                        </div>
                      )}

                      {workOrder.total_cost && (
                        <div className="flex items-center gap-2 min-h-[44px]">
                          <div className="p-2 rounded-lg bg-success/10 shrink-0">
                            <DollarSign className="w-4 h-4 text-success" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground font-body">Total Cost</p>
                            <p className="text-sm font-bold font-heading text-success">
                              ${workOrder.total_cost.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}

                      {workOrder.created_at && (
                        <div className="flex items-center gap-2 min-h-[44px]">
                          <div className="p-2 rounded-lg bg-warning/10 shrink-0">
                            <Calendar className="w-4 h-4 text-warning" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground font-body">Created</p>
                            <p className="text-sm font-medium font-body">
                              {formatDate(workOrder.created_at)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button - Mobile Optimized */}
                  <div className="w-full sm:w-auto sm:ml-6 mt-4 sm:mt-0">
                    <Button 
                      asChild
                      variant="outline"
                      size="default"
                      className="w-full sm:w-auto btn-gradient-primary border-0 text-white hover:shadow-lg transition-all duration-300 min-h-[44px]"
                    >
                      <Link to={`/work-orders/${workOrder.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
