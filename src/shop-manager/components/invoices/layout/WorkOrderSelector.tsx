
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkOrder } from "@/types/workOrder";

export interface WorkOrderSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (workOrder: WorkOrder) => void;
  workOrders: WorkOrder[];
}

export const WorkOrderSelector: React.FC<WorkOrderSelectorProps> = ({
  open,
  onClose,
  onSelect,
  workOrders
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Work Order</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {workOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No work orders available.</p>
          ) : (
            <div className="space-y-2">
              {workOrders.map((workOrder) => (
                <div 
                  key={workOrder.id}
                  onClick={() => onSelect(workOrder)}
                  className="p-3 border rounded-md cursor-pointer hover:bg-muted"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{workOrder.id}</span>
                    <span className="text-sm text-muted-foreground">{workOrder.status}</span>
                  </div>
                  <p className="text-sm truncate">{workOrder.description || 'No description'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
