
import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { TimeEntry } from '@/types/workOrder';
import { Customer } from '@/types/customer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Car, MapPin, Clock, Wrench, Package, DollarSign } from 'lucide-react';

interface WorkOrderUnifiedHeaderProps {
  workOrder: WorkOrder;
  customer?: Customer | null;
  jobLines: WorkOrderJobLine[];
  allParts: WorkOrderPart[];
  timeEntries: TimeEntry[];
}

export function WorkOrderUnifiedHeader({
  workOrder,
  customer,
  jobLines,
  allParts,
  timeEntries
}: WorkOrderUnifiedHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'on-hold':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate metrics
  const totalJobLines = jobLines.length;
  const totalBookedHours = jobLines.reduce((sum, line) => sum + (line.estimated_hours || 0), 0);
  const totalActualHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
  const partsUsed = allParts.length;
  const partsRevenue = allParts.reduce((sum, part) => sum + ((part.customerPrice || part.unit_price) * part.quantity), 0);
  const partsCost = allParts.reduce((sum, part) => sum + ((part.supplierCost || 0) * part.quantity), 0);
  const partsProfit = partsRevenue - partsCost;
  const laborRevenue = jobLines.reduce((sum, line) => sum + (line.total_amount || 0), 0);

  return (
    <div className="space-y-3 mb-4">
      {/* Main Header Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-xl font-bold">Work Order Overview</h1>
                <Badge className={getStatusColor(workOrder.status)}>
                  {workOrder.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">
                    {customer ? `${customer.first_name} ${customer.last_name}` : workOrder.customer_name || 'Unknown'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {new Date(workOrder.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {(workOrder.vehicle_make || workOrder.vehicle_model || workOrder.vehicle_year) && (
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Vehicle:</span>
                    <span className="font-medium">
                      {[workOrder.vehicle_year, workOrder.vehicle_make, workOrder.vehicle_model]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                  </div>
                )}
                
                {workOrder.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">{workOrder.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {workOrder.description && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground mb-1">Description:</p>
              <p className="text-sm">{workOrder.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Wrench className="h-3 w-3 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Job Lines</span>
            </div>
            <span className="text-sm font-bold">{totalJobLines}</span>
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">Booked Hours</span>
            </div>
            <span className="text-sm font-bold">{totalBookedHours.toFixed(1)}</span>
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">Parts</span>
            </div>
            <span className="text-sm font-bold">{partsUsed}</span>
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-emerald-600" />
              <span className="text-xs font-medium text-muted-foreground">Labor Revenue</span>
            </div>
            <span className="text-sm font-bold">${laborRevenue.toFixed(2)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
