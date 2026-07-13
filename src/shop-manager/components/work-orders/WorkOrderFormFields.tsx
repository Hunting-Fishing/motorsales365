
import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { CustomerFields } from "./form-fields/CustomerFields";
import { ServicesSection } from "./form-fields/ServicesSection";
import { StatusFields } from "./form-fields/StatusFields";
import { AssignmentFields } from "./form-fields/AssignmentFields";
import { NotesField } from "./form-fields/NotesField";
import { JobLinesSection } from "./form-fields/JobLinesSection";
import { ExpandedIntakeForm } from "./form-fields/ExpandedIntakeForm";
import { WorkOrderFormSchemaValues } from "@/schemas/workOrderSchema";
import { WorkOrderJobLine } from "@/types/jobLine";
import { SelectedService } from "@/types/selectedService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Technician {
  id: string;
  name: string;
  jobTitle?: string;
}

interface WorkOrderFormFieldsProps {
  form: UseFormReturn<WorkOrderFormSchemaValues>;
  technicians: Technician[];
  technicianLoading: boolean;
  technicianError: string | null;
  jobLines?: WorkOrderJobLine[];
  onJobLinesChange?: (jobLines: WorkOrderJobLine[]) => void;
  workOrderId?: string;
  shopId?: string;
  prePopulatedCustomer?: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    equipmentName?: string;
    equipmentType?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    vehicleLicensePlate?: string;
    vehicleVin?: string;
  };
  onTabChange?: (tabValue: string) => void;
  currentTab?: string;
}

export const WorkOrderFormFields: React.FC<WorkOrderFormFieldsProps> = ({
  form,
  technicians,
  technicianLoading,
  technicianError,
  jobLines = [],
  onJobLinesChange,
  workOrderId = `temp-${Date.now()}`,
  shopId,
  prePopulatedCustomer,
  onTabChange,
  currentTab = "intake"
}) => {
  const description = form.watch('description');
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [serviceJobLines, setServiceJobLines] = useState<WorkOrderJobLine[]>([]);

  // Convert selected services to job lines
  const handleServicesChange = (services: SelectedService[]) => {
    console.log('=== SERVICES CHANGE ===');
    console.log('Received services:', services);
    
    setSelectedServices(services);
    
    // Convert services to job lines format with unique IDs
    const newJobLines: WorkOrderJobLine[] = services.map((service, index) => {
      // Use the service's unique ID which already includes timestamp
      const jobLineId = `service-${service.id}`;
      
      console.log(`Converting service ${service.name} to job line with ID: ${jobLineId}`);
      
      return {
        id: jobLineId,
        work_order_id: workOrderId,
        name: service.name,
        description: service.description || '',
        category: service.category,
        subcategory: service.subcategory,
        estimated_hours: service.estimated_hours || 0,
        labor_rate: service.labor_rate || 0,
        total_amount: service.total_amount || 0,
        status: service.status || 'pending',
        notes: '',
        display_order: index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    console.log('Generated job lines:', newJobLines);
    setServiceJobLines(newJobLines);
    
    // Notify parent about job lines change
    if (onJobLinesChange) {
      console.log('Notifying parent about job lines change');
      onJobLinesChange(newJobLines);
    }
  };

  // Combine service-generated job lines with manually added ones
  const allJobLines = [...serviceJobLines, ...jobLines];

  // Create a wrapper function that matches the expected signature
  const handleJobLinesChange = async () => {
    // This function doesn't need to do anything special for the form fields
    // The actual job lines changes are handled by the parent component
    return Promise.resolve();
  };

  return (
    <Tabs value={currentTab} className="w-full" onValueChange={onTabChange}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="intake">Intake & Details</TabsTrigger>
        <TabsTrigger value="customer">Customer & Vehicle</TabsTrigger>
        <TabsTrigger value="services">Services & Labor</TabsTrigger>
        <TabsTrigger value="assignment">Assignment & Notes</TabsTrigger>
      </TabsList>

      <TabsContent value="intake" className="space-y-6">
        <ExpandedIntakeForm form={form} />
      </TabsContent>

      <TabsContent value="customer" className="space-y-6">
        <CustomerFields form={form} prePopulatedCustomer={prePopulatedCustomer} />
      </TabsContent>

      <TabsContent value="services" className="space-y-6">
        <ServicesSection form={form} onServicesChange={handleServicesChange} />
        
        {/* Job Lines Section - Show selected services as job lines */}
        <JobLinesSection
          workOrderId={workOrderId}
          description={description}
          jobLines={allJobLines}
          onJobLinesChange={handleJobLinesChange}
          isEditMode={true}
          shopId={shopId}
          selectedServicesCount={selectedServices.length}
        />
      </TabsContent>

      <TabsContent value="assignment" className="space-y-6">
        <StatusFields form={form} />
        <AssignmentFields 
          form={form} 
          technicians={technicians}
          technicianLoading={technicianLoading}
          technicianError={technicianError}
        />
        <NotesField form={form} />
      </TabsContent>
    </Tabs>
  );
};
