
import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BusinessConstant } from "@/hooks/useBusinessConstants";

interface BusinessInfoSectionProps {
  companyInfo: {
    taxId: string;
    businessType: string;
    industry: string;
    otherIndustry?: string;
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
  
  // Check if "other" is selected when component mounts or industry changes
  useEffect(() => {
    setShowOtherIndustry(companyInfo.industry === "other");
  }, [companyInfo.industry]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField
        label="Tax ID / EIN"
        id="company-taxId"
        value={companyInfo.taxId}
        onChange={onInputChange}
        description="Your business tax identification number"
      />
      
      <div className="space-y-2">
        <Label htmlFor="business-type">Business Type</Label>
        <Select 
          value={companyInfo.businessType} 
          onValueChange={(value) => onSelectChange('businessType', value)}
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
          id="company-otherIndustry"
          value={companyInfo.otherIndustry || ""}
          onChange={onInputChange}
          placeholder="Enter your industry"
          required
          description="Please specify your industry"
        />
      )}
    </div>
  );
}
