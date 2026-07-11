
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkOrder } from '@/types/workOrder';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { TimeEntry } from '@/types/workOrder';
import { Customer } from '@/types/customer';
import { WorkOrderOverviewTab } from './WorkOrderOverviewTab';
import { WorkOrderLineItems } from '../job-lines/WorkOrderLineItems';
import { JobLinesSection } from '../form-fields/JobLinesSection';
import { WorkOrderActivityTab } from './WorkOrderActivityTab';
import { WorkOrderNotifications } from '../notifications/WorkOrderNotifications';
import { WorkOrderDocuments } from '../documents/WorkOrderDocuments';
import { WorkOrderFormsTab } from '../forms/WorkOrderFormsTab';
import { WorkOrderInspectionsTab } from '../inspections/WorkOrderInspectionsTab';

interface WorkOrderDetailsTabsProps {
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

export function WorkOrderDetailsTabs({
  workOrder,
  jobLines,
  allParts,
  timeEntries,
  customer,
  onWorkOrderUpdate,
  onPartsChange,
  isEditMode,
  setJobLines
}: WorkOrderDetailsTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const handleJobLinesChange = async () => {
    await onWorkOrderUpdate();
  };

  return (
    <div className="modern-tabs-container">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="modern-tabs-list grid w-full grid-cols-8 max-w-6xl mx-auto">
          <TabsTrigger value="overview" className="modern-tab-trigger">
            Overview
          </TabsTrigger>
          <TabsTrigger value="parts" className="modern-tab-trigger">
            Parts
          </TabsTrigger>
          <TabsTrigger value="labor" className="modern-tab-trigger">
            Labor
          </TabsTrigger>
          <TabsTrigger value="inspections" className="modern-tab-trigger">
            Inspections
          </TabsTrigger>
          <TabsTrigger value="forms" className="modern-tab-trigger">
            Forms
          </TabsTrigger>
          <TabsTrigger value="activity" className="modern-tab-trigger">
            Activity
          </TabsTrigger>
          <TabsTrigger value="notifications" className="modern-tab-trigger">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="documents" className="modern-tab-trigger">
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8 fade-in">
          <div className="work-order-content-section">
            <WorkOrderOverviewTab
              workOrder={workOrder}
              jobLines={jobLines}
              allParts={allParts}
              timeEntries={timeEntries}
              customer={customer}
              onWorkOrderUpdate={onWorkOrderUpdate}
              onPartsChange={onPartsChange}
              isEditMode={isEditMode}
              setJobLines={setJobLines}
            />
          </div>
        </TabsContent>

        <TabsContent value="parts" className="mt-8 fade-in">
          <div className="work-order-content-section">
            <WorkOrderLineItems
              jobLines={jobLines}
              allParts={allParts}
              workOrderId={workOrder.id}
              isEditMode={isEditMode}
              onJobLinesChange={() => {}}
              onPartsChange={onPartsChange}
            />
          </div>
        </TabsContent>

        <TabsContent value="labor" className="mt-8 fade-in">
          <div className="work-order-content-section">
            <JobLinesSection
              workOrderId={workOrder.id}
              jobLines={jobLines}
              onJobLinesChange={handleJobLinesChange}
              isEditMode={isEditMode}
            />
          </div>
        </TabsContent>

        <TabsContent value="inspections" className="mt-8 fade-in">
          <div className="work-order-content-section">
            <WorkOrderInspectionsTab workOrder={workOrder} />
          </div>
        </TabsContent>

        <TabsContent value="forms" className="mt-8 fade-in">
          <div className="work-order-content-section">
            <WorkOrderFormsTab workOrder={workOrder} />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-8 fade-in">
          <div className="work-order-content-section">
            <WorkOrderActivityTab workOrderId={workOrder.id} />
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-8 fade-in">
          <div className="work-order-content-section">
            <WorkOrderNotifications workOrderId={workOrder.id} />
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-8 fade-in">
          <div className="work-order-content-section">
            <WorkOrderDocuments 
              workOrderId={workOrder.id} 
              isEditMode={isEditMode} 
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
