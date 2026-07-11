
import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/workOrders';
import { WorkOrderFeedbackButton } from '../feedback/WorkOrderFeedbackButton';

interface WorkOrderInformationProps {
  workOrder: WorkOrder;
}

export const WorkOrderInformation: React.FC<WorkOrderInformationProps> = ({
  workOrder
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Work Order Information</span>
          {workOrder.status === 'completed' && workOrder.customer && (
            <WorkOrderFeedbackButton 
              workOrderId={workOrder.id}
              customerId={workOrder.customer}
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500">Customer</h4>
          <p className="text-base mt-1">{workOrder.customer}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Status</h4>
          <div className="mt-1">
            <Badge 
              variant={
                workOrder.status === 'completed' ? 'success' : 
                workOrder.status === 'in-progress' ? 'warning' : 
                workOrder.status === 'pending' ? 'outline' : 
                'destructive'
              }
            >
              {workOrder.status.charAt(0).toUpperCase() + workOrder.status.slice(1)}
            </Badge>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Created Date</h4>
          <p className="text-base mt-1">{formatDate(workOrder.date)}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Due Date</h4>
          <p className="text-base mt-1">{formatDate(workOrder.dueDate)}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Technician</h4>
          <p className="text-base mt-1">{workOrder.technician}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Priority</h4>
          <div className="mt-1">
            <Badge 
              variant={
                workOrder.priority === 'high' ? 'destructive' : 
                workOrder.priority === 'medium' ? 'warning' : 
                'outline'
              }
            >
              {workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)}
            </Badge>
          </div>
        </div>
        <div className="col-span-1 md:col-span-2">
          <h4 className="text-sm font-medium text-gray-500">Description</h4>
          <p className="text-base mt-1">{workOrder.description}</p>
        </div>
        {workOrder.location && (
          <div className="col-span-1 md:col-span-2">
            <h4 className="text-sm font-medium text-gray-500">Location</h4>
            <p className="text-base mt-1">{workOrder.location}</p>
          </div>
        )}
        {workOrder.notes && (
          <div className="col-span-1 md:col-span-2">
            <h4 className="text-sm font-medium text-gray-500">Notes</h4>
            <p className="text-base mt-1 whitespace-pre-line">{workOrder.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
