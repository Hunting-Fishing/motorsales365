
import React, { useState } from 'react';
import { WorkOrder } from '@/types/workOrder';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { TimeEntry } from '@/types/workOrder';
import { Customer } from '@/types/customer';
import { WorkOrderLineItems } from '../job-lines/WorkOrderLineItems';
import { WorkOrderCustomerCard } from './WorkOrderCustomerCard';
import { WorkOrderTimeCard } from './WorkOrderTimeCard';
import { WorkOrderTotals } from '../shared/WorkOrderTotals';
import { useWorkOrderPartsData } from '@/hooks/useWorkOrderPartsData';
import { useWorkOrderJobLineOperations } from '@/hooks/useWorkOrderJobLineOperations';

interface WorkOrderOverviewTabProps {
  workOrder: WorkOrder;
  jobLines: WorkOrderJobLine[];
  allParts: WorkOrderPart[];
  timeEntries: TimeEntry[];
  customer: Customer | null;
  onWorkOrderUpdate: () => Promise<void>;
  onPartsChange: () => Promise<void>;
  isEditMode: boolean;
  setJobLines: (jobLines: WorkOrderJobLine[]) => void;
}

export function WorkOrderOverviewTab({
  workOrder,
  jobLines,
  allParts,
  timeEntries,
  customer,
  onWorkOrderUpdate,
  onPartsChange,
  isEditMode,
  setJobLines
}: WorkOrderOverviewTabProps) {
  // Parts data operations
  const { addPart, updatePart, deletePart, reorderParts } = useWorkOrderPartsData(workOrder.id);

  // Wrapper functions to match expected signatures
  const handlePartUpdate = async (partId: string, updates: Partial<WorkOrderPart>) => {
    await updatePart(partId, updates);
    await onPartsChange();
  };

  const handlePartDelete = async (partId: string) => {
    await deletePart(partId);
    await onPartsChange();
  };

  const handleAddPart = async (partData: any) => {
    await addPart(partData);
    await onPartsChange();
  };

  // Enhanced job line operations for completion toggle
  const jobLineOperations = useWorkOrderJobLineOperations(
    jobLines, 
    onWorkOrderUpdate
  );

  return (
    <div className="space-y-6 fade-in">
      {/* Main Content Layout - Focused on detailed information */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column - Customer & Time Info */}
        <div className="lg:col-span-4 space-y-6 slide-up">
          <WorkOrderCustomerCard customer={customer} workOrder={workOrder} />
          <WorkOrderTimeCard timeEntries={timeEntries} workOrder={workOrder} />
        </div>

        {/* Middle Column - Parts & Job Lines */}
        <div className="lg:col-span-5 slide-up">
          <div className="modern-card gradient-border">
            <WorkOrderLineItems
              jobLines={jobLines}
              allParts={allParts}
              workOrderId={workOrder.id}
              isEditMode={isEditMode}
              onJobLinesChange={setJobLines}
              onPartsChange={onPartsChange}
              onJobLineUpdate={jobLineOperations.handleUpdateJobLine}
              onJobLineDelete={jobLineOperations.handleDeleteJobLine}
              onJobLineReorder={jobLineOperations.handleReorderJobLines}
              onJobLineToggleCompletion={jobLineOperations.handleToggleCompletion}
              onPartUpdate={handlePartUpdate}
              onPartDelete={handlePartDelete}
              onPartReorder={reorderParts}
              onAddPart={handleAddPart}
            />
          </div>
        </div>

        {/* Right Column - Financial Summary */}
        <div className="lg:col-span-3 slide-up">
          <WorkOrderTotals
            jobLines={jobLines}
            allParts={allParts}
          />
        </div>
      </div>
    </div>
  );
}
