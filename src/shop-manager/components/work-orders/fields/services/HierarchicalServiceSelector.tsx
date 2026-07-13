
import React, { useState, useMemo } from 'react';
import { ServiceMainCategory, ServiceJob, ServiceSector } from '@/types/service';
import { SelectedService } from '@/types/selectedService';
import { ServiceCategoryList } from './ServiceCategoryList';
import { ServiceSearch } from './ServiceSearch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HierarchicalServiceSelectorProps {
  sectors: ServiceSector[];
  onServiceSelect: (service: ServiceJob, categoryName: string, subcategoryName: string) => void;
  selectedServices?: SelectedService[];
  onRemoveService?: (serviceId: string) => void;
  onUpdateServices?: (services: SelectedService[]) => void;
}

export const HierarchicalServiceSelector: React.FC<HierarchicalServiceSelectorProps> = ({
  sectors,
  onServiceSelect,
  selectedServices = [],
  onRemoveService,
  onUpdateServices
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Convert sectors to categories for the existing CategoryList component
  const categories = useMemo(() => {
    return sectors.flatMap(sector => sector.categories);
  }, [sectors]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    
    return categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.subcategories.some(sub =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.jobs.some(job =>
          job.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
  }, [categories, searchTerm]);

  const handleRemoveService = (serviceId: string) => {
    if (onRemoveService) {
      onRemoveService(serviceId);
    }
  };

  const handleUpdateServices = (services: SelectedService[]) => {
    if (onUpdateServices) {
      onUpdateServices(services);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Services</CardTitle>
        <ServiceSearch 
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search for services..."
        />
      </CardHeader>
      <CardContent>
        <ServiceCategoryList
          categories={filteredCategories}
          onServiceSelect={onServiceSelect}
          selectedServices={selectedServices}
          onRemoveService={handleRemoveService}
          onUpdateServices={handleUpdateServices}
        />
      </CardContent>
    </Card>
  );
};
