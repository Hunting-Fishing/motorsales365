
import { useState, useEffect } from 'react';
import { shopDataService, type ShopData, type CompanyInfo } from '@/services/shopDataService';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for managing shop data state and operations
 */
export const useShopData = () => {
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load shop data from database
   */
  const loadShopData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, validation } = await shopDataService.getValidatedShopData();
      
      if (!data) {
        setError('No shop data found');
        return;
      }

      setShopData(data);

      if (!validation.isValid) {
        console.warn('Shop data validation failed:', validation.missingFields);
        setError(`Missing required fields: ${validation.missingFields.join(', ')}`);
      }

      // Also load company info format
      const companyData = await shopDataService.getCompanyInfo();
      setCompanyInfo(companyData);

    } catch (err) {
      console.error('Failed to load shop data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shop data');
      
      toast({
        title: "Error",
        description: "Failed to load shop information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update company information
   */
  const updateCompanyInfo = async (updates: Partial<CompanyInfo>): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const success = await shopDataService.updateCompanyInfo(updates);
      
      if (success) {
        // Reload data to get updated values
        await loadShopData();
        
        toast({
          title: "Success",
          description: "Company information updated successfully",
        });
        
        return true;
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      console.error('Failed to update company info:', err);
      setError(err instanceof Error ? err.message : 'Failed to update company info');
      
      toast({
        title: "Error", 
        description: "Failed to update company information",
        variant: "destructive",
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh shop data
   */
  const refresh = () => {
    loadShopData();
  };

  // Load data on mount
  useEffect(() => {
    loadShopData();
  }, []);

  return {
    shopData,
    companyInfo,
    loading,
    error,
    updateCompanyInfo,
    refresh,
    // Validation helpers
    isValid: shopData ? shopDataService.validateShopData(shopData).isValid : false,
    missingFields: shopData ? shopDataService.validateShopData(shopData).missingFields : []
  };
};

/**
 * Hook for company info management specifically
 */
export const useCompanyInfo = () => {
  const { companyInfo, loading, error, updateCompanyInfo, refresh } = useShopData();

  return {
    companyInfo,
    loading,
    error,
    updateCompanyInfo,
    refresh
  };
};
