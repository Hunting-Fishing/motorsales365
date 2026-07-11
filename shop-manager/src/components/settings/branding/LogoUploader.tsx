
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LogoUploaderProps {
  logoPreview: string | null;
  companyName: string;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCompanyNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading?: boolean;
}

export function LogoUploader({ 
  logoPreview, 
  companyName, 
  onLogoChange, 
  onCompanyNameChange,
  loading = false
}: LogoUploaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <Label htmlFor="company-name">Company Name</Label>
        <Input 
          id="company-name" 
          value={companyName}
          onChange={onCompanyNameChange}
          className="mt-1"
          disabled={loading}
        />
      </div>
      
      <div>
        <Label htmlFor="logo-upload">Upload Logo</Label>
        <Input 
          id="logo-upload" 
          type="file" 
          accept="image/*"
          onChange={onLogoChange}
          className="mt-1" 
        />
        <p className="text-sm text-muted-foreground mt-1">
          Recommended: 200×60px, PNG or SVG
        </p>
      </div>
    </div>
  );
}
