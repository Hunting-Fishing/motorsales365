
import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, User, Building2, CreditCard, Users, Heart } from "lucide-react";

type TabValue = "personal" | "business" | "payment" | "vehicles" | "preferences" | "household" | "loyalty";

export interface FormTabsProps {
  initialTab?: string;
  currentTab?: string;
  setCurrentTab?: (value: string) => void;
  hasPersonalErrors?: boolean;
  hasBusinessErrors?: boolean;
  hasPaymentErrors?: boolean;
  hasPreferencesErrors?: boolean;
  hasReferralErrors?: boolean;
  hasVehicleErrors?: boolean;
  hasHouseholdErrors?: boolean;
  hasSegmentErrors?: boolean;
  isMobile?: boolean;
}

export const FormTabs: React.FC<FormTabsProps> = ({ 
  initialTab, 
  currentTab, 
  setCurrentTab,
  hasPersonalErrors,
  hasBusinessErrors,
  hasPaymentErrors,
  hasPreferencesErrors,
  hasReferralErrors,
  hasVehicleErrors,
  hasHouseholdErrors,
  hasSegmentErrors,
  isMobile
}) => {
  const [activeTab, setActiveTab] = useState<TabValue>("personal");

  // Set initial tab if provided
  useEffect(() => {
    if (initialTab === 'vehicles') {
      setActiveTab('vehicles');
    }
  }, [initialTab]);

  const handleValueChange = (value: string) => {
    setActiveTab(value as TabValue);
    // If setCurrentTab is provided (from parent), call it
    if (setCurrentTab) {
      setCurrentTab(value);
    }
  };
  
  return (
    <div className="sticky top-0 z-10 bg-background pb-4 pt-1">
      <Tabs value={currentTab || activeTab} onValueChange={handleValueChange} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="personal" className="flex items-center gap-2" data-section="personal">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal Info</span>
            <span className="inline sm:hidden">Personal</span>
            {hasPersonalErrors && <span className="w-2 h-2 rounded-full bg-destructive ml-1"></span>}
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2" data-section="business">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Business Info</span>
            <span className="inline sm:hidden">Business</span>
            {hasBusinessErrors && <span className="w-2 h-2 rounded-full bg-destructive ml-1"></span>}
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2" data-section="payment">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payment & Billing</span>
            <span className="inline sm:hidden">Payment</span>
            {hasPaymentErrors && <span className="w-2 h-2 rounded-full bg-destructive ml-1"></span>}
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-2" data-section="vehicles">
            <Car className="h-4 w-4" />
            <span>Vehicles</span>
            {hasVehicleErrors && <span className="w-2 h-2 rounded-full bg-destructive ml-1"></span>}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2" data-section="preferences">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
            <span className="inline sm:hidden">Prefs</span>
            {hasPreferencesErrors && <span className="w-2 h-2 rounded-full bg-destructive ml-1"></span>}
          </TabsTrigger>
          <TabsTrigger value="household" className="flex items-center gap-2" data-section="household">
            <Users className="h-4 w-4" />
            <span>Household</span>
            {hasHouseholdErrors && <span className="w-2 h-2 rounded-full bg-destructive ml-1"></span>}
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="flex items-center gap-2" data-section="loyalty">
            <Heart className="h-4 w-4" />
            <span>Loyalty</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
