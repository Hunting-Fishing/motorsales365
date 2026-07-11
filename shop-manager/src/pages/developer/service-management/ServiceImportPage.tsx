
import React from 'react';
import { FreshServiceImport } from '@/components/developer/service-management/FreshServiceImport';
import { useServiceSectors } from '@/hooks/useServiceCategories';

export function ServiceImportPage() {
  const { refetch } = useServiceSectors();

  const handleImportComplete = () => {
    console.log('Import completed, refreshing live data...');
    refetch();
  };

  return <FreshServiceImport onImportComplete={handleImportComplete} />;
}
