
import { useState, useCallback } from 'react';

interface ExcelServiceData {
  id: string;
  sector: string;
  category: string;
  subcategory: string;
  serviceName: string;
  description: string;
  estimatedTime: number;
  price: number;
}

interface ExcelSheetData {
  sheetName: string;
  services: ExcelServiceData[];
  totalRows: number;
}

export const useExcelServiceData = () => {
  const [excelData, setExcelData] = useState<ExcelSheetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImportComplete = useCallback((importedData: ExcelSheetData[]) => {
    setExcelData(importedData);
    setError(null);
  }, []);

  const clearData = useCallback(() => {
    setExcelData([]);
    setError(null);
  }, []);

  const updateService = useCallback((sectorId: string, serviceId: string, updates: Partial<ExcelServiceData>) => {
    setExcelData(prev => prev.map(sheet => {
      if (sheet.sheetName === sectorId) {
        return {
          ...sheet,
          services: sheet.services.map(service => 
            service.id === serviceId ? { ...service, ...updates } : service
          )
        };
      }
      return sheet;
    }));
  }, []);

  // Convert excel data to the format expected by ServiceHierarchyExcelView
  const convertToSectorFormat = useCallback(() => {
    return excelData.map(sheet => ({
      id: sheet.sheetName,
      name: sheet.sheetName,
      description: `${sheet.services.length} services`,
      categories: [{
        id: `${sheet.sheetName}-category`,
        name: 'All Services',
        subcategories: [{
          id: `${sheet.sheetName}-subcategory`,
          name: 'Services',
          jobs: sheet.services.map(service => ({
            id: service.id,
            name: service.serviceName,
            description: service.description,
            estimatedTime: service.estimatedTime,
            price: service.price,
            category: service.category,
            subcategory: service.subcategory
          }))
        }]
      }]
    }));
  }, [excelData]);

  return {
    excelData,
    isLoading,
    error,
    handleImportComplete,
    clearData,
    updateService,
    convertToSectorFormat,
    hasData: excelData.length > 0
  };
};
