
import React from 'react';
import { ServiceHierarchyTreeView } from '@sm/components/developer/service-management/ServiceHierarchyTreeView';
import { useServiceSectors } from '@sm/hooks/useServiceCategories';

export function ServiceTreeViewPage() {
  const { sectors } = useServiceSectors();
  const allCategories = sectors.flatMap(sector => sector.categories);

  return (
    <ServiceHierarchyTreeView 
      categories={allCategories}
    />
  );
}
