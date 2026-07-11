
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CustomerFormValues } from "./schemas/customerSchema";
import { PersonalInfoFields } from "./PersonalInfoFields";
import { BusinessInfoFields } from "./business/BusinessInfoFields";
import { PaymentBillingFields } from "./payment/PaymentBillingFields";
import { PreferencesFields } from "./PreferencesFields";
import { ReferralFields } from "./ReferralFields";
import { VehiclesFields } from "./VehiclesFields";
import { SegmentFields } from "./SegmentFields";
import { HouseholdFields } from "./HouseholdFields";

export interface FormContentProps {
  form: UseFormReturn<CustomerFormValues>;
  currentTab: string;
  formContext?: {
    availableShops?: Array<{id: string, name: string}>;
    singleShopMode?: boolean;
  };
}

export const FormContent: React.FC<FormContentProps> = ({ 
  form, 
  currentTab,
  formContext
}) => {
  return (
    <Tabs value={currentTab}>
      <TabsContent value="personal" className="mt-6">
        <PersonalInfoFields form={form} />
      </TabsContent>
      
      <TabsContent value="business" className="mt-6">
        <BusinessInfoFields 
          form={form} 
          availableShops={formContext?.availableShops} 
          singleShopMode={formContext?.singleShopMode}
        />
      </TabsContent>
      
      <TabsContent value="payment" className="mt-6">
        <PaymentBillingFields form={form} />
      </TabsContent>
      
      <TabsContent value="preferences" className="mt-6">
        <PreferencesFields form={form} />
      </TabsContent>
      
      <TabsContent value="household" className="mt-6">
        <HouseholdFields form={form} />
      </TabsContent>
      
      <TabsContent value="referral" className="mt-6">
        <ReferralFields form={form} />
      </TabsContent>
      
      <TabsContent value="segments" className="mt-6">
        <SegmentFields form={form} />
      </TabsContent>
      
      <TabsContent value="vehicles" className="mt-6">
        <VehiclesFields form={form} />
      </TabsContent>
    </Tabs>
  );
};
