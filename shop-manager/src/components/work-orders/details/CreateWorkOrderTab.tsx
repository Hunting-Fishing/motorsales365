
import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WorkOrderFormFields } from '../WorkOrderFormFields';
import { WorkOrderFormSchemaValues } from '@/schemas/workOrderSchema';
import { WorkOrderJobLine } from '@/types/jobLine';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { ClickableErrorItem } from '../shared/ClickableErrorItem';

interface Technician {
  id: string;
  name: string;
  jobTitle?: string;
}

interface CreateWorkOrderTabProps {
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
  onCreateWorkOrder?: (data: WorkOrderFormSchemaValues) => void;
  isEditMode?: boolean;
  onTabChange?: (tabValue: string) => void;
  currentTab?: string;
}

export function CreateWorkOrderTab({
  form,
  technicians,
  technicianLoading,
  technicianError,
  jobLines = [],
  onJobLinesChange,
  workOrderId = `temp-${Date.now()}`,
  shopId,
  prePopulatedCustomer,
  onCreateWorkOrder,
  isEditMode = false,
  onTabChange,
  currentTab = "intake"
}: CreateWorkOrderTabProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (data: WorkOrderFormSchemaValues) => {
    console.log('=== CREATE WORK ORDER TAB SUBMIT ===');
    console.log('1. Form data received:', data);
    console.log('2. Form errors state:', form.formState.errors);
    console.log('3. Form is valid:', form.formState.isValid);
    console.log('4. Current job lines:', jobLines);
    
    // Check if handler is provided
    if (!onCreateWorkOrder) {
      console.error('onCreateWorkOrder handler not provided');
      toast({
        title: "Configuration Error",
        description: "Work order creation handler is not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('5. Validation passed, starting submission...');
    setIsSubmitting(true);
    try {
      // Ensure inventoryItems is properly typed and include job lines
      const formData: WorkOrderFormSchemaValues & { jobLines?: any[] } = {
        ...data,
        inventoryItems: Array.isArray(data.inventoryItems) ? data.inventoryItems : [],
        jobLines: jobLines || []
      };
      
      console.log('6. Final form data being passed to handler:', formData);
      console.log('6.1. Job lines in form data:', formData.jobLines);
      console.log('6.2. Job lines length:', formData.jobLines?.length);
      
      await onCreateWorkOrder(formData);
      
      console.log('7. Work order creation completed successfully');
      toast({
        title: "Success",
        description: `Work order ${isEditMode ? 'updated' : 'created'} successfully`,
        variant: "default",
      });
    } catch (error) {
      console.error('=== CREATE WORK ORDER TAB ERROR ===');
      console.error('Error in onSubmit:', error);
      console.error('Error message:', (error as Error)?.message);
      
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'create'} work order: ${(error as Error)?.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get form validation errors with navigation data
  const getFormErrors = () => {
    const errors: Array<{
      field: string;
      message: string;
      tab: string;
      tabValue: string;
      fieldId: string;
    }> = [];
    
    if (form.formState.errors.customer) {
      errors.push({
        field: "Customer Name",
        message: "Customer name is required",
        tab: "Customer & Vehicle",
        tabValue: "customer",
        fieldId: "customer"
      });
    }
    
    if (form.formState.errors.description) {
      errors.push({
        field: "Description",
        message: "Description is required",
        tab: "Intake & Details", 
        tabValue: "intake",
        fieldId: "description"
      });
    }
    
    return errors;
  };

  const formErrors = getFormErrors();
  const hasFormErrors = formErrors.length > 0;
  const isFormValid = form.formState.isValid;

  // Handle navigation to error field
  const handleNavigateToError = (tabValue: string, fieldId: string) => {
    // Switch to the correct tab
    if (onTabChange) {
      onTabChange(tabValue);
    }
    
    // Focus the field after a brief delay to allow tab switching
    setTimeout(() => {
      form.setFocus(fieldId as any);
      
      // Add visual highlight to the field
      const fieldElement = document.querySelector(`[name="${fieldId}"]`);
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fieldElement.classList.add('animate-pulse', 'ring-2', 'ring-destructive');
        setTimeout(() => {
          fieldElement.classList.remove('animate-pulse', 'ring-2', 'ring-destructive');
        }, 2000);
      }
    }, 150);
  };

  // Debug logging for form state
  console.log('=== FORM STATE DEBUG ===');
  console.log('Form is valid:', isFormValid);
  console.log('Form errors:', form.formState.errors);
  console.log('Form values:', form.getValues());
  console.log('Has form errors:', hasFormErrors);
  console.log('Form errors list:', formErrors);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditMode ? 'Edit Work Order' : 'Create New Work Order'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <WorkOrderFormFields
                form={form}
                technicians={technicians}
                technicianLoading={technicianLoading}
                technicianError={technicianError}
                jobLines={jobLines}
                onJobLinesChange={onJobLinesChange}
                workOrderId={workOrderId}
                shopId={shopId}
                prePopulatedCustomer={prePopulatedCustomer}
                onTabChange={onTabChange}
                currentTab={currentTab}
              />
              
              {/* Form Validation Feedback */}
              {hasFormErrors && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-3">Please fix the following errors:</div>
                    <div className="space-y-2">
                      {formErrors.map((error, index) => (
                        <ClickableErrorItem
                          key={index}
                          error={error}
                          onNavigate={handleNavigateToError}
                        />
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Form Success Indicator */}
              {isFormValid && !hasFormErrors && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Form is ready to submit!
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || hasFormErrors}
                  className={hasFormErrors ? "opacity-50 cursor-not-allowed" : ""}
                >
                  {isSubmitting 
                    ? (isEditMode ? 'Updating...' : 'Creating...') 
                    : hasFormErrors 
                      ? 'Fix errors to continue'
                      : (isEditMode ? 'Update Work Order' : 'Create Work Order')
                  }
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
