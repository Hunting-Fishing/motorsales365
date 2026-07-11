import { useState } from "react";
import { CustomerFormValues } from "@/components/customers/form/schemas/customerSchema";
import { useShopData } from "./useShopData";
import { useCustomerSubmit } from "./useCustomerSubmit";
import { showImportCompleteNotification } from "../utils/customerNotificationHandler";
import { useToast } from "@/hooks/use-toast";

export const useCustomerCreate = () => {
  const { isLoading, availableShops, currentUserShopId } = useShopData();
  const { isSubmitting, isSuccess, newCustomerId, handleSubmit } = useCustomerSubmit();
  const { toast } = useToast();
  
  // Set default values with the current user's shop_id automatically selected
  const [defaultValues] = useState<CustomerFormValues>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    company: "",
    notes: "",
    shop_id: currentUserShopId || "", // Automatically set to user's shop
    tags: [],
    preferred_technician_id: "",
    communication_preference: "",
    referral_source: "",
    referral_person_id: "",
    other_referral_details: "",
    is_fleet: false,
    fleet_company: "",
    vehicles: [],
    segments: [],
    create_new_household: false,
    new_household_name: "",
    household_id: "", 
    household_relationship: "primary",
  });

  const onSubmit = async (data: CustomerFormValues) => {
    console.log("🔄 useCustomerCreate: Starting customer submission...");
    
    // Ensure shop_id is set to current user's shop if not already set
    const customerData = {
      ...data,
      shop_id: data.shop_id || currentUserShopId || ""
    };
    
    // Validate that shop_id is present
    if (!customerData.shop_id) {
      toast({
        title: "Error",
        description: "Unable to determine your shop. Please contact your administrator.",
        variant: "destructive"
      });
      return;
    }
    
    console.log("📊 useCustomerCreate: Submitting customer with shop_id:", customerData.shop_id);
    console.log("📊 useCustomerCreate: Customer data:", customerData);
    
    await handleSubmit(customerData);
  };

  const handleImportComplete = () => {
    showImportCompleteNotification(toast);
  };

  return {
    isSubmitting,
    isSuccess,
    isLoading,
    newCustomerId,
    defaultValues: {
      ...defaultValues,
      shop_id: currentUserShopId || "" // Ensure shop_id is always set from current user
    },
    availableShops,
    onSubmit,
    handleImportComplete,
  };
};
