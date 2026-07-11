
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Customer, CustomerNote } from "@/types/customer";
import { CustomerInteraction } from "@/types/interaction";
import { CustomerCommunication } from "@/types/customer/notes";
import { CustomerWorkOrdersTab } from "./CustomerWorkOrdersTab";
import { CustomerDocumentsTab } from "../documents/CustomerDocumentsTab";
import { InteractionsTab } from "../interactions/InteractionsTab";
import { CommunicationsTab } from "../communications/CommunicationsTab";
import { ActivityTimeline } from "../activity/ActivityTimeline";
import { CustomerAnalyticsSection } from './CustomerAnalyticsSection';
import { CustomerVehiclesTab } from "../vehicles/CustomerVehiclesTab";
import { WorkOrder } from "@/types/workOrder";

interface CustomerDetailsTabsProps {
  customer: Customer;
  customerWorkOrders: WorkOrder[];
  customerInteractions: CustomerInteraction[];
  customerCommunications: CustomerCommunication[];
  customerNotes: CustomerNote[];
  setAddInteractionOpen: (open: boolean) => void;
  onCommunicationAdded: () => void;
  onNoteAdded: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  workOrdersLoading?: boolean;
  workOrdersError?: string;
}

export const CustomerDetailsTabs: React.FC<CustomerDetailsTabsProps> = ({
  customer,
  customerWorkOrders,
  customerInteractions,
  customerCommunications,
  customerNotes,
  setAddInteractionOpen,
  onCommunicationAdded,
  onNoteAdded,
  activeTab,
  setActiveTab,
  workOrdersLoading = false,
  workOrdersError
}) => {
  

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
      <TabsList className="grid w-full md:w-auto md:inline-flex grid-cols-6 md:grid-cols-none h-auto">
        <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
        <TabsTrigger value="service">Service</TabsTrigger>
        <TabsTrigger value="interactions">Interactions</TabsTrigger>
        <TabsTrigger value="communications">Communications</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      
      <TabsContent value="vehicles">
        <CustomerVehiclesTab customer={customer} />
      </TabsContent>
      
      <TabsContent value="service">
        <CustomerWorkOrdersTab 
          customer={customer} 
          workOrders={customerWorkOrders}
          loading={workOrdersLoading}
          error={workOrdersError}
        />
      </TabsContent>
      
      <TabsContent value="interactions">
        <InteractionsTab
          customer={customer}
          interactions={customerInteractions}
          setAddInteractionOpen={setAddInteractionOpen}
        />
      </TabsContent>
      
      <TabsContent value="communications">
        <CommunicationsTab
          customer={customer}
          communications={customerCommunications}
          onCommunicationAdded={onCommunicationAdded}
        />
      </TabsContent>
      
      <TabsContent value="documents">
        <CustomerDocumentsTab customer={customer} />
      </TabsContent>
      
      <TabsContent value="analytics">
        <div className="space-y-8">
          <CustomerAnalyticsSection customer={customer} />
          <ActivityTimeline
            customer={customer}
            workOrders={customerWorkOrders}
            interactions={customerInteractions}
            communications={customerCommunications}
            notes={customerNotes}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
};
