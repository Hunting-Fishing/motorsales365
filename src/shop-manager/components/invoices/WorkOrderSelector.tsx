
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { WorkOrder } from '@/types/workOrder';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface WorkOrderSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWorkOrder: (workOrder: WorkOrder) => void;
  workOrders: WorkOrder[];
}

export function WorkOrderSelector({
  isOpen,
  onClose,
  onSelectWorkOrder,
  workOrders
}: WorkOrderSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredWorkOrders = workOrders.filter(workOrder => 
    workOrder.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workOrder.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (workOrder.description && workOrder.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (workOrder.service_type && workOrder.service_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select a Work Order</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            type="search"
            placeholder="Search work orders by ID, customer or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <div className="border rounded-lg overflow-hidden">
            {filteredWorkOrders.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                No work orders found matching your search.
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Service</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredWorkOrders.map((workOrder) => (
                      <tr 
                        key={workOrder.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => onSelectWorkOrder(workOrder)}
                      >
                        <td className="px-4 py-3 text-sm">{workOrder.id.substring(0, 8)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{workOrder.customer}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{workOrder.service_type || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="outline" className={
                            workOrder.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                            workOrder.status === 'in-progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            workOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-slate-100 text-slate-800 border-slate-200'
                          }>
                            {workOrder.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {workOrder.created_at ? format(new Date(workOrder.created_at), 'MM/dd/yyyy') : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" onClick={(e) => {
                            e.stopPropagation();
                            onSelectWorkOrder(workOrder);
                          }}>
                            Select
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
