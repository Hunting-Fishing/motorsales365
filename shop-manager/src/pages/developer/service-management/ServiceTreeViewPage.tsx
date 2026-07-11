
import React from 'react';
import { ServiceHierarchyTreeView } from '@/components/developer/service-management/ServiceHierarchyTreeView';
import { useServiceSectors } from '@/hooks/useServiceCategories';

export function ServiceTreeViewPage() {
  const { sectors } = useServiceSectors();
  const allCategories = sectors.flatMap(sector => sector.categories);

  return (
    <ServiceHierarchyTreeView 
      categories={allCategories}
    />
  );
}
