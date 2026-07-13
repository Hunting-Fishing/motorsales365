
import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { CustomerFormValues, customerSchema } from "./schemas/customerSchema";
import { FormTabs } from "./FormTabs";
import { FormContent } from "./FormContent";
import { CustomerFormActions } from "./CustomerFormActions";
import { useFormNavigation } from "./useFormNavigation";
import { FormContentWrapper } from "./FormContentWrapper";

interface CustomerFormProps {
  defaultValues?: CustomerFormValues;
  onSubmit: (data: CustomerFormValues) => Promise<void>;
  isSubmitting?: boolean;
  availableShops?: Array<{ id: string; name: string }>;
  singleShopMode?: boolean;
  isEditMode?: boolean;
  customerId?: string;
  initialTab?: string;
  formId?: string;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  availableShops = [],
  singleShopMode = false,
  isEditMode = false,
  customerId,
  initialTab,
  formId = "customer-create-form"
}) => {
  const {
    currentTab,
    setCurrentTab,
    handleNext,
    handlePrevious,
    currentStep,
    totalSteps,
    progressPercentage
  } = useFormNavigation();
  
  // Set initial tab if provided
  React.useEffect(() => {
    if (initialTab) {
      setCurrentTab(initialTab);
    }
  }, [initialTab, setCurrentTab]);
  
  // Create form with proper default values including automatic shop selection
  const formDefaultValues = defaultValues || {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    shop_id: "", // This will be set by useCustomerCreate hook
    vehicles: [],
    tags: [],
    segments: [],
    is_fleet: false,
    auto_billing: false,
    terms_agreed: false,
    create_new_household: false
  };

  // If we're in single shop mode and have shops available, auto-select the first one
  if (singleShopMode && availableShops.length === 1 && !formDefaultValues.shop_id) {
    formDefaultValues.shop_id = availableShops[0].id;
  }

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: formDefaultValues,
  });

  // Watch for shop_id changes to ensure it's always set
  const currentShopId = form.watch('shop_id');
  
  React.useEffect(() => {
    // If shop_id is not set but we have available shops, set it automatically
    if (!currentShopId && availableShops.length > 0) {
      console.log("🔧 CustomerForm: Auto-setting shop_id to:", availableShops[0].id);
      form.setValue('shop_id', availableShops[0].id);
    }
  }, [currentShopId, availableShops, form]);

  const handleFormSubmit = async (data: CustomerFormValues) => {
    console.log("📝 CustomerForm: Form submission started");
    console.log("📊 CustomerForm: Form data:", data);
    
    // Ensure shop_id is set before submission
    if (!data.shop_id && availableShops.length > 0) {
      data.shop_id = availableShops[0].id;
      console.log("🔧 CustomerForm: Auto-assigned shop_id:", data.shop_id);
    }
    
    await onSubmit(data);
  };
  
  // Save draft to localStorage
  const handleSaveDraft = () => {
    const draftData = form.getValues();
    const draftKey = customerId ? `customer-draft-${customerId}` : `customer-draft-new`;
    localStorage.setItem(draftKey, JSON.stringify({
      data: draftData,
      savedAt: new Date().toISOString()
    }));
    console.log("Draft saved:", draftKey);
  };

  return (
    <div className="space-y-8 pb-10 relative">
      <FormContentWrapper
        form={form}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        handleNext={handleNext}
        handlePrevious={handlePrevious}
        handleSaveDraft={handleSaveDraft}
        isSubmitting={isSubmitting}
        onSubmit={handleFormSubmit}
        formContext={{
          availableShops,
          singleShopMode
        }}
        isEditMode={isEditMode}
        customerId={customerId}
        currentStep={currentStep}
        totalSteps={totalSteps}
        progressPercentage={progressPercentage}
        formId={formId}
      />
    </div>
  );
};
