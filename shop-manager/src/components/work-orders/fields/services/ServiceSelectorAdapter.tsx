
import React from 'react';
import { ServiceMainCategory, ServiceJob } from '@/types/service';
import { SelectedService } from '@/types/selectedService';
import { IntegratedServiceSelector } from './IntegratedServiceSelector';

// Adapter component to convert old categories prop to new sectors prop
interface ServiceSelectorAdapterProps {
  categories: ServiceMainCategory[];
  onServiceSelect: (service: ServiceJob, categoryName: string, subcategoryName: string) => void;
  selectedServices: SelectedService[];
  onRemoveService: (serviceId: string) => void;
  onUpdateServices: (services: SelectedService[]) => void;
}

export function ServiceSelectorAdapter({
  categories,
  onServiceSelect,
  selectedServices,
  onRemoveService,
  onUpdateServices
}: ServiceSelectorAdapterProps) {
  // Convert categories to sectors format for backward compatibility
  const sectorsFromCategories = [{
    id: 'default-sector',
    name: 'Services',
    description: 'All available services',
    categories: categories,
    position: 1,
    is_active: true
  }];

  return (
    <IntegratedServiceSelector
      sectors={sectorsFromCategories}
      onServiceSelect={onServiceSelect}
      selectedServices={selectedServices}
      onRemoveService={onRemoveService}
      onUpdateServices={onUpdateServices}
    />
  );
}
