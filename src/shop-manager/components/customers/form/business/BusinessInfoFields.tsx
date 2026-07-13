
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { 
  Building2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerFormValues } from "../schemas/customerSchema";
import { shops as defaultShops } from "../schemas/relationshipData";
import { EssentialBusinessDetails } from "./EssentialBusinessDetails";
import { FleetManagementSection } from "./FleetManagementSection";

interface BusinessInfoFieldsProps {
  form: UseFormReturn<CustomerFormValues>;
  availableShops?: Array<{id: string, name: string}>;
  singleShopMode?: boolean;
}

export const BusinessInfoFields: React.FC<BusinessInfoFieldsProps> = ({ 
  form,
  availableShops = defaultShops,
  singleShopMode = false
}) => {
  // Watch form values to determine initial state
  const company = form.watch("company");
  const businessType = form.watch("business_type");
  const businessIndustry = form.watch("business_industry");
  const taxId = form.watch("tax_id");
  const businessEmail = form.watch("business_email");
  const businessPhone = form.watch("business_phone");
  const isFleet = form.watch("is_fleet");

  // Determine if business info is present
  const hasBusinessInfo = !!(
    company || 
    businessType || 
    businessIndustry || 
    taxId || 
    businessEmail || 
    businessPhone
  );

  // State for collapsible sections - smart defaults
  const [isEssentialInfoOpen, setIsEssentialInfoOpen] = React.useState(hasBusinessInfo);
  const [isFleetOpen, setIsFleetOpen] = React.useState(isFleet);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <CardTitle>Business Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Essential Business Details Section */}
        <EssentialBusinessDetails 
          form={form} 
          isOpen={isEssentialInfoOpen} 
          setIsOpen={setIsEssentialInfoOpen}
          availableShops={availableShops}
          singleShopMode={singleShopMode}
        />

        {/* Fleet Management Section */}
        <FleetManagementSection 
          form={form} 
          isOpen={isFleetOpen} 
          setIsOpen={setIsFleetOpen}
          isFleet={isFleet}
        />
      </CardContent>
    </Card>
  );
};
