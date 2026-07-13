
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { WorkOrder } from "@/types/workOrder";
import { formatDate } from "@/utils/formatters";

export interface WorkOrderSelectorProps {
  workOrders: WorkOrder[];
  open: boolean;
  onSelect: (workOrder: WorkOrder) => void;
  onClose: () => void;
}

export function WorkOrderSelector({ 
  workOrders, 
  open, 
  onSelect, 
  onClose 
}: WorkOrderSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredWorkOrders = workOrders.filter((wo) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      wo.id.toLowerCase().includes(searchLower) ||
      wo.description?.toLowerCase().includes(searchLower) ||
      wo.service_type?.toLowerCase().includes(searchLower) ||
      wo.status.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (workOrder: WorkOrder) => {
    onSelect(workOrder);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Work Order</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search work orders..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
          {filteredWorkOrders.length > 0 ? (
            filteredWorkOrders.map((workOrder) => (
              <div 
                key={workOrder.id} 
                className="p-3 hover:bg-muted flex flex-col sm:flex-row justify-between cursor-pointer"
                onClick={() => handleSelect(workOrder)}
              >
                <div>
                  <div className="font-medium">{workOrder.id}</div>
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {workOrder.description || "No description"}
                  </div>
                </div>
                <div className="mt-2 sm:mt-0 flex flex-col sm:items-end text-sm">
                  <div>
                    <span className={`
                      inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                      ${workOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                        workOrder.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        workOrder.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                        workOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {workOrder.status}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {workOrder.created_at ? formatDate(workOrder.created_at) : "No date"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No work orders found
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
