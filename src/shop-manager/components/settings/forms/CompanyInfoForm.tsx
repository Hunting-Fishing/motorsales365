
import React from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Upload } from 'lucide-react';
import { useBusinessConstants } from '@/hooks/useBusinessConstants';
import type { CompanyInfo } from '@/services/settings/companyService';

interface CompanyInfoFormProps {
  companyInfo: CompanyInfo;
  saving: boolean;
  dataChanged: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (field: string, value: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}

export function CompanyInfoForm({
  companyInfo,
  saving,
  dataChanged,
  onInputChange,
  onSelectChange,
  onFileUpload,
  onSave
}: CompanyInfoFormProps) {
  const { businessTypes, businessIndustries, isLoading: isLoadingConstants } = useBusinessConstants();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          id="company-name"
          label="Company Name"
          value={companyInfo.name}
          onChange={onInputChange}
          required
          fullWidth
        />

        <div className="space-y-2">
          <Label htmlFor="company-logo">Company Logo</Label>
          <div className="flex items-center space-x-4">
            {companyInfo.logo_url && (
              <img
                src={companyInfo.logo_url}
                alt="Company Logo"
                className="h-12 w-12 object-contain rounded border"
              />
            )}
            <div className="flex-1">
              <input
                type="file"
                id="company-logo"
                accept="image/*"
                onChange={onFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('company-logo')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <FormField
          id="company-address"
          label="Address"
          value={companyInfo.address}
          onChange={onInputChange}
          fullWidth
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            id="company-city"
            label="City"
            value={companyInfo.city}
            onChange={onInputChange}
            fullWidth
          />

          <FormField
            id="company-state"
            label="State"
            value={companyInfo.state}
            onChange={onInputChange}
            fullWidth
          />

          <FormField
            id="company-zip"
            label="ZIP Code"
            value={companyInfo.zip}
            onChange={onInputChange}
            fullWidth
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          id="company-phone"
          label="Phone"
          type="tel"
          value={companyInfo.phone}
          onChange={onInputChange}
          fullWidth
        />

        <FormField
          id="company-email"
          label="Email"
          type="email"
          value={companyInfo.email}
          onChange={onInputChange}
          fullWidth
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          id="company-tax_id"
          label="Tax ID"
          value={companyInfo.tax_id}
          onChange={onInputChange}
          fullWidth
        />

        <div className="space-y-2">
          <Label htmlFor="business-type">Business Type</Label>
          <Select
            value={companyInfo.business_type}
            onValueChange={(value) => onSelectChange('business_type', value)}
            disabled={isLoadingConstants}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              {businessTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select
            value={companyInfo.industry}
            onValueChange={(value) => onSelectChange('industry', value)}
            disabled={isLoadingConstants}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {businessIndustries.map((industry) => (
                <SelectItem key={industry.value} value={industry.value}>
                  {industry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {companyInfo.industry === 'other' && (
          <FormField
            id="company-other_industry"
            label="Other Industry"
            value={companyInfo.other_industry || ''}
            onChange={onInputChange}
            fullWidth
          />
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={onSave}
          disabled={!dataChanged || saving}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
