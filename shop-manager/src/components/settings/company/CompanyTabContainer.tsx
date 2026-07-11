
import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, CircleDollarSign, Clock, Save } from "lucide-react";
import { BasicInfoSection } from "./BasicInfoSection";
import { BusinessInfoSection } from "../BusinessInfoSection";
import { BusinessHoursSection } from "./BusinessHoursSection";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { CompanyTabSkeleton } from "./CompanyTabSkeleton";
import { useToast } from "@/hooks/use-toast";

export function CompanyTabContainer() {
  const [activeTab, setActiveTab] = useState("basic");
  const { toast } = useToast();
  
  const {
    companyInfo,
    businessHours,
    loading,
    saving,
    uploadingLogo,
    businessTypes,
    businessIndustries,
    isLoadingConstants,
    initialized,
    saveComplete,
    dataChanged,
    handleInputChange,
    handleSelectChange,
    handleBusinessHoursChange,
    handleFileUpload,
    handleSave,
    loadCompanyInfo
  } = useCompanyInfo();

  // Debug logs
  useEffect(() => {
    if (initialized && !loading) {
      console.log("Company info in container:", companyInfo);
      console.log("Business hours in container:", businessHours);
    }
  }, [companyInfo, businessHours, initialized, loading]);

  // Prompt user before leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dataChanged) {
        const message = "You have unsaved changes. Are you sure you want to leave?";
        e.returnValue = message;
        return message;
      }
    };

    if (dataChanged) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [dataChanged]);

  // When tab changes - log it to help with debugging
  useEffect(() => {
    console.log("Active tab changed to:", activeTab);
  }, [activeTab]);

  // Transform companyInfo to match BusinessInfoSection expected props
  const businessInfoProps = {
    tax_id: companyInfo.tax_id,
    business_type: companyInfo.business_type,
    industry: companyInfo.industry,
    other_industry: companyInfo.other_industry
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span>Basic Info</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4" />
            <span>Business Details</span>
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Business Hours</span>
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !initialized ? (
              <CompanyTabSkeleton />
            ) : (
              <>
                <TabsContent value="basic" className="mt-0">
                  <BasicInfoSection
                    companyInfo={companyInfo}
                    uploadingLogo={uploadingLogo}
                    onInputChange={handleInputChange}
                    onFileUpload={handleFileUpload}
                  />
                </TabsContent>

                <TabsContent value="business" className="mt-0">
                  <BusinessInfoSection
                    companyInfo={businessInfoProps}
                    businessTypes={businessTypes}
                    businessIndustries={businessIndustries}
                    isLoadingConstants={isLoadingConstants}
                    onInputChange={handleInputChange}
                    onSelectChange={handleSelectChange}
                  />
                </TabsContent>

                <TabsContent value="hours" className="mt-0">
                  <BusinessHoursSection
                    businessHours={businessHours}
                    onBusinessHoursChange={handleBusinessHoursChange}
                  />
                </TabsContent>

                <div className="flex justify-end mt-6">
                  <Button 
                    className={`${dataChanged ? 'bg-esm-blue-600 hover:bg-esm-blue-700' : 'bg-gray-300 hover:bg-gray-400'}`}
                    onClick={handleSave}
                    disabled={saving || !dataChanged}
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {dataChanged ? "Save Changes" : "No Changes"}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
