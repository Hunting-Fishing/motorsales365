
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { WorkOrder } from '@/types/workOrder';
import { updateWorkOrderStatus } from '@/services/workOrder';
import { toast } from '@/hooks/use-toast';
import { WORK_ORDER_STATUSES } from '@/data/workOrderConstants';

interface WorkOrderStatusUpdateProps {
  workOrder: WorkOrder;
  onStatusUpdated?: (newStatus: string, updatedWorkOrder?: WorkOrder) => void;
}

const getStatusColor = (status: string) => {
  const statusColorMap: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    'on-hold': 'bg-orange-100 text-orange-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800',
    'body-shop': 'bg-purple-100 text-purple-800',
    'mobile-service': 'bg-indigo-100 text-indigo-800',
    'needs-road-test': 'bg-cyan-100 text-cyan-800',
    'parts-requested': 'bg-amber-100 text-amber-800',
    'parts-ordered': 'bg-orange-100 text-orange-800',
    'parts-arrived': 'bg-lime-100 text-lime-800',
    'customer-to-return': 'bg-pink-100 text-pink-800',
    'rebooked': 'bg-violet-100 text-violet-800',
    'foreman-signoff-waiting': 'bg-yellow-100 text-yellow-800',
    'foreman-signoff-complete': 'bg-emerald-100 text-emerald-800',
    'sublet': 'bg-teal-100 text-teal-800',
    'waiting-customer-auth': 'bg-red-100 text-red-800',
    'po-requested': 'bg-slate-100 text-slate-800',
    'tech-support': 'bg-blue-100 text-blue-800',
    'warranty': 'bg-green-100 text-green-800',
    'internal-ro': 'bg-gray-100 text-gray-800'
  };
  return statusColorMap[status] || 'bg-gray-100 text-gray-800';
};

export function WorkOrderStatusUpdate({ workOrder, onStatusUpdated }: WorkOrderStatusUpdateProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(workOrder.status);
  const [error, setError] = useState<string | null>(null);

  const currentStatusOption = WORK_ORDER_STATUSES.find(option => option.value === workOrder.status);
  
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === workOrder.status) return;
    
    console.log('Status update initiated:', {
      workOrderId: workOrder.id,
      currentStatus: workOrder.status,
      newStatus: newStatus,
      selectedStatus: selectedStatus
    });
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const updatedWorkOrder = await updateWorkOrderStatus(workOrder.id, newStatus);
      
      if (updatedWorkOrder) {
        console.log('Status update successful:', {
          workOrderId: workOrder.id,
          oldStatus: workOrder.status,
          newStatus: updatedWorkOrder.status,
          updatedWorkOrder: updatedWorkOrder
        });
        
        const statusLabel = WORK_ORDER_STATUSES.find(s => s.value === newStatus)?.label;
        toast({
          title: "Success",
          description: `Work order status updated to ${statusLabel}`,
        });
        
        setSelectedStatus(newStatus);
        onStatusUpdated?.(newStatus, updatedWorkOrder);
      } else {
        throw new Error('No updated work order returned from server');
      }
    } catch (error: any) {
      console.error('Status update failed:', {
        workOrderId: workOrder.id,
        attemptedStatus: newStatus,
        error: error
      });
      
      const errorMessage = error?.message || 'Failed to update work order status';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Reset selection on error
      setSelectedStatus(workOrder.status);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        <Badge className={getStatusColor(selectedStatus)}>
          {WORK_ORDER_STATUSES.find(s => s.value === selectedStatus)?.label || selectedStatus}
        </Badge>
        {error && (
          <div className="flex items-center gap-1 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs">{error}</span>
          </div>
        )}
      </div>
      
      <Select
        value={selectedStatus}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Change status" />
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
        </SelectTrigger>
        <SelectContent>
          {WORK_ORDER_STATUSES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                {option.value === selectedStatus && (
                  <Check className="h-4 w-4 text-green-600" />
                )}
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
