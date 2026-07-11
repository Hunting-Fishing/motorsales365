
import React, { useState, useEffect } from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { LabourRatesTab } from "@/components/settings/LabourRatesTab";
import { DIYBayRatesTab } from "@/components/settings/DIYBayRatesTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLabourRates } from "@/hooks/useLabourRates";

export const LabourSettings = () => {
  const [activeTab, setActiveTab] = useState("standard-rates");
  const { loading: labourRatesLoading } = useLabourRates();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Set a small timeout to ensure UI elements are ready
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <SettingsPageLayout 
      title="Labour & Bay Rates"
      description="Configure hourly rates for different service types and DIY bay rentals"
      isLoading={isLoading}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100 p-1 rounded-lg border border-gray-200">
          <TabsTrigger 
            value="standard-rates"
            className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Labour Rates
          </TabsTrigger>
          <TabsTrigger 
            value="diy-bays"
            className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            DIY Bay Rentals
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="standard-rates">
          <LabourRatesTab />
        </TabsContent>
        
        <TabsContent value="diy-bays">
          <DIYBayRatesTab />
        </TabsContent>
      </Tabs>
    </SettingsPageLayout>
  );
};

export default LabourSettings;
