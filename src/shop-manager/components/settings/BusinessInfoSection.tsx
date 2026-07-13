
import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BusinessConstant } from "@/hooks/useBusinessConstants";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface BusinessInfoSectionProps {
  companyInfo: {
    tax_id: string;
    business_type: string;
    industry: string;
    other_industry?: string;
  };
  businessTypes: BusinessConstant[];
  businessIndustries: BusinessConstant[];
  isLoadingConstants: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (field: string, value: string) => void;
}

export function BusinessInfoSection({
  companyInfo,
  businessTypes,
  businessIndustries,
  isLoadingConstants,
  onInputChange,
  onSelectChange
}: BusinessInfoSectionProps) {
  const [showOtherIndustry, setShowOtherIndustry] = useState(false);
  const [hasCustomIndustry, setHasCustomIndustry] = useState(false);
  
  // Check if "other" is selected when component mounts or industry changes
  useEffect(() => {
    setShowOtherIndustry(companyInfo.industry === "other");
    
    // Check if the current industry is in the list of business industries
    if (companyInfo.industry && companyInfo.industry !== "other" && businessIndustries.length > 0) {
      const industryExists = businessIndustries.some(i => i.value === companyInfo.industry);
      setHasCustomIndustry(!industryExists && companyInfo.industry !== "");
    } else {
      setHasCustomIndustry(false);
    }
  }, [companyInfo.industry, businessIndustries]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField
        label="Tax ID / EIN"
        id="company-tax_id"
        value={companyInfo.tax_id}
        onChange={onInputChange}
        description="Your business tax identification number"
      />
      
      <div className="space-y-2">
        <Label htmlFor="business-type">Business Type</Label>
        <Select 
          value={companyInfo.business_type} 
          onValueChange={(value) => onSelectChange('business_type', value)}
          disabled={isLoadingConstants}
        >
          <SelectTrigger id="business-type">
            <SelectValue placeholder="Select business type" />
          </SelectTrigger>
          <SelectContent>
            {businessTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="business-industry">Industry</Label>
        <Select 
          value={companyInfo.industry} 
          onValueChange={(value) => {
            onSelectChange('industry', value);
            setShowOtherIndustry(value === "other");
          }}
          disabled={isLoadingConstants}
        >
          <SelectTrigger id="business-industry">
            <SelectValue placeholder="Select industry" />
          </SelectTrigger>
          <SelectContent>
            {businessIndustries.map((industry) => (
              <SelectItem key={industry.value} value={industry.value}>{industry.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showOtherIndustry && (
        <FormField
          label="Specify Industry"
          id="company-other_industry"
          value={companyInfo.other_industry || ""}
          onChange={onInputChange}
          placeholder="Enter your industry"
          required
          description="Please specify your industry"
        />
      )}
      
      {hasCustomIndustry && (
        <div className="md:col-span-2">
          <Alert className="bg-blue-50">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <AlertDescription className="text-blue-700">
              You're using a custom industry. You can select "Other" and enter a new industry if needed.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
