import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { Customer } from '@/types/customer';
import { WorkOrderStatusBadge } from '../WorkOrderStatusBadge';
import { WorkOrderDetailsActions } from './WorkOrderDetailsActions';
import { EditModeIndicator } from '../debug/EditModeIndicator';
import { WorkOrderProgressTimeline } from '../shared/WorkOrderProgressTimeline';
import { useNavigate } from 'react-router-dom';
interface WorkOrderDetailsHeaderProps {
  workOrder: WorkOrder;
  customer: Customer | null;
  currentStatus: string;
  isUpdatingStatus: boolean;
  onStatusChange: (newStatus: string) => Promise<void>;
  isEditMode: boolean;
}
export function WorkOrderDetailsHeader({
  workOrder,
  customer,
  currentStatus,
  isUpdatingStatus,
  onStatusChange,
  isEditMode
}: WorkOrderDetailsHeaderProps) {
  const navigate = useNavigate();
  const handleStatusChange = async (newStatus: string) => {
    await onStatusChange(newStatus);
  };
  return (
    <div className="modern-card-floating work-order-header p-8 lg:p-10 relative">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
        <div className="space-y-8 flex-1 relative z-10">
          {/* Main Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground font-heading tracking-tight">
                  Work Order #{workOrder.work_order_number || workOrder.id.slice(0, 8)}
                </h1>
                <div className="flex items-center gap-3">
                  <WorkOrderStatusBadge status={currentStatus} />
                  <EditModeIndicator 
                    workOrder={workOrder} 
                    isEditMode={isEditMode} 
                    onStatusChange={handleStatusChange} 
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Customer Information */}
          {customer && (
            <div className="modern-card p-6 bg-gradient-subtle">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {customer.first_name?.[0]}{customer.last_name?.[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-muted-foreground">Customer</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40"></span>
                    <span className="text-lg font-semibold text-foreground">
                      {customer.first_name} {customer.last_name}
                    </span>
                  </div>
                  {customer.email && (
                    <div className="text-sm text-muted-foreground truncate">
                      {customer.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Progress Timeline */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Progress
            </h3>
            <WorkOrderProgressTimeline currentStatus={currentStatus} className="max-w-4xl" />
          </div>
          
          {/* Description */}
          {workOrder.description && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </h3>
              <div className="modern-card p-6 border-l-4 border-primary/30">
                <p className="text-foreground leading-relaxed font-medium">
                  {workOrder.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 lg:ml-8">
          <WorkOrderDetailsActions 
            workOrder={workOrder} 
            onInvoiceCreated={(invoiceId) => {
              navigate(`/invoices/${invoiceId}`);
            }} 
            onWorkOrderUpdated={() => {
              window.location.reload();
            }} 
          />
        </div>
      </div>
    </div>
  );
}