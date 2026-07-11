
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BusinessInfoSection } from '@/components/settings/BusinessInfoSection';
import { useBusinessConstants } from '@/hooks/useBusinessConstants';
import { useShopData } from '@/hooks/useShopData';

interface StepProps {
  onNext: () => void;
  onPrevious: () => void;
  data: any;
  updateData: (data: any) => void;
  onComplete?: () => void;
  loading?: boolean;
}

export function BusinessDetailsStep({ onNext, onPrevious, data, updateData, loading = false }: StepProps) {
  const { companyInfo, updateCompanyInfo } = useShopData();
  const { businessTypes, businessIndustries, isLoading: isLoadingConstants } = useBusinessConstants();
  
  const [formData, setFormData] = useState({
    tax_id: data.taxId || companyInfo?.tax_id || '',
    business_type: data.businessType || companyInfo?.business_type || '',
    industry: data.industry || companyInfo?.industry || '',
    other_industry: data.otherIndustry || companyInfo?.other_industry || ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const fieldName = id.replace('company-', '');
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'industry' && value !== 'other' ? { other_industry: '' } : {})
    }));
  };

  const handleNext = async () => {
    // Convert to the format expected by updateData
    const dataToUpdate = {
      taxId: formData.tax_id,
      businessType: formData.business_type,
      industry: formData.industry,
      otherIndustry: formData.other_industry
    };
    
    updateData(dataToUpdate);
    
    // Save to database
    await updateCompanyInfo(formData);
    
    onNext();
  };

  // Show empty state if no business types are available
  if (!isLoadingConstants && businessTypes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Business information setup is ready for configuration.
          </p>
          <p className="text-sm text-gray-500">
            You can add business types and industries through the admin settings.
          </p>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious} disabled={loading}>
            Back
          </Button>
          <Button onClick={handleNext} disabled={loading}>
            {loading ? 'Saving...' : 'Next'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BusinessInfoSection
        companyInfo={formData}
        businessTypes={businessTypes}
        businessIndustries={businessIndustries}
        isLoadingConstants={isLoadingConstants}
        onInputChange={handleInputChange}
        onSelectChange={handleSelectChange}
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={loading}>
          {loading ? 'Saving...' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
