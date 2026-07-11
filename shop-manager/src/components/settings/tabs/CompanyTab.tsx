
import React from 'react';
import { SettingsFormWrapper } from '../SettingsFormWrapper';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';
import { CompanyInfoForm } from '@/components/settings/forms/CompanyInfoForm';
import { BusinessHoursForm } from '@/components/settings/forms/BusinessHoursForm';

export function CompanyTab() {
  const {
    companyInfo,
    businessHours,
    loading,
    saving,
    error,
    dataChanged,
    handleInputChange,
    handleSelectChange,
    handleBusinessHoursChange,
    handleFileUpload,
    handleSave,
    loadCompanyInfo
  } = useCompanyInfo();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Company Information</h2>
          <p className="text-muted-foreground">Manage your business details and operating hours</p>
        </div>
      </div>

      <SettingsFormWrapper
        title="Business Details"
        description="Basic information about your business"
        isLoading={loading}
        error={error}
        onRetry={loadCompanyInfo}
      >
        <CompanyInfoForm
          companyInfo={companyInfo}
          saving={saving}
          dataChanged={dataChanged}
          onInputChange={handleInputChange}
          onSelectChange={handleSelectChange}
          onFileUpload={handleFileUpload}
          onSave={handleSave}
        />
      </SettingsFormWrapper>

      <SettingsFormWrapper
        title="Business Hours"
        description="Set your operating hours for each day of the week"
        isLoading={loading}
        error={error}
        onRetry={loadCompanyInfo}
      >
        <BusinessHoursForm
          businessHours={businessHours}
          saving={saving}
          dataChanged={dataChanged}
          onChange={handleBusinessHoursChange}
          onSave={handleSave}
        />
      </SettingsFormWrapper>
    </div>
  );
}
