
import React from "react";
import { FormField } from "@/components/ui/form-field";
import { LogoUploadSection } from "./LogoUploadSection";
import { CompanyInfo } from "@/services/settings/companyService";
import { formatPhoneNumber } from "@/utils/formatters";

interface BasicInfoSectionProps {
  companyInfo: CompanyInfo;
  uploadingLogo: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BasicInfoSection({
  companyInfo,
  uploadingLogo,
  onInputChange,
  onFileUpload,
}: BasicInfoSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2 mb-4 flex items-center justify-center">
        <LogoUploadSection 
          logoUrl={companyInfo.logo_url} 
          isUploading={uploadingLogo} 
          onFileUpload={onFileUpload} 
        />
      </div>

      <FormField
        label="Company Name"
        id="company-name"
        value={companyInfo.name}
        onChange={onInputChange}
        required
      />
      
      <FormField
        label="Email"
        id="company-email"
        type="email"
        value={companyInfo.email || ""}
        onChange={onInputChange}
      />
      
      <FormField
        label="Phone"
        id="company-phone"
        type="tel"
        value={formatPhoneNumber(companyInfo.phone || "")}
        onChange={onInputChange}
      />
      
      <FormField
        label="Address"
        id="company-address"
        value={companyInfo.address || ""}
        onChange={onInputChange}
      />
      
      <FormField
        label="City"
        id="company-city"
        value={companyInfo.city || ""}
        onChange={onInputChange}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="State"
          id="company-state"
          value={companyInfo.state || ""}
          onChange={onInputChange}
        />
        
        <FormField
          label="ZIP Code"
          id="company-zip"
          value={companyInfo.zip || ""}
          onChange={onInputChange}
        />
      </div>
    </div>
  );
}
