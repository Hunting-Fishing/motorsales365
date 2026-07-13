
import React from 'react';

export interface WorkOrderHistoryProps {
  workOrderId: string;
}

export const WorkOrderHistory: React.FC<WorkOrderHistoryProps> = ({ workOrderId }) => {
  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium mb-4">History</h3>
      <p className="text-muted-foreground">No history records found for this work order.</p>
    </div>
  );
};
