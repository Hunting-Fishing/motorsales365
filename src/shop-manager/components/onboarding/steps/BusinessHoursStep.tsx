
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BusinessHoursSection } from '@/components/settings/company/BusinessHoursSection';
import { companyService, type BusinessHours } from '@/services/settings/companyService';
import { useShopData } from '@/hooks/useShopData';

interface StepProps {
  onNext: () => void;
  onPrevious: () => void;
  data: any;
  updateData: (data: any) => void;
  onComplete?: () => void;
  loading?: boolean;
}

const createDefaultHours = (shopId: string): BusinessHours[] => {
  return Array.from({ length: 7 }, (_, index) => ({
    shop_id: shopId,
    day_of_week: index,
    open_time: "09:00:00",
    close_time: "17:00:00",
    is_closed: index === 0 || index === 6 // Sunday and Saturday closed by default
  }));
};

export function BusinessHoursStep({ onNext, onPrevious, data, updateData, loading = false }: StepProps) {
  const { shopData } = useShopData();
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing business hours or create defaults
  useEffect(() => {
    const loadBusinessHours = async () => {
      // If no shop yet, use defaults with empty shop_id (will be updated on save)
      if (!shopData?.id) {
        setBusinessHours(createDefaultHours(''));
        setIsLoading(false);
        return;
      }
      
      try {
        const hours = await companyService.getBusinessHours(shopData.id);
        if (hours.length > 0) {
          setBusinessHours(hours);
        } else {
          setBusinessHours(createDefaultHours(shopData.id));
        }
      } catch (error) {
        console.error('Failed to load business hours:', error);
        setBusinessHours(createDefaultHours(shopData.id));
      } finally {
        setIsLoading(false);
      }
    };

    loadBusinessHours();
  }, [shopData?.id]);

  const handleBusinessHoursChange = (hours: BusinessHours[]) => {
    setBusinessHours(hours);
  };

  const handleNext = async () => {
    try {
      if (shopData?.id) {
        // Update hours with correct shop_id
        const hoursWithShopId = businessHours.map(h => ({ ...h, shop_id: shopData.id }));
        await companyService.updateBusinessHours(shopData.id, hoursWithShopId);
      }
      updateData({ businessHours });
      onNext();
    } catch (error) {
      console.error('Failed to save business hours:', error);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading business hours...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Set Your Business Hours</h3>
        <p className="text-gray-600 mb-6">
          Configure when your shop is open to customers. You can always change these later.
        </p>
      </div>

      <BusinessHoursSection
        businessHours={businessHours}
        onBusinessHoursChange={handleBusinessHoursChange}
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
